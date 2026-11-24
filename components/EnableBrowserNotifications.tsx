// =====================================================
// NASARA BROWSER NOTIFICATIONS BUTTON
// File: components/EnableBrowserNotifications.tsx
// iPHONE PUSH DIAGNOSTICS
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
} from "../lib/registerBrowserPush";

// =====================================================
// TYPES
// =====================================================

type EnableBrowserNotificationsProps = {
  userId: string;
};

type NotificationStatus =
  | "checking"
  | "enabled"
  | "disabled";

type DiagnosticItem = {
  label: string;
  value: string;
  good?: boolean;
};

// =====================================================
// CONFIGURATION
// =====================================================

const ENABLE_TIMEOUT_MS = 70000;
const DIAGNOSTIC_TIMEOUT_MS = 10000;

// =====================================================
// TIMEOUT HELPER
// =====================================================

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  step: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${step} timed out.`));
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

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function EnableBrowserNotifications({
  userId,
}: EnableBrowserNotificationsProps) {
  const [loading, setLoading] = useState(false);

  const [checking, setChecking] = useState(true);

  const [status, setStatus] =
    useState<NotificationStatus>("checking");

  const [message, setMessage] = useState("");

  const [success, setSuccess] = useState(false);

  const [diagnostics, setDiagnostics] =
    useState<DiagnosticItem[]>([]);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  // ===================================================
  // CHECK IPHONE / BROWSER PUSH ENVIRONMENT
  // ===================================================

  const checkNotificationStatus = useCallback(async () => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined"
    ) {
      return;
    }

    setChecking(true);
    setStatus("checking");
    setDiagnostics([]);

    const results: DiagnosticItem[] = [];

    const addResult = (
      label: string,
      value: string,
      good?: boolean
    ) => {
      results.push({
        label,
        value,
        good,
      });

      if (mountedRef.current) {
        setDiagnostics([...results]);
      }
    };

    try {
      // 1. HTTPS CHECK

      addResult(
        "Secure HTTPS connection",
        window.isSecureContext ? "Available" : "Unavailable",
        window.isSecureContext
      );

      // 2. DEVICE CHECK

      const isIOS =
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" &&
          navigator.maxTouchPoints > 1);

      const standalone =
        window.matchMedia?.(
          "(display-mode: standalone)"
        ).matches ||
        (navigator as Navigator & {
          standalone?: boolean;
        }).standalone === true;

      addResult(
        "Device",
        isIOS ? "Apple iPhone / iPad" : "Other device"
      );

      addResult(
        "Home Screen app",
        standalone ? "Installed mode detected" : "Browser mode detected",
        standalone
      );

      // 3. NOTIFICATION PERMISSION

      const permission =
        "Notification" in window
          ? Notification.permission
          : "Unsupported";

      addResult(
        "Notification permission",
        permission,
        permission === "granted"
      );

      // 4. PUSH MANAGER

      const pushSupported =
        "PushManager" in window;

      addResult(
        "PushManager API",
        pushSupported ? "Available" : "Unavailable",
        pushSupported
      );

      // 5. SERVICE WORKER SUPPORT

      const serviceWorkerSupported =
        "serviceWorker" in navigator;

      addResult(
        "Service Worker API",
        serviceWorkerSupported ? "Available" : "Unavailable",
        serviceWorkerSupported
      );

      // 6. VAPID KEY

      const vapidKey =
        process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";

      addResult(
        "VAPID public key",
        vapidKey ? "Loaded" : "Missing",
        Boolean(vapidKey)
      );

      if (!serviceWorkerSupported) {
        addResult(
          "Service worker registration",
          "Not supported"
        );

        setStatus("disabled");
        setMessage("This browser does not support service workers.");
        return;
      }

      // 7. GET EXISTING REGISTRATION
      // IMPORTANT: This only inspects. It does not register,
      // unregister, delete, or modify the service worker.

      addResult(
        "Service worker",
        "Checking existing registration..."
      );

      const registration =
        await withTimeout(
          navigator.serviceWorker.getRegistration("/"),
          DIAGNOSTIC_TIMEOUT_MS,
          "Checking service worker registration"
        );

      if (!registration) {
        addResult(
          "Service worker registration",
          "No registration found",
          false
        );

        addResult(
          "Active service worker",
          "Not available",
          false
        );

        addResult(
          "Existing push subscription",
          "Cannot check without registration",
          false
        );

        setStatus("disabled");
        setMessage(
          "Nasara has no existing service-worker registration on this device."
        );

        return;
      }

      addResult(
        "Service worker registration",
        "Found: " + registration.scope,
        true
      );

      // 8. ACTIVE WORKER

      const activeWorker =
        registration.active;

      addResult(
        "Active service worker",
        activeWorker
          ? activeWorker.state
          : "No active worker",
        Boolean(activeWorker)
      );

      addResult(
        "Waiting service worker",
        registration.waiting
          ? registration.waiting.state
          : "None"
      );

      addResult(
        "Installing service worker",
        registration.installing
          ? registration.installing.state
          : "None"
      );

      // 9. PAGE CONTROLLER

      addResult(
        "Current page controller",
        navigator.serviceWorker.controller
          ? navigator.serviceWorker.controller.state
          : "No controller"
      );

      // 10. EXISTING PUSH SUBSCRIPTION

      if (!pushSupported) {
        addResult(
          "Existing push subscription",
          "PushManager unavailable",
          false
        );

        setStatus("disabled");
        setMessage("PushManager is unavailable on this device.");
        return;
      }

      addResult(
        "Push subscription",
        "Checking..."
      );

      const subscription =
        await withTimeout(
          registration.pushManager.getSubscription(),
          DIAGNOSTIC_TIMEOUT_MS,
          "Checking existing push subscription"
        );

      if (subscription) {
        addResult(
          "Existing push subscription",
          "FOUND",
          true
        );

        addResult(
          "Push endpoint",
          subscription.endpoint.substring(0, 55) + "..."
        );

        setStatus("enabled");
        setSuccess(true);

        setMessage(
          "A browser push subscription exists. Tap Enable Notifications to verify its registration with your Nasara account."
        );

      } else {
        addResult(
          "Existing push subscription",
          "NOT FOUND",
          false
        );

        setStatus("disabled");
        setSuccess(false);

        setMessage(
          "Notifications are permitted, but this iPhone has no existing push subscription."
        );
      }

    } catch (error) {
      console.error(
        "NASARA PUSH DIAGNOSTIC ERROR:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      addResult(
        "Diagnostic error",
        errorMessage,
        false
      );

      setStatus("disabled");
      setSuccess(false);
      setMessage(errorMessage);

    } finally {
      if (mountedRef.current) {
        setChecking(false);
      }
    }
  }, []);

  // ===================================================
  // INITIAL CHECK
  // ===================================================

  useEffect(() => {
    mountedRef.current = true;

    void checkNotificationStatus();

    return () => {
      mountedRef.current = false;
    };
  }, [checkNotificationStatus]);

  // ===================================================
  // ENABLE NOTIFICATIONS
  // ===================================================

  async function handleEnableNotifications() {
    if (
      busyRef.current ||
      !mountedRef.current
    ) {
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
      const result =
        await withTimeout(
          enableBrowserNotifications(userId),
          ENABLE_TIMEOUT_MS,
          "Notification setup"
        );

      if (!mountedRef.current) {
        return;
      }

      setSuccess(result.success);
      setMessage(result.message);

      setStatus(
        result.success ? "enabled" : "disabled"
      );

      // Refresh diagnostic information after the attempt.
      if (result.success) {
        void checkNotificationStatus();
      }

    } catch (error) {
      console.error(
        "NASARA ENABLE NOTIFICATIONS ERROR:",
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
          : "Notification setup failed."
      );

    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  // ===================================================
  // NATIVE APP CHECK
  // ===================================================

  if (Platform.OS !== "web") {
    return null;
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={
          loading ||
          checking
        }
        onPress={handleEnableNotifications}
        style={({ pressed }) => [
          styles.button,
          status === "enabled" && styles.buttonEnabled,
          pressed && styles.buttonPressed,
          (loading || checking) &&
            styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Enabling notifications..."
            : checking
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

// =====================================================
// STYLES
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

  diagnosticContainer: {
    marginTop: 16,
    padding: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
  },

  diagnosticTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  diagnosticRow: {
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  diagnosticLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },

  diagnosticValue: {
    color: "#334155",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },

  diagnosticGood: {
    color: "#15803D",
  },

  diagnosticBad: {
    color: "#DC2626",
  },

  refreshButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    alignItems: "center",
  },

  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});