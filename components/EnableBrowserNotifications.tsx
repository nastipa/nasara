// =====================================================
// NASARA BROWSER NOTIFICATIONS BUTTON
// File: components/EnableBrowserNotifications.tsx
// =====================================================

import { useState } from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { enableBrowserNotifications } from "../lib/registerBrowserPush";

// =====================================================
// 1. COMPONENT PROPERTIES
// =====================================================

type EnableBrowserNotificationsProps = {
  userId: string;
};

// =====================================================
// 2. ENABLE NOTIFICATIONS BUTTON
// =====================================================

export default function EnableBrowserNotifications({
  userId,
}: EnableBrowserNotificationsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // ===================================================
  // 3. HIDE THIS BUTTON ON NATIVE MOBILE PLATFORMS
  // ===================================================

  if (Platform.OS !== "web") {
    return null;
  }

  // ===================================================
  // 4. HANDLE THE BUTTON PRESS
  // ===================================================

  async function handleEnableNotifications() {
    if (loading) {
      return;
    }

    if (!userId) {
      setSuccess(false);
      setMessage("Please sign in to enable notifications.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await enableBrowserNotifications(userId);

      setSuccess(result.success);
      setMessage(result.message);
    } catch (error) {
      console.error(
        "Could not enable browser notifications:",
        error
      );

      setSuccess(false);
      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // 5. DISPLAY THE BUTTON
  // ===================================================

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enable browser notifications"
        disabled={loading}
        onPress={handleEnableNotifications}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          loading && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Enabling notifications..."
            : "🔔 Enable Notifications"}
        </Text>
      </Pressable>

      {message !== "" && (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.message,
            success
              ? styles.successMessage
              : styles.errorMessage,
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

// =====================================================
// 6. STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 10,
  },

  button: {
    backgroundColor: "#16A34A",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  message: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },

  successMessage: {
    color: "#15803D",
  },

  errorMessage: {
    color: "#DC2626",
  },
});