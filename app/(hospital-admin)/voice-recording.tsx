import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useEffect,
  useState,
} from "react";


import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";


import {
  supabase,
} from "../../lib/supabase";



const API_URL =
"https://nasara-upload-server.onrender.com";



const UPLOAD_API =
`${API_URL}/upload`;



const VOICE_TEMPLATE_API =
`${API_URL}/hospital/upload-voice-template`;


const VOICE_TEMPLATES_API =
`${API_URL}/hospital/voice-templates`;

const DELETE_TEMPLATE_API =
`${API_URL}/hospital/delete-voice-template`;




const showMessage = (
  title:string,
  message?:string
)=>{


if(Platform.OS==="web"){

window.alert(
message
?
`${title}\n\n${message}`
:
title
);


}else{


Alert.alert(
title,
message
);


}


};







export default function VoiceRecording(){



const recorder =
useAudioRecorder(
RecordingPresets.HIGH_QUALITY
);



const player =
useAudioPlayer();




const [
recording,
setRecording
]
=
useState(false);



const [
audioUri,
setAudioUri
]
=
useState<string|null>(null);



const [
uploading,
setUploading
]
=
useState(false);










const [
language,
setLanguage
]
=
useState("en");



const [
templateType,
setTemplateType
]
=
useState("queue_call");



const [
voiceTemplates,
setVoiceTemplates
]
=
useState<any[]>([]);



const [
loadingTemplates,
setLoadingTemplates
]
=
useState(false);










const languages = [

{
code:"en",
name:"🇬🇧 English"
},

{
code:"tw",
name:"🇬🇭 Twi"
},

{
code:"ga",
name:"🇬🇭 Ga"
},

{
code:"ee",
name:"🇬🇭 Ewe"
},

{
code:"ha",
name:"🇬🇭 Hausa"
},

{
code:"dag",
name:"🇬🇭 Dagbani"
},

{
code:"gon",
name:"🇬🇭 Gonja"
},

];






const templates = [

{
code:"queue_call",
name:"Queue Call"
},

{
code:"welcome",
name:"Welcome"
},

{
code:"closed",
name:"Department Closed"
}

];







useEffect(()=>{

loadTemplates();

},[]);









/*
================================
START RECORDING
================================
*/


const startRecording =
async()=>{


try{


const permission =
await requestRecordingPermissionsAsync();



if(!permission.granted){


showMessage(
"Microphone Permission",
"Allow microphone access"
);


return;


}



await setAudioModeAsync({

allowsRecording:true,

playsInSilentMode:true,

});



await recorder.prepareToRecordAsync();



recorder.record();



setRecording(true);



setAudioUri(null);



}
catch(error:any){


console.log(
"START RECORD ERROR",
error
);


showMessage(
"Recording Error",
error.message
);


}



};
// ================================
// STOP RECORDING
// ================================

const stopRecording =
async()=>{


try{


await recorder.stop();



await setAudioModeAsync({

allowsRecording:false,

playsInSilentMode:true,

});



const uri =
recorder.uri;



if(uri){

setAudioUri(uri);

}



setRecording(false);



showMessage(
"Recording Ready",
"You can preview and upload"
);



}
catch(error:any){


console.log(
"STOP RECORD ERROR",
error
);


showMessage(
"Error",
error.message
);


}


};




// ================================
// PLAY RECORDING
// iOS FIX
// ================================

const playRecording =
async()=>{


try{


if(!audioUri){

showMessage(
"No Recording",
"Record audio first"
);

return;

}




await setAudioModeAsync({

allowsRecording:false,

playsInSilentMode:true,

});



player.replace({

uri:audioUri

});



player.play();



}
catch(error:any){


console.log(
"PLAY ERROR",
error
);


showMessage(
"Playback Error",
error.message
);


}


};





// ================================
// DELETE LOCAL RECORDING
// ================================


const deleteRecording =
async()=>{


try{


player.pause();



player.replace({

uri:""

});



setAudioUri(null);



showMessage(
"Deleted",
"Record again"
);



}
catch(error:any){


console.log(
"DELETE ERROR",
error
);


}


};







// ================================
// UPLOAD HOSPITAL VOICE TEMPLATE
// SAME WORKING DEPARTMENT UPLOAD FLOW
// ================================

const uploadTemplate =
async()=>{


try{


if(!audioUri){

showMessage(
"No Recording",
"Please record a voice first"
);

return;

}



setUploading(true);



const {
data:{
session
}
}
=
await supabase.auth.getSession();



if(!session){


showMessage(
"Session Expired",
"Please login again"
);


return;


}





const fileName =
`voice-${language}-${templateType}-${Date.now()}.m4a`;



const formData =
new FormData();



formData.append(

"file",

{

uri:
audioUri,

name:
fileName,

type:
"audio/m4a",

} as any

);





console.log(
"UPLOADING AUDIO URI",
audioUri
);



const uploadResponse =
await fetch(

UPLOAD_API,

{

method:"POST",

body:formData,

}

);





const uploadText =
await uploadResponse.text();

console.log(
"UPLOAD RAW RESPONSE",
uploadText
);


let uploadResult:any = null;


try {

  uploadResult = JSON.parse(uploadText);

}
catch(error){

  console.log(
    "JSON PARSE ERROR",
    error
  );

  throw new Error(
    "Upload server returned invalid response"
  );

}





if(!uploadResult.success){


throw new Error(

uploadResult.error ||
"Audio upload failed"

);


}






const audioUrl =

uploadResult.url ||
uploadResult.audio_url;





if(!audioUrl){


throw new Error(
"No audio URL returned"
);


}






console.log(
"AUDIO URL",
audioUrl
);







// SAVE TEMPLATE TO DATABASE


const response =
await fetch(

VOICE_TEMPLATE_API,

{

method:"POST",


headers:{


"Content-Type":
"application/json",


Authorization:
`Bearer ${session.access_token}`


},


body:JSON.stringify({

language,

template_type:
templateType,

audio_url:
audioUrl,


})

}

);






const result =
await response.json();





console.log(
"SAVE TEMPLATE RESULT",
result
);






if(!result.success){


throw new Error(

result.error ||
"Could not save template"

);


}





showMessage(
"Success",
"Hospital voice template saved"
);



setAudioUri(null);



await loadTemplates();



}
catch(error:any){


console.log(
"HOSPITAL VOICE UPLOAD ERROR",
error
);



showMessage(
"Upload Error",
error.message
);



}
finally{


setUploading(false);


}


};

// ================================
// GET SAVED VOICE TEMPLATES
// ================================


const loadTemplates =
async()=>{


try{


setLoadingTemplates(true);



const {
data:{
session
}
}
=
await supabase.auth.getSession();



if(!session){

return;

}




const response =
await fetch(

VOICE_TEMPLATES_API,

{

headers:{

Authorization:
`Bearer ${session.access_token}`

}

}

);



const result =
await response.json();



if(result.success){


setVoiceTemplates(

result.templates || []

);


}



}
catch(error){

console.log(
"LOAD TEMPLATES ERROR",
error
);


}
finally{


setLoadingTemplates(false);


}


};


// ================================
// DELETE SAVED TEMPLATE
// ================================


const deleteTemplate =
async(id:string)=>{


try{


const {
data:{
session
}
}
=
await supabase.auth.getSession();



if(!session){

return;

}





const response =
await fetch(

`${DELETE_TEMPLATE_API}/${id}`,

{

method:"DELETE",


headers:{

Authorization:
`Bearer ${session.access_token}`

}


}

);



const result =
await response.json();



if(result.success){


showMessage(
"Deleted",
"Voice template removed"
);


loadTemplates();


}



}
catch(error:any){


console.log(
"DELETE TEMPLATE ERROR",
error
);



showMessage(
"Error",
error.message
);



}


};
return (

<ScrollView

contentContainerStyle={
styles.container
}

showsVerticalScrollIndicator={false}

>


<Text style={styles.title}>
🎙️ Hospital Voice Recording
</Text>


<Text style={styles.subtitle}>
Create hospital-wide voice announcements used by every department
</Text>





<Text style={styles.label}>
Language
</Text>

<View style={styles.row}>
  {languages.map((item) => (
    <TouchableOpacity
      key={item.code}
      style={[
        styles.choice,
        language === item.code && styles.active,
      ]}
      onPress={() => setLanguage(item.code)}
    >
      <Text>{item.name}</Text>
    </TouchableOpacity>
  ))}
</View>


{/* TEMPLATE */}


<Text style={styles.label}>
Announcement Type
</Text>


<View style={styles.row}>


{

templates.map((item)=>(


<TouchableOpacity

key={item.code}

style={[

styles.choice,

templateType === item.code &&
styles.active

]}


onPress={()=>{

setTemplateType(item.code);

}}

>


<Text>

{item.name}

</Text>


</TouchableOpacity>


))


}


</View>

<View style={styles.infoBox}>


<Text style={styles.infoTitle}>
Recording instruction
</Text>


<Text style={styles.infoText}>

Do not mention queue number.

Example:

"Please proceed to the  department."

The system will automatically add the queue number.

</Text>


</View>

{/* BUTTONS */}



<TouchableOpacity

style={[

styles.button,

styles.start

]}

disabled={recording}

onPress={startRecording}

>


<Text style={styles.buttonText}>

🎙️ Start Recording

</Text>


</TouchableOpacity>


<TouchableOpacity

style={[

styles.button,

styles.stop

]}

disabled={!recording}

onPress={stopRecording}

>


<Text style={styles.buttonText}>

⏹️ Stop Recording

</Text>


</TouchableOpacity>


<TouchableOpacity

style={[

styles.button,

styles.play

]}

disabled={!audioUri}

onPress={playRecording}

>


<Text style={styles.buttonText}>

▶️ Preview Voice

</Text>


</TouchableOpacity>

<TouchableOpacity

style={[

styles.button,

styles.delete

]}

disabled={!audioUri}

onPress={deleteRecording}

>


<Text style={styles.buttonText}>

🗑️ Delete Recording

</Text>


</TouchableOpacity>


<TouchableOpacity

style={[

styles.button,

styles.upload

]}


disabled={
!audioUri ||
uploading
}


onPress={uploadTemplate}


>


{

uploading

?

<ActivityIndicator color="#fff"/>


:


<Text style={styles.buttonText}>

⬆️ Save Voice Template

</Text>


}



</TouchableOpacity>


<Text style={styles.sectionTitle}>
Saved Voice Templates
</Text>


{

loadingTemplates ?

<ActivityIndicator/>


:

voiceTemplates.map((item)=>(


<View

key={item.id}

style={styles.templateCard}

>


<Text style={styles.templateTitle}>
Hospital Voice Recording
</Text>

<Text>
Used by all departments
</Text>


<Text>

Language:
{item.language}

</Text>

<Text>

Type:
{item.template_type}

</Text>

<TouchableOpacity

style={styles.deleteTemplate}

onPress={()=>deleteTemplate(item.id)}

>


<Text style={styles.buttonText}>

Delete

</Text>


</TouchableOpacity>



</View>


))


}




</ScrollView>

);

}

const styles =
StyleSheet.create({


container:{

flexGrow:1,

padding:20,

backgroundColor:"#F8FAFC",

},



title:{

fontSize:28,

fontWeight:"900",

color:"#111827",

},



subtitle:{

marginTop:5,

marginBottom:25,

color:"#64748B",

},



label:{

fontSize:17,

fontWeight:"800",

marginTop:18,

marginBottom:10,

},



row:{

flexDirection:"row",

flexWrap:"wrap",

gap:10,

},



choice:{

backgroundColor:"#E5E7EB",

paddingHorizontal:16,

paddingVertical:12,

borderRadius:25,

},



active:{

backgroundColor:"#86EFAC",

},



infoBox:{

backgroundColor:"#EFF6FF",

padding:16,

borderRadius:15,

marginTop:25,

},



infoTitle:{

fontWeight:"900",

fontSize:16,

},



infoText:{

marginTop:8,

lineHeight:22,

color:"#334155",

},



button:{

padding:18,

borderRadius:16,

marginTop:15,

alignItems:"center",

},



buttonText:{

color:"#fff",

fontWeight:"900",

fontSize:16,

},



start:{

backgroundColor:"#2563EB",

},



stop:{

backgroundColor:"#DC2626",

},



play:{

backgroundColor:"#16A34A",

},



delete:{

backgroundColor:"#64748B",

},



upload:{

backgroundColor:"#7C3AED",

},




sectionTitle:{

fontSize:22,

fontWeight:"900",

marginTop:35,

marginBottom:15,

},



templateCard:{

backgroundColor:"#fff",

padding:18,

borderRadius:16,

marginBottom:12,

elevation:2,

},



templateTitle:{

fontSize:17,

fontWeight:"900",

marginBottom:8,

},



deleteTemplate:{

backgroundColor:"#DC2626",

padding:12,

borderRadius:10,

marginTop:12,

alignItems:"center",

},


});