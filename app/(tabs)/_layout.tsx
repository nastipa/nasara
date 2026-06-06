import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

export default function TabLayout() {
  const [unreadCount, setUnreadCount] =
    useState(0);

  /* ===================================================== */
  /* ✅ UNREAD NOTIFICATIONS */
  /* ===================================================== */

  useEffect(() => {
    let channel: any = null;

    const loadUnread =
      async () => {
        try {
          /* ===================================================== */
          /* ✅ GET USER */
          /* ===================================================== */

          const {
            data: authData,
          } =
            await supabase.auth.getUser();

          const user =
            authData?.user;

          if (!user) return;

          /* ===================================================== */
          /* ✅ INITIAL COUNT */
          /* ===================================================== */

          const {
            count,
            error,
          } =
            await (supabase as any)
              .from(
                "notifications"
              )
              .select("*", {
                count:
                  "exact",
                head: true,
              })
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "read",
                false
              );

          if (!error) {
            setUnreadCount(
              count || 0
            );
          }

          /* ===================================================== */
          /* ✅ REMOVE OLD CHANNEL */
          /* ===================================================== */

          const oldChannels =
            supabase
              .getChannels();

          oldChannels.forEach(
            (c: any) => {
              if (
                c.topic.includes(
                  `notif-count-${user.id}`
                )
              ) {
                supabase.removeChannel(
                  c
                );
              }
            }
          );

          /* ===================================================== */
          /* ✅ CREATE REALTIME CHANNEL */
          /* ===================================================== */

          channel =
            supabase.channel(
              `notif-count-${user.id}`
            );

          /* ===================================================== */
          /* ✅ LISTEN FOR CHANGES */
          /* ===================================================== */

          channel.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "notifications",
              filter: `user_id=eq.${user.id}`,
            },

            async () => {
              const {
                count,
                error,
              } =
                await (
                  supabase as any
                )
                  .from(
                    "notifications"
                  )
                  .select("*", {
                    count:
                      "exact",
                    head: true,
                  })
                  .eq(
                    "user_id",
                    user.id
                  )
                  .eq(
                    "read",
                    false
                  );

              if (!error) {
                setUnreadCount(
                  count || 0
                );
              }
            }
          );

          /* ===================================================== */
          /* ✅ SUBSCRIBE LAST */
          /* ===================================================== */

          channel.subscribe();
        } catch (err) {
          console.log(
            "Unread error:",
            err
          );
        }
      };

    loadUnread();

    /* ===================================================== */
    /* ✅ CLEANUP */
    /* ===================================================== */

    return () => {
      if (channel) {
        supabase.removeChannel(
          channel
        );
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={({
        route,
      }) => ({
        headerShown: false,

        tabBarActiveTintColor:
          "#2563eb",

        tabBarInactiveTintColor:
          "#18792a",

        tabBarIcon: ({
          color,
          size,
        }) => {
          let iconName: any =
            "home-outline";

          if (
            route.name ===
            "browse"
          ) {
            iconName =
              "home-outline";
          } else if (
            route.name ===
            "sell"
          ) {
            iconName =
              "add-circle-outline";
          } else if (
            route.name ===
            "chat"
          ) {
            iconName =
              "chatbubble-ellipses-outline";
          } else if (
            route.name ===
            "profile"
          ) {
            iconName =
              "settings-outline";
          } else if (
            route.name ===
            "reels"
          ) {
            iconName =
              "play-circle-outline";
              } else if (
            route.name ===
            "farm"
          ) {
            iconName =
              "leaf-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
        }}
      />

      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />

      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
        }}
      />
      <Tabs.Screen
        name="farm"
        options={{
          title: "Farm",
        }}
      />
    </Tabs>
  );
}