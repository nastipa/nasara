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
  const [ready, setReady] = useState(false); // 🔥 NEW

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setReady(true); // ✅ ONLY READY AFTER SESSION LOADS
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
    if (!ready) return; // 🔥 WAIT FIRST

    const path = pathname || "";

    const isAuth =
      path.includes("/login") || path.includes("/signup");

    const isProtected =
      path.includes("/sell") ||
      path.includes("/profile") ||
      path.includes("/verify-phone") ||
      path.includes("(admin)");

    // ✅ FORCE ROOT → BROWSE
    if (path === "/") {
      router.replace("/(tabs)/browse");
      return;
    }

    // 🔒 ONLY PROTECT PRIVATE PAGES
    if (!session && isProtected) {
      router.replace("/(auth)/login");
      return;
    }

    // 🔁 PREVENT LOGIN AFTER LOGIN
    if (session && isAuth) {
      router.replace("/(tabs)/browse");
      return;
    }

  }, [pathname, session, ready]);

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