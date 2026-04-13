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

  /* ================= RESET ACTIVE INDEX ================= */
  useEffect(() => {
    setActiveIndex(0);
  }, [posts.length]);
   
  
  /* ================= REALTIME ================= */
useEffect(() => {
  const channel = (supabase as any).channel(`reels-sync-${Date.now()}`);

  // ✅ ADD ALL LISTENERS FIRST
  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "posts" },
    (payload: any) => {
      const p = payload.new;

      setPosts((prev) => {
        if (prev.find((x) => x.id === p.id)) return prev;

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

  // ✅ SUBSCRIBE LAST (VERY IMPORTANT)
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
  /* ================= SAFE URL ================= */
  const safeUrl = (url?: string | null) => {
  if (!url) return null;

  // ❌ BLOCK blob for mobile
  if (Platform.OS !== "web" && url.startsWith("blob:")) {
    return null;
  }

  if (url.includes("undefined")) return null;

  return url;
};

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
              local_uri: safeUrl(p.local_uri),
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

 /* ================= 🚀 SMART PRELOAD ================= */
const cacheVideo = async (url: string) => {
  if (!url) return;

  try {
    if (Platform.OS === "web") {
      const video = document.createElement("video");
      video.src = url;
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
    } else {
      // ✅ MOBILE preload (VERY IMPORTANT)
      const { Video } = require("expo-av");

      const video = new Video();
      await video.loadAsync({ uri: url }, {}, false);
      await video.unloadAsync();
    }
  } catch (e) {
    console.log("preload error:", e);
  }
};

const preloadVideos = (index: number) => {
  if (!posts.length) return;

  // 🔥 LOAD AROUND CURRENT (not only next)
  const around = posts.slice(
    Math.max(0, index - 2), // 2 behind
    index + 6               // 6 ahead
  );

  around.forEach((v) => {
    const src = v.media_url || v.local_uri;

    if (!src || preloaded.current.has(v.id)) return;

    preloaded.current.add(v.id);

    // ⚡ preload instantly (no delay)
    cacheVideo(src);
  });
};

/* 🔥 TRIGGER */
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

  /* ================= UI ================= */
  return (
    <ReelsFeed
      key={posts.length} // 🔥 force clean re-render (fix ghost video)
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