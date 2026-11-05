// =========================================================
// 🟢 NASARA REELS 2.0 — FEED ENGINE
// 🔵 For You | Following | Friends | My Reels
// 🟣 Uses existing posts and follows tables
// =========================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import ReelsFeed from "../../components/ReelsFeed";
import { supabase } from "../../lib/supabase";
import { getUserSafe } from "../../lib/auth";

// =========================================================
// 🟢 CONFIGURATION
// =========================================================

const PAGE_SIZE = 8;

export type ReelFeedMode =
  | "for_you"
  | "following"
  | "friends"
  | "my_reels";

// =========================================================
// 🔵 MAIN COMPONENT
// =========================================================

export default function Reels() {
  const [posts, setPosts] = useState<any[]>([]);
  const [feedMode, setFeedMode] =
    useState<ReelFeedMode>("for_you");

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);

  const loadingMore = useRef(false);
  const channelRef = useRef<any>(null);
  const ids = useRef(new Set<string>());
  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const pageRef = useRef(0);
  const feedModeRef = useRef<ReelFeedMode>("for_you");
  const userIdRef = useRef<string | null>(null);

  // =====================================================
  // 🟢 KEEP CURRENT VALUES AVAILABLE TO ASYNC FUNCTIONS
  // =====================================================

  useEffect(() => {
    feedModeRef.current = feedMode;
  }, [feedMode]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // =====================================================
  // 🔵 LOAD LOGGED-IN USER
  // =====================================================

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const user = await getUserSafe();

        if (!active) return;

        const id = user?.id ?? null;

        userIdRef.current = id;
        setUserId(id);
      } catch (error) {
        console.log("REELS USER ERROR:", error);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  // =====================================================
  // 🟣 GET USER IDS FOR SELECTED FEED
  // =====================================================

  const getFeedUserIds = useCallback(
    async (mode: ReelFeedMode, currentUserId: string) => {
      // 🟢 FOR YOU: no user filter
      if (mode === "for_you") {
        return null;
      }

      // 🟢 MY REELS
      if (mode === "my_reels") {
        return [currentUserId];
      }

      // 🔵 ACCOUNTS I FOLLOW
      const { data: followingRows, error: followingError } =
        await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);

      if (followingError) {
        throw followingError;
      }

      const followingIds = [
        ...new Set(
          (followingRows || [])
            .map((row: any) => row.following_id)
            .filter(Boolean)
        ),
      ];

      if (mode === "following") {
        return followingIds;
      }

      // 🟣 FRIENDS: MUTUAL FOLLOWERS
      const { data: followerRows, error: followerError } =
        await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", currentUserId);

      if (followerError) {
        throw followerError;
      }

      const followerIds = new Set(
        (followerRows || [])
          .map((row: any) => row.follower_id)
          .filter(Boolean)
      );

      return followingIds.filter((id) => followerIds.has(id));
    },
    []
  );

  // =====================================================
  // 🟢 LOAD REELS
  // =====================================================

  const loadPosts = useCallback(
    async (reset = false) => {
      if (loadingMore.current) return;

      const currentUserId = userIdRef.current;
      const currentMode = feedModeRef.current;

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      loadingMore.current = true;

      const version = requestVersion.current;
      const currentPage = reset ? 0 : pageRef.current;

      try {
        const userIds = await getFeedUserIds(
          currentMode,
          currentUserId
        );

        // Ignore results from an old feed selection.
        if (
          !mounted.current ||
          version !== requestVersion.current
        ) {
          return;
        }

        // An empty list means there are no accounts to display.
        if (userIds !== null && userIds.length === 0) {
          if (reset) {
            setPosts([]);
            ids.current.clear();
            pageRef.current = 0;
            setPage(0);
          }

          setLoading(false);
          return;
        }

        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("posts")
          .select("*")
          .eq("status", "ready")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (userIds !== null) {
          query = query.in("user_id", userIds);
        }

        const { data, error } = await query;

        if (error) {
          console.log("REELS LOAD ERROR:", error);
          return;
        }

        if (
          !mounted.current ||
          version !== requestVersion.current
        ) {
          return;
        }

        const formatted = (data || [])
          .filter((item: any) => !ids.current.has(item.id))
          .map((item: any) => {
            ids.current.add(item.id);

            return {
              ...item,
              views: item.views ?? 0,
            };
          });

        setPosts((previous) =>
          reset ? formatted : [...previous, ...formatted]
        );

        pageRef.current = currentPage;
        setPage(currentPage);
        setLoading(false);
      } catch (error) {
        console.log("REELS LOAD ERROR:", error);
      } finally {
        if (version === requestVersion.current) {
          loadingMore.current = false;
        }
      }
    },
    [getFeedUserIds]
  );

  // =====================================================
  // 🔵 RESET WHEN FEED CHANGES
  // =====================================================

  useEffect(() => {
    if (!userId) return;

    requestVersion.current += 1;
    loadingMore.current = false;

    ids.current.clear();
    pageRef.current = 0;

    setPage(0);
    setPosts([]);
    setActiveIndex(0);
    setLoading(true);

    loadPosts(true);
  }, [feedMode, userId, loadPosts]);

  // =====================================================
  // 🟣 REALTIME POSTS
  // =====================================================

  useEffect(() => {
    mounted.current = true;

    const setupRealtime = async () => {
      try {
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channel = supabase.channel("nasara-reels-global");

        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "posts",
          },
          (payload: any) => {
            if (!mounted.current) return;

            const newRow = payload.new;
            const oldRow = payload.old;

            // 🟢 INSERT
            if (payload.eventType === "INSERT") {
              if (newRow?.status !== "ready") return;

              const mode = feedModeRef.current;
              const currentUserId = userIdRef.current;

              if (!currentUserId) return;

              // For You can accept any ready post.
              // Other feeds are refreshed on next load.
              if (mode === "for_you") {
                setPosts((previous) => {
                  if (previous.some((p) => p.id === newRow.id)) {
                    return previous;
                  }

                  ids.current.add(newRow.id);

                  return [
                    { ...newRow, views: newRow.views ?? 0 },
                    ...previous,
                  ];
                });
              }

              return;
            }

            // 🔵 UPDATE
            if (payload.eventType === "UPDATE") {
              setPosts((previous) =>
                previous
                  .map((item) =>
                    item.id === newRow.id
                      ? { ...item, ...newRow }
                      : item
                  )
                  .filter((item) => item.status === "ready")
              );

              return;
            }

            // 🟣 DELETE
            if (payload.eventType === "DELETE") {
              setPosts((previous) =>
                previous.filter((item) => item.id !== oldRow.id)
              );

              ids.current.delete(oldRow.id);
            }
          }
        );

        channel.subscribe((status) => {
          console.log("NASARA REELS REALTIME:", status);
        });

        channelRef.current = channel;
      } catch (error) {
        console.log("REELS REALTIME ERROR:", error);
      }
    };

    setupRealtime();

    return () => {
      mounted.current = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // =====================================================
  // 🟢 LOAD MORE
  // =====================================================

  const handleLoadMore = () => {
    if (loadingMore.current || loading) return;

    pageRef.current += 1;
    setPage(pageRef.current);
  };

  useEffect(() => {
    if (page > 0) {
      loadPosts();
    }
  }, [page, loadPosts]);

  // =====================================================
  // 🔵 DELETE REEL
  // =====================================================

  const handleDelete = async (id: string) => {
    const ok =
      Platform.OS === "web"
        ? window.confirm("Delete this Reel?")
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Delete Reel",
              "Are you sure you want to delete this video?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ]
            );
          });

    if (!ok) return;

    const previousPosts = posts;

    setPosts((current) =>
      current.filter((item) => item.id !== id)
    );

    ids.current.delete(id);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("REEL DELETE ERROR:", error);

      setPosts(previousPosts);
      ids.current.add(id);

      if (Platform.OS === "web") {
        window.alert(error.message);
      } else {
        Alert.alert("Delete Failed", error.message);
      }
    }
  };

  // =====================================================
  // 🟣 LOADER
  // =====================================================

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#D6A83F" />
      </View>
    );
  }

  // =====================================================
  // 🟢 REELS INTERFACE
  // =====================================================

  return (
    <ReelsFeed
      reels={posts}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      loadMore={handleLoadMore}
      feedMode={feedMode}
      setFeedMode={setFeedMode}
      onDelete={handleDelete}
    />
  );
}

// =========================================================
// 🟢 STYLES
// =========================================================

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});