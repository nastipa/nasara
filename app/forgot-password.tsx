import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendReset = async () => {
    if (!email) {
      Alert.alert("Error", "Enter your email");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://nasara1.vercel.app/reset-password"
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Check your email for reset link");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={sendReset}>
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
});