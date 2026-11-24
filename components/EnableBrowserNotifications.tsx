// =====================================================
// NASARA BROWSER NOTIFICATIONS BUTTON
// File: components/EnableBrowserNotifications.tsx
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";

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

type EnableBrowserNotificationsProps = {
  userId: string;
};

type NotificationStatus =
  | "checking"
  | "enabled"
  | "disabled";

const ENABLE_TIMEOUT_MS = 70000;

function withComponentTimeout<T>(
  promise: Promise<T>,
  milliseconds: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          "Notification setup is taking too long. Close and reopen Nasara before trying again."
        )
      );
    }, milliseconds);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function EnableBrowserNotifications({
  userId,
}: EnableBrowserNotificationsProps) {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] =
    useState<NotificationStatus>("checking");

  const [message, setMessage] = useState("");

  const [success, setSuccess] = useState(false);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);

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

      const registration = await withComponentTimeout(
        registerBrowserPush(),
        25000
      );

      if (!registration) {
        setStatus("disabled");
        setSuccess(false);
        setMessage(
          "Nasara could not access its notification service worker."
        );
        return;
      }

      const subscription = await withComponentTimeout(
        registration.pushManager.getSubscription(),
        15000
      );

      if (!subscription) {
        setStatus("disabled");
        setSuccess(false);
        setMessage(
          "Notifications are permitted, but no push subscription was found. Tap Enable Notifications to try again."
        );
        return;
      }

      const saved = await withComponentTimeout(
        saveBrowserPushSubscription(userId, subscription),
        25000
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
        error instanceof Error
          ? error.message
          : "Could not check notification status. Please try again."
      );
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;

    void checkNotificationStatus();

    return () => {
      mountedRef.current = false;
    };
  }, [checkNotificationStatus]);

  if (Platform.OS !== "web") {
    return null;
  }

  async function handleEnableNotifications() {
    if (busyRef.current || !mountedRef.current) {
      return;
    }

    if (!userId) {
      setSuccess(false);
      setMessage(
        "Please sign in to enable notifications."
      );
      return;
    }

    busyRef.current = true;
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const result = await withComponentTimeout(
        enableBrowserNotifications(userId),
        ENABLE_TIMEOUT_MS
      );

      if (!mountedRef.current) {
        return;
      }

      setSuccess(result.success);
      setMessage(result.message);

      setStatus(
        result.success ? "enabled" : "disabled"
      );
    } catch (error) {
      console.error(
        "Could not enable browser notifications:",
        error
      );

      if (!mountedRef.current) {
        return;
      }

      setSuccess(false);
      setStatus("disabled");

      setMessage(
        error instanceof Error
          ? error.message
          : "Notification setup failed. Please close and reopen Nasara."
      );
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status === "enabled"
            ? "Browser notifications enabled"
            : "Enable browser notifications"
        }
        disabled={loading || status === "checking"}
        onPress={handleEnableNotifications}
        style={({ pressed }) => [
          styles.button,
          status === "enabled" && styles.buttonEnabled,
          pressed && styles.buttonPressed,
          (loading || status === "checking") &&
            styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Enabling notifications..."
            : status === "checking"
              ? "Checking Notifications..."
              : status === "enabled"
                ? "Notifications Enabled"
                : "Enable Notifications"}
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