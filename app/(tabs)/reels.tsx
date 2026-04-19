import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import ReelsFeed from "../../components/ReelsFeed";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 8;

export default function Reels() {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [myOnly, setMyOnly] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const loadingMore = useRef(false);
  const channelRef = useRef<any>(null);
  const ids = useRef(new Set<string>());
  const mounted = useRef(false);

  /* ================= USER ================= */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data?.user?.id ?? null;
    });
  }, []);

  /* ================= RESET ================= */
  useEffect(() => {
    setActiveIndex(0);
    setPage(0);
    ids.current.clear();
    setPosts([]);
  }, [myOnly]);

  /* ================= REALTIME (FINAL FIX) ================= */
  useEffect(() => {
  let channel: any;

  const setup = async () => {
    // 🧠 ALWAYS CLEAN FIRST
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 🔥 CREATE ONLY ONCE
    channel = supabase.channel("reels-global");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          if (payload.eventType === "INSERT") {
            setPosts((prev) => {
              if (prev.some((p) => p.id === newRow.id)) return prev;
              return [{ ...newRow, views: 0 }, ...prev];
            });
          }

          if (payload.eventType === "UPDATE") {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === newRow.id ? { ...p, ...newRow } : p
              )
            );
          }

          if (payload.eventType === "DELETE") {
            setPosts((prev) =>
              prev.filter((p) => p.id !== oldRow.id)
            );
          }
        }
      )
      .subscribe(); // ✅ ONLY ONCE HERE

    channelRef.current = channel;
  };

  setup();

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, []); // ⚠️ IMPORTANT: EMPTY DEPENDENCY ONLY
  /* ================= LOAD POSTS ================= */
  const loadPosts = async (reset = false) => {
    if (loadingMore.current) return;
    loadingMore.current = true;

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("posts")
        .select("*")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (myOnly && userIdRef.current) {
        query = query.eq("user_id", userIdRef.current);
      }

      const { data, error } = await query;

      if (error) return console.log(error);

      if (data) {
        setLoading(false);

        const formatted = data
          .filter((p: any) => !ids.current.has(p.id))
          .map((p: any) => {
            ids.current.add(p.id);

            return {
              ...p,
              views: p.views ?? 0,
            };
          });

        setPosts((prev) => (reset ? formatted : [...prev, ...formatted]));
      }
    } finally {
      loadingMore.current = false;
    }
  };

  /* ================= INIT ================= */
  useEffect(() => {
    loadPosts(true);
  }, [myOnly]);

  useEffect(() => {
    if (page !== 0) loadPosts();
  }, [page]);

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm("Delete reel?")
        : await new Promise<boolean>((res) => {
            Alert.alert("Delete", "Are you sure?", [
              { text: "Cancel", onPress: () => res(false) },
              { text: "Delete", style: "destructive", onPress: () => res(true) },
            ]);
          });

    if (!ok) return;

    setPosts((p) => p.filter((x) => x.id !== id));
    await supabase.from("posts").delete().eq("id", id);
  };

  /* ================= LOADER ================= */
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <ReelsFeed
      reels={posts}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      loadMore={() => setPage((p) => p + 1)}
      myOnly={myOnly}
      setMyOnly={setMyOnly}
      onDelete={handleDelete}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
});