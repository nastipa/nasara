import { Redirect } from "expo-router";

export default function Index() {
  // 🔥 GO DIRECTLY TO BROWSE (REAL HOME)
  return <Redirect href="/(tabs)/browse" />;
}