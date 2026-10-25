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

  // Allocate an ArrayBuffer-backed typed array.
  const outputArray = new Uint8Array(
    new ArrayBuffer(rawData.length)
  );

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// =====================================================
// 3. REGISTER THE SERVICE WORKER
// =====================================================

export async function registerBrowserPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!("serviceWorker" in navigator)) {
    console.log("Service workers are not supported.");
    return null;
  }

  if (!("PushManager" in window)) {
    console.log("Browser push is not supported.");
    return null;
  }

  if (!("Notification" in window)) {
    console.log("Browser notifications are not supported.");
    return null;
  }

  if (!window.isSecureContext) {
    console.log("Browser push requires HTTPS.");
    return null;
  }

  try {
    const registration =
      await navigator.serviceWorker.register("/sw.js");

    await navigator.serviceWorker.ready;

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
// 4. REQUEST NOTIFICATION PERMISSION
// =====================================================

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  try {
    const permission =
      await Notification.requestPermission();

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
// 5. CREATE OR REUSE A BROWSER PUSH SUBSCRIPTION
// =====================================================

export async function createBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error(
      "Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY."
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
      return existingSubscription;
    }

    const subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

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
// 6. SAVE THE SUBSCRIPTION TO SUPABASE
// =====================================================

export async function saveBrowserPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  if (!userId) {
    console.error(
      "A logged-in user ID is required."
    );

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
// 7. ENABLE BROWSER NOTIFICATIONS FOR A USER
// =====================================================

export async function enableBrowserNotifications(
  userId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  if (!userId) {
    return {
      success: false,
      message: "Please sign in to enable notifications.",
    };
  }

  const allowed =
    await requestBrowserNotificationPermission();

  if (!allowed) {
    return {
      success: false,
      message:
        "Notification permission was not granted.",
    };
  }

  const subscription =
    await createBrowserPushSubscription();

  if (!subscription) {
    return {
      success: false,
      message:
        "Could not create a browser push subscription.",
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
        "The subscription could not be saved. Check your Supabase login and permissions.",
    };
  }

  return {
    success: true,
    message:
      "Browser notifications have been enabled successfully.",
  };
}