import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function GuestSignup() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  const signUp = async () => {
    if (!fullName || !phone || !email || !password) {
      return showMessage(
        "Missing Information",
        "Please complete all fields."
      );
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await (supabase as any).from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          phone,
          account_type: "guest",
        });
      }

      showMessage(
        "Account Created",
        "Your guest account has been created successfully."
      );

      router.replace("/services/service-type");
    } catch (e: any) {
      showMessage("Error", e.message);
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
        Guest Account
      </Text>

      <Text
        style={{
          color: "#666",
          marginBottom: 25,
        }}
      >
        Create a guest account to continue your utility application.
      </Text>

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
        Full Name
      </Text>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter full name"
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
        Phone Number
      </Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Enter phone number"
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
        placeholder="Create password"
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
        onPress={signUp}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
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
          {loading ? "Creating Account..." : "Create Guest Account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
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
          Back
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}