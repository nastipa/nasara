import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";

import { supabase } from "../lib/supabase";
import FollowButton from "./FollowButton";
import LikeButton from "./LikeButton";
import ReelPlayer from "./ReelPlayer";

const { height, width } = Dimensions.get("window");

type ReelType = {
  id: string;
  media_url: string | null;
  local_uri?: string | null;
  caption?: string;
  user_id: string;
  views?: number;
  thumbnail_url?: string | null;
};

export default function ReelsFeed({
  reels,
  activeIndex,
  setActiveIndex,
  loadMore,
  myOnly,
  setMyOnly,
  onDelete,
}: any) {
  const router = useRouter();

  const viewed = useRef<Set<string>>(new Set());
  const preloaded = useRef<Set<string>>(new Set());

  const [feed, setFeed] = useState<ReelType[]>([]);

  /* ================= MERGE ================= */
  useEffect(() => {
    if (!reels) return;

    setFeed((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      reels.forEach((r: ReelType) => map.set(r.id, r));
      return Array.from(map.values());
    });
  }, [reels]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    const channel = supabase.channel("reels-sync");

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload: any) => {
        const p = payload.new;

        setFeed((prev) => {
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

        setFeed((prev) =>
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
        setFeed((prev) => prev.filter((p) => p.id !== id));
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= VIEW TRACK ================= */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;

      const index = viewableItems[0].index;
      if (index == null) return;

      setActiveIndex(index);

      const reel = feed[index];
      if (!reel) return;

      if (!viewed.current.has(reel.id)) {
        viewed.current.add(reel.id);

        // 🔥 FIX: ensure RPC runs
        (supabase as any)
          .rpc("increment_reel_views", {
            post_id_input: reel.id,
          })
          .then(() => {
            // instant UI update
            setFeed((prev) =>
              prev.map((item) =>
                item.id === reel.id
                  ? { ...item, views: (item.views ?? 0) + 1 }
                  : item
              )
            );
          })
          .catch((e: any) => console.log("view error", e));
      }
    }
  ).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 85,
  };

  /* ================= PRELOAD ================= */
  const preloadVideos = useCallback(
    (index: number) => {
      const around = feed.slice(Math.max(0, index - 1), index + 3);

      around.forEach((item) => {
        const src = item.media_url || item.local_uri;

        if (!src || preloaded.current.has(item.id)) return;

        preloaded.current.add(item.id);

        if (Platform.OS === "web") {
          const v = document.createElement("video");
          v.src = src;
          v.preload = "metadata";
        }
      });
    },
    [feed]
  );

  useEffect(() => {
    preloadVideos(activeIndex);
  }, [activeIndex, feed]);

  /* ================= ITEM ================= */
  const renderItem = ({ item, index }: any) => {
    const isActive = index === activeIndex;

    return (
      <View style={{ height, width }}>
        <ReelPlayer
          id={item.id}
          url={item.media_url}
          localUri={item.local_uri}
          active={isActive}
          thumbnail={item.thumbnail_url}
        />

        {!!item.caption && (
          <Text style={styles.caption}>{item.caption}</Text>
        )}

        <Text style={styles.views}>👁 {item.views ?? 0}</Text>

        <View style={styles.actions}>
          <LikeButton postId={item.id} />

          <Pressable onPress={() => router.push(`/comments?postId=${item.id}`)}>
            <Text style={styles.icon}>💬</Text>
          </Pressable>

          <FollowButton userId={item.user_id} />

          <Pressable
            onPress={() =>
              item.media_url &&
              Share.share({ message: item.media_url })
            }
          >
            <Text style={styles.icon}>📤</Text>
          </Pressable>

          {/* ✅ SELLER SHOP BACK */}
          <Pressable
            onPress={() =>
              router.push(`/seller-items?userId=${item.user_id}`)
            }
          >
            <Text style={styles.icon}>🛍</Text>
          </Pressable>

          {/* ✅ DELETE ONLY IN MY REELS */}
          {myOnly && onDelete && (
            <Pressable onPress={() => onDelete(item.id)}>
              <Text style={styles.icon}>🗑️</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={styles.topBar}>
        <Text
          onPress={() => setMyOnly(false)}
          style={[styles.tab, !myOnly && styles.activeTab]}
        >
          For You
        </Text>

        <Text
          onPress={() => setMyOnly(true)}
          style={[styles.tab, myOnly && styles.activeTab]}
        >
          My Reels
        </Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    flexDirection: "row",
    gap: 20,
    zIndex: 10,
  },
  tab: {
    color: "gray",
    fontSize: 16,
    fontWeight: "bold",
  },
  activeTab: {
    color: "white",
  },
  actions: {
    position: "absolute",
    right: 15,
    bottom: 190,
    alignItems: "center",
    gap: 24,
  },
  icon: {
    fontSize: 28,
    color: "white",
  },
  caption: {
    position: "absolute",
    bottom: 210,
    left: 15,
    right: 90,
    color: "white",
    fontSize: 16,
  },
  views: {
    position: "absolute",
    bottom: 250,
    left: 15,
    color: "white",
    fontSize: 14,
  },
});