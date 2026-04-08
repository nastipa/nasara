import { Session } from "@supabase/supabase-js";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false); // ✅ NEW FIX

  /* ================= MOUNT ================= */
  useEffect(() => {
    setMounted(true); // ✅ ensures navigation is safe
  }, []);

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setReady(true);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ================= ROUTING ================= */
  useEffect(() => {
    if (!ready || !mounted) return; // 🔥 CRITICAL FIX

    const path = pathname || "";

    const isAuth =
      path.includes("/login") || path.includes("/signup");

    const isProtected =
      path.includes("/sell") ||
      path.includes("/profile") ||
      path.includes("/verify-phone") ||
      path.includes("(admin)");

    // ✅ FORCE ROOT → BROWSE (SAFE)
    if (path === "/") {
      setTimeout(() => {
        router.replace("/(tabs)/browse");
      }, 0);
      return;
    }

    // 🔒 PROTECT PRIVATE ROUTES
    if (!session && isProtected) {
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 0);
      return;
    }

    // 🔁 PREVENT LOGIN AFTER LOGIN
    if (session && isAuth) {
      setTimeout(() => {
        router.replace("/(tabs)/browse");
      }, 0);
      return;
    }
  }, [pathname, session, ready, mounted]);

  /* ================= LOADING ================= */
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#020617",
        }}
      >
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  /* ================= NAV ================= */
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen name="verify-phone" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </AuthProvider>
  );
}