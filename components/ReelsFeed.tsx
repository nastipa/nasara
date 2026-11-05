// =========================================================
// 🟢 NASARA REELS 2.0 — PREMIUM VIDEO EXPERIENCE
// 🔵 For You | Following | Friends | My Reels
// 🟣 Preserves existing playback and database functionality
// =========================================================

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken
} from "react-native";

import { supabase } from "../lib/supabase";

import FollowButton from "./FollowButton";
import LikeButton from "./LikeButton";
import ReelPlayer from "./ReelPlayer";

// =========================================================
// 🟢 SCREEN DIMENSIONS
// =========================================================

const { height, width } = Dimensions.get("window");

// =========================================================
// 🔵 REEL TYPE
// =========================================================

type ReelType = {
  id: string;
  media_url: string | null;
  local_uri?: string | null;
  caption?: string;
  user_id: string;
  views?: number;
  thumbnail_url?: string | null;

  // 🎵 BACKGROUND MUSIC
  music_id?: string | null;
  music_url?: string | null;
  music_title?: string | null;
  music_artist?: string | null;
  music_start_time?: number | null;
  music_duration?: number | null;
  music_volume?: number | null;
  original_volume?: number | null;
};

// =========================================================
// 🟣 REELS FEED MODE
// =========================================================

type ReelFeedMode =
  | "for_you"
  | "following"
  | "friends"
  | "my_reels";

// =========================================================
// 🔵 COMPONENT PROPS
// =========================================================

type Props = {
  reels: ReelType[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  loadMore: () => void;

  feedMode: ReelFeedMode;
  setFeedMode: (mode: ReelFeedMode) => void;

  onDelete?: (id: string) => void;
};

// =========================================================
// 🟢 FEED TAB CONFIGURATION
// =========================================================

const FEED_TABS: {
  id: ReelFeedMode;
  label: string;
}[] = [
  {
    id: "for_you",
    label: "For You",
  },
  {
    id: "following",
    label: "Following",
  },
  {
    id: "friends",
    label: "Friends",
  },
  {
    id: "my_reels",
    label: "My Reels",
  },
];

// =========================================================
// 🟢 MAIN REELS COMPONENT
// =========================================================

export default function ReelsFeed({
  reels,
  activeIndex,
  setActiveIndex,
  loadMore,
  feedMode,
  setFeedMode,
  onDelete,
}: Props) {
  const router = useRouter();

  // =====================================================
  // 🎬 SCREEN FOCUS CONTROL
  // =====================================================

  const [screenFocused, setScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);

      return () => {
        setScreenFocused(false);
      };
    }, [])
  );

  // =====================================================
  // 🔵 REFS
  // =====================================================

  const viewed = useRef<Set<string>>(new Set());
  const watchTimers = useRef<Record<string, any>>({});
  const feedRef = useRef<ReelType[]>([]);
  const feedListRef = useRef<FlatList<ReelType>>(null);

  // =====================================================
  // 🔊 SHARED REELS SOUND PERMISSION
  // =====================================================

  const [soundEnabled, setSoundEnabled] = useState(false);

  // =====================================================
  // 🟣 FEED STATE
  // =====================================================

  const [feed, setFeed] = useState<ReelType[]>([]);

  // =====================================================
  // 🟢 SYNC FEED DATA
  // =====================================================

  useEffect(() => {
    if (!Array.isArray(reels)) {
      setFeed([]);
      return;
    }

    setFeed((previous) => {
      const existingMap = new Map(
        previous.map((reel) => [reel.id, reel])
      );

      return reels.map((reel) => {
        const existing = existingMap.get(reel.id);

        return existing
          ? {
              ...reel,
              views: existing.views ?? reel.views,
            }
          : reel;
      });
    });
  }, [reels]);

  // =====================================================
  // 🔵 KEEP FEED REF UPDATED
  // =====================================================

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  // =====================================================
  // 🟣 RESET SCROLL WHEN FEED CHANGES
  // =====================================================

  useEffect(() => {
    setActiveIndex(0);

    feedListRef.current?.scrollToOffset({
      offset: 0,
      animated: false,
    });

    viewed.current.clear();

    Object.values(watchTimers.current).forEach((timer) => {
      clearTimeout(timer);
    });

    watchTimers.current = {};
  }, [feedMode, setActiveIndex]);

  // =====================================================
  // 🟢 CLEAN UP VIEW TIMERS
  // =====================================================

  useEffect(() => {
    return () => {
      Object.values(watchTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });

      watchTimers.current = {};
    };
  }, []);

  // =====================================================
  // 🔵 REAL DATABASE VIEW TRACKING
  // =====================================================

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken[];
    }) => {
      if (!viewableItems.length) return;

      const index = viewableItems[0].index;

      if (index == null) return;

      setActiveIndex(index);

      const reel = feedRef.current[index];

      if (!reel) return;

      // 🟢 CLEAR TIMERS FOR OTHER REELS

      Object.keys(watchTimers.current).forEach((id) => {
        if (id !== reel.id) {
          clearTimeout(watchTimers.current[id]);
          delete watchTimers.current[id];
        }
      });

      // 🔵 COUNT VIEW ONCE PER FEED SESSION

      if (viewed.current.has(reel.id)) return;

      if (watchTimers.current[reel.id]) return;

      watchTimers.current[reel.id] = setTimeout(
        async () => {
          if (viewed.current.has(reel.id)) {
            delete watchTimers.current[reel.id];
            return;
          }

          viewed.current.add(reel.id);

          try {
            const { error } = await (supabase as any).rpc(
              "increment_reel_views",
              {
                post_id_input: reel.id,
              }
            );

            if (error) {
              console.log("VIEW RPC ERROR:", error);
            }

            setFeed((previous) =>
              previous.map((item) =>
                item.id === reel.id
                  ? {
                      ...item,
                      views: (item.views ?? 0) + 1,
                    }
                  : item
              )
            );
          } catch (error) {
            console.log("VIEW ERROR:", error);
          }

          delete watchTimers.current[reel.id];
        },
        2000
      );
    }
  ).current;

  // =====================================================
  // 🟢 VIEWABILITY CONFIGURATION
  // =====================================================

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  // =====================================================
  // 🔵 CHANGE FEED
  // =====================================================

  const handleFeedChange = (mode: ReelFeedMode) => {
    if (mode === feedMode) return;

    setFeedMode(mode);
  };

  // =====================================================
  // 🟣 SHARE REEL
  // =====================================================

  const handleShare = async (item: ReelType) => {
    try {
      await Share.share({
        message:
          "🔥 Check out this Reel on Nasara!\n\nDiscover more on Nasara:\nhttps://nasara1.vercel.app",
      });
    } catch (error) {
      console.log("REEL SHARE ERROR:", error);
    }
  };

  // =====================================================
  // 🟢 RENDER REEL ITEM
  // =====================================================

  const renderItem = ({
    item,
    index,
  }: {
    item: ReelType;
    index: number;
  }) => {
    const isActive =
      index === activeIndex && screenFocused;

    return (
      <View style={styles.reelContainer}>

        {/* ===============================================
            🟢 VIDEO PLAYER
            =============================================== */}

        <ReelPlayer
          key={item.id}
          id={item.id}
          url={item.media_url}
          localUri={item.local_uri}
          active={isActive}
          thumbnail={item.thumbnail_url}

          // 🎵 BACKGROUND MUSIC
          music_url={item.music_url}
          music_volume={item.music_volume}
          original_volume={item.original_volume}
          music_start_time={item.music_start_time}
          music_duration={item.music_duration}

          // 🔊 AUDIO PERMISSION
          soundEnabled={soundEnabled}
          onEnableSound={() => setSoundEnabled(true)}
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

          {/* ❤️ LIKE */}

          <View style={styles.actionItem}>
            <View style={styles.actionCircle}>
              <LikeButton postId={item.id} />
            </View>

            <Text style={styles.actionLabel}>
              Like
            </Text>
          </View>

          {/* 💬 COMMENTS */}

          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionCircle}
              onPress={() =>
                router.push(
                  `/comments?postId=${item.id}`
                )
              }
            >
              <Text style={styles.actionEmoji}>
                💬
              </Text>
            </Pressable>

            <Text style={styles.actionLabel}>
              Comment
            </Text>
          </View>

          {/* 👤 FOLLOW */}

          <View style={styles.actionItem}>
            <View style={styles.actionCircle}>
              <FollowButton userId={item.user_id} />
            </View>

            <Text style={styles.actionLabel}>
              Follow
            </Text>
          </View>

          {/* 📤 SHARE */}

          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionCircle}
              onPress={() => handleShare(item)}
            >
              <Text style={styles.actionEmoji}>
                📤
              </Text>
            </Pressable>

            <Text style={styles.actionLabel}>
              Share
            </Text>
          </View>

          {/* 🛍️ SELLER SHOP */}

          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionCircle}
              onPress={() =>
                router.push(
                  `/seller-items?userId=${item.user_id}`
                )
              }
            >
              <Text style={styles.actionEmoji}>
                🛍️
              </Text>
            </Pressable>

            <Text style={styles.actionLabel}>
              Shop
            </Text>
          </View>

          {/* 🗑️ DELETE */}

          {feedMode === "my_reels" && onDelete && (
            <View style={styles.actionItem}>
              <Pressable
                style={styles.actionCircle}
                onPress={() => onDelete(item.id)}
              >
                <Text style={styles.actionEmoji}>
                  🗑️
                </Text>
              </Pressable>

              <Text style={styles.actionLabel}>
                Delete
              </Text>
            </View>
          )}

        </View>

        {/* ===============================================
            🔵 BOTTOM REEL INFORMATION
            =============================================== */}

        <View style={styles.bottomInfo}>

          {/* 👁️ VIEWS */}

          <View style={styles.viewsContainer}>
            <Text style={styles.viewsIcon}>
              ▶️
            </Text>

            <Text style={styles.views}>
              {(item.views ?? 0).toLocaleString()} views
            </Text>
          </View>

          {/* 📝 CAPTION */}

          {!!item.caption && (
            <Text
              style={styles.caption}
              numberOfLines={3}
            >
              {item.caption}
            </Text>
          )}

          {/* 🟡 NASARA BRANDING */}

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

  // =====================================================
  // 🟢 MAIN REELS INTERFACE
  // =====================================================

  return (
    <View style={styles.container}>

      {/* ===============================================
          🔵 PREMIUM TOP NAVIGATION
          =============================================== */}

      <View style={styles.topBar}>

        {/* 🟡 NASARA BRAND */}

        <View style={styles.brandSection}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>
              N
            </Text>
          </View>

          <View>
            <Text style={styles.brandTitle}>
              NASARA
            </Text>

            <Text style={styles.brandSubtitle}>
              REELS
            </Text>
          </View>
        </View>

        {/* 🟢 FEED NAVIGATION */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContainer}
        >
          {FEED_TABS.map((tab) => {
            const active = feedMode === tab.id;

            return (
              <Pressable
                key={tab.id}
                onPress={() => handleFeedChange(tab.id)}
                style={[
                  styles.tabButton,
                  active && styles.activeTabButton,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    active && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>

                {active && (
                  <View style={styles.activeTabIndicator} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

      </View>

      {/* ===============================================
          🎬 VIDEO FEED
          =============================================== */}

      {feed.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            🎬
          </Text>

          <Text style={styles.emptyTitle}>
            No Reels Yet
          </Text>

          <Text style={styles.emptyDescription}>
            New videos will appear here when creators share them.
          </Text>

          <Pressable
            style={styles.refreshButton}
            onPress={loadMore}
          >
            <Text style={styles.refreshButtonText}>
              Refresh
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={feedListRef}
          data={feed}
          extraData={activeIndex}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}

          // 🎬 MOBILE VIDEO SCROLLING
          pagingEnabled={Platform.OS !== "web"}
          snapToInterval={
            Platform.OS !== "web" ? height : undefined
          }
          snapToAlignment="start"
          decelerationRate="fast"

          // 🌐 WEB SCROLLING
          {...(Platform.OS === "web"
            ? {
                style: styles.webReelsList,
                contentContainerStyle: styles.webReelsContent,
              }
            : {})}

          showsVerticalScrollIndicator={false}

          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}

          onEndReached={loadMore}
          onEndReachedThreshold={0.5}

          // ⚡ VIDEO LOADING OPTIMISATION
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          updateCellsBatchingPeriod={50}

          // 🎬 KEEP VIDEO VIEWS MOUNTED
          removeClippedSubviews={false}

          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
        />
      )}

    </View>
  );
}

// =========================================================
// 🟢 PREMIUM NASARA REELS STYLES
// =========================================================

const styles = StyleSheet.create({

  // =====================================================
  // 🔵 MAIN CONTAINER
  // =====================================================

  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  reelContainer: {
    height,
    width,
    backgroundColor: "#000000",
    overflow: "hidden",

    ...(Platform.OS === "web"
      ? {
          scrollSnapAlign: "start",
          scrollSnapStop: "always",
        }
      : {}),
  } as any,

  // =====================================================
  // 🟣 VIDEO OVERLAYS
  // =====================================================

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

  // =====================================================
  // 🟢 TOP NAVIGATION
  // =====================================================

  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 38,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
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
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  brandSubtitle: {
    color: "#D6A83F",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 1,
  },

  // =====================================================
  // 🔵 FEED NAVIGATION
  // =====================================================

  tabsScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: width * 0.72,
  },

  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 3,
  },

  tabButton: {
    minHeight: 39,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  activeTabButton: {
    backgroundColor: "#D6A83F",
    borderColor: "#D6A83F",
  },

  tabText: {
    color: "#E0E0E0",
    fontSize: 11,
    fontWeight: "700",
  },

  activeTabText: {
    color: "#111111",
    fontWeight: "900",
  },

  activeTabIndicator: {
    display: "none",
  },

  // =====================================================
  // 🟣 RIGHT ACTION PANEL
  // =====================================================

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

  // =====================================================
  // 🟢 BOTTOM REEL INFORMATION
  // =====================================================

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
    fontWeight: "900",
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

  // =====================================================
  // 🔵 NASARA FOOTER
  // =====================================================

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

  // =====================================================
  // 🟣 EMPTY FEED
  // =====================================================

  emptyContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  emptyIcon: {
    fontSize: 55,
    marginBottom: 18,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 9,
  },

  emptyDescription: {
    color: "#AAAAAA",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  refreshButton: {
    marginTop: 22,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: "#D6A83F",
  },

  refreshButtonText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
  },

  // =====================================================
  // 🌐 WEB REELS SCROLLING
  // =====================================================

  webReelsList: {
    flex: 1,
    height: "100%",
    overflowY: "auto",
    scrollSnapType: "y mandatory",
    overscrollBehaviorY: "contain",
  } as any,
  webReelsContent: {
    flexGrow: 1,
  },
});