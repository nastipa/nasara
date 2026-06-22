import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function GuestLogin() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  const login = async () => {
    if (!email || !password) {
      return showMessage(
        "Missing Information",
        "Please enter your email and password."
      );
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) throw error;

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("account_type")
        .eq("id", data.user.id)
        .single();

      if (profile?.account_type !== "guest") {
        await supabase.auth.signOut();

        return showMessage(
          "Access Denied",
          "This account is not a guest account."
        );
      }

      showMessage(
        "Login Successful",
        "Welcome back."
      );

      router.replace("/services/service-type");
    } catch (e: any) {
      showMessage("Login Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
      }}
      contentContainerStyle={{
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        Guest Login
      </Text>

      <Text
        style={{
          color: "#666",
          marginBottom: 25,
        }}
      >
        Login with your guest account.
      </Text>

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
        Email Address
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Enter email"
        style={{
          backgroundColor: "#fff",
          borderRadius: 10,
          padding: 15,
          marginBottom: 18,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      />

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
        Password
      </Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Enter password"
        style={{
          backgroundColor: "#fff",
          borderRadius: 10,
          padding: 15,
          marginBottom: 25,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      />

      <TouchableOpacity
        onPress={login}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          padding: 18,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
            textAlign: "center",
            fontSize: 16,
          }}
        >
          {loading ? "Logging In..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push("/services/guest-signup")
        }
        style={{
          marginTop: 18,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#2563eb",
            fontWeight: "600",
          }}
        >
          Create Guest Account
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          marginTop: 12,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#666",
          }}
        >
          Back
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}