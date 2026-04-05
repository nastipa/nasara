import { Session } from "@supabase/supabase-js";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AuthProvider } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        console.log("⚠️ No session or expired");
      }

      setSession(data.session);
      setMounted(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);

        if (event === "SIGNED_OUT") {
          router.replace("/(auth)/login");
        }

        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ================= ROUTE GUARD ================= */
  useEffect(() => {
    if (!mounted) return;

    const isAuthPage =
      pathname?.startsWith("/(auth)/login") ||
      pathname?.startsWith("/(auth)/signup");

    const isProtectedPage =
      pathname?.startsWith("/verify-phone") ||
      pathname?.startsWith("/(admin)");

    if (!session && isProtectedPage) {
      router.replace("/(auth)/login");
      return;
    }

    if (session && isAuthPage) {
      router.replace("/");
      return;
    }
  }, [session, mounted, pathname]);

  /* ================= ✅ FIX WHITE SCREEN ON BACK ================= */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handlePopState = () => {
        // If route becomes invalid, recover safely
        const path = window.location.pathname;

        if (!path || path === "/") {
          router.replace("/"); // home
        } else {
          router.replace(path); // reload current route properly
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, []);

  /* ================= SESSION DEBUG ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log("Session:", data.session);
    });
  }, []);

  return (
    <AuthProvider>
      <Stack>
        {/* HOME */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* MAIN APP */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* ADMIN */}
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />

        {/* AUTH */}
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />

        {/* VERIFY */}
        <Stack.Screen name="verify-phone" options={{ headerShown: false }} />

        {/* MODAL */}
        <Stack.Screen
          name="comments"
          options={{
            headerShown: false,
            presentation: "transparentModal",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}