import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { uploadVideo } from "../lib/uploadVideo";

export default function CreateReel() {
  const router = useRouter();

  const [video, setVideo] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);

  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  const chunks = useRef<any[]>([]);

  const pulse = useRef(new Animated.Value(1)).current;

  /* ================= PICK VIDEO ================= */
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
    });

    if (!res.canceled) {
      const file = res.assets[0];
      setVideo(file);
    }
  };

  /* ================= MOBILE CAMERA RECORD ================= */
  const recordMobile = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });

    if (!res.canceled) {
      setVideo(res.assets[0]);
    }
  };

  /* ================= WEB CAMERA ================= */
  const startCamera = async () => {
    if (Platform.OS !== "web") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setCameraOn(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (e) {
      console.log("Camera error:", e);
    }
  };

  const startRecord = () => {
    if (Platform.OS !== "web") return;

    const stream = streamRef.current;
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunks.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "video/webm" });
      const file = new File([blob], "reel.webm");

      setVideo(file);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(file);
      }
    };

    recorder.start();
    setRecording(true);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopRecord = () => {
    recorderRef.current?.stop();
    setRecording(false);
    pulse.stopAnimation();
    pulse.setValue(1);
  };

  /* ================= POST ================= */
  const postReel = async () => {
  if (!video) {
    Alert.alert("Select video first");
    return;
  }

  setLoading(true);

  try {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      Alert.alert("Login required");
      return;
    }

    let preview = null;

    if (Platform.OS === "web") {
      if (video instanceof File || video instanceof Blob) {
        preview = URL.createObjectURL(video);
      } else if (video?.uri) {
        preview = video.uri;
      }
    } else {
      preview = video?.uri ?? null;
    }

   const { data: newPost, error } = await (supabase as any)
  .from("posts")
  .insert({
    user_id: data.user.id,
    caption,
    media_url: null,
    local_uri: preview,
    thumbnail_url: null,
    views: 0, // ✅ IMPORTANT
    status: "uploading",
  })
  .select()
  .single();

if (error) {
  console.log("insert error:", error);
  return;
}
console.log("NEW POST:", newPost);
    router.replace("/reels");

    const result = await uploadVideo(video);

    await (supabase as any)
      .from("posts")
      .update({
        media_url: result.video,
        thumbnail_url: result.thumbnail,
        local_uri: null,
        status: "ready",
      })
      .eq("id", newPost.id);

  } catch (err: any) {
    console.log(err);
    Alert.alert("Upload failed", err.message);
  }

  setLoading(false);
};
  /* ================= UI ================= */
  return (
    <View style={styles.container}>

      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={styles.backBtn}
      >
        <Text style={{ color: "white" }}>⬅ Home</Text>
      </TouchableOpacity>

      {/* WEB CAMERA */}
      {Platform.OS === "web" && cameraOn && (
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          muted
          playsInline
        />
      )}

      {/* OPEN CAMERA */}
      {!cameraOn && (
        <TouchableOpacity onPress={startCamera} style={styles.startBtn}>
          <Text style={{ color: "white" }}>🎥 Open Camera</Text>
        </TouchableOpacity>
      )}

      {/* RECORD BUTTON (WEB ONLY) */}
      {Platform.OS === "web" && cameraOn && (
        <Animated.View style={[styles.recordWrap, { transform: [{ scale: pulse }] }]}>
          <TouchableOpacity
            onPressIn={startRecord}
            onPressOut={stopRecord}
            style={styles.recordBtn}
          />
        </Animated.View>
      )}

      {/* MOBILE CONTROLS */}
     <View style={{ marginTop: 20 }}>
  
  {/* RECORD BUTTON (ALL PLATFORMS) */}
  <TouchableOpacity
    onPress={Platform.OS === "web" ? startCamera : recordMobile}
    style={styles.btn}
  >
    <Text style={{ color: "white" }}>
      🎥 {Platform.OS === "web" ? "Open & Record Camera" : "Record Video"}
    </Text>
  </TouchableOpacity>

  {/* PICK VIDEO (ALL PLATFORMS) */}
  <TouchableOpacity onPress={pickVideo} style={styles.btn}>
    <Text style={{ color: "white" }}>📁 Pick Video</Text>
  </TouchableOpacity>

</View>

      {/* CAPTION */}
      <TextInput
        placeholder="Caption..."
        placeholderTextColor="#aaa"
        value={caption}
        onChangeText={setCaption}
        style={styles.input}
      />

      {/* POST */}
      <TouchableOpacity onPress={postReel} style={styles.postBtn}>
        <Text style={{ color: "white" }}>🚀 Post Reel</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color="white" />}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    padding: 20,
  },

  video: {
    width: "100%",
    height: 300,
    backgroundColor: "black",
  },

  startBtn: {
    padding: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    marginTop: 20,
  },

  recordWrap: {
    alignSelf: "center",
    marginTop: 20,
  },

  recordBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "red",
  },

  input: {
    backgroundColor: "#111",
    color: "white",
    padding: 12,
    marginTop: 20,
    borderRadius: 10,
  },

  postBtn: {
    backgroundColor: "#00c853",
    padding: 14,
    marginTop: 15,
    alignItems: "center",
    borderRadius: 10,
  },

  btn: {
    backgroundColor: "#333",
    padding: 12,
    marginTop: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 8,
  },
});