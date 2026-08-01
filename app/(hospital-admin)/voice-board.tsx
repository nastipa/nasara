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
    setAudioModeAsync,
    useAudioPlayer,
} from "expo-audio";

import * as Speech from "expo-speech";

import {
    supabase,
} from "../../lib/supabase";



const API_URL =
  "https://nasara-upload-server.onrender.com";

const VOICE_TEMPLATES_API =
  `${API_URL}/hospital/voice-templates`;

const VOICE_QUEUE_API =
  `${API_URL}/hospital/voice-queue`;

const VOICE_PLAYED_API =
  `${API_URL}/hospital/voice-queue/played`;



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





export default function HospitalVoiceBoard(){


const player =
useAudioPlayer();



const [
templates,
setTemplates
]
=
useState<any[]>([]);



const [
loading,
setLoading
]
=
useState(true);



const [
playingId,
setPlayingId
]
=
useState<string|null>(null);


const [
playing,
setPlaying
]
=
useState(false);


const [
announcement,
setAnnouncement
]
=
useState<any>(null);
const loadVoiceQueue = async()=>{

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
VOICE_QUEUE_API,
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
result.announcement
){

setAnnouncement(
result.announcement
);

playAnnouncement(
result.announcement
);

}


}
catch(error){

console.log(
"VOICE QUEUE ERROR",
error
);

}

};

useEffect(() => {

  loadVoiceQueue();


  const channel =
    supabase
      .channel("hospital_voice_queue_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hospital_voice_queue",
        },
        (payload) => {

          console.log(
            "NEW VOICE ANNOUNCEMENT",
            payload.new
          );


         loadVoiceQueue();

        }
      )
      .subscribe();


  return () => {

    supabase.removeChannel(channel);

  };


}, []);

/*
================================
iOS AUDIO SETUP
================================
*/


useEffect(()=>{


const setupAudio =
async()=>{


try{


await setAudioModeAsync({

allowsRecording:false,

playsInSilentMode:true,

});


}
catch(error){

console.log(
"AUDIO SETUP ERROR",
error
);


}


};


setupAudio();


},[]);





/*
================================
LOAD HOSPITAL VOICE TEMPLATES
NO REFRESH
================================
*/


useEffect(()=>{


loadVoiceTemplates();


},[]);





const loadVoiceTemplates =
async()=>{


try{


setLoading(true);



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
"HOSPITAL VOICE TEMPLATES",
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
"LOAD VOICE TEMPLATE ERROR",
error
);


}
finally{


setLoading(false);


}


};





const defaultVoices = [

{
id:"default-en",
language:"English",
name:"Default English Voice",
type:"tts",
},



];
// =================================
// PLAY RECORDED AUDIO FROM R2
// =================================


const playRecordedVoice =
async(
item:any
)=>{


try{


if(!item.audio_url){

return;

}



setPlaying(true);

setPlayingId(item.id);



await setAudioModeAsync({

allowsRecording:false,

playsInSilentMode:true,

});





player.replace({

uri:item.audio_url

});



player.play();





const timer =
setInterval(()=>{


if(!player.playing){


clearInterval(timer);


setPlaying(false);

setPlayingId(null);


}


},500);



}
catch(error:any){


console.log(
"PLAY RECORDED VOICE ERROR",
error
);



setPlaying(false);

setPlayingId(null);



showMessage(
"Playback Error",
error.message
);



}


};






// =================================
// PLAY DEFAULT TTS VOICE
// =================================


const playDefaultVoice =
async(
language:string
)=>{


try{


setPlaying(true);



setPlayingId(
`default-${language}`
);




let text =
"Please proceed to the consultation room.";



let speechLanguage =
"en-US";




if(language==="Twi"){


text =
"Yɛ srɛ wo kɔ ayaresabea no mu.";


speechLanguage =
"en-GH";


}



if(language==="Ga"){


text =
"Yɛpaa shɛ kɛ consultation room.";


speechLanguage =
"en-GH";


}





Speech.stop();





Speech.speak(

text,

{

language:speechLanguage,

rate:0.75,

pitch:1,


onDone:()=>{


setPlaying(false);

setPlayingId(null);


},


onError:()=>{


setPlaying(false);

setPlayingId(null);


}


}

);




}
catch(error:any){


console.log(
"TTS ERROR",
error
);



setPlaying(false);

setPlayingId(null);



}



};

const playAnnouncement =
async(
announcement:any
)=>{


try{


setPlaying(true);



const queueNumber =
announcement.queue_number ||
"001";



// 1. Speak queue number first

await new Promise<void>((resolve)=>{


Speech.speak(

queueNumber,

{

language:"en-US",

rate:0.75,

pitch:1,


onDone:()=>resolve(),


onError:()=>resolve(),

}


);


});



// 2. Play recorded languages

if(
announcement.voices &&
announcement.voices.length
){


for(
const voice of announcement.voices
){


if(
voice.audio_url
){


player.replace({

uri:
voice.audio_url

});


player.play();



await new Promise(resolve=>{

setTimeout(
resolve,
5000
);

});


}


}

}


// 3. Mark played


const {
data:{
session
}
}
=
await supabase.auth.getSession();


await fetch(
VOICE_PLAYED_API,
{

method:"POST",

headers:{

Authorization:
`Bearer ${session?.access_token}`,

"Content-Type":
"application/json",

},


body:JSON.stringify({

booking_id:
announcement.booking_id

})

}

);



setPlaying(false);



}
catch(error){

console.log(
"ANNOUNCEMENT PLAY ERROR",
error
);


setPlaying(false);

}


};



// =================================
// STOP AUDIO
// =================================


const stopAudio =
()=>{


try{


player.pause();


Speech.stop();



setPlaying(false);


setPlayingId(null);



}
catch(error){

console.log(
"STOP AUDIO ERROR",
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
🔊 Hospital Voice Board
</Text>


<Text style={styles.subtitle}>
Hospital recorded voices and default system voices
</Text>





{
loading ?


<ActivityIndicator
size="large"
/>


:

<View>


<Text style={styles.sectionTitle}>
🎙️ Recorded Hospital Voices
</Text>



{

templates.length === 0 ?

<View style={styles.empty}>


<Text style={styles.emptyTitle}>
No Recorded Voice
</Text>


<Text style={styles.emptyText}>
Create voice templates from Hospital Admin Voice Recording.
</Text>


</View>


:


templates.map((item)=>(


<View

key={item.id}

style={styles.card}

>


<Text style={styles.cardTitle}>

{item.language?.toUpperCase()}

</Text>


<Text style={styles.cardText}>

{item.template_type}

</Text>



<TouchableOpacity

style={styles.playButton}

onPress={()=>playRecordedVoice(item)}

>


<Text style={styles.buttonText}>

{

playingId === item.id

?

"🔊 Playing..."

:

"▶️ Play Recorded Voice"

}

</Text>


</TouchableOpacity>



</View>


))


}





<Text style={styles.sectionTitle}>
🤖 Default System Voices
</Text>




{

defaultVoices.map((item)=>(


<View

key={item.id}

style={styles.card}

>


<Text style={styles.cardTitle}>

{item.name}

</Text>


<Text style={styles.cardText}>

Language: {item.language}

</Text>



<TouchableOpacity

style={styles.defaultButton}

onPress={()=>playDefaultVoice(item.language)}

>


<Text style={styles.buttonText}>

{

playingId === item.id

?

"🔊 Playing..."

:

"▶️ Play Default Voice"

}

</Text>


</TouchableOpacity>



</View>


))


}




{

playing &&

<TouchableOpacity

style={styles.stopButton}

onPress={stopAudio}

>


<Text style={styles.buttonText}>
⏹️ Stop Voice
</Text>


</TouchableOpacity>


}





</View>


}



</ScrollView>

);


}




const styles =
StyleSheet.create({

container:{

flex:1,

backgroundColor:"#F8FAFC",

padding:20,

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



sectionTitle:{

fontSize:22,

fontWeight:"900",

marginTop:25,

marginBottom:15,

},



card:{

backgroundColor:"#FFFFFF",

padding:20,

borderRadius:18,

marginBottom:15,

elevation:2,

},



cardTitle:{

fontSize:18,

fontWeight:"900",

},



cardText:{

marginTop:8,

color:"#64748B",

},



playButton:{

marginTop:15,

backgroundColor:"#2563EB",

padding:15,

borderRadius:12,

alignItems:"center",

},



defaultButton:{

marginTop:15,

backgroundColor:"#16A34A",

padding:15,

borderRadius:12,

alignItems:"center",

},



stopButton:{

backgroundColor:"#DC2626",

padding:18,

borderRadius:15,

alignItems:"center",

marginTop:20,

},



buttonText:{

color:"#FFFFFF",

fontWeight:"900",

fontSize:16,

},



empty:{

backgroundColor:"#FFFFFF",

padding:25,

borderRadius:18,

alignItems:"center",

},



emptyTitle:{

fontSize:20,

fontWeight:"900",

},



emptyText:{

marginTop:10,

textAlign:"center",

color:"#64748B",

},


});