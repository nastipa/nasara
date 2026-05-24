import {
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

import { Platform } from "react-native";

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

  send: require(
    "../assets/sounds/message.mp3"
  ),
};

let configured = false;

async function configureAudio() {
  if (configured) return;

  await setAudioModeAsync({
    playsInSilentMode: true,

    shouldPlayInBackground: false,
  });

  configured = true;
}

export async function playSound(
  type:
    | "post"
    | "message"
    | "send"
    | "like"
    | "battle"
    | "reel"
    | "auction"
    | "live"
) {
  try {
    let soundType:
      | "post"
      | "message"
      | "send"
      | "like" = "post";

    if (type === "message") {
      soundType = "message";
    }

    if (type === "send") {
      soundType = "send";
    }

    if (type === "like") {
      soundType = "like";
    }

    if (Platform.OS === "web") {
      const audio =
        new window.Audio(
          `/sounds/${soundType}.mp3`
        );

      audio.volume = 1;

      await audio.play();

      return;
    }

    await configureAudio();

    const player =
      createAudioPlayer(
        sounds[soundType]
      );

    player.play();

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