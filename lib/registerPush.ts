import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export async function registerPush(userId: string) {
  try {
    // ❌ STOP WEB ERROR HERE
    if (Platform.OS === "web") {
      console.log("Push not supported on web");
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== "granted") {
      console.log("Permission not granted");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (!token) return;

    // ✅ SAVE TOKEN
    await (supabase as any)
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);

  } catch (err) {
    console.log("Push error:", err);
  }
}