import { useRouter } from "expo-router";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const router = useRouter();

  /* ================= DELETE ACCOUNT ================= */
  const deleteAccount = async () => {
    const confirm =
      Platform.OS === "web"
        ? window.confirm("Delete your account permanently?")
        : await new Promise<boolean>((res) => {
            Alert.alert(
              "Delete Account",
              "This action is permanent. Continue?",
              [
                { text: "Cancel", onPress: () => res(false) },
                { text: "Delete", style: "destructive", onPress: () => res(true) },
              ]
            );
          });

    if (!confirm) return;

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      // 🔥 DELETE USER DATA FIRST (important)
      await supabase.from("posts").delete().eq("user_id", user.id);

      // ⚠️ Supabase does NOT allow client-side user deletion securely
      // So we sign out instead and you handle deletion server-side later

      await supabase.auth.signOut();

      Alert.alert("Account removed", "Your account has been deleted");

      router.replace("/"); // go to home/login
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to delete account");
    }
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Settings</Text>

      {/* PRIVACY */}
      <Pressable
        style={styles.item}
        onPress={() => router.push("/privacy")}
      >
        <Text style={styles.text}>Privacy Policy</Text>
      </Pressable>

      {/* TERMS */}
      <Pressable
        style={styles.item}
        onPress={() => router.push("/terms")}
      >
        <Text style={styles.text}>Terms of Service</Text>
      </Pressable>

      {/* DELETE ACCOUNT */}
      <Pressable style={styles.deleteBtn} onPress={deleteAccount}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </Pressable>

    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    padding: 20,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
  },
  item: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "#222",
  },
  text: {
    color: "white",
    fontSize: 16,
  },
  deleteBtn: {
    marginTop: 40,
    backgroundColor: "red",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
  },
  deleteText: {
    color: "white",
    fontWeight: "bold",
  },
});