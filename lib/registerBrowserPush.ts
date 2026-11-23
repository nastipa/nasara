// =====================================================
// NASARA BROWSER PUSH REGISTRATION
// File: lib/registerBrowserPush.ts
// =====================================================

import { supabase } from "./supabase";

// =====================================================
// 1. GET THE PUBLIC VAPID KEY
// =====================================================

const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";

const PUSH_BACKEND =
  "https://nasara-upload-server.onrender.com";

// =====================================================
// 2. TIMEOUT HELPER
// Prevents notification setup from remaining stuck.
// =====================================================

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
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
    (navigator as Navigator & {
      standalone?: boolean;
    }).standalone === true;

  return standaloneMediaQuery || iosStandalone;
}

// =====================================================
// 5. REGISTER THE SERVICE WORKER
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
    const registration = await withTimeout(
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      }),
      15000,
      "Service worker registration timed out."
    );

    // Use the registration returned for Nasara's scope.
    // Do not wait indefinitely for the global ready promise.

    if (registration.active) {
      console.log(
        "Nasara service worker is active:",
        registration.scope
      );

      return registration;
    }

    const worker =
      registration.installing || registration.waiting;

    if (worker) {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          const checkState = () => {
            if (worker.state === "activated") {
              worker.removeEventListener(
                "statechange",
                checkState
              );

              resolve();
            } else if (worker.state === "redundant") {
              worker.removeEventListener(
                "statechange",
                checkState
              );

              reject(
                new Error(
                  "Nasara service worker became redundant."
                )
              );
            }
          };

          worker.addEventListener(
            "statechange",
            checkState
          );

          checkState();
        }),
        15000,
        "Nasara service worker activation timed out."
      );
    } else {
      const readyRegistration = await withTimeout(
        navigator.serviceWorker.ready,
        15000,
        "Nasara service worker did not become ready."
      );

      console.log(
        "Nasara service worker is ready:",
        readyRegistration.scope
      );

      return readyRegistration;
    }

    if (!registration.active) {
      throw new Error(
        "Nasara service worker is not active."
      );
    }

    console.log(
      "Nasara service worker activated:",
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
// 6. REQUEST NOTIFICATION PERMISSION
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
      "Notification permission is blocked. Change permission in device settings."
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
// 7. CREATE OR REUSE A BROWSER PUSH SUBSCRIPTION
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
    const existingSubscription = await withTimeout(
      registration.pushManager.getSubscription(),
      10000,
      "Checking the existing push subscription timed out."
    );

    if (existingSubscription) {
      console.log(
        "Existing browser push subscription found."
      );

      return existingSubscription;
    }

    const applicationServerKey =
      urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }),
      15000,
      "Creating the browser push subscription timed out."
    );

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
// 8. SAVE / REGISTER THE SUBSCRIPTION FOR THE USER
// =====================================================

export async function saveBrowserPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    // STEP 1: Validate information.

    if (!userId || !subscription) {
      console.error(
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
        "The browser subscription is incomplete."
      );

      return false;
    }

    // STEP 2: Get the current Supabase login session.

    const {
      data: { session },
      error: sessionError,
    } = await withTimeout(
      supabase.auth.getSession(),
      10000,
      "Checking the login session timed out."
    );

    if (
      sessionError ||
      !session?.access_token ||
      !session.user?.id
    ) {
      console.error(
        "No authenticated session was found:",
        sessionError
      );

      return false;
    }

    // STEP 3: Verify the currently logged-in account.

    if (session.user.id !== userId) {
      console.error(
        "The supplied user ID does not match the active login."
      );

      return false;
    }

    // STEP 4: Register with Nasara's backend.

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000);

    let response: Response;

    try {
      response = await fetch(
        `${PUSH_BACKEND}/browser-push/register-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subscription: subscriptionData,
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

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

    console.log(
      "Browser push subscription registered successfully for:",
      userId
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
        "Push notifications are not supported in this browser.",
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
        "Notification setup is incomplete. Check the Vercel VAPID public key configuration.",
    };
  }

  try {
    // STEP 1: Request or confirm permission.

    const allowed =
      await requestBrowserNotificationPermission();

    if (!allowed) {
      const permission = Notification.permission;

      return {
        success: false,
        message:
          permission === "denied"
            ? "Notifications are blocked. Allow them in your iPhone settings."
            : "The browser did not grant notification permission. Try again from the Nasara Home Screen app.",
      };
    }

    // STEP 2: Create or reuse the device subscription.

    const subscription =
      await createBrowserPushSubscription();

    if (!subscription) {
      return {
        success: false,
        message:
          "Permission is granted, but the iPhone could not create a push subscription. Close and reopen Nasara, then try again.",
      };
    }

    // STEP 3: Register this subscription for the
    // currently signed-in Nasara account.

    const saved = await saveBrowserPushSubscription(
      userId,
      subscription
    );

    if (!saved) {
      return {
        success: false,
        message:
          "The push subscription exists, but Nasara could not register it for this account. Please try again.",
      };
    }

    return {
      success: true,
      message:
        "Nasara browser notifications have been enabled successfully.",
    };
  } catch (error) {
    console.error(
      "Enabling browser notifications failed:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while enabling notifications. Please try again.",
    };
  }
}