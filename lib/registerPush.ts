import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import Constants from "expo-constants";

import { Platform } from "react-native";

import { supabase } from "./supabase";

/* ================= NOTIFICATION HANDLER ================= */

Notifications.setNotificationHandler({
  handleNotification: async () => ({

    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,

    // ✅ latest expo required fields
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ================= REGISTER PUSH ================= */

export async function registerPush(
  userId: string
) {

  try {

    /* ================= BLOCK WEB ================= */

    if (Platform.OS === "web") {

      console.log(
        "Push notifications not supported on web"
      );

      return null;
    }

    /* ================= REAL DEVICE ONLY ================= */

    if (!Device.isDevice) {

      console.log(
        "Push notifications require physical device"
      );

      return null;
    }

    /* ================= PERMISSIONS ================= */

    const {
      status: existingStatus,
    } =
      await Notifications.getPermissionsAsync();

    let finalStatus =
      existingStatus;

    if (
      existingStatus !==
      "granted"
    ) {

      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus =
        status;
    }

    if (
      finalStatus !==
      "granted"
    ) {

      console.log(
        "Push permission denied"
      );

      return null;
    }

    /* ================= GET TOKEN ================= */

    const token =
      (
        await Notifications.getExpoPushTokenAsync({

          projectId:
            Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

    console.log(
      "Expo Push Token:",
      token
    );

    if (!token)
      return null;

    /* ================= SAVE TOKEN ================= */

    const {
      error,
    } =
      await (supabase as any)
        .from("profiles")
        .update({

          push_token:
            token,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", userId);

    if (error) {

      console.log(
        "Push token save error:",
        error
      );

      return null;
    }

    /* ================= ANDROID CHANNEL ================= */

    if (
      Platform.OS ===
      "android"
    ) {

      await Notifications.setNotificationChannelAsync(
        "default",
        {

          name: "default",

          importance:
            Notifications.AndroidImportance.MAX,

          vibrationPattern: [
            0,
            250,
            250,
            250,
          ],

          lightColor:
            "#22c55e",
        }
      );
    }

    return token;

  } catch (err) {

    console.log(
      "Register push error:",
      err
    );

    return null;
  }
}