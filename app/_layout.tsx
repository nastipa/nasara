import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
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

  /* ================= STEP 5: DEEP LINK HANDLER ================= */
  useEffect(() => {
    const handleDeepLink = (event: any) => {
      const url = event.url;
      const parsed = Linking.parse(url);

      if (parsed.path === "battle-room") {
        router.push(`/battle-room?id=${parsed.queryParams?.id}`);
      }

      if (parsed.path === "item") {
        router.push(`/item/${parsed.queryParams?.id}`);
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  /* ================= MOUNT ================= */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.log("Session error:", error.message);
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(data.session);
        }
      } catch (err) {
        console.log("Init error:", err);
        setSession(null);
      }

      setReady(true);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (String(event) === "TOKEN_REFRESH_FAILED") {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }

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

    const isAuthPage =
      path.startsWith("/(auth)/login") ||
      path.startsWith("/(auth)/signup");

    const isAdmin =
      session?.user?.user_metadata?.role === "admin";

    // 🔒 Not logged in → block protected pages
    if (!session && isProtected) {
      if (!isAuthPage) {
        router.replace("/(auth)/login");
      }
      return;
    }

    // 🔐 Logged in → prevent going back to login/signup
    if (session && isAuthPage) {
      router.replace("/(tabs)/browse");
      return;
    }

    // 🔐 Admin protection
    if (isAdminRoute && !isAdmin) {
      router.replace("/(tabs)/browse");
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

        {/* 🔥 SHARE ROUTES */}
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="battle-room" />
      </Stack>
    </AuthProvider>
  );
}