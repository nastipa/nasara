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
  const [mounted, setMounted] = useState(false);

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session);
        setMounted(true);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ================= ROUTE GUARD (FIXED) ================= */
  useEffect(() => {
    if (!mounted) return;

    const isAuthPage =
      pathname === "/login" || pathname === "/signup";

    const isInsideApp =
      pathname?.startsWith("/(tabs)") ||
      pathname?.startsWith("/browse") ||
      pathname?.startsWith("/profile") ||
      pathname?.startsWith("/sell");

    // 🚫 Not logged in → force login ONLY if inside app
    if (!session && isInsideApp) {
      if (pathname !== "/login") {
        router.replace("/login");
      }
      return;
    }

    // ✅ Logged in → prevent staying on login/signup
    if (session && isAuthPage) {
      router.replace("/(tabs)/browse");
      return;
    }
  }, [session, mounted, pathname]);

  /* ================= LOADING SCREEN ================= */
  if (!mounted) {
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
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen name="verify-phone" />
        <Stack.Screen
          name="comments"
          options={{ presentation: "transparentModal" }}
        />
      </Stack>
    </AuthProvider>
  );
}