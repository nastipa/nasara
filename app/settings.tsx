import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function SettingsScreen() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  /* ================= CHECK LOGIN ================= */
  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      () => {
        checkUser();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data } =
      await supabase.auth.getUser();

    setLoggedIn(!!data?.user);
  };

  /* ================= LOGOUT ================= */
  const logoutUser = async () => {
    try {
      await supabase.auth.signOut();

      if (Platform.OS === "web") {
        window.location.href = "/browse";
        return;
      }

      router.replace("/browse");
    } catch (error: any) {
      Alert.alert(
        "Logout Error",
        error.message
      );
    }
  };

  /* ================= DELETE ACCOUNT ================= */
  const confirmDelete = () => {
    // WEB FIX
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Are you sure you want to delete your account? This action is permanent."
      );

      if (ok) {
        deleteAccount();
      }

      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: deleteAccount,
        },
      ]
    );
  };

  const deleteAccount = async () => {
    try {
      setDeleting(true);

      const { error } =
        await supabase.rpc(
          "delete_my_account"
        );

      if (error) {
        console.log(error);

        Alert.alert(
          "Delete Error",
          error.message
        );

        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();

      // WEB FIX
      if (Platform.OS === "web") {
        alert(
          "Account deleted successfully"
        );

        window.location.href =
          "/browse";

        return;
      }

      Alert.alert(
        "Deleted",
        "Account removed successfully"
      );

      router.replace("/browse");

    } catch (e: any) {
      console.log(e);

      Alert.alert(
        "Error",
        e.message ||
          "Failed to delete account"
      );
    }

    setDeleting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        ⚙️ Settings
      </Text>

      {/* PRIVACY */}
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          router.push("/privacy")
        }
      >
        <Text style={styles.text}>
          🔒 Privacy Policy
        </Text>
      </TouchableOpacity>

      {/* TERMS */}
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          router.push("/terms")
        }
      >
        <Text style={styles.text}>
          📜 Terms of Service
        </Text>
      </TouchableOpacity>

      {/* ONLY SHOW WHEN LOGGED IN */}
      {loggedIn && (
        <>
          {/* DELETE ACCOUNT */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={confirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteText}>
                🗑️ Delete Account
              </Text>
            )}
          </TouchableOpacity>

          {/* LOGOUT */}
          <TouchableOpacity
            onPress={logoutUser}
            style={styles.logoutBtn}
          >
            <Text
              style={styles.logoutText}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

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

  logoutBtn: {
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },

  logoutText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});