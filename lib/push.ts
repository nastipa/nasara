import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}