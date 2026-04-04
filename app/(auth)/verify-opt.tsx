import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function VerifyOTP() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= VERIFY OTP ================= */
  const verifyCode = async () => {
    if (!code || !newPassword) {
      Alert.alert("Error", "Enter code and new password");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: String(email),
        token: code,
        type: "email",
      });

      if (error) {
        Alert.alert("Invalid Code", error.message);
        setLoading(false);
        return;
      }

      // ✅ UPDATE PASSWORD
      const { error: passError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passError) {
        Alert.alert("Error", passError.message);
        setLoading(false);
        return;
      }

      Alert.alert("Success ✅", "Password updated");

      router.replace("/(auth)/login");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      <Text style={styles.label}>Enter OTP Code</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="numeric"
        value={code}
        onChangeText={setCode}
      />

      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter new password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TouchableOpacity style={styles.button} onPress={verifyCode}>
        <Text style={styles.buttonText}>
          {loading ? "Processing..." : "Reset Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  label: {
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },

  button: {
    backgroundColor: "green",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});