import { Text, View } from "react-native";

export default function PendingVerification() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Verification Pending
      </Text>

      <Text style={{ marginTop: 10, textAlign: "center" }}>
        Your ID has been submitted successfully.
        Please wait for admin approval before accessing the app.
      </Text>
    </View>
  );
}