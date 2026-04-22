import { useEffect, useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    // 🔥 handles session after clicking email link
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          console.log("Recovery session ready");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async () => {
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password updated!");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        Reset Password
      </Text>

      <TextInput
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <TextInput
        placeholder="Confirm Password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <Button title="Update Password" onPress={updatePassword} />
    </View>
  );
}