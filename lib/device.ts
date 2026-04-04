import * as Application from "expo-application";
import { Platform } from "react-native";

export const getDeviceId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "android") {
      return await Application.getAndroidId();
    }

    if (Platform.OS === "ios") {
      return await Application.getIosIdForVendorAsync();
    }

    return null;
  } catch (error) {
    console.log("Device ID Error:", error);
    return null;
  }
};