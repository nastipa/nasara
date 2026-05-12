import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<any[]>([]);

  const userIdRef =
    useRef<string | null>(null);

  const channelRef =
    useRef<any>(null);

  /* ================= GET USER ================= */

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        userIdRef.current =
          data?.user?.id ?? null;

        loadNotifications();
      });
  }, []);

  /* ================= LOAD ================= */

  const loadNotifications =
    async () => {
      if (!userIdRef.current)
        return;

      const { data } =
        await (supabase as any)
          .from("notifications")
          .select("*")
          .eq(
            "user_id",
            userIdRef.current
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (data) {
        setNotifications(data);
      }
    };

  /* ================= REALTIME ================= */

  useEffect(() => {
    let channel: any;

    const start =
      async () => {
        const { data } =
          await supabase.auth.getUser();

        const user =
          data?.user;

        if (!user) return;

        channel = supabase
          .channel(
            "notifications-" +
              user.id
          )

          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table:
                "notifications",

              filter: `user_id=eq.${user.id}`,
            },

            (payload: any) => {
              setNotifications(
                (prev) => [
                  payload.new,
                  ...prev,
                ]
              );
            }
          );

        await channel.subscribe();

        channelRef.current =
          channel;
      };

    start();

    return () => {
      if (
        channelRef.current
      ) {
        supabase.removeChannel(
          channelRef.current
        );
      }
    };
  }, []);

  /* ================= OPEN NOTIFICATION ================= */

  const openNotification =
    async (
      notification: any
    ) => {
      try {
        /* ================= MARK READ ================= */

        await (
          supabase as any
        )
          .from(
            "notifications"
          )
          .update({
            read: true,
          })
          .eq(
            "id",
            notification.id
          );

        /* ================= UPDATE UI ================= */

        setNotifications(
          (prev) =>
            prev.map((n) =>
              n.id ===
              notification.id
                ? {
                    ...n,
                    read: true,
                  }
                : n
            )
        );

        /* ================= NAVIGATION ================= */

        if (
          notification.type ===
          "chat"
        ) {
          router.push(
            `/chat/${notification.ref_id}`
          );

          return;
        }

        if (
          notification.type ===
          "item"
        ) {
          router.push(
            `/item/${notification.ref_id}`
          );

          return;
        }

        if (
          notification.type ===
          "battle"
        ) {
          router.push(
            `/battle-room?id=${notification.ref_id}`
          );

          return;
        }
      } catch (err) {
        console.log(err);
      }
    };

  /* ================= UI ================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "#0f172a",
        padding: 15,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        🔔 Notifications
      </Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) =>
          String(item.id)
        }
        ListEmptyComponent={() => (
          <Text
            style={{
              color: "#94a3b8",
              textAlign:
                "center",
              marginTop: 50,
            }}
          >
            No notifications yet
          </Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              openNotification(
                item
              )
            }
            style={{
              backgroundColor:
                item.read
                  ? "#1e293b"
                  : "#1d4ed8",

              padding: 15,

              borderRadius: 14,

              marginBottom: 12,

              borderWidth: 1,

              borderColor:
                item.read
                  ? "#334155"
                  : "#2563eb",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight:
                  "bold",
              }}
            >
              {item.title}
            </Text>

            <Text
              style={{
                color: "#e2e8f0",
                marginTop: 5,
              }}
            >
              {item.body}
            </Text>

            <Text
              style={{
                color: "#94a3b8",
                marginTop: 8,
                fontSize: 11,
              }}
            >
              {new Date(
                item.created_at
              ).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}