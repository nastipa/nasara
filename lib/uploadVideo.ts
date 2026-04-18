import { Platform } from "react-native";

const API_URL = "https://nasara-six.vercel.app/api/r2-sign";

export const uploadVideo = async (
  fileOrUri: any,
  onProgress?: (p: number) => void
) => {
  let file: File;

  /* ================= WEB ================= */
  if (Platform.OS === "web") {
    if (fileOrUri instanceof File) {
      file = fileOrUri;
    } else {
      const res = await fetch(fileOrUri.uri);
      const blob = await res.blob();

      file = new File([blob], "video.mp4", {
        type: "video/mp4",
      });
    }
  }

  /* ================= MOBILE ================= */
  else {
    const res = await fetch(fileOrUri.uri);
    const blob = await res.blob();

    file = new File([blob], "video.mp4", {
      type: "video/mp4",
    });
  }

  /* 🔥 STEP 1: GET SIGNED URL */
  const signRes = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const data = await signRes.json();

  if (!data?.signedUrl || !data?.publicUrl) {
    throw new Error("Failed to get upload URL");
  }

  /* 🔥 STEP 2: UPLOAD DIRECTLY TO R2 */
  await fetch(data.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
    },
    body: file,
  });

  /* 🔥 RETURN FINAL URL */
  return {
    video: data.publicUrl,
    thumbnail: data.publicUrl + "#t=1",
  };
};