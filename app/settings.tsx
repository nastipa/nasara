import { useRouter } from "expo-router";

import { useEffect, useState } from "react";

import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { supabase } from "../lib/supabase";

export default function SettingsScreen() {

  const router = useRouter();

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {

    checkUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          checkUser();
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser =
    async () => {

      const { data } =
        await supabase.auth.getUser();

      setLoggedIn(
        !!data?.user
      );
    };

  const logoutUser =
    async () => {

      try {

        await supabase.auth.signOut();

        if (
          Platform.OS ===
          "web"
        ) {

          window.location.href =
            "/browse";

          return;
        }

        router.replace(
          "/browse"
        );

      } catch (
        error: any
      ) {

        Alert.alert(
          "Logout Error",
          error.message
        );
      }
    };

  const confirmDelete =
    () => {

      if (
        Platform.OS ===
        "web"
      ) {

        const ok =
          window.confirm(
            "Are you sure you want to delete your account?"
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
            text:
              "Cancel",

            style:
              "cancel",
          },

          {
            text:
              "Delete",

            style:
              "destructive",

            onPress:
              deleteAccount,
          },
        ]
      );
    };

  const deleteAccount =
    async () => {

      try {

        setDeleting(
          true
        );

       const {
  data: { session },
} = await supabase.auth.getSession();

const response = await fetch(
  "https://nasara-upload-server.onrender.com/delete-account",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    },
  }
);

const result = await response.json();

if (!response.ok) {
  Alert.alert(
    "Delete Error",
    result.error || "Unable to delete account."
  );

  setDeleting(false);
  return;
}

        await supabase.auth.signOut();

        if (
          Platform.OS ===
          "web"
        ) {

          alert(
            "Account deleted"
          );

          window.location.href =
            "/browse";

          return;
        }

        Alert.alert(
          "Deleted",
          "Account removed"
        );

        router.replace(
          "/browse"
        );

      } catch (
        e: any
      ) {

        Alert.alert(
          "Error",
          e.message
        );
      }

      setDeleting(
        false
      );
    };

  return (

    <ScrollView
      style={
        styles.container
      }
    >

      <Text
        style={
          styles.title
        }
      >
        ⚙️ Settings
      </Text>

      <TouchableOpacity
        style={
          styles.item
        }

        onPress={() =>
          router.push(
            "/privacy"
          )
        }
      >
        <Text
          style={
            styles.text
          }
        >
          🔒 Privacy Policy
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.item
        }

        onPress={() =>
          router.push(
            "/terms"
          )
        }
      >
        <Text
          style={
            styles.text
          }
        >
          📜 Terms of Service
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.item
        }

        onPress={() =>
          router.push(
            "/profile"
          )
        }
      >
        <Text
          style={
            styles.text
          }
        >
          👤 Edit Profile
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.item
        }

        onPress={() =>
          router.push(
            "/notifications"
          )
        }
      >
        <Text
          style={
            styles.text
          }
        >
          🔔 Notifications
        </Text>
      </TouchableOpacity>

     

      {loggedIn ? (

  <View>

    {/* Delete Account temporarily disabled while feature is under development */}

    <TouchableOpacity
      onPress={logoutUser}
      style={styles.logoutBtn}
    >
      <Text style={styles.logoutText}>
        Logout
      </Text>
    </TouchableOpacity>

  </View>

) : null}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      padding: 20,
      backgroundColor:
        "#0f172a",
    },

    title: {
      fontSize: 24,
      fontWeight:
        "bold",
      marginBottom: 20,
      color: "white",
    },

    item: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor:
        "#1e293b",
    },

    text: {
      fontSize: 16,
      color: "white",
      fontWeight:
        "500",
    },

    deleteBtn: {
      marginTop: 40,
      backgroundColor:
        "#dc2626",
      padding: 15,
      borderRadius: 10,
      alignItems:
        "center",
    },

    deleteText: {
      color: "white",
      fontWeight:
        "bold",
    },

    logoutBtn: {
      backgroundColor:
        "#ef4444",
      padding: 14,
      borderRadius: 10,
      marginTop: 20,
      marginBottom: 40,
    },

    logoutText: {
      color: "white",
      textAlign:
        "center",
      fontWeight:
        "bold",
    },
  });