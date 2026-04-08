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
  const [mounted, setMounted] = useState(false);

  /* ================= MOUNT ================= */
  useEffect(() => {
    setMounted(true);
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

  /* ================= SAFE ROUTING ================= */
  useEffect(() => {
    if (!ready || !mounted) return;

    const path = pathname || "";

    const isAdminRoute = path.startsWith("/(admin)");
    const isProtected =
      path.startsWith("/(tabs)/sell") ||
      path.startsWith("/(tabs)/profile") ||
      path.startsWith("/verify-phone") ||
      isAdminRoute;

    const isAdmin =
      session?.user?.user_metadata?.role === "admin";

    // 🔒 If NOT logged in → go to login
    if (!session && isProtected) {
      router.replace("/(auth)/login");
      return;
    }

    // 🔐 If NOT admin → block admin routes
    if (isAdminRoute && !isAdmin) {
      router.replace("/(tabs)/browse");
      return;
    }

    // ❌ NO other redirects here (IMPORTANT)

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