import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { signIn, signUp } from "../lib/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ===== LOGIN ===== */
  const handleLogin = async () => {
    // ✅ ADD 1: VALIDATION
    if (!email || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      // ✅ ADD 2: CORRECT REDIRECT (MATCHES layout.tsx)
      router.replace("/(tabs)");
    }
  };

  /* ===== REGISTER ===== */
  const handleRegister = async () => {
    // ✅ ADD 3: VALIDATION
    if (!email || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password);

    setLoading(false);

    if (error) {
      Alert.alert("Signup failed", error.message);
    } else {
      Alert.alert("Success", "Account created. You can login now.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button
        title={loading ? "Please wait…" : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />
      <View style={{ height: 10 }} />
      <Button
        title="Create Account"
        onPress={handleRegister}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
});