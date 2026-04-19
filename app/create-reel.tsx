import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { uploadVideo } from "../lib/uploadVideo";

const { height, width } = Dimensions.get("window");

export default function CreateReel() {
  const router = useRouter();

  const [video, setVideo] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordTime, setRecordTime] = useState(0);

  const [progress, setProgress] = useState(0);

  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  const chunks = useRef<any[]>([]);
  const timerRef = useRef<any>(null);

  const player = useVideoPlayer(video?.uri || null);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  /* ================= CAMERA ================= */
  const startCamera = async (mode = facing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t: any) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      });

      streamRef.current = stream;
      setCameraOn(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

    } catch {
      Alert.alert("Camera Error", "Allow camera permission");
    }
  };

  const flipCamera = () => {
    const newFacing = facing === "user" ? "environment" : "user";
    setFacing(newFacing);
    startCamera(newFacing);
  };

  /* ================= RECORD ================= */
  const startRecord = async () => {
    const isMobileWeb =
      Platform.OS === "web" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobileWeb) {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        quality: 1,
      });

      if (!res.canceled) {
        setVideo(res.assets[0]);
      }
      return;
    }

    if (!cameraOn || !streamRef.current) {
      Alert.alert("Start camera first");
      return;
    }

    let time = 3;
    setCountdown(time);

    const interval = setInterval(() => {
      time--;
      if (time === 0) {
        clearInterval(interval);
        setCountdown(null);
        beginRecording();
      } else {
        setCountdown(time);
      }
    }, 1000);
  };

  const beginRecording = () => {
    const recorder = new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;
    chunks.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "video/webm" });
      const file = new File([blob], "reel.webm", { type: "video/webm" });

      const url = URL.createObjectURL(file);

      setVideo({ uri: url, file });
      setRecording(false);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecord = () => {
    recorderRef.current?.stop();
  };

  /* ================= MOBILE RECORD ================= */
  const recordMobile = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 0.8,
    });

    if (!res.canceled) {
      setVideo(res.assets[0]);
    }
  };

  /* ================= PICK VIDEO ================= */
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });

    if (!res.canceled) {
      setVideo(res.assets[0]);
    }
  };

  /* ================= THUMBNAIL ================= */
  const generateThumbnail = async () => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: 1000,
      });
      return uri;
    } catch {
      return null;
    }
  };

  /* ================= POST (FULL FIX) ================= */
  const postReel = async () => {
    if (!video) return;

    setLoading(true);
    setProgress(0);

    const { data, error } = await supabase.auth.getUser();

if (error || !data?.user?.id) {
  Alert.alert("Login required");
  setLoading(false);
  return;
}

const userId = data.user.id;

    const thumbnail = await generateThumbnail();

    // 1. CREATE POST FIRST (NO MEDIA YET)
    const { data: newPost } = await (supabase as any)
      .from("posts")
      .insert({
        user_id: userId,
        caption,
        status: "uploading",
        views: 0,
      })
      .select()
      .single();

    // 2. GO TO REELS IMMEDIATELY
    router.replace("/reels");

    // 3. UPLOAD IN BACKGROUND WITH PROGRESS
    const result = await uploadVideo(video.uri, (p) => {
      setProgress(p);
    });

    // 4. UPDATE TO READY
    await (supabase as any)
      .from("posts")
      .update({
        media_url: result.video,
        thumbnail_url: result.thumbnail || thumbnail,
        status: "ready",
      })
      .eq("id", newPost.id);

    setLoading(false);
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>

      {/* CAMERA (WEB) */}
      {Platform.OS === "web" && cameraOn && (
        <View style={styles.cameraWrap}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={styles.fullVideo}
          />

          {recording && (
            <Text style={styles.timer}>⏱ {recordTime}s</Text>
          )}

          {countdown !== null && (
            <Text style={styles.countdown}>{countdown}</Text>
          )}

          <TouchableOpacity onPress={flipCamera} style={styles.flip}>
            <Text style={{ color: "white" }}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={recording ? stopRecord : startRecord}
            style={styles.recordBtn}
          />
        </View>
      )}

      {!cameraOn && Platform.OS === "web" && (
        <TouchableOpacity onPress={() => startCamera()} style={styles.btn}>
          <Text style={styles.txt}>Start Camera</Text>
        </TouchableOpacity>
      )}

      {/* MOBILE RECORD */}
      {Platform.OS !== "web" && (
        <TouchableOpacity onPress={recordMobile} style={styles.btn}>
          <Text style={styles.txt}>Record Video</Text>
        </TouchableOpacity>
        
      )}
      <TouchableOpacity
  onPress={() => router.replace("/browse")}
  style={{
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
  }}
>
  <Text style={{ color: "white", fontSize: 14 }}>⬅ Home</Text>
</TouchableOpacity>
      {/* PICK */}
      <TouchableOpacity onPress={pickVideo} style={styles.btn}>
        <Text style={styles.txt}>Pick Video</Text>
      </TouchableOpacity>

      {/* EDIT */}
      {video && (
        <>
          <VideoView player={player} style={styles.preview} />

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Caption"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          {/* PROGRESS */}
          {loading && (
            <Text style={{ color: "white" }}>
              Uploading {progress}%
            </Text>
          )}

          <TouchableOpacity onPress={postReel} style={styles.post}>
            <Text style={styles.txt}>Post Reel</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && <ActivityIndicator color="white" />}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  cameraWrap: { width, height },
  fullVideo: { width: "100%", height: "100%" },

  timer: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    color: "red",
  },

  countdown: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    fontSize: 60,
    color: "white",
  },

  flip: {
    position: "absolute",
    top: 80,
    right: 20,
  },

  recordBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "red",
  },

  btn: {
    backgroundColor: "#222",
    padding: 15,
    margin: 10,
    alignItems: "center",
  },

  txt: { color: "white" },

  preview: { width, height: 300 },

  input: {
    color: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    margin: 10,
  },

  post: {
    backgroundColor: "green",
    padding: 15,
    margin: 20,
    alignItems: "center",
  },
});