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

// =====================================================
// 2. CONVERT VAPID KEY TO UINT8ARRAY
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
// 3. CHECK IPHONE HOME SCREEN INSTALLATION
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
// 4. REGISTER THE SERVICE WORKER
// =====================================================

export async function registerBrowserPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.isSecureContext) {
    console.error("Browser push requires HTTPS.");
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
    const registration =
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

    await navigator.serviceWorker.ready;

    console.log(
      "Nasara service worker registered:",
      registration.scope
    );

    return registration;
  } catch (error) {
    console.error(
      "Service worker registration failed:",
      error
    );

    return null;
  }
}

// =====================================================
// 5. REQUEST NOTIFICATION PERMISSION
// Call this after the user taps the Enable button.
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
    return true;
  }

  if (Notification.permission === "denied") {
    console.error(
      "Notification permission is blocked. Change the permission in device or website settings."
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
      "Notification permission request failed:",
      error
    );

    return false;
  }
}

// =====================================================
// 6. CREATE OR REUSE A BROWSER PUSH SUBSCRIPTION
// =====================================================

export async function createBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error(
      "Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY. Check the Vercel environment variables and redeploy."
    );

    return null;
  }

  const registration = await registerBrowserPush();

  if (!registration) {
    return null;
  }

  try {
    const existingSubscription =
      await registration.pushManager.getSubscription();

    if (existingSubscription) {
      console.log(
        "Existing browser push subscription found."
      );

      return existingSubscription;
    }

    const applicationServerKey =
      urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

    console.log(
      "Browser push subscription created."
    );

    return subscription;
  } catch (error) {
    console.error(
      "Creating browser push subscription failed:",
      error
    );

    return null;
  }
}

// =====================================================
// 7. SAVE THE SUBSCRIPTION TO SUPABASE
// =====================================================

export async function saveBrowserPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  if (!userId) {
    console.error("A logged-in user ID is required.");

    return false;
  }

  try {
    const subscriptionData = subscription.toJSON();

    if (
      !subscription.endpoint ||
      !subscriptionData.keys?.p256dh ||
      !subscriptionData.keys?.auth
    ) {
      console.error(
        "The browser subscription is incomplete."
      );

      return false;
    }

    const { error } = await (supabase as any)
      .from("browser_push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription: subscriptionData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      console.error(
        "Saving browser subscription failed:",
        error.message
      );

      return false;
    }

    console.log(
      "Browser push subscription saved successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "Unexpected subscription save error:",
      error
    );

    return false;
  }
}

// =====================================================
// 8. ENABLE BROWSER NOTIFICATIONS FOR A USER
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

  const allowed =
    await requestBrowserNotificationPermission();

  if (!allowed) {
    const permission =
      Notification.permission;

    return {
      success: false,
      message:
        permission === "denied"
          ? "Notifications are blocked. Allow them in your device or website settings."
          : "The browser did not grant notification permission. Try again from the Nasara Home Screen app.",
    };
  }

  const subscription =
    await createBrowserPushSubscription();

  if (!subscription) {
    return {
      success: false,
      message:
        "Permission was granted, but the browser push subscription failed. Check the browser console for details.",
    };
  }

  const saved = await saveBrowserPushSubscription(
    userId,
    subscription
  );

  if (!saved) {
    return {
      success: false,
      message:
        "The browser subscription was created but could not be saved. Check the Supabase table permissions and login session.",
    };
  }

  return {
    success: true,
    message:
      "Nasara browser notifications have been enabled successfully.",
  };
}