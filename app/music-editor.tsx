import { useRef, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { VideoView, useVideoPlayer } from "expo-video";

import { useLocalSearchParams, useRouter } from "expo-router";

import Waveform from "../components/Waveform";
import { mergeVideoWithAudio } from "../lib/mergeVideo";

export default function MusicEditor(){

  const router = useRouter();
  const { video } = useLocalSearchParams();

  const player = useVideoPlayer(video as string);

  const soundRef = useRef<any>(null);

  const [playing,setPlaying] = useState(false);
  const [loading,setLoading] = useState(false);

  const [musicUri,setMusicUri] = useState<string | null>(null);

  const [musicVolume,setMusicVolume] = useState(1);
  const [videoVolume,setVideoVolume] = useState(1);

  const [startTime,setStartTime] = useState(0);
  const [progress,setProgress] = useState(0);

  /* ================= PICK MUSIC ================= */

  const pickMusic = async () => {

    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true
    });

    if(result.canceled) return;

    const file = result.assets[0];

    setMusicUri(file.uri);

    const { sound } = await Audio.Sound.createAsync({
      uri: file.uri
    });

    sound.setVolumeAsync(musicVolume);

    soundRef.current = sound;
  };

  /* ================= PLAY ================= */

  const playBoth = async () => {

    if(!musicUri) return;

    try{
      setPlaying(true);

      player.currentTime = 0;
      player.volume = videoVolume;

      await soundRef.current?.setPositionAsync(startTime * 1000);
      await soundRef.current?.setVolumeAsync(musicVolume);

      player.play();
      await soundRef.current?.playAsync();

    }catch(e){
      console.log(e);
    }
  };

  const pauseBoth = async () => {

    setPlaying(false);

    player.pause();
    await soundRef.current?.pauseAsync();
  };

  /* ================= MERGE ================= */

  const saveAndGoBack = async () => {

    if(!video || !musicUri){
      alert("Pick music first");
      return;
    }

    try{

      setLoading(true);

      const mergedVideo = await mergeVideoWithAudio(
        video as string,
        musicUri,
        {
          musicVolume,
          videoVolume,
          startTime
        }
      );

      router.replace({
        pathname: "/create-reel",
        params: { video: mergedVideo }
      });

    }catch(e){
      console.log("merge error",e);
    }

    setLoading(false);
  };

  /* ================= UI ================= */

  return (
    <View style={{ flex:1, backgroundColor:"#000" }}>

      <VideoView
        player={player}
        style={{ flex:1 }}
      />

      <View style={styles.panel}>

        <TouchableOpacity onPress={pickMusic}>
          <Text style={styles.btn}>Pick Music</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={playing ? pauseBoth : playBoth}>
          <Text style={styles.btn}>
            {playing ? "Pause" : "Play"}
          </Text>
        </TouchableOpacity>

        {/* 🔥 WAVEFORM */}
        <Waveform progress={progress} />

        <Slider
          minimumValue={0}
          maximumValue={1}
          value={progress}
          onValueChange={(v)=>{
            setProgress(v);
            setStartTime(v * 30);
          }}
        />

        <Text style={styles.label}>Music Volume</Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={musicVolume}
          onValueChange={setMusicVolume}
        />

        <Text style={styles.label}>Video Volume</Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={videoVolume}
          onValueChange={setVideoVolume}
        />

        <TouchableOpacity onPress={saveAndGoBack}>
          <Text style={styles.btn}>
            {loading ? "Processing..." : "Use This"}
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  panel:{
    position:"absolute",
    bottom:0,
    width:"100%",
    padding:15,
    backgroundColor:"rgba(0,0,0,0.7)"
  },
  btn:{
    color:"#fff",
    fontSize:16,
    marginBottom:10
  },
  label:{
    color:"#fff",
    marginTop:10
  }
});