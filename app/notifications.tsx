import { useEffect, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);

  /* ================= GET USER ================= */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data?.user?.id ?? null;
      loadNotifications();
    });
  }, []);

  /* ================= LOAD ================= */
  const loadNotifications = async () => {
    if (!userIdRef.current) return;

    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", userIdRef.current)
      .order("created_at", { ascending: false });

    if (data) setNotifications(data);
  };

  /* ================= REALTIME (CRITICAL) ================= */
  useEffect(() => {
    let channel: any;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) return;

      channel = supabase
        .channel("notifications-" + user.id)

        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        );

      await channel.subscribe();

      channelRef.current = channel;
    };

    start();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
            <Text>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}