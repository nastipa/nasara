import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  View,
} from "react-native";

import { AuthProvider } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

/* 🔥 PUSH */
import { registerPush } from "../lib/registerPush";

/* 🔥 SOUND */
import { playSound } from "../lib/playSound";

/* ================= FOREGROUND PUSH ================= */
Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,

      /* ✅ NEW REQUIRED */
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});
export default function RootLayout() {
  const router = useRouter();
  /* ================= 🌐 WEB NOTIFICATION SOUND ================= */

  const playWebNotificationSound = () => {
    if (Platform.OS !== "web") {
      return;
    }

    try {
      const audio = new window.Audio(
        "/assets/sounds/message.mp3"
      );

      audio.volume = 1.0;

      audio.currentTime = 0;

      audio.play().catch((error) => {
        console.log(
          "Web notification sound blocked:",
          error
        );
      });
    } catch (error) {
      console.log(
        "Web notification sound error:",
        error
      );
    }
  };

  /* ================= 🌐 UNLOCK WEB AUDIO ================= */

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const unlockAudio = () => {
      try {
        const audio = new window.Audio(
          "/assets/sounds/message.mp3"
        );

        audio.volume = 0;

        const promise = audio.play();

        if (promise) {
          promise
            .then(() => {
              audio.pause();
              audio.currentTime = 0;
            })
            .catch(() => {});
        }
      } catch (error) {
        console.log(
          "Web audio unlock error:",
          error
        );
      }

      window.removeEventListener(
        "click",
        unlockAudio
      );

      window.removeEventListener(
        "touchstart",
        unlockAudio
      );

      window.removeEventListener(
        "keydown",
        unlockAudio
      );
    };

    window.addEventListener(
      "click",
      unlockAudio
    );

    window.addEventListener(
      "touchstart",
      unlockAudio
    );

    window.addEventListener(
      "keydown",
      unlockAudio
    );

    return () => {
      window.removeEventListener(
        "click",
        unlockAudio
      );

      window.removeEventListener(
        "touchstart",
        unlockAudio
      );

      window.removeEventListener(
        "keydown",
        unlockAudio
      );
    };
  }, []);

  const pathname =
    usePathname();

  const [
    session,
    setSession,
  ] = useState<Session | null>(
    null
  );

  const [ready, setReady] =
    useState(false);

  const [
    mounted,
    setMounted,
  ] = useState(false);

  /* ================= STEP 5: DEEP LINK HANDLER ================= */

  useEffect(() => {
    const handleDeepLink = (
      event: any
    ) => {
      const url = event.url;

      const parsed =
        Linking.parse(url);

      if (
        parsed.path ===
        "battle-room"
      ) {
        router.push(
          `/battle-room?id=${parsed.queryParams?.id}`
        );
      }

      if (
        parsed.path === "item"
      ) {
        router.push(
          `/item/${parsed.queryParams?.id}`
        );
      }
    };

    const subscription =
      Linking.addEventListener(
        "url",
        handleDeepLink
      );

    return () => {
      subscription.remove();
    };
  }, []);

  /* ================= PUSH CLICK HANDLE ================= */

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (
          response
        ) => {
          const data =
            response
              .notification
              .request.content.data;

          if (
            data?.type ===
            "battle"
          ) {
            router.push(
              "/battle"
            );
          }

          if (
            data?.type ===
            "reel"
          ) {
            router.push(
              "/reels"
            );
          }

          if (
            data?.type ===
            "item"
          ) {
            router.push(
              "/browse"
            );
          }

          if (
            data?.type ===
            "chat"
          ) {
            router.push(
              "/chat"
            );
          }
          if (
  data?.type ===
  "food_order"
) {
  router.push({
    pathname:
      "/(restaurant-owner)/orders",
    params: {
      orderId:
        String(data?.id || ""),
    },
  });

  return;
}
        }
      );

    return () =>
      subscription.remove();
  }, []);

  /* ================= 🔥 GLOBAL REALTIME BROADCAST ================= */

  useEffect(() => {
    if (!session?.user?.id) return;

    /* ================= ITEMS ================= */

    const itemsChannel = supabase
      .channel("global-items")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "items_live",
        },
        async (payload) => {
          const item = payload.new as any;

          /* DON'T NOTIFY OWNER */
          if (item.user_id === session.user.id) {
            return;
          }

          /* 🔊 SOUND */
          playSound("post");
          playWebNotificationSound();

          /* 📱 NATIVE NOTIFICATION ONLY */
          if (Platform.OS !== "web") {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "🛒 New Item Posted",
                body:
                  item.title ||
                  "New item available",

                sound: "default",

                data: {
                  type: "item",
                  id: item.id,
                },
              },

              trigger: null,
            });
          }
        }
      )
      .subscribe();

    /* ================= NOTIFICATIONS ================= */

    const notifChannel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          const notif = payload.new as any;

          /* ONLY CURRENT USER */
          if (
            notif.user_id !==
            session.user.id
          ) {
            return;
          }

          /* ===== FOOD ORDER ===== */

          if (
            notif.type ===
            "food_order"
          ) {
            /* 🔔 RESTAURANT ORDER SOUND */

            playSound("message");
            playWebNotificationSound();

            /* 📱 NATIVE NOTIFICATION ONLY */

            if (Platform.OS !== "web") {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title:
                    notif.title ||
                    "🔔 New Restaurant Order",

                  body:
                    notif.body ||
                    "A new restaurant order has been received.",

                  sound: "default",

                  data: {
                    type: "food_order",
                    id: notif.ref_id,
                  },
                },

                trigger: null,
              });
            }

            return;
          }

          /* ===== MESSAGE ===== */

          if (
            notif.type ===
            "message"
          ) {
            playSound("message");
            playWebNotificationSound();

            if (Platform.OS !== "web") {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title:
                    notif.title ||
                    "💬 New Message",

                  body:
                    notif.body ||
                    "Someone sent a message",

                  sound: "default",

                  data: {
                    type: "chat",
                  },
                },

                trigger: null,
              });
            }

            return;
          }

          /* ===== LIKE ===== */

          if (
            notif.type ===
            "like"
          ) {
            playSound("like");
            playWebNotificationSound();

            if (Platform.OS !== "web") {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title:
                    notif.title ||
                    "❤️ New Like",

                  body:
                    notif.body ||
                    "Someone liked your post",

                  sound: "default",
                },

                trigger: null,
              });
            }

            return;
          }

          /* ===== REEL ===== */

          if (
            notif.type ===
            "reel"
          ) {
            playSound("post");
            playWebNotificationSound();

            if (Platform.OS !== "web") {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title:
                    "🎬 New Reel",

                  body:
                    notif.body ||
                    "New reel uploaded",

                  sound: "default",

                  data: {
                    type: "reel",
                  },
                },

                trigger: null,
              });
            }

            return;
          }

          /* ===== BATTLE ===== */

          if (
            notif.type ===
            "battle"
          ) {
            playSound("post");
            playWebNotificationSound();

            if (Platform.OS !== "web") {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title:
                    "⚔️ New Battle",

                  body:
                    notif.body ||
                    "New battle started",

                  sound: "default",

                  data: {
                    type: "battle",
                  },
                },

                trigger: null,
              });
            }

            return;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        itemsChannel
      );

      supabase.removeChannel(
        notifChannel
      );
    };
  }, [session?.user?.id]);
  /* ================= MOUNT ================= */

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ================= LOAD SESSION ================= */

  useEffect(() => {
    const init =
      async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            console.log(
              "Session error:",
              error.message
            );

            await supabase.auth.signOut();

            setSession(null);
          } else {
            setSession(
              data.session
            );
          }
        } catch (err) {
          console.log(
            "Init error:",
            err
          );

          setSession(null);
        }

        setReady(true);
      };

    init();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (
            String(event) ===
            "TOKEN_REFRESH_FAILED"
          ) {
            await supabase.auth.signOut();

            setSession(null);

            return;
          }

          setSession(
            session
          );
        }
      );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ================= 🔥 REGISTER PUSH TOKEN ================= */

  useEffect(() => {
    const setupPush =
      async () => {
        if (
          !session?.user
        )
          return;

        try {
          await registerPush(
            session.user.id
          );

          console.log(
            "✅ Push token saved"
          );
        } catch (err) {
          console.log(
            "Push setup error:",
            err
          );
        }
      };

    setupPush();
  }, [session]);

  /* ================= SAFE ROUTING ================= */

  useEffect(() => {
    if (
      !ready ||
      !mounted
    )
      return;

    const path =
      pathname || "";

    const isAdminRoute =
      path.startsWith(
        "/(admin)"
      );

    const isProtected =
      path.startsWith(
        "/(tabs)/sell"
      ) ||
      path.startsWith(
        "/(tabs)/profile"
      ) ||
      path.startsWith(
        "/verify-phone"
      ) ||
      isAdminRoute;

    const isAuthPage =
      path.startsWith(
        "/(auth)/login"
      ) ||
      path.startsWith(
        "/(auth)/signup"
      );

    const isAdmin =
      session?.user
        ?.user_metadata
        ?.role ===
      "admin";

    if (
      !session &&
      isProtected
    ) {
      if (
        !isAuthPage
      ) {
        router.replace(
          "/(auth)/login"
        );
      }

      return;
    }

    if (
      session &&
      isAuthPage
    ) {
      router.replace(
        "/(tabs)/browse"
      );

      return;
    }

    if (
      isAdminRoute &&
      !isAdmin
    ) {
      router.replace(
        "/(tabs)/browse"
      );

      return;
    }
  }, [
    pathname,
    session,
    ready,
    mounted,
  ]);

  /* ================= LOADING ================= */

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,

          justifyContent:
            "center",

          alignItems:
            "center",

          backgroundColor:
            "#020617",
        }}
      >
        <ActivityIndicator
          size="large"
          color="#22c55e"
        />
      </View>
    );
  }

  /* ================= NAV ================= */

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />

        <Stack.Screen name="(tabs)" />

        <Stack.Screen name="(auth)/login" />

        <Stack.Screen name="(auth)/signup" />

        <Stack.Screen name="verify-phone" />

        <Stack.Screen name="(admin)" />

        <Stack.Screen name="item/[id]" />

        <Stack.Screen name="battle-room" />
      </Stack>
    </AuthProvider>
  );
}