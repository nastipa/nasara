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
  useAudioPlayer,
} from "expo-audio";

import * as Speech from "expo-speech";

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


const VOICE_QUEUE_API =
`${API_URL}/hospital/voice-queue`;


const VOICE_PLAYED_API =
`${API_URL}/hospital/voice-queue/played`;


const VOICE_TEMPLATE_API =
`${API_URL}/hospital/voice-template`;


const VOICE_TEMPLATES_API =
`${API_URL}/hospital/voice-templates`;



export default function DepartmentVoiceBoard(){


const player =
useAudioPlayer();



const [
announcement,
setAnnouncement
]
=
useState<any | null>(null);

const [
loading,
setLoading
]
=
useState(true);



const [
processing,
setProcessing
]
=
useState(false);



const [
templates,
setTemplates
]
=
useState<any[]>([]);



const [
loadingTemplates,
setLoadingTemplates
]
=
useState(false);



const [
selectedTemplate,
setSelectedTemplate
]
=
useState<any>(null);



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





/*
===========================
LOAD BOOKING QUEUE
===========================
*/

const loadVoiceQueue = async () => {

  try {

    setLoading(true);


    const {
      data: { session },
    } = await supabase.auth.getSession();


    if (!session) {

      console.log("NO SESSION");

      return;

    }



    const response = await fetch(
      VOICE_QUEUE_API,
      {
        headers: {

          Authorization:
            `Bearer ${session.access_token}`,

        },

      }
    );



    const result =
      await response.json();



    console.log(
      "VOICE ANNOUNCEMENT",
      JSON.stringify(result, null, 2)
    );



    if (result.success) {


      /*
        Backend now returns:

        {
          success:true,
          announcements:[
             {...},
             {...}
          ]
        }

        We display the first voice item.
      */


     const nextAnnouncement =
  result.announcement || null;


setAnnouncement(
  nextAnnouncement
);


if (nextAnnouncement) {


  console.log(
    "QUEUE:",
    nextAnnouncement.queue_number
  );


  console.log(
    "MESSAGE:",
    nextAnnouncement.message
  );


  console.log(
    "VOICES:",
    JSON.stringify(
      nextAnnouncement.voices || [],
      null,
      2
    )
  );


} else {


  console.log(
    "NO VOICE ANNOUNCEMENT"
  );


}


} else {


  setAnnouncement(null);


}



}
catch(error:any) {


console.log(
  "VOICE QUEUE ERROR",
  error.message || error
);


setAnnouncement(null);


}
finally {


setLoading(false);


}


};

/*
===========================
LOAD VOICE TEMPLATES
===========================
*/


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



console.log(
"TEMPLATES RESULT",
result
);



if(result.success){


setTemplates(
result.templates || []
);


}



}
catch(error){


console.log(
"TEMPLATE ERROR",
error
);


}
finally{


setLoadingTemplates(false);


}


};





useEffect(()=>{


loadVoiceQueue();

loadTemplates();



},[]);
/*
===========================
GET TEMPLATE AUDIO
===========================
*/


const getTemplate =
async(
language:string
)=>{


try{


const {
data:{
session
}
}
=
await supabase.auth.getSession();



if(!session){

return null;

}





const response =
await fetch(

`${VOICE_TEMPLATE_API}?language=${language}&template_type=queue_call`,

{

headers:{

Authorization:
`Bearer ${session.access_token}`

}

}

);





const result =
await response.json();





if(
result.success &&
result.template
){

return result.template.audio_url;

}



return null;


}
catch(error){


console.log(
"GET TEMPLATE ERROR",
error
);


return null;


}


};



/*
===========================
PLAY VOICE
===========================
*/

const playVoice = async () => {

  try {

    if (!announcement) return;


    Speech.stop();
    player.pause();


    const voices =
      announcement.voices || [];


    console.log(
      "PLAYING VOICES:",
      JSON.stringify(
        voices,
        null,
        2
      )
    );


    for (const voice of voices) {


      console.log(
        "CURRENT VOICE:",
        voice.language,
        voice.audio_type,
        voice.audio_url
      );


      /*
      ==========================
      RECORDED VOICE
      ==========================
      */

      if (
  voice.audio_type === "template" &&
  voice.audio_url
) {


await new Promise<void>((resolve)=>{


if(Platform.OS === "web") {


const audio =
new Audio(
  voice.audio_url
);


audio.volume = 1;


audio.onended = () => {
  resolve();
};


audio.onerror = () => {
  resolve();
};


audio.play()
.catch((error)=>{

console.log(
"WEB AUDIO BLOCKED",
error
);

resolve();

});


}
else {


player.replace({

uri: voice.audio_url

});


player.play();


const check =
setInterval(()=>{


if(!player.playing){

clearInterval(check);

resolve();

}


},500);


}



});


}
      /*
      ==========================
      ENGLISH TTS FALLBACK
      ==========================
      */

      else if(
        voice.audio_type === "tts"
      ){


        await new Promise<void>((resolve)=>{


         Speech.speak(
  `${announcement.hospital_departments?.name || "Department"} ${announcement.queue_number}, please proceed to ${announcement.hospital_departments?.name || "Department"}.`,
  {
    language:"en-US",
    rate:0.75,
    pitch:1,

    onDone:()=>resolve(),

    onError:()=>resolve(),
  }
);

  
        });


      }


    }


    console.log(
      "VOICE SEQUENCE COMPLETED"
    );


  }
  catch(error){

    console.log(
      "PLAY VOICE ERROR",
      error
    );

  }

};
/*
===========================
STOP VOICE
===========================
*/


const stopVoice =
()=>{


try{


Speech.stop();


player.pause();



}
catch(error){


console.log(error);


}


};








/*
===========================
MARK NEXT PATIENT ONLY
===========================
*/


const nextPatient =
async()=>{


try{


if(!announcement?.id){

return;

}




setProcessing(true);




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






await fetch(

VOICE_PLAYED_API,

{

method:"POST",

headers:{

"Content-Type":
"application/json",


Authorization:
`Bearer ${session.access_token}`

},


body:JSON.stringify({

booking_id: announcement.booking_id

})
}

);





setAnnouncement(null);



await loadVoiceQueue();



}
catch(error:any){


console.log(
"NEXT ERROR",
error
);



showMessage(
"Error",
"Could not move patient"
);



}
finally{


setProcessing(false);


}


};

/*
===========================
PLAY TEMPLATE TEST
===========================
*/


const playTemplate =
(template:any)=>{


try{


player.replace({

uri:template.audio_url

});


player.play();



}
catch(error){


console.log(
"TEMPLATE PLAY ERROR",
error
);


}


};
return (

<ScrollView

style={styles.container}

contentContainerStyle={{
paddingBottom:40
}}

>


<Text style={styles.title}>
🔊 Voice Queue Board
</Text>



<Text style={styles.subtitle}>
Automatic patient calling system
</Text>





{
loading ?


<ActivityIndicator
size="large"
/>


:


announcement ?



<View style={styles.card}>


<Text style={styles.status}>
NOW CALLING
</Text>




<Text style={styles.queue}>
{announcement.queue_number}
</Text>




<Text style={styles.message}>
{announcement.message}
</Text>




<Text style={styles.language}>
Language: {announcement.language || "English"}
</Text>





<TouchableOpacity

style={[
styles.button,
styles.play
]}

onPress={playVoice}

>

<Text style={styles.buttonText}>
▶️ Play Voice
</Text>


</TouchableOpacity>






<TouchableOpacity

style={[
styles.button,
styles.stop
]}

onPress={stopVoice}

>

<Text style={styles.buttonText}>
⏹️ Stop
</Text>


</TouchableOpacity>






<TouchableOpacity

style={[
styles.button,
styles.next
]}

disabled={processing}

onPress={nextPatient}

>


{

processing ?

<ActivityIndicator
color="#fff"
/>

:

<Text style={styles.buttonText}>
➡️ Next Patient
</Text>


}


</TouchableOpacity>



</View>



:



<View style={styles.empty}>


<Text style={styles.emptyTitle}>
No Patient Waiting
</Text>



<Text style={styles.emptyText}>
New bookings will appear automatically.
</Text>




<TouchableOpacity

style={styles.refresh}

onPress={()=>{
loadVoiceQueue();
loadTemplates();
}}

>


<Text style={styles.buttonText}>
Refresh
</Text>


</TouchableOpacity>


</View>


}







<View style={styles.templateBox}>


<Text style={styles.templateTitle}>
🔊 Voice Templates
</Text>


<Text style={styles.templateSubtitle}>
Select a recorded language template
</Text>





{

loadingTemplates ?


<ActivityIndicator/>


:


languages.map((item)=>{


const template =
templates.find(
(t)=>
t.language === item.code
);



return (


<TouchableOpacity

key={item.code}

style={[
styles.templateCard,

selectedTemplate?.language === item.code &&
styles.selectedTemplate

]}


onPress={()=>{

if(template){

setSelectedTemplate(template);

}

}}

>


<Text style={styles.templateLanguage}>
{item.name}
</Text>




<Text>

Queue Call

</Text>





<Text

style={{

color:
template
?
"#16A34A"
:
"#DC2626",

fontWeight:"700"

}}

>


{

template

?

"✅ Recorded"

:

"❌ Missing - English default"

}


</Text>






{

template &&
selectedTemplate?.id === template.id &&


<TouchableOpacity

style={styles.templatePlay}

onPress={()=>playTemplate(template)}

>


<Text style={styles.buttonText}>
▶️ Test Template
</Text>


</TouchableOpacity>


}



</TouchableOpacity>


);


})


}



</View>





</ScrollView>

);


}








const styles =
StyleSheet.create({



container:{

flex:1,

padding:20,

backgroundColor:"#F8FAFC",

},



title:{

fontSize:28,

fontWeight:"800",

},



subtitle:{

color:"#64748B",

marginBottom:25,

},



card:{

backgroundColor:"#fff",

padding:25,

borderRadius:25,

alignItems:"center",

},



status:{

backgroundColor:"#DCFCE7",

color:"#15803D",

padding:10,

borderRadius:20,

fontWeight:"800",

},



queue:{

fontSize:64,

fontWeight:"900",

marginVertical:15,

},



message:{

fontSize:18,

textAlign:"center",

},



language:{

marginVertical:15,

color:"#64748B",

},



button:{

width:"100%",

padding:16,

borderRadius:16,

alignItems:"center",

marginTop:10,

},



buttonText:{

color:"#fff",

fontWeight:"800",

},



play:{

backgroundColor:"#16A34A",

},



stop:{

backgroundColor:"#DC2626",

},



next:{

backgroundColor:"#2563EB",

},



empty:{

backgroundColor:"#fff",

padding:30,

borderRadius:25,

alignItems:"center",

},



emptyTitle:{

fontSize:22,

fontWeight:"800",

},



emptyText:{

marginTop:10,

color:"#64748B",

textAlign:"center",

},



refresh:{

marginTop:20,

backgroundColor:"#16A34A",

padding:15,

borderRadius:20,

},



templateBox:{

marginTop:30,

},



templateTitle:{

fontSize:22,

fontWeight:"800",

},



templateSubtitle:{

color:"#64748B",

marginBottom:15,

},



templateCard:{

backgroundColor:"#fff",

padding:15,

borderRadius:15,

marginBottom:10,

},



selectedTemplate:{

borderWidth:2,

borderColor:"#16A34A",

},



templateLanguage:{

fontSize:17,

fontWeight:"800",

marginBottom:5,

},



templatePlay:{

backgroundColor:"#16A34A",

padding:12,

borderRadius:12,

marginTop:10,

alignItems:"center",

},


});