import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

export default function PaystackScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();

  if (!url) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: url }}
      onNavigationStateChange={(nav) => {
        if (nav.url.includes("success")) {
          router.back();
        }
      }}
    />
  );
}