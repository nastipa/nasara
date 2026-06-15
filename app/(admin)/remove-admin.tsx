 import { useState } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function RemoveAdmin() {
  const [userId, setUserId] = useState("");
  const [system, setSystem] = useState<"nasara" | "coalition">("nasara");
  const [loading, setLoading] = useState(false);

  const removeAdmin = async () => {
    if (!userId || !system) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "https://nasara-upload-server.onrender.com/remove-admin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            system,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to remove admin");
        return;
      }

      alert("Admin removed successfully");

      setUserId("");
    } catch (e) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Remove Admin
      </Text>

      <TextInput
        placeholder="User ID"
        value={userId}
        onChangeText={setUserId}
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
        onPress={removeAdmin}
        disabled={loading}
        style={{
          backgroundColor: "#dc2626",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
          {loading ? "Removing..." : "Remove Admin"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}