import { useEvent } from "expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ===== VIDEO WRAPPER ===== */
function FeedVideo({
  uri,
  play,
}: {
  uri: string;
  play: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    play ? p.play() : p.pause();
  });

  useEvent(player, "playingChange", { isPlaying: play });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 220 }}
    />
  );
}

type Item = {
  id: string;
  title?: string;
  price?: number;
  image_url?: string | null;
  video_url?: string | null;
  location?: string | null;
  user_id?: string | null;
  is_promoted?: boolean | null;
  is_boosted?: boolean | null;
  is_negotiable?: boolean | null;
  type?: "item" | "ad" | "banner";
};

export default function BrowseScreen() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [topBanners, setTopBanners] = useState<any[]>([]);
  const [topPromoted, setTopPromoted] = useState<Item[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleId, setVisibleId] = useState<string | null>(null);

  /* ================= LOAD ITEMS ================= */
  const loadItems = async () => {
    setLoading(true);

    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("items_live")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.log("ITEM LOAD ERROR:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const mapped = data.map((i: any) => ({
        ...i,
        id: String(i.id),

        // ✅ BOOST ACTIVE IF boosted_until IS FUTURE
        is_boosted: i.boosted_until && i.boosted_until > today,

        // ✅ PROMO ACTIVE IF promoted_until IS FUTURE
        is_promoted: i.promoted_until && i.promoted_until > today,

        type: "item",
      }));

      // ✅ Sort Boost first, Promo second
      mapped.sort((a: any, b: any) => {
        if (a.is_boosted && !b.is_boosted) return -1;
        if (!a.is_boosted && b.is_boosted) return 1;

        if (a.is_promoted && !b.is_promoted) return -1;
        if (!a.is_promoted && b.is_promoted) return 1;

        return 0;
      });

      setItems(mapped);
    }

    setLoading(false);
  };

  /* ================= LOAD FEED ADS (FINAL FIX) ================= */
  const loadAds = async () => {
    const today = new Date().toISOString();

    console.log("LOADING ADS... TODAY:", today);

    // ✅ CLEAN + PERFECT FILTER (NO OR BUG)
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("status", "active")
      .eq("is_active", true)
      .eq("position", "feed")

      // ✅ MUST BE WITHIN ACTIVE DATE RANGE
      .lte("starts_at", today)
      .gte("ends_at", today)

      // ✅ Latest approved ads first
      .order("approved_at", { ascending: false });

    if (error) {
      console.log("ADS LOAD ERROR:", error.message);
      return;
    }

    console.log("ADS FOUND:", data?.length);

    if (data) {
      setAds(
        data.map((ad: any) => ({
          ...ad,
          id: "ad-" + ad.id,
          type: "ad",
        }))
      );
    }
  };

  /* ================= LOAD TOP BANNERS ================= */
  const loadTopBanners = async () => {
    const today = new Date().toISOString();

    const { data } = await supabase
      .from("banner")
      .select("*")
      .eq("status", "active")
      .gt("ends_at", today)
      .order("created_at", { ascending: false });

    setTopBanners(data || []);
  };

  /* ================= LOAD INLINE BANNERS ================= */
  const loadBanners = async () => {
    const today = new Date().toISOString();

    const { data } = await supabase
      .from("banner")
      .select("*")
      .eq("status", "active")
      .gt("ends_at", today)
      .order("created_at", { ascending: false });

    setBanners(data || []);
  };

  /* ================= LOAD PROMOTED ITEMS ================= */
  const loadTopPromoted = async () => {
    const today = new Date().toISOString();

    const { data } = await supabase
      .from("items_live")
      .select("*")
      .eq("is_promoted", true)
      .gt("promoted_until", today)
      .order("promoted_until", { ascending: false })
      .limit(5);

    if (data) {
      setTopPromoted(
        data.map((i: any) => ({
          ...i,
          id: "promo-" + i.id,
          type: "item",
        }))
      );
    }
  };

  /* ================= LOAD EVERYTHING ================= */
  useFocusEffect(
    useCallback(() => {
      loadItems();
      loadAds();
      loadTopBanners();
      loadTopPromoted();
      loadBanners();
    }, [])
  );

  /* ================= VIDEO VISIBILITY ================= */
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) {
      setVisibleId(viewableItems[0].item.id);
    }
  }).current;

  const viewConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  /* ================= BUILD FEED ================= */
  const combined: Item[] = [];

  /* 🔝 TOP BANNERS */
  topBanners.forEach((b) => {
    combined.push({
      id: "top-banner-" + b.id,
      image_url: b.image_url,
      type: "banner",
    });
  });

  /* 🟡 PROMOTED STRIP */
  topPromoted.forEach((p) => combined.push(p));

  /* 📦 ITEMS + ADS + INLINE BANNERS */
  items.forEach((item, index) => {
    combined.push(item);

    /* ✅ FEED ADS every 4 items (FIXED ROTATION) */
    if ((index + 1) % 4 === 0 && ads.length > 0) {
      const adIndex = Math.floor(index / 4) % ads.length;
      const ad = ads[adIndex];

      combined.push({
        ...ad,
        id: "feed-ad-" + ad.id + "-" + index,
        type: "ad",
      });
    }

    /* INLINE BANNER every 6 items */
    if ((index + 1) % 6 === 0 && banners.length > 0) {
      const banner = banners[index % banners.length];

      combined.push({
        id: "inline-banner-" + banner.id + "-" + index,
        image_url: banner.image_url,
        type: "banner",
      });
    }
  });

  /* ================= UI ================= */
  return (
    <FlatList
      data={combined}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={() => {
        loadItems();
        loadAds();
      }}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewConfig}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        /* ===== BANNERS ===== */
        if (item.type === "banner") {
          return (
            <Image
              source={{ uri: item.image_url as string }}
              style={{
                width: "100%",
                height: 200,
                marginBottom: 12,
                borderRadius: 10,
              }}
            />
          );
        }

        /* ===== ADS ===== */
        if (item.type === "ad") {
          return item.image_url ? (
            <View style={{ marginBottom: 12 }}>
              <Image
                source={{ uri: item.image_url }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 10,
                }}
              />
            </View>
          ) : null;
        }

        const isPlaying = visibleId === item.id;

        /* ===== NORMAL ITEMS ===== */
        return (
          <TouchableOpacity
            onPress={() => router.push("/itemdetail/" + item.id)}
            style={{
              backgroundColor: "#fff",
              marginBottom: 12,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <View>
              {item.video_url ? (
                <FeedVideo uri={item.video_url} play={isPlaying} />
              ) : item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={{ width: "100%", height: 220 }}
                />
              ) : (
                <View
                  style={{
                    height: 220,
                    backgroundColor: "#eee",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text>No media</Text>
                </View>
              )}
            </View>

            <View style={{ padding: 10 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                {item.title}
              </Text>

              <Text>{item.price}</Text>

              {item.location && <Text>{item.location}</Text>}

              {item.is_boosted && (
                <Text style={{ fontWeight: "bold" }}>BOOSTED</Text>
              )}

              {item.is_promoted && (
                <Text style={{ fontWeight: "bold" }}>PROMOTED</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}