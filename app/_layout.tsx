import { Session } from "@supabase/supabase-js"
import { Stack, usePathname, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { AuthProvider } from "../lib/AuthContext"
import { supabase } from "../lib/supabase"

export default function RootLayout() {
  const router = useRouter()
  const pathname = usePathname()

  const [session, setSession] = useState<Session | null>(null)
  const [mounted, setMounted] = useState(false)

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {

      // ✅ ADDED: HANDLE EXPIRED SESSION
      if (error || !data.session) {
        console.log("⚠️ No session or expired")
      }

      setSession(data.session)
      setMounted(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {

        // ✅ ADDED: DEBUG EVENTS
        console.log("Auth event:", event)

        // ✅ ADDED: HANDLE TOKEN EXPIRED / SIGNED OUT
        if (event === "SIGNED_OUT") {
          console.log("User signed out → redirecting")
          router.replace("/(auth)/login")
        }

        if (event === "TOKEN_REFRESHED") {
          console.log("Token refreshed successfully")
        }

        setSession(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  /* ================= ROUTE GUARD ================= */
  useEffect(() => {
    if (!mounted) return

    const isAuthPage =
      pathname?.startsWith("/(auth)/login") ||
      pathname?.startsWith("/(auth)/signup")

    const isProtectedPage =
      pathname?.startsWith("/verify-phone") ||
      pathname?.startsWith("/(admin)")

    /* 🔒 Protect pages */
    if (!session && isProtectedPage) {
      router.replace("/(auth)/login")
      return
    }

    /* ✅ Logged in users shouldn't see login/signup */
    if (session && isAuthPage) {
      router.replace("/")
      return
    }
  }, [session, mounted, pathname])

  /* ================= DEBUG SESSION ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log("Session:", data.session)
    })
  }, [])

  /* ================= ADDED: FORCE CHECK SESSION EVERY TIME APP OPENS ================= */
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        console.log("❌ Session expired → logging out")

        await supabase.auth.signOut()
        router.replace("/(auth)/login")
      }
    }

    checkSession()
  }, [])

  return (
    <AuthProvider>
      <Stack>
         <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Main app */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Admin group */}
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />

        {/* Auth screens */}
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />

        {/* Verification */}
        <Stack.Screen name="verify-phone" options={{ headerShown: false }} />

        {/* Comments modal */}
        <Stack.Screen
          name="comments"
          options={{
            headerShown: false,
            presentation: "transparentModal"
          }}
        />

      </Stack>
    </AuthProvider>
  )
}