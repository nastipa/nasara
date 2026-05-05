import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const { email } = useLocalSearchParams();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!otp || !password) {
      Alert.alert(
        "Error",
        "Enter code and new password"
      );
      return;
    }

    setLoading(true);

    // Verify recovery OTP
    const { error: verifyError } =
      await supabase.auth.verifyOtp({
        email: email as string,
        token: otp.trim(),
        type: "recovery",
      });

    if (verifyError) {
      setLoading(false);
      Alert.alert(
        "Error",
        verifyError.message
      );
      return;
    }

    // Update password
    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    setLoading(false);

    if (updateError) {
      Alert.alert(
        "Error",
        updateError.message
      );
      return;
    }

    Alert.alert(
      "Success",
      "Password updated successfully"
    );
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          marginBottom: 20,
        }}
      >
        Reset Password
      </Text>

      <TextInput
        placeholder="Enter code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        style={{
          borderWidth: 1,
          marginBottom: 15,
          padding: 12,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          marginBottom: 20,
          padding: 12,
          borderRadius: 8,
        }}
      />

      <TouchableOpacity
        onPress={handleReset}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
          padding: 15,
          borderRadius: 8,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Resetting..."
            : "Reset Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}