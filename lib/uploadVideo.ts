import { Platform } from "react-native";

const API_URL = "https://nasara-upload-server.onrender.com/upload";

export const uploadVideo = async (uri: string, onProgress?: (p: number) => void) => {
  return new Promise<{ video: string; thumbnail?: string }>((resolve, reject) => {
    try {
      const formData = new FormData();

      if (Platform.OS === "web") {
        fetch(uri)
          .then((res) => res.blob())
          .then((blob) => {
            formData.append("file", blob, "reel.mp4");

            sendRequest(formData, resolve, reject, onProgress);
          });
      } else {
        formData.append("file", {
          uri,
          name: "reel.mp4",
          type: "video/mp4",
        } as any);

        sendRequest(formData, resolve, reject, onProgress);
      }
    } catch (e) {
      reject(e);
    }
  });
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

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable && onProgress) {
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    }
  };

  xhr.onload = () => {
    try {
      const data = JSON.parse(xhr.responseText);

      if (!data?.success) throw new Error("Upload failed");

      resolve({
        video: data.url,
        thumbnail: data.thumbnail,
      });
    } catch (e) {
      reject(e);
    }
  };

  xhr.onerror = () => reject("Upload failed");

  xhr.send(formData);
};