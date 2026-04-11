import * as ImagePicker from "expo-image-picker";

const UPLOAD_URL = "https://nasara-upload-server.onrender.com/upload";

export const uploadMedia = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];

  const formData = new FormData();

  formData.append("file", {
    uri: asset.uri,
    name: asset.fileName || "upload.jpg",
    type: asset.mimeType || "image/jpeg",
  } as any);

  try {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    console.log("UPLOAD RESPONSE:", data);

    // ⚠️ IMPORTANT: return ONLY URL (not full object)
    if (!data.success || !data.url) {
      console.log("UPLOAD FAILED:", data);
      return null;
    }

    return data.url;
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    return null;
  }
};