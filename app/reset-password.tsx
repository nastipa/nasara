import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= HANDLE DEEP LINK ================= */
 useEffect(() => {
  const handleDeepLink = async () => {
    const url = await Linking.getInitialURL();

    if (!url) return;

    console.log("RESET URL:", url);

    // 👇 HANDLE HASH (#) PARAMS
    const hash = url.split("#")[1];

    if (!hash) {
      Alert.alert("Invalid or expired link");
      return;
    }

    const params = Object.fromEntries(
      hash.split("&").map((param) => {
        const [key, value] = param.split("=");
        return [key, value];
      })
    );

    const access_token = params.access_token;
    const refresh_token = params.refresh_token;

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        Alert.alert("Session Error", error.message);
      }
    } else {
      Alert.alert("Invalid reset link");
    }
  };

  handleDeepLink();
}, []);
  /* ================= RESET PASSWORD ================= */
  const handleReset = async () => {
    if (!password || !confirm) {
      Alert.alert("Enter all fields");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Password updated! You can login now.");
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Reset Password
      </Text>

      <TextInput
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          padding: 12,
          marginBottom: 10,
          borderRadius: 10,
        }}
      />

      <TextInput
        placeholder="Confirm password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={{
          borderWidth: 1,
          padding: 12,
          marginBottom: 20,
          borderRadius: 10,
        }}
      />

      <TouchableOpacity
        onPress={handleReset}
        style={{
          backgroundColor: "green",
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {loading ? "Updating..." : "Update Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}