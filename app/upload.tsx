import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Button, Image, StyleSheet, Text, View } from "react-native";

/* ======= CLOUDINARY CONFIG ======= */
const CLOUD_NAME = "ajars";
const UPLOAD_PRESET_IMAGES = "ajars_images";
const UPLOAD_PRESET_VIDEOS = "ajars_videos";

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ================= PICK IMAGE ================= */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.6,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setVideoUri(null);
      setUploadedUrl(null);
    }
  };

  /* ================= PICK VIDEO ================= */
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setImageUri(null);
      setUploadedUrl(null);
    }
  };

  /* ================= UPLOAD TO CLOUDINARY ================= */
  const uploadToCloudinary = async (uri: string, type: "image" | "video") => {
    try {
      setLoading(true);

      const data = new FormData();
      const fileName = uri.split("/").pop();

      data.append("file", {
        uri,
        type: type === "image" ? "image/jpeg" : "video/mp4",
        name: fileName,
      } as any);

      data.append(
        "upload_preset",
        type === "image" ? UPLOAD_PRESET_IMAGES : UPLOAD_PRESET_VIDEOS
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`,
        {
          method: "POST",
          body: data,
        }
      );

      const json = await res.json();
      if (!json.secure_url) throw new Error("Upload failed");

      setUploadedUrl(json.secure_url);
      Alert.alert("Upload Success", "File uploaded to Cloudinary!");
    } catch (err) {
      console.log("Cloudinary upload error:", err);
      Alert.alert("Upload Failed", "Check console for details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upload Media</Text>

      <Button title="Pick Image" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

      <Button title="Pick Video" onPress={pickVideo} />
      {videoUri && <Text style={{ marginTop: 10, color: "green" }}>Video selected</Text>}

      {(imageUri || videoUri) && (
        <Button
          title={loading ? "Uploading..." : "Upload to Cloudinary"}
          onPress={() =>
            uploadToCloudinary(imageUri || videoUri!, imageUri ? "image" : "video")
          }
          disabled={loading}
        />
      )}

      {uploadedUrl && (
        <>
          <Text style={{ marginTop: 20, fontWeight: "bold" }}>Uploaded URL:</Text>
          <Text selectable style={{ color: "blue" }}>
            {uploadedUrl}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  preview: { width: "100%", height: 200, marginVertical: 10, borderRadius: 12 },
});