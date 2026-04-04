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

  const ids = useRef(new Set<string>());
  const loadingMore = useRef(false);
  const preloaded = useRef(new Set<string>());

  /* ================= SAFE URL ================= */
  const safeUrl = (url?: string | null) => {
    if (!url) return null;

    // ❌ block blob in mobile ONLY
    if (url.startsWith("blob:") && Platform.OS !== "web") {
      return null;
    }

    return url;
  };

  /* ================= LOAD ================= */
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

      if (myOnly) {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) return;
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.log("load error:", error);
        return;
      }

      if (data) {
        if (reset) {
          ids.current.clear();
          preloaded.current.clear();
          setPosts([]);
        }

        const formatted: Post[] = data
          .filter((p: any) => !ids.current.has(p.id))
          .map((p: any) => {
            ids.current.add(p.id);

            return {
              id: p.id,
              user_id: p.user_id,
              media_url: safeUrl(p.media_url),
              local_uri: safeUrl(p.local_uri), // 🔥 important
              thumbnail_url: p.thumbnail_url ?? null,
              caption: p.caption ?? "",
              views: p.views ?? 0,
            };
          });

        setPosts((prev) => (reset ? formatted : [...prev, ...formatted]));
      }
    } catch (e) {
      console.log("load exception:", e);
    }

    setLoading(false);
    loadingMore.current = false;
  };

  /* ================= 🔥 PRELOAD (ALL PLATFORMS) ================= */
  const preloadVideos = (index: number) => {
    const next = posts.slice(index + 1, index + 3);

    next.forEach((v) => {
      if (!v.media_url || preloaded.current.has(v.id)) return;

      if (Platform.OS === "web") {
        const video = document.createElement("video");
        video.src = v.media_url;
        video.preload = "auto";
      }

      // mark as preloaded
      preloaded.current.add(v.id);
    });
  };

  useEffect(() => {
    preloadVideos(activeIndex);
  }, [activeIndex, posts]);

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    Alert.alert("Delete Reel", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // 🔥 instant UI update
            setPosts((prev) => prev.filter((p) => p.id !== id));

            await supabase.from("posts").delete().eq("id", id);

            ids.current.delete(id);
            preloaded.current.delete(id);
          } catch (e) {
            console.log("delete error", e);
          }
        },
      },
    ]);
  };

  /* ================= REALTIME ================= */
  useEffect(() => {
    const channel = supabase
      .channel("reels-live")
      

      // INSERT
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          const p = payload.new;

          if (ids.current.has(p.id)) return;

          const formatted: Post = {
            id: p.id,
            user_id: p.user_id,
            media_url: safeUrl(p.media_url),
            local_uri: safeUrl(p.local_uri),
            thumbnail_url: p.thumbnail_url ?? null,
            caption: p.caption ?? "",
            views: p.views ?? 0,
          };

          ids.current.add(formatted.id);
          setPosts((prev) => [formatted, ...prev]);
        }
      )

      // UPDATE (🔥 critical fix)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload: any) => {
          const updated = payload.new;

          setPosts((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? {
                    ...p,
                    media_url: safeUrl(updated.media_url),
                    local_uri: safeUrl(updated.local_uri),
                    thumbnail_url: updated.thumbnail_url,
                  }
                : p
            )
          );
        }
      )

      // DELETE
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload: any) => {
          const id = payload.old.id;

          setPosts((prev) => prev.filter((p) => p.id !== id));
          ids.current.delete(id);
          preloaded.current.delete(id);
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  /* ================= INIT ================= */
  useEffect(() => {
    loadPosts(true);
  }, [myOnly]);

  useEffect(() => {
    if (page !== 0) loadPosts();
  }, [page]);

  /* ================= LOADER ================= */
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

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