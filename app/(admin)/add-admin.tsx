 import { useState } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function AddAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [system, setSystem] = useState<"nasara" | "coalition">("nasara");
  const [loading, setLoading] = useState(false);

  const createAdmin = async () => {
    if (!email || !password || !system) {
      alert("Fill all required fields");
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
            email,
            password,
            full_name: fullName,
            system,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create admin");
        return;
      }

      alert("Admin created successfully");

      setEmail("");
      setPassword("");
      setFullName("");
    } catch (e) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Add Admin
      </Text>

      <TextInput
        placeholder="Full Name (optional for Nasara)"
        value={fullName}
        onChangeText={setFullName}
        style={{ padding: 12, backgroundColor: "#fff", marginBottom: 10 }}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ padding: 12, backgroundColor: "#fff", marginBottom: 10 }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ padding: 12, backgroundColor: "#fff", marginBottom: 10 }}
      />

      <Text style={{ marginBottom: 10, fontWeight: "bold" }}>
        Select System
      </Text>

      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => setSystem("nasara")}
          style={{
            flex: 1,
            padding: 10,
            backgroundColor: system === "nasara" ? "#16a34a" : "#e2e8f0",
            marginRight: 5,
            borderRadius: 8,
          }}
        >
          <Text style={{ textAlign: "center" }}>Nasara</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSystem("coalition")}
          style={{
            flex: 1,
            padding: 10,
            backgroundColor: system === "coalition" ? "#2563eb" : "#e2e8f0",
            marginLeft: 5,
            borderRadius: 8,
          }}
        >
          <Text style={{ textAlign: "center" }}>Coalition</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={createAdmin}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
          {loading ? "Creating..." : "Create Admin"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}