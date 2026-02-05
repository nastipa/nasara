import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function PaymentSuccess() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>
        ✅ Payment Successful
      </Text>

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/browse")}
        style={{ marginTop: 20 }}
      >
        <Text style={{ color: "#2563eb" }}>Back Home</Text>
      </TouchableOpacity>
    </View>
  );
}