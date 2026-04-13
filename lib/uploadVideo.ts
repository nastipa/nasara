import { Platform } from "react-native";

const BASE_URL = "https://nasara-upload-server.onrender.com";
const MAX_SIZE_MB = 20;

/* ================= STEP 4: PRELOAD HELPER ================= */
const preloadVideo = (url: string) => {
  if (Platform.OS !== "web") return;

  try {
    const video = document.createElement("video");
    video.src = url;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
  } catch (e) {
    console.log("preload failed:", e);
  }
};

export const uploadVideo = async (
  fileOrUri: any,
  onProgress?: (p: number) => void
) => {
  const formData = new FormData();

  /* ================= HANDLE WEB ================= */
  if (Platform.OS === "web") {
    let file: File;

    if (fileOrUri instanceof File) {
      file = fileOrUri;
    } 
    else if (fileOrUri instanceof Blob) {
      file = new File([fileOrUri], "video.webm", { type: "video/webm" });
    } 
    else if (fileOrUri?.uri) {
      const response = await fetch(fileOrUri.uri);
      const blob = await response.blob();
      file = new File([blob], "video.mp4", { type: blob.type });
    } 
    else {
      throw new Error("Invalid file");
    }

    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
      throw new Error("Max 20MB allowed");
    }

    formData.append("file", file);
  }

  /* ================= HANDLE MOBILE ================= */
  else {
    let uri = "";

    if (typeof fileOrUri === "string") {
      uri = fileOrUri;
    } 
    else if (fileOrUri?.uri) {
      uri = fileOrUri.uri;
    }

    if (!uri) {
      throw new Error("Invalid file");
    }

    formData.append("file", {
      uri,
      type: "video/mp4",
      name: `video_${Date.now()}.mp4`,
    } as any);
  }

  /* ================= UPLOAD ================= */
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!data.success || !data.url) {
    throw new Error("Upload failed");
  }

  const videoUrl = data.url;

  /* ================= STEP 4 APPLY PRELOAD ================= */
  preloadVideo(videoUrl);

  return {
    video: videoUrl,
    thumbnail: videoUrl + "#t=1",
    public_id: null,
  };
};