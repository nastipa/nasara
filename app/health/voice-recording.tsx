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
  useEffect, useState,
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


const showMessage = (
  title:string,
  message?:string
)=>{

if(Platform.OS === "web"){

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







const API_URL =
"https://nasara-upload-server.onrender.com";



const UPLOAD_API =
`${API_URL}/upload`;



const VOICE_TEMPLATE_API =
`${API_URL}/hospital/upload-voice-template`;


const GET_TEMPLATES_API =
`${API_URL}/hospital/voice-templates`;

const DELETE_TEMPLATE_API =
`${API_URL}/hospital/delete-voice-template`;

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
useState<string | null>(null);



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
name:"🇬🇧 English",
},

{
code:"tw",
name:"🇬🇭 Twi",
},

{
code:"ga",
name:"🇬🇭 Ga",
},

{
code:"ee",
name:"🇬🇭 Ewe",
},

{
code:"ha",
name:"🇬🇭 Hausa",
},

{
code:"dag",
name:"🇬🇭 Dagbani",
},

{
code:"gon",
name:"🇬🇭 Gonja",
},

];







const templates = [

{
code:"queue_call",
name:"Queue Call",
},


{
code:"welcome",
name:"Welcome Message",
},


{
code:"closed",
name:"Department Closed",
},

];

useEffect(()=>{

loadTemplates();

},[]);

/*
===========================
START RECORDING
===========================
*/


const startRecording =
async()=>{


try{



const permission =
await requestRecordingPermissionsAsync();



if(!permission.granted){


showMessage(
"Microphone Permission",
"Please allow microphone access"
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
error.message ||
"Could not start recording"
);



}



};



/*
===========================
STOP RECORDING
===========================
*/


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
"You can play, delete or upload"
);



}
catch(error:any){


console.log(
"STOP RECORD ERROR",
error
);



showMessage(
"Error",
error.message ||
"Could not stop recording"
);



}



};
/*
===========================
PLAY RECORDING
===========================
*/


const playRecording =
async()=>{


try{


if(!audioUri){


showMessage(
"No Recording",
"Please record first"
);


return;


}

await setAudioModeAsync({

allowsRecording:false,

playsInSilentMode:true,

});

player.replace({

uri:audioUri,

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
error.message ||
"Could not play recording"
);



}


};


/*
===========================
DELETE RECORDING
===========================
*/

const deleteRecording =
async()=>{

try{

// Stop playing audio first
player.pause();


// Clear player source
player.replace({
  uri:"",
});


// Clear recorded file reference
setAudioUri(null);


// Reset recorder state
await setAudioModeAsync({

  allowsRecording:false,

  playsInSilentMode:true,

});


showMessage(
"Deleted",
"Recording removed. Record again."
);


}
catch(error:any){

console.log(
"DELETE RECORDING ERROR",
error
);


showMessage(
"Delete Error",
error.message ||
"Could not delete recording"
);


}

};


/*
===========================
UPLOAD TEMPLATE
===========================
*/


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

uri:audioUri,

name:fileName,

type:"audio/m4a",

} as any

);







const uploadResponse =
await fetch(

UPLOAD_API,

{

method:"POST",

body:formData,

}

);


const uploadResult =
await uploadResponse.json();

if(!uploadResult.success){


throw new Error(
"Audio upload failed"
);


}





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

template_type:templateType,

audio_url:
uploadResult.url,

})

}

);


const result =
await response.json();





if(!result.success){


throw new Error(

result.error ||
"Could not save template"

);


}

showMessage(
"Success",
"Voice template uploaded"
);
await loadTemplates();


setAudioUri(null);



}
catch(error:any){


console.log(error);



showMessage(
"Upload Error",
error.message
);



}
finally{


setUploading(false);


}


};


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
GET_TEMPLATES_API,
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

console.log(error);

}
finally{

setLoadingTemplates(false);

}

};



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
"Voice template deleted"
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

>


<Text style={styles.title}>
🎙️ Voice Template Recording
</Text>



<Text style={styles.subtitle}>
Record reusable hospital announcements
</Text>
<View
style={{
backgroundColor:"#EFF6FF",
padding:15,
borderRadius:12,
marginBottom:20,
}}
>

<Text
style={{
fontWeight:"800",
fontSize:16,
marginBottom:10,
}}
>
Read exactly these words
</Text>

<Text
style={{
fontSize:16,
lineHeight:24,
}}
>

{language==="en" &&
"Please proceed to the consultation room."}

{language==="tw" &&
"Yɛ srɛ wo, kɔ ayaresabea no mu."}

{language==="ga" &&
"Yɛpaa shɛ, kɛ consultation room."}

{language==="ee" &&
"Míelɔ be nàyi consultation room."}

{language==="ha" &&
"A shiga dakin dubawa."}

{language==="dag" &&
"Talahi ka kuli consultation room."}

{language==="gon" &&
"Please proceed to the consultation room."}

</Text>

<Text
style={{
marginTop:10,
color:"#DC2626",
fontWeight:"700",
}}
>
Do NOT mention the queue number.
The system will announce it automatically.
</Text>

</View>

<Text style={styles.label}>
Language
</Text>



<View style={styles.row}>


{

languages.map((item)=>(


<TouchableOpacity

key={item.code}

style={[

styles.choice,

language === item.code &&
styles.active

]}

onPress={()=>
setLanguage(item.code)
}

>


<Text>
{item.name}
</Text>


</TouchableOpacity>


))


}


</View>



<Text style={styles.label}>
Template
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

onPress={()=>
setTemplateType(item.code)
}

>


<Text>
{item.name}
</Text>


</TouchableOpacity>


))


}



</View>







<View style={styles.buttons}>



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
▶️ Play Recording
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

disabled={!audioUri || uploading}

onPress={uploadTemplate}

>


{

uploading ?

<ActivityIndicator color="#fff"/>

:

<Text style={styles.buttonText}>
⬆️ Upload Template
</Text>


}

</TouchableOpacity>



</View>
<Text
style={{
fontSize:20,
fontWeight:"800",
marginTop:30,
marginBottom:15,
}}
>
Voice Templates
</Text>

{
loadingTemplates ?

<ActivityIndicator/>

:

voiceTemplates.map((item)=>(
<View
key={item.id}
style={{
backgroundColor:"#fff",
padding:15,
borderRadius:12,
marginBottom:12,
}}
>

<Text
style={{
fontWeight:"700",
fontSize:16,
}}
>
{item.language.toUpperCase()}
</Text>

<Text>
{item.template_type}
</Text>

<View
style={{
flexDirection:"row",
marginTop:10,
}}
>

<TouchableOpacity
style={{
backgroundColor:"#16A34A",
padding:10,
borderRadius:8,
marginRight:10,
}}
>

<Text style={{color:"#fff"}}>
▶️ Play
</Text>

</TouchableOpacity>

<TouchableOpacity
style={{
backgroundColor:"#DC2626",
padding:10,
borderRadius:8,
}}
onPress={()=>deleteTemplate(item.id)}
>

<Text style={{color:"#fff"}}>
Delete
</Text>

</TouchableOpacity>

</View>

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

fontWeight:"800",

},


subtitle:{

color:"#64748B",

marginBottom:20,

},


label:{

fontWeight:"700",

marginTop:15,

marginBottom:10,

},



row:{

flexDirection:"row",

flexWrap:"wrap",

gap:10,

},



choice:{

paddingHorizontal:15,

paddingVertical:10,

backgroundColor:"#E2E8F0",

borderRadius:20,

},



active:{

backgroundColor:"#86EFAC",

},



buttons:{

marginTop:30,

gap:15,

},



button:{

padding:18,

borderRadius:16,

alignItems:"center",

},



buttonText:{

color:"#fff",

fontWeight:"800",

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


});