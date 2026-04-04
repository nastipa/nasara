import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
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
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= HANDLE DEEP LINK ================= */
  useEffect(() => {
    const handleDeepLink = async () => {
      try {
        const url = await Linking.getInitialURL();

        if (!url) return;

        const { queryParams } = Linking.parse(url);

        // 🔥 FIX TYPES
        const access_token = Array.isArray(queryParams?.access_token)
          ? queryParams?.access_token[0]
          : queryParams?.access_token;

        const refresh_token = Array.isArray(queryParams?.refresh_token)
          ? queryParams?.refresh_token[0]
          : queryParams?.refresh_token;

        // 🔐 SET SESSION
        if (
          typeof access_token === "string" &&
          typeof refresh_token === "string"
        ) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        }
      } catch (err) {
        console.log("Deep link error:", err);
      }
    };

    handleDeepLink();
  }, []);

  /* ================= UPDATE PASSWORD ================= */
  const updatePassword = async () => {
    if (!password) {
      Alert.alert("Error", "Enter new password");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      Alert.alert("Success ✅", "Password updated successfully!");

      // 🔁 Redirect to login
      router.replace("/(auth)/login");

    } catch (err: any) {
      Alert.alert("Error", err.message);
    }

    setLoading(false);
  };

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        🔑 Reset Password
      </Text>

      <TextInput
        placeholder="Enter new password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TouchableOpacity
        onPress={updatePassword}
        style={{
          backgroundColor: "green",
          padding: 14,
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