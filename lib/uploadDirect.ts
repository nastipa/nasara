import { Platform } from "react-native";

const API = "https://nasara-upload-server.onrender.com/get-upload-url";

/* ================= RETRY ================= */
const retry = async (fn: any, retries = 2) => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    return retry(fn, retries - 1);
  }
};

/* ================= UPLOAD ================= */
export const uploadDirect = async (
  uri: string,
  type: "image" | "video",
  onProgress?: (p: number) => void
): Promise<string> => {
  return retry(async () => {
    // 1️⃣ GET SIGNED URL
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
    });

    const { uploadUrl, fileUrl } = await res.json();

    if (!uploadUrl) throw new Error("No upload URL");

    // 2️⃣ FIX URI
    let fileUri = uri;

    if (Platform.OS === "android") {
      if (!uri.startsWith("file://")) {
        fileUri = "file://" + uri;
      }
    } else {
      fileUri = uri.replace("file://", "");
    }

    // 3️⃣ UPLOAD
    const xhr = new XMLHttpRequest();

    return new Promise<string>((resolve, reject) => {
      xhr.open("PUT", uploadUrl);

      xhr.setRequestHeader(
        "Content-Type",
        type === "video" ? "video/mp4" : "image/jpeg"
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(fileUrl);
        } else {
          reject("Upload failed");
        }
      };

      xhr.onerror = () => reject("Network error");

      xhr.send({
        uri: fileUri,
        type: type === "video" ? "video/mp4" : "image/jpeg",
        name: type === "video" ? "video.mp4" : "image.jpg",
      } as any);
    });
  });
};