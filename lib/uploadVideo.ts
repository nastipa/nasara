import { Platform } from "react-native";

const API_URL = "https://nasara-upload-server.onrender.com/upload";

export const uploadVideo = async (
  uri: string,
  onProgress?: (p: number) => void
) => {
  return new Promise<{ video: string; thumbnail?: string }>(
    (resolve, reject) => {
      try {
        const formData = new FormData();

        /* ================= WEB ================= */
        if (Platform.OS === "web") {
          fetch(uri)
            .then((res) => res.blob())
            .then((blob) => {
              formData.append("file", blob, "reel.mp4");

              sendRequest(formData, resolve, reject, onProgress);
            })
            .catch(reject);

          return;
        }

        /* ================= ANDROID + IOS FIX ================= */

        let fileUri = uri;

        // 🔥 CRITICAL ANDROID FIX
        if (Platform.OS === "android") {
          if (!uri.startsWith("file://")) {
            fileUri = "file://" + uri;
          }
        } else {
          // iOS cleanup
          fileUri = uri.replace("file://", "");
        }

        formData.append("file", {
          uri: fileUri,
          name: "reel.mp4",
          type: "video/mp4",
        } as any);

        sendRequest(formData, resolve, reject, onProgress);
      } catch (e) {
        reject(e);
      }
    }
  );
};

/* ================= REQUEST HANDLER ================= */
const sendRequest = (
  formData: FormData,
  resolve: any,
  reject: any,
  onProgress?: (p: number) => void
) => {
  const xhr = new XMLHttpRequest();

  xhr.open("POST", API_URL);

  /* ================= PROGRESS ================= */
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable && onProgress) {
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    }
  };

  /* ================= RESPONSE ================= */
  xhr.onload = () => {
    try {
      const text = xhr.responseText;

      // 🔥 DEBUG (VERY IMPORTANT)
      console.log("UPLOAD RESPONSE:", text);

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.log("❌ NOT JSON RESPONSE:", text);
        return reject("Server returned HTML instead of JSON");
      }

      if (!data?.url) {
        return reject("Invalid upload response");
      }

      resolve({
        video: data.url,
        thumbnail: data.thumbnail,
      });
    } catch (e) {
      reject(e);
    }
  };

  xhr.onerror = () => {
    console.log("❌ NETWORK ERROR");
    reject("Upload failed");
  };

  xhr.send(formData);
};