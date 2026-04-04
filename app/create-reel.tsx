import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
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

  const videoRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const chunks = useRef<any[]>([]);

  const [video, setVideo] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= WEB RECORD ================= */
  const startWebRecording = async () => {
    if (Platform.OS !== "web") return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 800000, // 🔥 compress
    });

    mediaRecorderRef.current = recorder;
    chunks.current = [];

    recorder.ondataavailable = (e: any) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "video/webm" });

      // 🔥 SIZE CHECK
      if (blob.size > 100 * 1024 * 1024) {
        alert("Video too large! Max 100MB");
        return;
      }

      const file = new File([blob], "record.webm");

      setVideo(file);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(file);
      }
    };

    recorder.start();
    setRecording(true);
  };

  const stopWebRecording = () => {
    if (Platform.OS !== "web") return;

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        ?.getTracks()
        ?.forEach((t: any) => t.stop());
    }

    setRecording(false);
  };

  /* ================= MOBILE RECORD ================= */
  const recordMobile = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.5, // 🔥 compress
      videoMaxDuration: 60, // 🔥 limit
    });

    if (!res.canceled) {
      const file = res.assets[0];

      if (file.fileSize && file.fileSize > 100 * 1024 * 1024) {
        alert("Video too large! Max 100MB");
        return;
      }

      setVideo(file);
    }
  };

  /* ================= PICK ================= */
  const pickVideo = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";

      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) {
          alert("Video too large! Max 100MB");
          return;
        }

        setVideo(file);

        if (videoRef.current) {
          videoRef.current.src = URL.createObjectURL(file);
        }
      };

      input.click();
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.5, // 🔥 ADD
        videoMaxDuration: 60, // 🔥 ADD
      });

      if (!res.canceled) {
        const file = res.assets[0];

        if (file.fileSize && file.fileSize > 100 * 1024 * 1024) {
          alert("Video too large! Max 100MB");
          return;
        }

        setVideo(file);
      }
    }
  };

  /* ================= POST ================= */
  const postReel = async () => {
    if (!video) {
      alert("Please select a video");
      return;
    }

    setLoading(true);

    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      setLoading(false);
      return;
    }

    // 🔥 FINAL SIZE CHECK
    if (Platform.OS === "web" && video.size > 100 * 1024 * 1024) {
      alert("Video too large!");
      setLoading(false);
      return;
    }

    if (
      Platform.OS !== "web" &&
      video.fileSize &&
      video.fileSize > 100 * 1024 * 1024
    ) {
      alert("Video too large!");
      setLoading(false);
      return;
    }

    const preview =
      Platform.OS === "web"
        ? URL.createObjectURL(video)
        : video.uri;

    try {
      // ✅ INSERT FIRST (FAST UI)
      const { data: newPost, error } = await (supabase as any)
        .from("posts")
        .insert({
          user_id: data.user.id,
          caption,
          media_url: null,
          local_uri: preview,
        })
        .select()
        .single();

      if (error || !newPost) {
        console.log("insert error", error);
        setLoading(false);
        return;
      }

      // 🚀 INSTANT NAVIGATION
      router.replace("/reels");

      // 🔥 BACKGROUND UPLOAD
      const result = await uploadVideo(video);

      await (supabase as any)
        .from("posts")
        .update({
          media_url: result.video,
          thumbnail_url: result.thumbnail,
          public_id: result.public_id,
          local_uri: null,
        })
        .eq("id", newPost.id);

    } catch (e) {
      console.log("UPLOAD ERROR:", e);
    }

    setLoading(false);
  };

  /* ================= UI ================= */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.box}>
        
        {Platform.OS === "web" && (
          <video
            ref={videoRef}
            style={{ height: 200 }}
            autoPlay
            muted
            controls
          />
        )}

        {Platform.OS === "web" ? (
          recording ? (
            <TouchableOpacity onPress={stopWebRecording}>
              <Text style={styles.btn}>⏹ Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startWebRecording}>
              <Text style={styles.btn}>🎥 Record</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity onPress={recordMobile}>
            <Text style={styles.btn}>🎥 Record</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={pickVideo}>
          <Text style={styles.btn}>📁 Pick Video</Text>
        </TouchableOpacity>

        <TextInput
          placeholder="Caption..."
          value={caption}
          onChangeText={setCaption}
          style={styles.input}
        />

        <TouchableOpacity onPress={postReel}>
          <Text style={styles.btn}>🚀 Post</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/browse")}>
          <Text style={styles.back}>⬅ Back Home</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator />}
      </View>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "85%",
    gap: 10,
  },
  input: {
    borderWidth: 1,
    padding: 10,
  },
  btn: {
    backgroundColor: "#000",
    color: "#fff",
    padding: 12,
    textAlign: "center",
  },
  back: {
    color: "blue",
    marginTop: 10,
    textAlign: "center",
  },
});