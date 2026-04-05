import { Session } from "@supabase/supabase-js";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native"; // ✅ ADDED
import { AuthProvider } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setMounted(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        setSession(session);

        // ✅ ONLY redirect on logout (safe)
        if (event === "SIGNED_OUT") {
          router.replace("/(auth)/login");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ================= 🟢 ONLINE STATUS (ADDED) ================= */
  useEffect(() => {
    if (!session?.user) return;

    const userId = session.user.id;

    const updateStatus = async (online: boolean) => {
      await (supabase as any)
        .from("profiles")
        .update({
          is_online: online,
          last_seen: new Date().toISOString(),
        })
        .eq("id", userId);
    };

    // 🟢 when app opens
    updateStatus(true);

    // 🔄 listen app state
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        updateStatus(true);
      } else {
        updateStatus(false);
      }
    });

    // ⚪ when app closes
    return () => {
      updateStatus(false);
      sub.remove();
    };
  }, [session]);
  /* ================= END ONLINE STATUS ================= */

  /* ================= ROUTE GUARD ================= */
  useEffect(() => {
    if (!mounted) return;

    const isAuthPage =
      pathname?.startsWith("/(auth)/login") ||
      pathname?.startsWith("/(auth)/signup");

    const isLandingPage = pathname === "/";

    const isProtectedPage =
      pathname?.startsWith("/(tabs)") ||
      pathname?.startsWith("/(admin)") ||
      pathname?.startsWith("/verify-phone");

    // ✅ ALLOW landing page always
    if (isLandingPage) return;

    // 🔒 Protect app pages
    if (!session && isProtectedPage) {
      router.replace("/(auth)/login");
      return;
    }

    // ✅ Prevent logged-in users from seeing auth pages
    if (session && isAuthPage) {
      router.replace("/(tabs)/browse");
      return;
    }
  }, [session, mounted, pathname]);

  /* ================= UI ================= */
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 🌍 Landing Page */}
        <Stack.Screen name="index" />

        {/* 📱 Main App */}
        <Stack.Screen name="(tabs)" />

        {/* 👑 Admin */}
        <Stack.Screen name="(admin)" />

        {/* 🔐 Auth */}
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />

        {/* 📞 Verification */}
        <Stack.Screen name="verify-phone" />

        {/* 💬 Modal */}
        <Stack.Screen
          name="comments"
          options={{
            presentation: "transparentModal",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}