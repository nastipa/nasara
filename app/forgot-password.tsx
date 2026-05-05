import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const sendCode = async () => {
  if (!email) {
    Alert.alert("Error", "Enter your email");
    return;
  }

  if (timer > 0) return;

  setLoading(true);

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );

  setLoading(false);

  if (error) {
    Alert.alert("Error", error.message);
    return;
  }

  setTimer(60);

  Alert.alert(
    "Code sent",
    "Check your email for reset code"
  );

  router.push({
    pathname: "/reset-password",
    params: { email },
  });
};

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, marginBottom: 15 }}>
        Forgot Password
      </Text>

      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          marginBottom: 15,
          padding: 12,
          borderRadius: 6,
        }}
      />

      <TouchableOpacity
        onPress={sendCode}
        disabled={loading || timer > 0}
        style={{
          backgroundColor: "#2563eb",
          padding: 15,
          borderRadius: 6,
          opacity: loading || timer > 0 ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          {timer > 0 ? `Resend in ${timer}s` : "Send Code"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}