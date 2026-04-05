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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setMounted(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        if (event === "SIGNED_OUT") {
          router.replace("/(auth)/login");
        }
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
      pathname?.startsWith("/(tabs)") ||
      pathname?.startsWith("/verify-phone") ||
      pathname?.startsWith("/(admin)");

    // ❌ Not logged in → block protected pages
    if (!session && isProtectedPage) {
      router.replace("/(auth)/login");
      return;
    }

    // ✅ Logged in → block auth pages
    if (session && isAuthPage) {
      router.replace("/(tabs)");
      return;
    }
  }, [session, mounted, pathname]);

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="verify-phone" options={{ headerShown: false }} />
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