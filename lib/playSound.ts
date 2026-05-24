import {
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

import { Platform } from "react-native";

/* ================= ONLY EXISTING FILES ================= */
const sounds = {
  post: require(
    "../assets/sounds/post.mp3"
  ),

  message: require(
    "../assets/sounds/message.mp3"
  ),

  like: require(
    "../assets/sounds/like.mp3"
  ),
};

/* ================= CONFIG FLAG ================= */
let configured = false;

/* ================= AUDIO CONFIG ================= */
async function configureAudio() {
  if (configured) return;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
  });

  configured = true;
}

/* ================= MAIN FUNCTION ================= */
export async function playSound(
  type:
    | "post"
    | "message"
    | "like"
) {
  try {
    /* ================= WEB ================= */
    if (Platform.OS === "web") {
      const file =
        type === "post"
          ? "/sounds/post.mp3"
          : type === "message"
          ? "/sounds/message.mp3"
          : "/sounds/like.mp3";

      const audio =
        new window.Audio(file);

      audio.volume = 1;

      await audio.play();

      return;
    }

    /* ================= MOBILE ================= */
    await configureAudio();

    const player =
      createAudioPlayer(
        sounds[type]
      );

    player.play();

    /* auto cleanup */
    setTimeout(() => {
      try {
        player.remove();
      } catch {}
    }, 3000);
  } catch (err) {
    console.log(
      "Sound error:",
      err
    );
  }
}