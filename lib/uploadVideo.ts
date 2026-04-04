import { Platform } from "react-native";
import { supabase } from "./supabase";

const CLOUD_NAME = "ajars";
const UPLOAD_PRESET = "ajars_videos";
const MAX_SIZE_MB = 20;
const MAX_USER_VIDEOS = 20;

let cleaning = false; // prevent multiple cleanup calls

type Post = {
  id: string;
  public_id?: string;
  created_at: string;
};

export const uploadVideo = async (
  fileOrUri: any,
  onProgress?: (p: number) => void
) => {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

  const formData = new FormData();

  /* WEB */
  if (Platform.OS === "web") {
    if (!(fileOrUri instanceof File)) throw new Error("Invalid file");

    if (fileOrUri.size / (1024 * 1024) > MAX_SIZE_MB) {
      throw new Error("Max 20MB allowed");
    }

    formData.append("file", fileOrUri);
  } else {
    const uri = fileOrUri?.uri;

    if (!uri) throw new Error("Invalid file");

    formData.append("file", {
      uri,
      type: "video/mp4",
      name: `upload_${Date.now()}.mp4`,
    } as any);
  }

  formData.append("upload_preset", UPLOAD_PRESET);

  // ✅ Ensure correct resource type
  formData.append("resource_type", "video");

  /* UPLOAD */
  const result: any = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);

        if (!data.secure_url) {
          reject(new Error("Upload failed"));
          return;
        }

        resolve(data);
      } catch {
        reject(new Error("Invalid response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));

    xhr.send(formData);
  });

  /* ✅ OPTIMIZED VIDEO (MAJOR BANDWIDTH SAVER) */
  const video = result.secure_url.replace(
    "/upload/",
    "/upload/q_auto:low,f_auto,w_480,vc_auto/"
  );

  /* ✅ OPTIMIZED THUMBNAIL */
  const thumbnail = result.secure_url.replace(
    "/upload/",
    "/upload/so_1,f_auto,q_auto,w_400/"
  );

  // cleanup old videos safely
  safeCleanOldVideos();

  return {
    video,
    thumbnail,
    public_id: result.public_id,
  };
};

/* SAFE CLEANUP */
const safeCleanOldVideos = async () => {
  if (cleaning) return;
  cleaning = true;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await (supabase as any)
      .from("posts")
      .select("id, public_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!data || data.length <= MAX_USER_VIDEOS) return;

    const remove = data.slice(0, data.length - MAX_USER_VIDEOS);

    for (const p of remove) {
      await supabase.from("posts").delete().eq("id", p.id);
    }
  } catch (e) {
    console.log("Cleanup error", e);
  }

  cleaning = false;
};