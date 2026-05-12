import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/* ===================================================== */
/* ✅ GET PUSH TOKEN */
/* ===================================================== */
export async function registerForPushNotificationsAsync() {
  let token = null;

  /* ===================================================== */
  /* ✅ DISABLE WEB PUSH NOTIFICATIONS */
  /* ===================================================== */
  if (Platform.OS === "web") {
    console.log("Web push notifications disabled");
    return null;
  }

  /* ===================================================== */
  /* ✅ ONLY PHYSICAL DEVICES */
  /* ===================================================== */
  if (!Device.isDevice) {
    alert("Must use physical device");
    return null;
  }

  /* ===================================================== */
  /* ✅ REQUEST PERMISSIONS */
  /* ===================================================== */
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push token");
    return null;
  }

  /* ===================================================== */
  /* ✅ GET EXPO PUSH TOKEN */
  /* ===================================================== */
  token = (
    await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.expoConfig?.extra?.eas?.projectId,
    })
  ).data;

  console.log("Expo Push Token:", token);

  /* ===================================================== */
  /* ✅ ANDROID NOTIFICATION CHANNEL */
  /* ===================================================== */
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "default",
      {
        name: "default",
        importance:
          Notifications.AndroidImportance.MAX,

        vibrationPattern: [0, 250, 250, 250],

        lightColor: "#FF231F7C",
      }
    );
  }

  return token;
}

/* ===================================================== */
/* ✅ SEND PUSH */
/* ===================================================== */
export async function sendPushNotification({
  token,
  title,
  body,
  data = {},
}: {
  token: string;
  title: string;
  body: string;
  data?: any;
}) {
  try {
    const message = {
      to: token,
      sound: "default",
      title,
      body,
      data,
    };

    const response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",

        headers: {
          Accept: "application/json",

          "Accept-encoding":
            "gzip, deflate",

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(message),
      }
    );

    const result = await response.json();

    console.log("Push sent:", result);

    return result;
  } catch (err) {
    console.log("Push send error:", err);

    return null;
  }
}