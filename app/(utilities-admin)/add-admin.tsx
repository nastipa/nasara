import { useState } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AddAdmin() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createAdmin = async () => {
    if (!fullName || !email || !password) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "https://nasara-upload-server.onrender.com/create-admin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            system: "utilities",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create admin");
        return;
      }

      alert("Utilities admin created successfully");

      setFullName("");
      setEmail("");
      setPassword("");
    } catch (e) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Add Utilities Admin
      </Text>

      <TextInput
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={{ padding: 12, backgroundColor: "#fff", marginBottom: 10 }}
      />

      <TextInput
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
        style={{ padding: 12, backgroundColor: "#fff", marginBottom: 10 }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ padding: 12, backgroundColor: "#fff", marginBottom: 20 }}
      />

      <TouchableOpacity
        onPress={createAdmin}
        disabled={loading}
        style={{
          backgroundColor: "#f59e0b",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
          {loading ? "Creating..." : "Create Utilities Admin"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}