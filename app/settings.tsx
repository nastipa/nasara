import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function SettingsScreen() {
  const router = useRouter();

const logoutUser = async () => {
  try {
    await supabase.auth.signOut();

    // ✅ Redirect to browse after logout
    router.replace("/browse");

  } catch (error: any) {
    Alert.alert("Logout Error", error.message);
  }
};
  /* DELETE ACCOUNT */
  const handleDelete = async () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;

              await fetch(
                "https://nasara-upload-server.onrender.com/delete-account",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization:` Bearer ${token}`,
                  },
                }
              );

              await supabase.auth.signOut();
              router.replace("/(auth)/login");
            } catch (e) {
              Alert.alert("Error", "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Settings</Text>

      {/* PRIVACY */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push("/privacy")}
      >
        <Text style={styles.text}>🔒 Privacy Policy</Text>
      </TouchableOpacity>

      {/* TERMS */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push("/terms")}
      >
        <Text style={styles.text}>📜 Terms of Service</Text>
      </TouchableOpacity>

      {/* DELETE (SAFE ZONE) */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteText}>🗑 Delete Account</Text>
      </TouchableOpacity>
      <TouchableOpacity
  onPress={async () => {
    await supabase.auth.signOut();
    router.replace("/browse");
  }}
  style={{
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  }}
>
  <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>
    Logout
  </Text>
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },

  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  text: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },

  deleteBtn: {
    marginTop: 40,
    backgroundColor: "#dc2626",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  deleteText: {
    color: "white",
    fontWeight: "bold",
  },
});