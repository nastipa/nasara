import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);

  /* ===== PUSH NOTIFICATIONS ===== */
  useEffect(() => {
    if (Platform.OS !== "web") {
      if (Constants.appOwnership === "expo") return;
      registerForPushNotifications();
    }
  }, []);

  /* ===== AUTH LISTENER ===== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ===== ROUTE GUARD (FINAL & CORRECT) ===== */
  useEffect(() => {
    if (!ready) return;

    const isLoginPage = pathname === "/login";

    // 🔒 NOT LOGGED IN → FORCE LOGIN
    if (!session && !isLoginPage) {
      router.replace("/login");
      return;
    }

    // ✅ LOGGED IN → GO TO ROOT (index.tsx decides real home)
    if (session && isLoginPage) {
      router.replace("/");
      return;
    }
  }, [session, ready, pathname]);

  if (!ready) return null;

  return <Slot />;
}

/* ===== PUSH REGISTRATION ===== */
const registerForPushNotifications = async () => {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await (supabase as any)
        .from("profiles")
        .update({ push_token: token })
        .eq("id", user.id);
    }
  } catch (e) {
    console.log("Push error:", e);
  }
};