import { useLocalSearchParams, useRouter } from "expo-router";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
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

/* ================= TYPES ================= */
type ReelType = {
  id: string;
  media_url: string | null;
  local_uri?: string | null;
  caption?: string;
  user_id: string;
  views?: number;
  thumbnail_url?: string | null;
};

/* ================= COMPONENT ================= */
export default function ReelsFeed({
  reels,
  activeIndex,
  setActiveIndex,
  loadMore,
  myOnly,
  setMyOnly,
}: any) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const viewed = useRef<Set<string>>(new Set());

  const [feed, setFeed] = useState<ReelType[]>([]);

  /* ================= LOAD ================= */
  useEffect(() => {
    setFeed(reels || []);
  }, [reels]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    const channel = supabase
      .channel("reels-feed")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload: any) => {
          const updated = payload.new as ReelType;

          setFeed((prev) =>
            prev.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    try {
      setFeed((prev) => prev.filter((item) => item.id !== id));
      await supabase.from("posts").delete().eq("id", id);
    } catch (e) {
      console.log("delete error", e);
    }
  };

  /* ================= VIEW TRACK ================= */
  const onViewableItemsChanged = useRef(
    async ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;

      const index = viewableItems[0].index;
      if (index == null) return;

      setActiveIndex(index);

      const reel = feed[index];
      if (!reel) return;

      // only count view once
      if (!viewed.current.has(reel.id)) {
        viewed.current.add(reel.id);

        try {
          await (supabase as any).rpc("increment_reel_views", {
            post_id_input: reel.id,
          });
        } catch {}
      }
    }
  ).current;

  const viewabilityConfig = { itemVisiblePercentThreshold: 85 };

  /* ================= ITEM ================= */
  const RenderItem = memo(({ item, index }: any) => {
    const isActive = index === activeIndex;

    // 🔥 OPTIMIZED VIDEO SOURCE
    const videoUrl =
      (typeof item.media_url === "string" && item.media_url) ||
      (typeof item.local_uri === "string" && item.local_uri) ||
      "";

    return (
      <View style={{ height, width }}>
        <ReelPlayer
          id={item.id}
          url={videoUrl}
          active={isActive}
          thumbnail={item.thumbnail_url}
        />

        {item.caption && <Text style={styles.caption}>{item.caption}</Text>}

        <Text style={styles.views}>👁 {item.views ?? 0}</Text>

        <View style={styles.actions}>
          <LikeButton postId={item.id} />

          <Pressable
            onPress={() => router.push(`/comments?postId=${item.id}`)}
          >
            <Text style={styles.icon}>💬</Text>
          </Pressable>

          <FollowButton userId={item.user_id} />

          <Pressable
            onPress={() =>
              videoUrl && Share.share({ message: videoUrl })
            }
          >
            <Text style={styles.icon}>📤</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(`/seller-items?userId=${item.user_id}`)
            }
          >
            <Text style={styles.icon}>🛍</Text>
          </Pressable>

          {myOnly && (
            <Pressable onPress={() => handleDelete(item.id)}>
              <Text style={styles.icon}>🗑️</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  });

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1 }}>
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
        renderItem={({ item, index }) => <RenderItem item={item} index={index} />}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
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

/* ================= STYLES ================= */
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