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

type Post = {
  id: string;
  media_url: string | null;
  local_uri?: string | null;
  thumbnail_url?: string | null;
  caption?: string;
  user_id: string;
  views?: number;
};

const PAGE_SIZE = 8;

export default function Reels() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [myOnly, setMyOnly] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const ids = useRef(new Set<string>());
  const loadingMore = useRef(false);

  /* ================= GET USER ================= */
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      userIdRef.current = data?.user?.id ?? null;
    };
    getUser();
  }, []);

  /* ================= RESET INDEX ================= */
  useEffect(() => {
    setActiveIndex(0);
  }, [posts.length]);

  /* ================= REALTIME (FIXED FILTERED) ================= */
  useEffect(() => {
    supabase.removeAllChannels();

    const channel = supabase.channel("reels-sync");

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload: any) => {
        const p = payload.new;

        if (!p?.id) return;

        // 🔥 FILTER FOR MY REELS
        if (myOnly && p.user_id !== userIdRef.current) return;

        setPosts((prev) => {
          if (prev.some((x) => x.id === p.id)) return prev;
          return [p, ...prev];
        });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "posts" },
      (payload: any) => {
        const updated = payload.new;

        setPosts((prev) =>
          prev.map((p) =>
            p.id === updated.id ? { ...p, ...updated } : p
          )
        );
      }
    );

    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "posts" },
      (payload: any) => {
        const id = payload.old.id;
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myOnly]);

  /* ================= LOAD POSTS ================= */
  const loadPosts = async (reset = false) => {
    if (loadingMore.current) return;
    loadingMore.current = true;

    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      // 🔥 KEY FIX: APPLY FILTER HERE TOO
      if (myOnly && userIdRef.current) {
        query = query.eq("user_id", userIdRef.current);
      }

      const { data, error } = await query;

      if (error) {
        console.log(error);
        return;
      }

      if (data) {
        if (reset) {
          ids.current.clear();
          setPosts([]);
        }

        const formatted = data
          .filter((p: any) => !ids.current.has(p.id))
          .map((p: any) => {
            ids.current.add(p.id);

            return {
              id: p.id,
              user_id: p.user_id,
              media_url: p.media_url,
              local_uri: p.local_uri,
              thumbnail_url: p.thumbnail_url,
              caption: p.caption,
              views: p.views,
            };
          });

        setPosts((prev) =>
          reset ? formatted : [...prev, ...formatted]
        );
      }
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
    loadingMore.current = false;
  };

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

  /* ================= INIT ================= */
  useEffect(() => {
    loadPosts(true);
  }, [myOnly]);

  useEffect(() => {
    if (page !== 0) loadPosts();
  }, [page]);

  /* ================= LOADING ================= */
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