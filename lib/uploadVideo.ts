import { Platform } from "react-native";

const BASE_URL = "https://nasara-upload-server.onrender.com";
const MAX_SIZE_MB = 20;

/* ================= PRELOAD HELPER ================= */
const preloadVideo = (url: string) => {
  if (Platform.OS !== "web") return;

  try {
    const video = document.createElement("video");
    video.src = url;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.load(); // ✅ important
  } catch (e) {
    console.log("preload failed:", e);
  }
};

/* ================= MAIN UPLOAD ================= */
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
      // ✅ FORCE MP4
      file = new File([fileOrUri], `video_${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    } 
    else if (fileOrUri?.uri) {
      const response = await fetch(fileOrUri.uri);
      const blob = await response.blob();

      file = new File([blob], `video_${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    } 
    else {
      throw new Error("Invalid file input");
    }

    /* ===== SIZE CHECK ===== */
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
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
      throw new Error("Invalid file input");
    }

    formData.append("file", {
      uri,
      type: "video/mp4", // ✅ force mp4
      name: `video_${Date.now()}.mp4`,
    } as any);
  }

  /* ================= UPLOAD ================= */
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload request failed");
  }

  const data = await res.json();

  if (!data?.success || !data?.url) {
    throw new Error("Upload failed");
  }

  const videoUrl = data.url;

  /* ================= PRELOAD ================= */
  preloadVideo(videoUrl);

  return {
    video: videoUrl,
    thumbnail: videoUrl + "#t=1", // ⚠️ optional, backend thumbnail is better
    public_id: null,
  };
};