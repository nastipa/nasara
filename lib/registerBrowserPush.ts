// =====================================================
// NASARA BROWSER PUSH REGISTRATION
// File: lib/registerBrowserPush.ts
// =====================================================

import { supabase } from "./supabase";

// =====================================================
// 1. GET THE PUBLIC VAPID KEY
// =====================================================

const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || "";

const PUSH_SETUP_TIMEOUT = 30000;

// =====================================================
// 2. TIMEOUT HELPER
// =====================================================

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise.then(
      (result) => {
        window.clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

// =====================================================
// 3. CONVERT VAPID KEY TO UINT8ARRAY
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
// 4. CHECK IPHONE HOME SCREEN INSTALLATION
// =====================================================

function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1)
  );
}

function isRunningAsInstalledApp(): boolean {
  const standaloneMediaQuery =
    window.matchMedia?.("(display-mode: standalone)")
      .matches ?? false;

  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean })
      .standalone === true;

  return standaloneMediaQuery || iosStandalone;
}

// =====================================================
// 5. REGISTER OR REUSE THE SERVICE WORKER
// =====================================================

export async function registerBrowserPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.isSecureContext) {
    console.error("Nasara push requires HTTPS.");
    return null;
  }

  if (!("serviceWorker" in navigator)) {
    console.error("Service workers are not supported.");
    return null;
  }

  if (!("PushManager" in window)) {
    console.error("PushManager is not supported.");
    return null;
  }

  if (!("Notification" in window)) {
    console.error("Notifications are not supported.");
    return null;
  }

  try {
    console.log("Nasara: Checking service worker registration.");

    // First check whether a registration already exists.
    let registration =
      await navigator.serviceWorker.getRegistration("/");

    // Register only if no existing registration is found.
    if (!registration) {
      console.log("Nasara: Registering /sw.js.");

      registration =
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
    } else {
      console.log(
        "Nasara: Existing service worker found:",
        registration.scope
      );

      // Check for an updated service worker.
      await registration.update().catch((error) => {
        console.warn(
          "Nasara: Service worker update check failed:",
          error
        );
      });
    }

    // Make sure the registration belongs to this website.
    const registrationOrigin =
      new URL(registration.scope).origin;

    if (registrationOrigin !== window.location.origin) {
      throw new Error(
        "Service worker belongs to a different website origin."
      );
    }

    // Wait for an active service worker.
    const readyRegistration =
      await withTimeout(
        navigator.serviceWorker.ready,
        PUSH_SETUP_TIMEOUT,
        "Service worker activation timed out. Close and reopen Nasara."
      );

    if (!readyRegistration.active) {
      throw new Error(
        "Nasara service worker is not active."
      );
    }

    console.log(
      "Nasara: Service worker is ready:",
      readyRegistration.scope
    );

    console.log(
      "Nasara: Active service worker:",
      readyRegistration.active.state
    );

    return readyRegistration;
  } catch (error) {
    console.error(
      "Nasara service worker registration failed:",
      error
    );

    return null;
  }
}

// =====================================================
// 6. REQUEST NOTIFICATION PERMISSION
// Call this after the user taps Enable Notifications.
// =====================================================

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    console.error("Notification API is unavailable.");

    return false;
  }

  if (Notification.permission === "granted") {
    console.log(
      "Nasara: Notification permission already granted."
    );

    return true;
  }

  if (Notification.permission === "denied") {
    console.error(
      "Nasara: Notification permission is blocked."
    );

    return false;
  }

  try {
    const permission =
      await Notification.requestPermission();

    console.log(
      "Nasara notification permission:",
      permission
    );

    return permission === "granted";
  } catch (error) {
    console.error(
      "Nasara notification permission request failed:",
      error
    );

    return false;
  }
}

// =====================================================
// 7. CREATE OR REUSE A BROWSER PUSH SUBSCRIPTION
// =====================================================

export async function createBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error(
      "Nasara: Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY."
    );

    return null;
  }

  if (!("PushManager" in window)) {
    console.error(
      "Nasara: PushManager is unavailable."
    );

    return null;
  }

  const registration =
    await registerBrowserPush();

  if (!registration) {
    console.error(
      "Nasara: Could not obtain an active service worker registration."
    );

    return null;
  }

  try {
    console.log(
      "Nasara: Checking for an existing push subscription."
    );

    // STEP 1: Check for an existing subscription.
    let subscription =
      await withTimeout(
        registration.pushManager.getSubscription(),
        PUSH_SETUP_TIMEOUT,
        "Checking the existing push subscription timed out."
      );

    if (subscription) {
      console.log(
        "Nasara: Existing push subscription found."
      );

      return subscription;
    }

    console.log(
      "Nasara: No existing subscription. Creating a new one."
    );

    // STEP 2: Convert the VAPID public key.
    const applicationServerKey =
      urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    if (applicationServerKey.length !== 65) {
      throw new Error(
        "The VAPID public key is invalid. Expected a 65-byte public key."
      );
    }

    // STEP 3: Confirm service worker is active.
    if (!registration.active) {
      throw new Error(
        "The Nasara service worker is not active."
      );
    }

    // STEP 4: Create a fresh push subscription.
    subscription =
      await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }),
        PUSH_SETUP_TIMEOUT,
        "Creating the push subscription timed out. Please close and reopen Nasara."
      );

    if (!subscription) {
      throw new Error(
        "The browser did not return a push subscription."
      );
    }

    console.log(
      "Nasara: New push subscription created successfully."
    );

    console.log(
      "Nasara push endpoint:",
      subscription.endpoint
    );

    return subscription;
  } catch (error: any) {
    console.error(
      "Nasara: Creating browser push subscription failed."
    );

    console.error(
      "Error name:",
      error?.name || "UnknownError"
    );

    console.error(
      "Error message:",
      error?.message || error
    );

    return null;
  }
}

// =====================================================
// 8. SAVE / TRANSFER THE BROWSER PUSH SUBSCRIPTION
// =====================================================

export async function saveBrowserPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    // STEP 1: Validate the supplied information.
    if (!userId || !subscription) {
      console.error(
        "Saving browser push subscription failed:",
        "Missing user ID or subscription."
      );

      return false;
    }

    const subscriptionData = subscription.toJSON();

    if (
      !subscription.endpoint ||
      !subscription.endpoint.startsWith("https://") ||
      !subscriptionData.keys?.p256dh ||
      !subscriptionData.keys?.auth
    ) {
      console.error(
        "Saving browser push subscription failed:",
        "The browser subscription is incomplete."
      );

      return false;
    }

    // STEP 2: Get the current Supabase login session.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token ||
      !session.user?.id
    ) {
      console.error(
        "Saving browser push subscription failed:",
        sessionError || "No authenticated session was found."
      );

      return false;
    }

    // STEP 3: Ensure this is the currently logged-in account.
    if (session.user.id !== userId) {
      console.error(
        "Saving browser push subscription failed:",
        "The supplied user ID does not match the active login."
      );

      return false;
    }

    // STEP 4: Send the subscription to the trusted backend.
    const response = await fetch(
      "https://nasara-upload-server.onrender.com/browser-push/register-subscription",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscription: subscriptionData,
        }),
      }
    );

    // STEP 5: Read the backend response.
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      console.error(
        "Saving browser push subscription failed:",
        result?.error ||
          `Backend returned HTTP ${response.status}.`
      );

      return false;
    }

    // STEP 6: Registration succeeded.
    console.log(
      "Browser push subscription registered successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "Saving browser push subscription failed:",
      error
    );

    return false;
  }
}

// =====================================================
// 9. ENABLE BROWSER NOTIFICATIONS FOR A USER
// =====================================================

export async function enableBrowserNotifications(
  userId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  if (typeof window === "undefined") {
    return {
      success: false,
      message: "Notifications are unavailable here.",
    };
  }

  if (!userId) {
    return {
      success: false,
      message: "Please sign in to enable notifications.",
    };
  }

  if (!window.isSecureContext) {
    return {
      success: false,
      message:
        "Notifications require a secure HTTPS connection.",
    };
  }

  if (!("Notification" in window)) {
    return {
      success: false,
      message:
        "This browser does not support web notifications.",
    };
  }

  if (!("serviceWorker" in navigator)) {
    return {
      success: false,
      message:
        "Service workers are unavailable in this browser.",
    };
  }

  if (!("PushManager" in window)) {
    return {
      success: false,
      message:
        "Push notifications are unavailable in this browser.",
    };
  }

  if (isIOSDevice() && !isRunningAsInstalledApp()) {
    return {
      success: false,
      message:
        "On iPhone, open Nasara using its Home Screen icon to enable notifications.",
    };
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      success: false,
      message:
        "Notification setup is incomplete. Please check the Vercel VAPID public key configuration.",
    };
  }

  // STEP 1: Request or confirm notification permission.
  const allowed =
    await requestBrowserNotificationPermission();

  if (!allowed) {
    const permission = Notification.permission;

    return {
      success: false,
      message:
        permission === "denied"
          ? "Notifications are blocked. Allow them in your device or website settings."
          : "The browser did not grant notification permission. Try again from the Nasara Home Screen app.",
    };
  }

  // STEP 2: Create or reuse the browser push subscription.
  const subscription =
    await createBrowserPushSubscription();

  if (!subscription) {
    return {
      success: false,
      message:
        "Notification permission was granted, but this iPhone could not create a push subscription. Check the browser console for the exact error.",
    };
  }

  // STEP 3: Save the subscription to the Nasara backend.
  const saved = await saveBrowserPushSubscription(
    userId,
    subscription
  );

  if (!saved) {
    return {
      success: false,
      message:
        "The browser subscription was created but could not be saved to Nasara. Check the login session and backend response.",
    };
  }

  // STEP 4: Confirm success.
  return {
    success: true,
    message:
      "Nasara browser notifications have been enabled successfully.",
  };
}