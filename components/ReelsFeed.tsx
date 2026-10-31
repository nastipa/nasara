/* =========================================================
   🟢 NASARA REELS - PREMIUM VIDEO FEED
   🔵 Preserves existing playback and database functionality
   🟣 Modern TikTok-style interface
   ========================================================= */

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

/* =========================================================
   🟢 SCREEN DIMENSIONS
   ========================================================= */

const { height, width } = Dimensions.get("window");

/* =========================================================
   🔵 REEL TYPE
   ========================================================= */

type ReelType = {
  id: string;
  media_url: string | null;
  local_uri?: string | null;
  caption?: string;
  user_id: string;
  views?: number;
  thumbnail_url?: string | null;
};

/* =========================================================
   🟣 COMPONENT PROPS
   ========================================================= */

type Props = {
  reels: ReelType[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  loadMore: () => void;
  myOnly: boolean;
  setMyOnly: (v: boolean) => void;
  onDelete?: (id: string) => void;
};

/* =========================================================
   🟢 MAIN REELS COMPONENT
   ========================================================= */

export default function ReelsFeed({
  reels,
  activeIndex,
  setActiveIndex,
  loadMore,
  myOnly,
  setMyOnly,
  onDelete,
}: Props) {
  const router = useRouter();

  /* =======================================================
     🔵 REFS
     ======================================================= */

  const viewed = useRef<Set<string>>(new Set());
  const watchTimers = useRef<Record<string, any>>({});
  const preloaded = useRef<Set<string>>(new Set());

  const feedRef = useRef<ReelType[]>([]);

  /* =======================================================
     🟣 STATE
     ======================================================= */

  const [feed, setFeed] = useState<ReelType[]>([]);

  /* =======================================================
     🟢 SAFE FEED
     ======================================================= */

  useEffect(() => {
    if (!Array.isArray(reels)) {
      setFeed([]);
      return;
    }

    setFeed((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));

      return reels.map((r) => {
        const existing = map.get(r.id);

        return existing
          ? { ...r, views: existing.views ?? r.views }
          : r;
      });
    });
  }, [reels]);

  /* =======================================================
     🔵 KEEP FEED REF UPDATED
     ======================================================= */

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  /* =======================================================
     🟣 REAL DATABASE VIEW TRACKING
     ======================================================= */

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;

      const index = viewableItems[0].index;

      if (index == null) return;

      setActiveIndex(index);

      const reel = feedRef.current[index];

      if (!reel) return;

      // Clear timers belonging to other reels.
      Object.keys(watchTimers.current).forEach((id) => {
        if (id !== reel.id) {
          clearTimeout(watchTimers.current[id]);
          delete watchTimers.current[id];
        }
      });

      // Count a view once per reel during this feed session.
      if (!viewed.current.has(reel.id)) {
        if (watchTimers.current[reel.id]) return;

        watchTimers.current[reel.id] = setTimeout(async () => {
          viewed.current.add(reel.id);

          try {
            await (supabase as any).rpc("increment_reel_views", {
              post_id_input: reel.id,
            });

            setFeed((prev) =>
              prev.map((item) =>
                item.id === reel.id
                  ? {
                      ...item,
                      views: (item.views ?? 0) + 1,
                    }
                  : item
              )
            );
          } catch (e) {
            console.log("VIEW ERROR:", e);
          }

          delete watchTimers.current[reel.id];
        }, 2000);
      }
    }
  ).current;

  /* =======================================================
     🟢 VIEWABILITY CONFIGURATION
     ======================================================= */

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
  };

  /* =======================================================
     🔵 VIDEO PRELOADING
     ======================================================= */

  const preloadVideos = useCallback(
    (index: number) => {
      const around = feed.slice(
        Math.max(0, index - 1),
        index + 2
      );

      around.forEach((item) => {
        const src = item.media_url;

        if (!src || preloaded.current.has(item.id)) return;

        preloaded.current.add(item.id);

        if (Platform.OS === "web") {
          const v = document.createElement("video");

          v.src = src;
          v.preload = "metadata";
          v.muted = true;
        }
      });
    },
    [feed]
  );

  useEffect(() => {
    preloadVideos(activeIndex);
  }, [activeIndex, feed, preloadVideos]);

  /* =======================================================
     🟣 REEL ITEM
     ======================================================= */

  const renderItem = ({
    item,
    index,
  }: {
    item: ReelType;
    index: number;
  }) => {
    const isActive = index === activeIndex;

    return (
      <View style={styles.reelContainer}>

        {/* ===============================================
            🟢 VIDEO PLAYER
            =============================================== */}

        <ReelPlayer
          key={item.id + "_" + isActive}
          id={item.id}
          url={item.media_url}
          localUri={item.local_uri}
          active={isActive}
          thumbnail={item.thumbnail_url}
        />

        {/* ===============================================
            🔵 TOP VIDEO OVERLAY
            =============================================== */}

        <View
          pointerEvents="none"
          style={styles.topOverlay}
        />

        {/* ===============================================
            🟣 BOTTOM VIDEO OVERLAY
            =============================================== */}

        <View
          pointerEvents="none"
          style={styles.bottomOverlay}
        />

        {/* ===============================================
            🟢 RIGHT ACTION PANEL
            =============================================== */}

        <View style={styles.actions}>

          {/* LIKE */}

          <View style={styles.actionItem}>
            <View style={styles.actionCircle}>
              <LikeButton postId={item.id} />
            </View>

            <Text style={styles.actionLabel}>Like</Text>
          </View>

          {/* COMMENTS */}

          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionCircle}
              onPress={() =>
                router.push(`/comments?postId=${item.id}`)
              }
            >
              <Text style={styles.actionEmoji}>💬</Text>
            </Pressable>

            <Text style={styles.actionLabel}>Comment</Text>
          </View>

          {/* FOLLOW */}

          <View style={styles.actionItem}>
            <View style={styles.actionCircle}>
              <FollowButton userId={item.user_id} />
            </View>

            <Text style={styles.actionLabel}>Follow</Text>
          </View>

          {/* SHARE */}

          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionCircle}
              onPress={() =>
                Share.share({
                  message:
                    "🔥 This is trending on Nasara 👀👇\nhttps://nasara1.vercel.app",
                })
              }
            >
              <Text style={styles.actionEmoji}>📤</Text>
            </Pressable>

            <Text style={styles.actionLabel}>Share</Text>
          </View>

          {/* SELLER ITEMS */}

          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionCircle}
              onPress={() =>
                router.push(
                  `/seller-items?userId=${item.user_id}`
                )
              }
            >
              <Text style={styles.actionEmoji}>🛍️</Text>
            </Pressable>

            <Text style={styles.actionLabel}>Shop</Text>
          </View>

          {/* DELETE */}

          {myOnly && onDelete && (
            <View style={styles.actionItem}>
              <Pressable
                style={styles.actionCircle}
                onPress={() => onDelete(item.id)}
              >
                <Text style={styles.actionEmoji}>🗑️</Text>
              </Pressable>

              <Text style={styles.actionLabel}>Delete</Text>
            </View>
          )}

        </View>

        {/* ===============================================
            🔵 BOTTOM REEL INFORMATION
            =============================================== */}

        <View style={styles.bottomInfo}>

          <View style={styles.viewsContainer}>
            <Text style={styles.viewsIcon}>▶️</Text>

            <Text style={styles.views}>
              {(item.views ?? 0).toLocaleString()} views
            </Text>
          </View>

          {!!item.caption && (
            <Text
              style={styles.caption}
              numberOfLines={3}
            >
              {item.caption}
            </Text>
          )}

          <View style={styles.reelFooter}>
            <View style={styles.nasaraBadge}>
              <Text style={styles.nasaraBadgeText}>
                N
              </Text>
            </View>

            <Text style={styles.nasaraFooterText}>
              Discover more on Nasara
            </Text>
          </View>

        </View>

      </View>
    );
  };

  /* =======================================================
     🟢 MAIN REELS INTERFACE
     ======================================================= */

  return (
    <View style={styles.container}>

      {/* ===============================================
          🔵 TOP NAVIGATION
          =============================================== */}

      <View style={styles.topBar}>

        <View style={styles.brandSection}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>N</Text>
          </View>

          <View>
            <Text style={styles.brandTitle}>NASARA</Text>
            <Text style={styles.brandSubtitle}>REELS</Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>

          <Pressable
            onPress={() => setMyOnly(false)}
            style={[
              styles.tabButton,
              !myOnly && styles.activeTabButton,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                !myOnly && styles.activeTabText,
              ]}
            >
              For You
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMyOnly(true)}
            style={[
              styles.tabButton,
              myOnly && styles.activeTabButton,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                myOnly && styles.activeTabText,
              ]}
            >
              My Reels
            </Text>
          </Pressable>

        </View>

      </View>

      {/* ===============================================
          🟣 VIDEO FEED
          =============================================== */}

      <FlatList
        data={feed}
        extraData={activeIndex}
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
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={Platform.OS === "android"}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />

    </View>
  );
}

/* =========================================================
   🟢 PREMIUM NASARA REELS STYLES
   ========================================================= */

const styles = StyleSheet.create({

  /* ===============================================
     🔵 MAIN CONTAINER
     =============================================== */

  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  reelContainer: {
    height,
    width,
    backgroundColor: "#000000",
    overflow: "hidden",
  },

  /* ===============================================
     🟣 VIDEO OVERLAYS
     =============================================== */

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: "rgba(0,0,0,0.22)",
  },

  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  /* ===============================================
     🟢 TOP NAVIGATION
     =============================================== */

  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 38,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#D6A83F",
    justifyContent: "center",
    alignItems: "center",
  },

  brandIconText: {
    color: "#111111",
    fontSize: 21,
    fontWeight: "900",
  },

  brandTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  brandSubtitle: {
    color: "#D6A83F",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginTop: 1,
  },

  /* ===============================================
     🔵 NAVIGATION TABS
     =============================================== */

  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  tabButton: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 24,
  },

  activeTabButton: {
    backgroundColor: "#D6A83F",
  },

  tabText: {
    color: "#D0D0D0",
    fontSize: 12,
    fontWeight: "700",
  },

  activeTabText: {
    color: "#111111",
    fontWeight: "900",
  },

  /* ===============================================
     🟣 RIGHT ACTION PANEL
     =============================================== */

  actions: {
    position: "absolute",
    right: 12,
    bottom: 165,
    alignItems: "center",
    gap: 17,
    zIndex: 10,
  },

  actionItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  actionCircle: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: "rgba(20,20,20,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionEmoji: {
    fontSize: 23,
    color: "#FFFFFF",
  },

  actionLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 5,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 4,
  },

  /* ===============================================
     🟢 BOTTOM REEL INFORMATION
     =============================================== */

  bottomInfo: {
    position: "absolute",
    left: 16,
    right: 85,
    bottom: 48,
    zIndex: 10,
  },

  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  viewsIcon: {
    color: "#D6A83F",
    fontSize: 12,
    marginRight: 7,
  },

  views: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 4,
  },

  caption: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 15,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowRadius: 5,
  },

  /* ===============================================
     🔵 NASARA FOOTER
     =============================================== */

  reelFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },

  nasaraBadge: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: "#D6A83F",
    alignItems: "center",
    justifyContent: "center",
  },

  nasaraBadgeText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
  },

  nasaraFooterText: {
    color: "#E5E5E5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 4,
  },

});