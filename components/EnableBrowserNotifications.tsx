// =====================================================
// NASARA BROWSER NOTIFICATIONS BUTTON
// File: components/EnableBrowserNotifications.tsx
// =====================================================

import { useCallback, useEffect, useState } from "react";

import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  enableBrowserNotifications,
  registerBrowserPush,
  saveBrowserPushSubscription,
} from "../lib/registerBrowserPush";

// =====================================================
// 1. COMPONENT PROPERTIES
// =====================================================

type EnableBrowserNotificationsProps = {
  userId: string;
};

type NotificationStatus =
  | "checking"
  | "enabled"
  | "disabled";

// =====================================================
// 2. ENABLE NOTIFICATIONS BUTTON
// =====================================================

export default function EnableBrowserNotifications({
  userId,
}: EnableBrowserNotificationsProps) {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] =
    useState<NotificationStatus>("checking");

  const [message, setMessage] = useState("");

  const [success, setSuccess] = useState(false);

  // ===================================================
  // 3. CHECK EXISTING NOTIFICATION STATUS
  // Runs when the component loads or the user changes.
  // ===================================================

  const checkNotificationStatus = useCallback(async () => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined"
    ) {
      return;
    }

    setStatus("checking");

    try {
      if (
        !userId ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        setStatus("disabled");
        setSuccess(false);
        setMessage("");
        return;
      }

      // Register or reuse the existing service worker.

      const registration = await registerBrowserPush();

      if (!registration) {
        setStatus("disabled");
        return;
      }

      // Retrieve the existing browser subscription.

      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        setStatus("disabled");
        setSuccess(false);
        setMessage(
          "Notifications are permitted, but no push subscription was found. Please enable notifications again."
        );
        return;
      }

      // Save or update the subscription for this user.

      const saved = await saveBrowserPushSubscription(
        userId,
        subscription
      );

      if (saved) {
        setStatus("enabled");
        setSuccess(true);
        setMessage(
          "Nasara browser notifications are enabled."
        );
      } else {
        setStatus("disabled");
        setSuccess(false);
        setMessage(
          "Your notification subscription could not be verified. Tap the button to try again."
        );
      }
    } catch (error) {
      console.error(
        "Checking browser notification status failed:",
        error
      );

      setStatus("disabled");
      setSuccess(false);
      setMessage(
        "Could not check notification status. Please try again."
      );
    }
  }, [userId]);

  // ===================================================
  // 4. CHECK STATUS WHEN THE COMPONENT LOADS
  // This prevents the button resetting after a refresh.
  // ===================================================

  useEffect(() => {
    void checkNotificationStatus();
  }, [checkNotificationStatus]);

  // ===================================================
  // 5. HIDE BUTTON ON NATIVE MOBILE PLATFORMS
  // ===================================================

  if (Platform.OS !== "web") {
    return null;
  }

  // ===================================================
  // 6. HANDLE ENABLE NOTIFICATIONS BUTTON PRESS
  // ===================================================

  async function handleEnableNotifications() {
    if (loading) {
      return;
    }

    if (!userId) {
      setSuccess(false);
      setMessage(
        "Please sign in to enable notifications."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result =
        await enableBrowserNotifications(userId);

      setSuccess(result.success);
      setMessage(result.message);

      if (result.success) {
        setStatus("enabled");
      } else {
        setStatus("disabled");
      }
    } catch (error) {
      console.error(
        "Could not enable browser notifications:",
        error
      );

      setSuccess(false);
      setStatus("disabled");

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // 7. DISPLAY THE NOTIFICATIONS BUTTON
  // ===================================================

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status === "enabled"
            ? "Browser notifications enabled"
            : "Enable browser notifications"
        }
        disabled={
          loading || status === "checking"
        }
        onPress={handleEnableNotifications}
        style={({ pressed }) => [
          styles.button,

          status === "enabled" &&
            styles.buttonEnabled,

          pressed && styles.buttonPressed,

          (loading || status === "checking") &&
            styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Enabling notifications..."
            : status === "checking"
              ? "⏳ Checking Notifications..."
              : status === "enabled"
                ? "✅ Notifications Enabled"
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
// 8. STYLES
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

  buttonEnabled: {
    backgroundColor: "#15803D",
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