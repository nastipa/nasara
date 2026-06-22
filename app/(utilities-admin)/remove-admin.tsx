import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RemoveAdmin() {
  const [userId, setUserId] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  const removeAdmin = async () => {
    if (!userId) {
      alert("Enter User ID");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "https://nasara-upload-server.onrender.com/remove-admin",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            system: "utilities",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            "Failed to remove admin"
        );
        return;
      }

      alert(
        "Utilities Admin removed successfully"
      );

      setUserId("");
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        backgroundColor: "#f8fafc",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Remove Utilities Admin
      </Text>

      <TextInput
        placeholder="User ID"
        value={userId}
        onChangeText={setUserId}
        style={{
          padding: 12,
          backgroundColor: "#fff",
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={removeAdmin}
        disabled={loading}
        style={{
          backgroundColor: "#dc2626",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Removing..."
            : "Remove Utilities Admin"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}