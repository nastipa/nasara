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
  const [editing, setEditing] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordTime, setRecordTime] = useState(0);

  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  const chunks = useRef<any[]>([]);
  const timerRef = useRef<any>(null);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);

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

  /* ================= CAMERA (DESKTOP WEB ONLY) ================= */
  const startCamera = async (mode = facing) => {
    if (Platform.OS !== "web") return;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t: any) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      });

      streamRef.current = stream;
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      Alert.alert("Camera Error", "Allow camera permission");
    }
  };

  const flipCamera = () => {
    const newFacing = facing === "user" ? "environment" : "user";
    setFacing(newFacing);
    startCamera(newFacing);
  };

  /* ================= RECORD (FIXED FOR WEB + MOBILE WEB) ================= */
  const startRecord = async () => {
    const isMobileWeb =
      Platform.OS === "web" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    /* 📱 MOBILE WEB → NATIVE CAMERA (NO CORRUPTION FIX) */
    if (isMobileWeb) {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        quality: 1,
      });

      if (!res.canceled) {
        setVideo(res.assets[0]);
        setEditing(true);
      }
      return;
    }

    /* 💻 DESKTOP WEB → WEBCAM RECORDING */
    if (Platform.OS === "web") {
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
    }
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
      setEditing(true);
      setRecording(false);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecord = () => {
    recorderRef.current?.stop();
  };

  /* ================= MOBILE APP CAMERA ================= */
  const recordMobile = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 0.8,
    });

    if (!res.canceled) {
      setVideo(res.assets[0]);
      setEditing(true);
    }
  };

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });

    if (!res.canceled) {
      setVideo(res.assets[0]);
      setEditing(true);
    }
  };

  /* ================= TRIM PREVIEW ================= */
  const previewTrim = () => {
    if (!player) return;

    player.currentTime = startTime;
    player.play();

    setTimeout(() => {
      player.pause();
    }, (endTime - startTime) * 1000);
  };

  /* ================= THUMBNAIL ================= */
  const generateThumbnail = async () => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: startTime * 1000,
      });
      return uri;
    } catch {
      return null;
    }
  };

  /* ================= POST ================= */
  const postReel = async () => {
    if (!video) return Alert.alert("Select video first");

    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return Alert.alert("Login required");

      const thumbnail = await generateThumbnail();

      const { data: newPost } = await (supabase as any)
        .from("posts")
        .insert({
          user_id: data.user.id,
          caption,
          local_uri: video.uri,
          thumbnail_url: thumbnail,
          status: "uploading",
          views: 0,
        })
        .select()
        .single();

      router.replace("/reels");

      const result = await uploadVideo(video.file || video);

      await (supabase as any)
        .from("posts")
        .update({
          media_url: result.video,
          thumbnail_url: result.thumbnail || thumbnail,
          local_uri: null,
          status: "ready",
        })
        .eq("id", newPost.id);

    } catch (e: any) {
      Alert.alert("Error", e.message);
    }

    setLoading(false);
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={styles.backBtn}
      >
        <Text style={{ color: "white" }}>⬅ Home</Text>
      </TouchableOpacity>

      {/* CAMERA (DESKTOP WEB ONLY) */}
      {Platform.OS === "web" && cameraOn && !editing && (
        <View style={styles.cameraWrap}>
          <video ref={videoRef} autoPlay muted playsInline style={styles.fullVideo} />

          {recording && (
            <Text style={styles.timerOverlay}>⏱ {recordTime}s</Text>
          )}

          {countdown !== null && (
            <Text style={styles.countdownOverlay}>{countdown}</Text>
          )}

          <TouchableOpacity onPress={flipCamera} style={styles.flipOverlay}>
            <Text style={{ color: "white" }}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={recording ? stopRecord : startRecord}
            style={styles.recordBtn}
          >
            <View style={styles.innerRecord} />
          </TouchableOpacity>
        </View>
      )}

      {/* START CAMERA */}
      {!cameraOn && !editing && (
        <TouchableOpacity onPress={() => startCamera()} style={styles.bigBtn}>
          <Text style={styles.txt}>▶ Start Camera</Text>
        </TouchableOpacity>
      )}

      {/* UPLOAD */}
      {!editing && (
        <TouchableOpacity onPress={pickVideo} style={styles.bigBtn}>
          <Text style={styles.txt}>📁 Upload</Text>
        </TouchableOpacity>
      )}

      {/* EDITING */}
      {editing && video && (
        <>
          <VideoView player={player} style={styles.video} />

          <View style={styles.trimBox}>
            <TextInput
              value={String(startTime)}
              onChangeText={(v) => setStartTime(Number(v))}
              style={styles.input}
            />

            <TextInput
              value={String(endTime)}
              onChangeText={(v) => setEndTime(Number(v))}
              style={styles.input}
            />

            <TouchableOpacity onPress={previewTrim} style={styles.btn}>
              <Text style={styles.txt}>Preview Trim</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Caption..."
            placeholderTextColor="#aaa"
            value={caption}
            onChangeText={setCaption}
            style={styles.input}
          />

          <TouchableOpacity onPress={postReel} style={styles.postBtn}>
            <Text style={styles.txt}>🚀 Post</Text>
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

  cameraWrap: {
    width,
    height,
    position: "relative",
  },

  fullVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  timerOverlay: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    color: "red",
    fontSize: 18,
  },

  countdownOverlay: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    fontSize: 60,
    color: "white",
  },

  flipOverlay: {
    position: "absolute",
    top: 80,
    right: 20,
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 20,
  },

  recordBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
  },

  innerRecord: {
    width: 50,
    height: 50,
    backgroundColor: "white",
    borderRadius: 10,
  },

  video: { width, height: height * 0.45 },

  bigBtn: {
    backgroundColor: "#222",
    padding: 20,
    margin: 20,
    alignItems: "center",
  },

  trimBox: { padding: 15 },

  input: {
    backgroundColor: "#111",
    color: "white",
    padding: 10,
    marginTop: 10,
  },

  btn: {
    backgroundColor: "#333",
    padding: 12,
    marginTop: 10,
    alignItems: "center",
  },

  postBtn: {
    backgroundColor: "#00c853",
    padding: 15,
    margin: 20,
    alignItems: "center",
  },

  txt: { color: "white" },

  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "#222",
    padding: 10,
  },
});