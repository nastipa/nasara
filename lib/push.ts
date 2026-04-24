import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotifications() {
  // ✅ STOP WEB CRASH HERE
  if (Platform.OS === "web") {
    return null;
  }

  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== "granted") {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  return token;
}