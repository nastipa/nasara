// =====================================================
// NASARA BROWSER NOTIFICATIONS BUTTON
// File: components/EnableBrowserNotifications.tsx
// DIRECT iPHONE PUSH SUBSCRIPTION FIX
// =====================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  registerBrowserPush,
  saveBrowserPushSubscription,
} from "../lib/registerBrowserPush";

// =====================================================
// TYPES
// =====================================================

type EnableBrowserNotificationsProps = {
  userId: string;
};

type DiagnosticItem = {
  label: string;
  value: string;
  good?: boolean;
};

// =====================================================
// CONFIGURATION
// =====================================================

const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || "";

// =====================================================
// CONVERT VAPID KEY
// =====================================================

function urlBase64ToUint8Array(
  base64String: string
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(
    new ArrayBuffer(rawData.length)
  );

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function EnableBrowserNotifications({
  userId,
}: EnableBrowserNotificationsProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const [diagnostics, setDiagnostics] =
    useState<DiagnosticItem[]>([]);

  const registrationRef =
    useRef<ServiceWorkerRegistration | null>(null);

  const subscriptionRef =
    useRef<PushSubscription | null>(null);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  // ===================================================
  // DIAGNOSTICS
  // ===================================================

  const checkNotificationStatus = useCallback(
    async (
      registration?: ServiceWorkerRegistration
    ) => {
      if (
        Platform.OS !== "web" ||
        typeof window === "undefined"
      ) {
        return;
      }

      const results: DiagnosticItem[] = [];

      const addResult = (
        label: string,
        value: string,
        good?: boolean
      ) => {
        results.push({ label, value, good });

        if (mountedRef.current) {
          setDiagnostics([...results]);
        }
      };

      try {
        addResult(
          "Current page origin",
          window.location.origin
        );

        addResult(
          "HTTPS",
          window.isSecureContext
            ? "Available"
            : "Unavailable",
          window.isSecureContext
        );

        const isIOS =
          /iPhone|iPad|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" &&
            navigator.maxTouchPoints > 1);

        addResult(
          "Device",
          isIOS ? "Apple iPhone / iPad" : "Other device"
        );

        const standalone =
          window.matchMedia?.(
            "(display-mode: standalone)"
          ).matches ||
          (navigator as Navigator & {
            standalone?: boolean;
          }).standalone === true;

        addResult(
          "Home Screen app",
          standalone ? "Installed" : "Not installed",
          standalone
        );

        addResult(
          "Notification permission",
          "Notification" in window
            ? Notification.permission
            : "Unsupported",
          "Notification" in window &&
            Notification.permission === "granted"
        );

        addResult(
          "PushManager",
          "PushManager" in window
            ? "Available"
            : "Unavailable",
          "PushManager" in window
        );

        addResult(
          "VAPID public key",
          VAPID_PUBLIC_KEY
            ? "Loaded"
            : "Missing",
          Boolean(VAPID_PUBLIC_KEY)
        );

        const activeRegistration =
          registration ||
          registrationRef.current;

        if (!activeRegistration) {
          addResult(
            "Service worker",
            "Registration not available",
            false
          );

          addResult(
            "Existing push subscription",
            "Cannot check",
            false
          );

          return;
        }

        addResult(
          "Service worker scope",
          activeRegistration.scope,
          true
        );

        addResult(
          "Active service worker",
          activeRegistration.active?.state ||
            "Not active",
          Boolean(activeRegistration.active)
        );

        addResult(
          "Page controller",
          navigator.serviceWorker.controller?.state ||
            "None"
        );

        const existingSubscription =
          await activeRegistration.pushManager.getSubscription();

        subscriptionRef.current =
          existingSubscription;

        addResult(
          "Existing push subscription",
          existingSubscription ? "FOUND" : "NOT FOUND",
          Boolean(existingSubscription)
        );

        if (existingSubscription) {
          addResult(
            "Push endpoint",
            existingSubscription.endpoint.substring(
              0,
              55
            ) + "..."
          );
        }
      } catch (error: any) {
        addResult(
          "Diagnostic error",
          error?.message || String(error),
          false
        );
      }
    },
    []
  );

  // ===================================================
  // PREPARE SERVICE WORKER BEFORE BUTTON TAP
  // ===================================================

  useEffect(() => {
    mountedRef.current = true;

    if (Platform.OS !== "web") {
      return;
    }

    let cancelled = false;

    async function preparePush() {
      setChecking(true);

      try {
        const registration =
          await registerBrowserPush();

        if (cancelled || !mountedRef.current) {
          return;
        }

        if (!registration) {
          setMessage(
            "Nasara could not prepare the service worker."
          );

          setSuccess(false);
          return;
        }

        registrationRef.current = registration;

        const subscription =
          await registration.pushManager.getSubscription();

        if (cancelled || !mountedRef.current) {
          return;
        }

        subscriptionRef.current = subscription;

        await checkNotificationStatus(registration);

      } catch (error: any) {
        console.error(
          "NASARA PUSH PREPARATION ERROR:",
          error
        );

        if (mountedRef.current) {
          setMessage(
            error?.message ||
              "Could not prepare browser notifications."
          );
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setChecking(false);
        }
      }
    }

    void preparePush();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [checkNotificationStatus]);

  // ===================================================
  // ENABLE NOTIFICATIONS
  // IMPORTANT:
  // SUBSCRIBE IS CALLED DIRECTLY FROM THE BUTTON TAP.
  // ===================================================

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

    if (!registrationRef.current) {
      setSuccess(false);
      setMessage(
        "Nasara service worker is not ready. Close and reopen Nasara, then try again."
      );
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setSuccess(false);
      setMessage(
        "VAPID public key is missing. Check your Vercel environment variables."
      );
      return;
    }

    if (!("Notification" in window)) {
      setSuccess(false);
      setMessage(
        "This browser does not support notifications."
      );
      return;
    }

    if (Notification.permission === "denied") {
      setSuccess(false);
      setMessage(
        "Notifications are blocked. Allow them in your iPhone settings."
      );
      return;
    }

    // If permission has not yet been granted,
    // request it and ask the user to tap again.
    if (Notification.permission !== "granted") {
      try {
        const permission =
          await Notification.requestPermission();

        if (permission !== "granted") {
          setSuccess(false);
          setMessage(
            "Notification permission was not granted."
          );
          return;
        }

        setSuccess(false);
        setMessage(
          "Permission granted. Tap Enable Notifications again to create your subscription."
        );

        return;
      } catch (error: any) {
        setSuccess(false);
        setMessage(
          error?.message ||
            "Could not request notification permission."
        );
        return;
      }
    }

    busyRef.current = true;
    setLoading(true);
    setSuccess(false);
    setMessage("");

    try {
      const registration =
        registrationRef.current;

      let subscription =
        subscriptionRef.current;

      // IMPORTANT:
      // If no subscription exists, invoke subscribe()
      // immediately in this button interaction.
      // Do not await another operation first.

      if (!subscription) {
        const applicationServerKey =
          urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        if (applicationServerKey.length !== 65) {
          throw new Error(
            "Invalid VAPID public key. Expected 65 bytes."
          );
        }

        console.log(
          "NASARA: Starting direct push subscription."
        );

        const subscriptionPromise =
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });

        subscription = await subscriptionPromise;

        if (!subscription) {
          throw new Error(
            "The browser did not return a push subscription."
          );
        }

        subscriptionRef.current = subscription;

        console.log(
          "NASARA: Push subscription created."
        );
      }

      // Save or register the subscription.
      const saved =
        await saveBrowserPushSubscription(
          userId,
          subscription
        );

      if (!saved) {
        throw new Error(
          "The push subscription exists, but Nasara could not save it to the server."
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setSuccess(true);

      setMessage(
        "Nasara browser notifications have been enabled successfully."
      );

      await checkNotificationStatus(registration);

    } catch (error: any) {
      console.error(
        "NASARA PUSH SUBSCRIPTION ERROR:",
        error
      );

      if (!mountedRef.current) {
        return;
      }

      setSuccess(false);

      setMessage(
        `Push subscription failed: ${
          error?.name || "Error"
        }: ${
          error?.message || String(error)
        }`
      );

      // Show the actual error in diagnostics too.
      setDiagnostics((previous) => [
        ...previous,
        {
          label: "Subscription error name",
          value: error?.name || "UnknownError",
          good: false,
        },
        {
          label: "Subscription error message",
          value:
            error?.message || String(error),
          good: false,
        },
      ]);

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
        disabled={loading || checking}
        onPress={handleEnableNotifications}
        style={({ pressed }) => [
          styles.button,
          success && styles.buttonEnabled,
          pressed && styles.buttonPressed,
          (loading || checking) &&
            styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Enabling notifications..."
            : checking
              ? "Preparing Notifications..."
              : success
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

      {/* PUSH DIAGNOSTICS */}

      <View style={styles.diagnosticContainer}>
        <Text style={styles.diagnosticTitle}>
          Nasara Push Diagnostics
        </Text>

        {diagnostics.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            style={styles.diagnosticRow}
          >
            <Text style={styles.diagnosticLabel}>
              {item.label}
            </Text>

            <Text
              selectable
              style={[
                styles.diagnosticValue,
                item.good === true &&
                  styles.diagnosticGood,
                item.good === false &&
                  styles.diagnosticBad,
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          disabled={checking || loading}
          onPress={() => {
            void checkNotificationStatus();
          }}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshButtonText}>
            {checking
              ? "Checking..."
              : "Refresh Diagnostics"}
          </Text>
        </Pressable>
      </View>
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