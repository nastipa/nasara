// 🔵 =====================================================
// 🔵 NASARA PREMIUM BROWSE SCREEN
// 🔵 Navy • Gold • White Marketplace Design
// 🔵 =====================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import SafeVideo from "../../components/SafeVideo";
import { supabase } from "../../lib/supabase";

// 🟡 =====================================================
// 🟡 CONFIGURATION
// 🟡 =====================================================

const CACHE_KEY = "BROWSE_ULTRA_CACHE";
const MAX_FEED_ITEMS = 500;
const PAGE_SIZE = 12;

const NAVY = "#101D38";
const NAVY_LIGHT = "#1E3A63";
const GOLD = "#D9AD55";
const GOLD_LIGHT = "#FFF6E4";
const BACKGROUND = "#F5F6FA";
const WHITE = "#FFFFFF";
const TEXT = "#17243B";
const MUTED = "#7B8799";
const BORDER = "#E9EDF3";
const GREEN = "#07865B";

let isRefreshing = false;

// 🟡 =====================================================
// 🟡 TYPES
// 🟡 =====================================================

type Item = {
  id: string;
  title?: string;
  price?: number;
  is_deal?: boolean;
  deal_price?: number;
  deal_start?: string;
  deal_end?: string;
  image_url?: string | null;
  image_urls?: string[];
  video_url?: string | null;
  location?: string | null;
  category?: string | null;
  negotiable?: boolean;
  is_negotiable?: boolean;
  seller_phone?: string | null;
  user_id?: string;
  created_at?: string;
  url?: string | null;
  original_id?: string;
  type?: "item" | "ad" | "banner" | "promoted" | "boosted";
};

type Promo = {
  id: string;
  item_id: string;
  seller_id: string;
  amount: number;
  payment_code: string;
  promoted_until: string;
  status: string;
  items_live?: {
    title?: string;
    image_url?: string;
    video_url?: string;
  };
};

// 🟡 =====================================================
// 🟡 MAIN BROWSE SCREEN
// 🟡 =====================================================

export default function BrowseScreen() {
  const router = useRouter();

  // 🔵 STATES

  const [items, setItems] = useState<Item[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [ads, setAds] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Item[]>([]);
  const [promoted, setPromoted] = useState<Item[]>([]);
  const [boosted, setBoosted] = useState<Item[]>([]);
  const [countdown, setCountdown] = useState("");

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [promos, setPromos] = useState<Promo[]>([]);

  const [userVerifiedMap, setUserVerifiedMap] = useState<{
    [key: string]: boolean;
  }>({});

  // 🔵 AI PERSONALIZATION

  const [likedCategories, setLikedCategories] = useState<string[]>([]);
  const [likedLocations, setLikedLocations] = useState<string[]>([]);
  const [recentViews, setRecentViews] = useState<string[]>([]);

  // 🔵 PAGINATION

  const lastCursor = useRef<string | null>(null);
  const lastRefreshRef = useRef(0);

  // 🔵 RESPONSIVE GRID

  const screenWidth = Dimensions.get("window").width;
  const numCols = screenWidth > 900 ? 4 : 2;
  const horizontalPadding = screenWidth > 900 ? 24 : 14;
  const cardGap = 12;

  const cardWidth =
    (screenWidth - horizontalPadding * 2 - cardGap * (numCols - 1)) /
    numCols;

  // 🟡 CATEGORIES

  const categories = [
    "All",
    "🔥 Friday Deals",
    "electronics",
    "beauty & personal care",
    "health & wellness",
    "fashion",
    "vehicles",
    "real estate",
    "food & grocery",
    "home & living",
    "education",
    "others",
  ];

  const categoryIcons: Record<string, string> = {
    All: "✦",
    "🔥 Friday Deals": "🔥",
    electronics: "📱",
    "beauty & personal care": "💄",
    "health & wellness": "💊",
    fashion: "👗",
    vehicles: "🚗",
    "real estate": "🏡",
    "food & grocery": "🥑",
    "home & living": "🛋️",
    education: "📚",
    others: "🛍️",
  };

  // 🟡 =====================================================
  // 🟡 CACHE
  // 🟡 =====================================================

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);

        if (cached) {
          setItems(JSON.parse(cached));
        }
      } catch (error) {
        console.log("Cache load error:", error);
      }
    };

    loadCache();
  }, []);

  // 🟡 =====================================================
  // 🟡 SEARCH DEBOUNCE
  // 🟡 =====================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  // 🟡 =====================================================
  // 🟡 PHONE VERIFICATION
  // 🟡 =====================================================

  useEffect(() => {
    const checkVerification = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile, error } = await (supabase as any)
        .from("profiles")
        .select("phone, phone_verified, role")
        .eq("id", user.id)
        .single();

      if (error || !profile) return;

      if (profile.role === "admin") return;

      if (!profile.phone) {
        router.replace("/verify-phone");
      }
    };

    checkVerification();
  }, []);

  // 🟡 =====================================================
  // 🟡 AUTH LISTENER
  // 🟡 =====================================================

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        setIsAdmin(
          session?.user?.email === "dinnanitipa@gmail.com"
        );

        if (!session) {
          router.replace("/browse");
        }

        refreshAll();
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🟡 =====================================================
  // 🟡 LOGOUT
  // 🟡 =====================================================

  const logoutUser = async () => {
    await supabase.auth.signOut();

    Alert.alert("Logged Out", "You are now signed out.");

    router.replace("/browse");
  };

  // 🟡 =====================================================
  // 🟡 ADMIN DELETE PRODUCT OR IMAGE
  // 🟡 =====================================================

  const deleteItem = async (item: Item) => {
    Alert.alert(
      "Delete",
      "Remove the main image or the entire post?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Image",
          onPress: async () => {
            try {
              const postId = item.original_id || item.id;

              const { data: post, error: fetchErr } = await (
                supabase as any
              )
                .from("items_live")
                .select("id,image_urls,image_url")
                .eq("id", postId)
                .single();

              if (fetchErr || !post) {
                Alert.alert("Post not found");
                return;
              }

              const images = Array.isArray(post.image_urls)
                ? [...post.image_urls]
                : post.image_url
                ? [post.image_url]
                : [];

              const imageToRemove = item.image_url || images[0];

              const updated = images.filter(
                (img: string) => img !== imageToRemove
              );

              if (updated.length === 0) {
                const { error } = await supabase
                  .from("items_live")
                  .delete()
                  .eq("id", postId);

                if (error) throw error;
              } else {
                const { error } = await (supabase as any)
                  .from("items_live")
                  .update({
                    image_urls: updated,
                    image_url: updated[0],
                  })
                  .eq("id", postId);

                if (error) throw error;
              }

              await refreshAll();
            } catch (error: any) {
              console.log("Delete image error:", error);

              Alert.alert(
                "Delete failed",
                error.message || "Try again"
              );
            }
          },
        },
        {
          text: "Delete Post",
          style: "destructive",
          onPress: async () => {
            try {
              const postId = item.original_id || item.id;

              const { error } = await supabase
                .from("items_live")
                .delete()
                .eq("id", postId);

              if (error) throw error;

              await refreshAll();
            } catch (error: any) {
              console.log("Delete post error:", error);

              Alert.alert(
                "Delete failed",
                error.message || "Try again"
              );
            }
          },
        },
      ]
    );
  };

  // 🟡 =====================================================
  // 🟡 ADMIN DELETE SPECIAL ITEMS
  // 🟡 =====================================================

  const deleteSpecialItem = async (item: Item) => {
    if (!isAdmin) return;

    Alert.alert(
      "Delete?",
      "Remove this item permanently?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              let query: any;

              if (item.type === "ad") {
                const realId = item.id.replace("ad-", "");

                query = supabase
                  .from("ads")
                  .delete()
                  .eq("id", realId);
              } else if (item.type === "banner") {
                const realId = item.id.replace("banner-", "");

                query = supabase
                  .from("banner")
                  .delete()
                  .eq("id", realId);
              } else if (item.type === "promoted") {
                query = supabase
                  .from("promoted")
                  .delete()
                  .eq("id", item.id);
              } else if (item.type === "boosted") {
                query = (supabase as any)
                  .from("items_live")
                  .update({
                    is_boosted: false,
                    boosted_until: null,
                  })
                  .eq("id", item.id);
              } else {
                query = supabase
                  .from("items_live")
                  .delete()
                  .eq("id", item.id);
              }

              const { error } = await query;

              if (error) {
                Alert.alert("Delete Failed", error.message);
                return;
              }

              Alert.alert("Success", "Item removed");

              refreshAll();
            } catch (error) {
              console.log(error);

              Alert.alert("Error", "Something went wrong");
            }
          },
        },
      ]
    );
  };

 // 🟡 LOAD LIVE STREAMS

const loadLiveStreams = async () => {
  const { data, error } = await supabase
    .from("live_streams")
    .select(`
      id,
      title,
      status,
      is_active,
      user_id,
      created_at
    `)
    .eq("status", "live")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.log("Live load error:", error.message);
    return;
  }

  setLiveStreams(data ?? []);
};

  // 🟡 =====================================================
  // 🟡 AI PREFERENCES
  // 🟡 =====================================================

  const loadAIPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await (supabase as any)
        .from("user_feed_activity")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data) return;

      setLikedCategories(
        data.map((x: any) => x.category).filter(Boolean)
      );

      setLikedLocations(
        data.map((x: any) => x.location).filter(Boolean)
      );

      setRecentViews(
        data.map((x: any) => x.item_id).filter(Boolean)
      );
    } catch (error) {
      console.log("AI preference error:", error);
    }
  };

  // 🟡 =====================================================
  // 🟡 REFRESH ALL
  // 🟡 =====================================================

  const refreshAll = async () => {
    if (isRefreshing) return;

    isRefreshing = true;

    setHasMore(true);
    lastCursor.current = null;

    try {
      await Promise.all([
        loadItems(true),
        loadLiveStreams(),
        loadAIPreferences(),
      ]);

      loadPromoted();
      loadBoosted();
      loadAds();
      loadBanners();
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      isRefreshing = false;
      lastRefreshRef.current = Date.now();
    }
  };

  // 🟡 =====================================================
  // 🟡 LOAD ITEMS - GROUP MULTIPLE IMAGES
  // 🟡 =====================================================

  const loadItems = async (reset = false) => {
    if (loadingMore) return;

    setLoadingMore(true);

    try {
      let query = supabase
        .from("items_live")
        .select(`
          id,
          title,
          price,
          deal_price,
          is_deal,
          deal_start,
          deal_end,
          image_url,
          image_urls,
          video_url,
          location,
          category,
          is_negotiable,
          seller_phone,
          user_id,
          created_at
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!reset && lastCursor.current) {
        query = query.lt("created_at", lastCursor.current);
      }

      if (
        selectedCategory !== "All" &&
        selectedCategory !== "🔥 Friday Deals"
      ) {
        query = query.eq("category", selectedCategory);
      }

      if (debouncedSearch) {
        query = query.or(
          `title.ilike.%${debouncedSearch}%,location.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query;

      if (error || !data) {
        console.log("Items load error:", error?.message);
        return;
      }

      // 🟢 IMPORTANT:
      // Each database product now becomes ONE feed item.
      // All its images remain attached to that item.

      const mapped: Item[] = data.map((i: any) => {
        const images =
          Array.isArray(i.image_urls) && i.image_urls.length > 0
            ? i.image_urls
            : i.image_url
            ? [i.image_url]
            : [];

        return {
          id: String(i.id),
          original_id: String(i.id),
          title: i.title,
          price: i.price,
          is_deal: i.is_deal,
          deal_price: i.deal_price,
          deal_start: i.deal_start,
          deal_end: i.deal_end,
          image_url: images[0] || null,
          image_urls: images,
          video_url: i.video_url,
          location: i.location,
          category: i.category,
          negotiable: Boolean(i.is_negotiable),
          is_negotiable: Boolean(i.is_negotiable),
          seller_phone: i.seller_phone,
          user_id: i.user_id,
          created_at: i.created_at,
          type: "item",
        };
      });

      setTimeout(() => {
        loadVerifiedUsers(mapped);
      }, 200);

      if (mapped.length > 0) {
        lastCursor.current =
          mapped[mapped.length - 1].created_at || null;
      }

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const now = new Date();

      let finalItems = mapped;

      if (selectedCategory === "🔥 Friday Deals") {
        finalItems = mapped.filter((item) => {
          if (!item.is_deal) return false;

          if (!item.deal_start || !item.deal_end) return true;

          return (
            new Date(item.deal_start) <= now &&
            new Date(item.deal_end) >= now
          );
        });
      }

      if (reset) {
        setItems(finalItems);
      } else {
        setItems((prev) => {
          const merged = [...prev, ...finalItems];

          return Array.from(
            new Map(
              merged.map((item) => [item.id, item])
            ).values()
          ).slice(0, 300);
        });
      }

      try {
        const mergedCache = reset
          ? finalItems
          : [...items, ...finalItems];

        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify(
            mergedCache.slice(0, MAX_FEED_ITEMS)
          )
        );
      } catch (error) {
        console.log("Cache save error:", error);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // 🟡 =====================================================
  // 🟡 VERIFIED SELLERS
  // 🟡 =====================================================

  const loadVerifiedUsers = async (itemsList: Item[]) => {
    const ids = [
      ...new Set(
        itemsList
          .map((item) => item.user_id)
          .filter(Boolean)
      ),
    ];

    if (ids.length === 0) return;

    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, verified")
      .in("id", ids);

    if (data) {
      const map: any = {};

      data.forEach((profile: any) => {
        map[profile.id] = profile.verified === true;
      });

      setUserVerifiedMap((prev) => ({
        ...prev,
        ...map,
      }));
    }
  };

  // 🟡 =====================================================
  // 🟡 AI TRACKING
  // 🟡 =====================================================

  const trackInteraction = async (
    item: Item,
    action: "view" | "chat" | "share"
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await (supabase as any)
        .from("user_feed_activity")
        .insert({
          user_id: user.id,
          item_id: item.original_id || item.id,
          category: item.category,
          location: item.location,
          action,
        });
    } catch (error) {
      console.log("AI tracking error:", error);
    }
  };

  const trackFeedAction = async (
    item: Item,
    action: string
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await (supabase as any)
        .from("user_feed_activity")
        .insert({
          user_id: user.id,
          item_id: Number(item.original_id || item.id),
          action,
          category: item.category || null,
        });
    } catch (error) {
      console.log("Track error:", error);
    }
  };

  // 🟡 =====================================================
  // 🟡 SHARE PRODUCT
  // 🟡 =====================================================

  const shareItem = async (item: Item) => {
    try {
      const link =
       ` https://nasara-six.vercel.app/item/${item.original_id || item.id}`;

      trackInteraction(item, "share");
      await trackFeedAction(item, "share");

      await Share.share({
        message: `🔥 Check this on Nasara:\n${item.title}\n${link}`,
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  // 🟡 =====================================================
  // 🟡 PROMOTED ITEMS
  // 🟡 =====================================================

  const loadPromoted = async () => {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("promoted")
      .select(`
        id,
        promoted_until,
        created_at,
        items_live (
          id,
          title,
          price,
          image_url,
          image_urls,
          video_url,
          location,
          category
        )
      `)
      .eq("status", "approved")
      .gt("promoted_until", today)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.log("Promoted Error:", error.message);
      return;
    }

    if (!data) return;

    const formatted = data
      .map((p: any) => {
        const item = p.items_live;

        if (!item) return null;

        const images =
          Array.isArray(item.image_urls) &&
          item.image_urls.length > 0
            ? item.image_urls
            : item.image_url
            ? [item.image_url]
            : [];

        return {
          id: String(item.id),
          original_id: String(item.id),
          title: item.title,
          price: item.price,
          image_url: images[0] || null,
          image_urls: images,
          video_url: item.video_url,
          location: item.location,
          category: item.category,
          created_at: p.created_at,
          type: "promoted" as const,
        };
      })
      .filter(Boolean) as Item[];

    formatted.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    setPromoted(formatted);
  };

  // 🟡 =====================================================
  // 🟡 BOOSTED ITEMS
  // 🟡 =====================================================

  const loadBoosted = async () => {
    const today = new Date().toISOString();

    let query = supabase
      .from("items_live")
      .select("*")
      .eq("is_boosted", true)
      .gt("boosted_until", today)
      .order("created_at", { ascending: false })
      .limit(20);

    if (
      selectedCategory !== "All" &&
      selectedCategory !== "🔥 Friday Deals"
    ) {
      query = query.eq("category", selectedCategory);
    }

    const { data } = await query;

    if (data) {
      setBoosted(
        data.map((b: any) => {
          const images =
            Array.isArray(b.image_urls) && b.image_urls.length > 0
              ? b.image_urls
              : b.image_url
              ? [b.image_url]
              : [];

          return {
            id: String(b.id),
            original_id: String(b.id),
            title: b.title,
            price: b.price,
            image_url: images[0] || null,
            image_urls: images,
            video_url: b.video_url,
            location: b.location,
            category: b.category,
            created_at: b.created_at,
            negotiable: Boolean(b.is_negotiable),
            type: "boosted" as const,
          };
        })
      );
    }
  };

  // 🟡 =====================================================
  // 🟡 ADS
  // 🟡 =====================================================

  const loadAds = async () => {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .in("status", ["approved", "active"])
      .eq("is_active", true)
      .or(`expires_at.gt.${today},expires_at.is.null`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.log("Ads Load Error:", error.message);
      return;
    }

    if (!data) {
      setAds([]);
      return;
    }

    const cleaned = data
      .filter(
        (ad: any) =>
          !ad.expires_at || ad.expires_at > today
      )
      .filter(
        (ad: any) =>
          ad.title && ad.title.trim() !== ""
      )
      .map((ad: any) => ({
        id: "ad-" + ad.id,
        title: ad.title,
        image_url: ad.image_url,
        video_url: ad.video_url,
        url: ad.link || ad.url,
        expires_at: ad.expires_at,
        created_at: ad.created_at,
        type: "ad" as const,
      }));

    setAds(cleaned);
  };

  // 🟡 =====================================================
  // 🟡 BANNERS
  // 🟡 =====================================================

  const loadBanners = async () => {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("banner")
      .select("*")
      .in("status", ["approved", "active"])
      .eq("is_active", true)
      .or(`expires_at.gt.${today},expires_at.is.null`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.log("Banner Load Error:", error.message);
      return;
    }

    if (!data) {
      setBanners([]);
      return;
    }

    const cleaned = data
      .filter(
        (banner: any) =>
          !banner.expires_at || banner.expires_at > today
      )
      .filter(
        (banner: any) =>
          banner.title && banner.title.trim() !== ""
      )
      .map((banner: any) => ({
        id: "banner-" + banner.id,
        title: banner.title,
        image_url: banner.image_url,
        video_url: banner.video_url,
        url: banner.url,
        expires_at: banner.expires_at,
        created_at: banner.created_at,
        type: "banner" as const,
      }));

    setBanners(cleaned);
  };

  // 🟡 =====================================================
  // 🟡 AUTO REFRESH
  // 🟡 =====================================================

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // 🟡 =====================================================
  // 🟡 REALTIME LIVE STREAMS
  // 🟡 =====================================================

  useEffect(() => {
    const channel = supabase
      .channel("live-streams-" + Math.random().toString())
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          loadLiveStreams();
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🟡 =====================================================
  // 🟡 APP REFRESH
  // 🟡 =====================================================

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (
          state === "active" &&
          Date.now() - lastRefreshRef.current > 30000
        ) {
          refreshAll();
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // 🟡 =====================================================
  // 🟡 INITIAL LOAD
  // 🟡 =====================================================

  useEffect(() => {
    setItems([]);
    lastCursor.current = null;
    setHasMore(true);

    refreshAll();
  }, [selectedCategory, debouncedSearch]);

  // 🟡 =====================================================
  // 🟡 FRIDAY COUNTDOWN
  // 🟡 =====================================================

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const friday = new Date();

      const day = friday.getDay();
      const days = day <= 5 ? 5 - day : 12 - day;

      friday.setDate(friday.getDate() + days);
      friday.setHours(0, 0, 0, 0);

      const diff = friday.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("🔥 Friday Deals are LIVE!");
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);

      setCountdown(`${d}d ${h}h ${m}m`);
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  // 🟡 =====================================================
  // 🟡 FORCE DEAL TIME UPDATES
  // 🟡 =====================================================

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate((x) => x + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // 🟡 =====================================================
  // 🟡 CLEAN ITEMS
  // 🟡 =====================================================

  const cleanItems = useMemo(() => {
    const specialIds = new Set([
      ...promoted.map((x) => x.id),
      ...boosted.map((x) => x.id),
    ]);

    return items.filter(
      (x) => !specialIds.has(x.original_id || x.id)
    );
  }, [items, promoted, boosted]);

  // 🟡 =====================================================
  // 🟡 PRIORITY FEED
  // 🟡 =====================================================

  const combined: Item[] = useMemo(() => {
    const sortByNewest = (list: Item[]) =>
      [...list].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

    const paidAds = sortByNewest(ads);
    const bannerItems = sortByNewest(banners);
    const promotedItems = sortByNewest(promoted);
    const boostedItems = sortByNewest(boosted);

    let normalItems = sortByNewest(cleanItems);

    if (
      selectedCategory !== "All" &&
      selectedCategory !== "🔥 Friday Deals"
    ) {
      normalItems = normalItems.filter(
        (item) => item.category === selectedCategory
      );
    }

    const search = debouncedSearch.toLowerCase();

    const filterPromotions = (list: Item[]) => {
      if (!search) return list;

      return list.filter((item) =>
        item.title?.toLowerCase().includes(search)
      );
    };

    return [
      ...filterPromotions(paidAds),
      ...filterPromotions(bannerItems),
      ...filterPromotions(promotedItems),
      ...filterPromotions(boostedItems),
      ...normalItems,
    ];
  }, [
    ads,
    banners,
    promoted,
    boosted,
    cleanItems,
    selectedCategory,
    debouncedSearch,
  ]);

  // 🟡 =====================================================
  // 🟡 PAGINATION
  // 🟡 =====================================================

  const loadMore = () => {
    if (!hasMore || loadingMore) return;

    loadItems(false);
  };

  // 🟡 =====================================================
  // 🟡 OPEN ITEM
  // 🟡 =====================================================

  const handlePress = async (item: Item) => {
    await trackFeedAction(item, "click");

    if (item.type === "ad" || item.type === "banner") {
      if (item.url) {
        if (typeof window !== "undefined") {
          window.location.href = item.url;
        } else {
          Linking.openURL(item.url);
        }
      }

      return;
    }

    router.push(
      "/itemdetail/" + (item.original_id || item.id)
    );
  };

  // 🟡 =====================================================
  // 🟡 DEAL COUNTDOWN
  // 🟡 =====================================================

  const getDealTimeLeft = (dealEnd?: string) => {
    if (!dealEnd) return null;

    const diff = new Date(dealEnd).getTime() - Date.now();

    if (diff <= 0) return "Expired";

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);

    return `${d}d ${h}h ${m}m left`;
  };

  // 🟡 =====================================================
  // 🟡 PRODUCT CHAT - FIND AND REUSE OLD CONVERSATION
  // 🟡 =====================================================

  const openSellerChat = async (item: Item) => {
    const { data, error: authError } =
      await supabase.auth.getUser();

    const currentUserId = data.user?.id;
    const sellerId = item.user_id;

    if (authError || !currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    if (!sellerId) {
      Alert.alert("Error", "Seller not found");
      return;
    }

    if (currentUserId === sellerId) {
      Alert.alert("Notice", "This is your own item.");
      return;
    }

    try {
      let existingRoom: any = null;

      // 🔵 FIRST: Search using the normal buyer/seller order.
      const { data: directRoom, error: directError } =
        await (supabase as any)
          .from("chat_rooms")
          .select("id")
          .eq("buyer_id", currentUserId)
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (directError) {
        console.log("Direct chat search error:", directError);
        Alert.alert("Chat Error", directError.message);
        return;
      }

      existingRoom = directRoom;

      // 🔵 SECOND: Search with buyer and seller reversed.
      if (!existingRoom) {
        const { data: reverseRoom, error: reverseError } =
          await (supabase as any)
            .from("chat_rooms")
            .select("id")
            .eq("buyer_id", sellerId)
            .eq("seller_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (reverseError) {
          console.log("Reverse chat search error:", reverseError);
          Alert.alert("Chat Error", reverseError.message);
          return;
        }

        existingRoom = reverseRoom;
      }

      let roomId = existingRoom?.id;

      // 🟢 CREATE A ROOM ONLY IF NO OLD CONVERSATION EXISTS.
      if (!roomId) {
        const postId = item.original_id || item.id;

        const { data: newRoom, error: createError } =
          await (supabase as any)
            .from("chat_rooms")
            .insert({
              item_id: postId,
              buyer_id: currentUserId,
              seller_id: sellerId,
            })
            .select("id")
            .single();

        if (createError) {
          console.log("Chat creation error:", createError);
          Alert.alert("Chat Failed", createError.message);
          return;
        }

        roomId = newRoom.id;
      }

      // 🟡 RECORD FEED ACTIVITY.
      trackInteraction(item, "chat");
      await trackFeedAction(item, "chat");

      // 🟢 OPEN THE EXISTING OR NEW ROOM.
      router.push({
        pathname: "/chat/[id]",
        params: { id: roomId },
      });

    } catch (error: any) {
      console.log("Browse chat error:", error);
      Alert.alert("Error", "Could not open chat.");
    }
  };
  // 🟡 =====================================================
  // 🟡 MAIN UI
  // 🟡 =====================================================

  return (
    <FlatList
      key={`browse-${numCols}`}
      data={combined}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      numColumns={numCols}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews={true}
      columnWrapperStyle={
        numCols > 1
          ? {
              gap: cardGap,
              justifyContent: "flex-start",
            }
          : undefined
      }
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingTop: 12,
        paddingBottom: 35,
        backgroundColor: BACKGROUND,
      }}
      style={{
        backgroundColor: BACKGROUND,
      }}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator color={GOLD} size="large" />
            <Text style={styles.loadingText}>
              Discovering more on Nasara...
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !loadingMore ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyTitle}>
              Nothing to display yet
            </Text>
            <Text style={styles.emptyDescription}>
              Try another search or explore a different category.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                setSelectedCategory("All");
                refreshAll();
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>
                Explore All Products
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>

          {/* 🔵 PREMIUM HEADER */}

          <LinearGradient
            colors={[NAVY, NAVY_LIGHT, "#294B76"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <View>
                <View style={styles.brandRow}>
                  <View style={styles.brandIcon}>
                    <Text style={styles.brandIconText}>N</Text>
                  </View>

                  <Text style={styles.brandName}>
                    NASARA
                  </Text>
                </View>

                <Text style={styles.headerTagline}>
                  Discover. Connect. Trade.
                </Text>
              </View>

              {/* 🔵 DISCOVER USERS • CONTACTS • SETTINGS */}

<View style={styles.headerActions}>

  {/* 👥 DISCOVER USERS — EXISTING FEATURE */}

  <TouchableOpacity
    onPress={() => router.push("/discover")}
    style={styles.headerIconButton}
    activeOpacity={0.8}
  >
    <Text style={styles.headerIcon}>👥</Text>
  </TouchableOpacity>

  {/* 📇 CONTACTS — NEW FEATURE */}

  <TouchableOpacity
    onPress={() => router.push("/contacts")}
    style={styles.headerIconButton}
    activeOpacity={0.8}
  >
    <Text style={styles.headerIcon}>📇</Text>
  </TouchableOpacity>

  {/* ⚙️ SETTINGS — EXISTING FEATURE */}

  <TouchableOpacity
    onPress={() => router.push("/settings")}
    style={styles.headerIconButton}
    activeOpacity={0.8}
  >
    <Text style={styles.headerIcon}>⚙️</Text>
  </TouchableOpacity>

</View>
            </View>

            <View style={styles.headerDivider} />

            <Text style={styles.headerWelcome}>
              Your marketplace.
            </Text>

            <Text style={styles.headerWelcomeGold}>
              Your opportunities.
            </Text>

            <Text style={styles.headerDescription}>
              Find products, discover sellers and connect with opportunities.
            </Text>

            {!user && (
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
                style={styles.signInButton}
              >
                <Text style={styles.signInText}>
                  Sign In / Create Account
                </Text>

                <Text style={styles.signInArrow}>→</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  "https://expo.dev/artifacts/eas/6f60JxLlU8pBM04e11_v5zcbg8lBTJOeRAORe3EHVFE.apk"
                )
              }
              style={styles.downloadButton}
            >
              <Text style={styles.downloadIcon}>📱</Text>

              <Text style={styles.downloadText}>
                Download Nasara Android App
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* 🔵 SEARCH */}

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              placeholder="Search products, sellers and more..."
              placeholderTextColor="#A0A8B5"
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
              returnKeyType="search"
            />

            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText("")}
                style={styles.clearSearch}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 🔵 LIVE SELLERS */}

          {liveStreams.length > 0 && (
            <View style={styles.liveSection}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.liveTitleRow}>
                  <View style={styles.liveDot} />

                  <Text style={styles.sectionTitle}>
                    Sellers Live Now
                  </Text>
                </View>

                <Text style={styles.liveCount}>
                  {liveStreams.length} LIVE
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {liveStreams.map((live) => (
                  <TouchableOpacity
                    key={live.id}
                    onPress={() =>
                      router.push(`/watch-video/${live.id}`)
                    }
                    style={styles.liveCard}
                  >
                    <View style={styles.liveAvatar}>
                      <Text style={styles.liveAvatarText}>▶️</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={styles.liveCardTitle}
                      >
                        {live.title || "Seller is Live"}
                      </Text>

                      <Text style={styles.liveCardSubtitle}>
                        Tap to watch
                      </Text>
                    </View>

                    <Text style={styles.liveArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 🔵 FRIDAY MARKET */}

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() =>
              setSelectedCategory("🔥 Friday Deals")
            }
            style={styles.fridayCard}
          >
            <LinearGradient
              colors={["#FFF7E5", "#FFE8B6", "#F8D88E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fridayGradient}
            >
              <View style={styles.fridayTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.fridayTag}>
                    <Text style={styles.fridayTagText}>
                      NASARA SPECIAL
                    </Text>
                  </View>

                  <Text style={styles.fridayTitle}>
                    Friday Market
                  </Text>

                  <Text style={styles.fridayDescription}>
                    Discover exclusive offers from sellers.
                  </Text>
                </View>

                <View style={styles.fridayEmojiContainer}>
                  <Text style={styles.fridayEmoji}>🛍️</Text>
                </View>
              </View>

              <View style={styles.fridayBottom}>
                <View>
                  <Text style={styles.fridayCountdownLabel}>
                    NEXT MARKET
                  </Text>

                  <Text style={styles.fridayCountdown}>
                    ⏳ {countdown}
                  </Text>
                </View>

                <View style={styles.fridayExplore}>
                  <Text style={styles.fridayExploreText}>
                    Explore →
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 🔵 CATEGORIES */}

          <View style={styles.categorySection}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  Explore Categories
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Find what you are looking for
                </Text>
              </View>

              <Text style={styles.categorySparkle}>✦</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingRight: 10,
              }}
            >
              {categories.map((cat) => {
                const active = selectedCategory === cat;

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.85}
                    style={[
                      styles.categoryButton,
                      active && styles.categoryButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryIcon,
                        active && styles.categoryIconActive,
                      ]}
                    >
                      {categoryIcons[cat] || "🛍️"}
                    </Text>

                    <Text
                      style={[
                        styles.categoryText,
                        active && styles.categoryTextActive,
                      ]}
                    >
                      {cat === "All"
                        ? "All"
                        : cat
                            .replace("🔥 ", "")
                            .replace(/\b\w/g, (c) =>
                              c.toUpperCase()
                            )}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 🔵 FEED HEADING */}

          <View style={styles.feedHeading}>
            <View>
              <Text style={styles.feedTitle}>
                {selectedCategory === "All"
                  ? "Discover Products"
                  : selectedCategory.replace("🔥 ", "")}
              </Text>

              <Text style={styles.feedSubtitle}>
                Explore products and connect with sellers.
              </Text>
            </View>

            <View style={styles.feedIcon}>
              <Text style={styles.feedIconText}>✦</Text>
            </View>
          </View>

        </View>
      }
      renderItem={({ item }) => {
        const images =
          Array.isArray(item.image_urls) &&
          item.image_urls.length > 0
            ? item.image_urls
            : item.image_url
            ? [item.image_url]
            : [];

        const isVerified =
          userVerifiedMap[item.user_id || ""] === true;

        const dealTime = getDealTimeLeft(item.deal_end);

        return (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => handlePress(item)}
            style={[
              styles.productCard,
              { width: cardWidth },
            ]}
          >
            {/* 🟡 PRODUCT IMAGE GALLERY */}

            <View style={styles.productImageContainer}>
              {item.video_url ? (
                <SafeVideo url={item.video_url} />
              ) : images.length > 0 ? (
                <ProductImageGallery
                  images={images}
                  width={cardWidth}
                />
              ) : (
                <View style={styles.noMedia}>
                  <Text style={styles.noMediaIcon}>🛍️</Text>

                  <Text style={styles.noMediaText}>
                    No image available
                  </Text>
                </View>
              )}

              

              {/* 🟡 BADGES */}

              <View
                pointerEvents="none"
                style={styles.badgeContainer}
              >
                {item.type === "ad" && (
                  <Badge label="📢 AD" />
                )}

                {item.type === "banner" && (
                  <Badge label="🎯 BANNER" />
                )}

                {item.type === "promoted" && (
                  <Badge label="⭐ PROMOTED" />
                )}

                {item.type === "boosted" && (
                  <Badge label="🚀 BOOSTED" />
                )}

                {item.is_deal === true && (
                  <Badge label="🔥 DEAL" />
                )}

                {(item.negotiable || item.is_negotiable) && (
                  <Badge label="NEGOTIABLE" />
                )}
              </View>

              {/* 🟡 ADMIN DELETE */}

              {isAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    if (item.type === "item") {
                      deleteItem(item);
                    } else {
                      deleteSpecialItem(item);
                    }
                  }}
                  style={styles.adminDelete}
                >
                  <Text style={styles.adminDeleteText}>
                    🗑️
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 🟡 PRODUCT DETAILS */}

            <View style={styles.productDetails}>
              <View style={styles.productTitleRow}>
                <Text
                  numberOfLines={2}
                  style={styles.productTitle}
                >
                  {item.title || "Untitled Product"}
                </Text>

                {isVerified && (
                  <Text style={styles.verifiedBadge}>
                    ✓
                  </Text>
                )}
              </View>

              {/* 🟡 PRICE */}

              {item.is_deal && item.deal_price ? (
                <View style={styles.dealPriceContainer}>
                  <Text style={styles.originalPrice}>
                    GH₵ {item.price}
                  </Text>

                  <Text style={styles.dealPrice}>
                    GH₵ {item.deal_price}
                  </Text>

                  {item.price !== undefined && (
                    <Text style={styles.savingText}>
                      Save GH₵{" "}
                      {Math.max(
                        0,
                        Number(item.price) -
                          Number(item.deal_price)
                      ).toFixed(2)}
                    </Text>
                  )}

                  {dealTime && (
                    <Text style={styles.dealTime}>
                      ⏳ {dealTime}
                    </Text>
                  )}
                </View>
              ) : item.price !== undefined &&
                item.price !== null ? (
                <Text style={styles.productPrice}>
                  GH₵ {Number(item.price).toLocaleString()}
                </Text>
              ) : null}

              {/* 🟡 LOCATION */}

              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>⌖</Text>

                <Text
                  numberOfLines={1}
                  style={styles.locationText}
                >
                  {item.location || "Location not specified"}
                </Text>
              </View>

              {/* 🟡 SELLER PHONE NUMBER */}

              {item.type === "item" && item.seller_phone ? (
                <View style={styles.sellerPhoneContainer}>
                  <Text style={styles.sellerPhoneIcon}>
                    📞
                  </Text>

                  <Text
                    numberOfLines={1}
                    style={styles.sellerPhoneText}
                  >
                    {item.seller_phone}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={(event) => {
                      event.stopPropagation?.();

                      const phone = String(
                        item.seller_phone || ""
                      ).trim();

                      if (!phone) return;

                      Linking.openURL("tel:" + phone).catch(
                        (error) => {
                          console.log("Phone call error:", error);

                          Alert.alert(
                            "Call Error",
                            "Could not open the phone dialer."
                          );
                        }
                      );
                    }}
                    style={styles.sellerCallButton}
                  >
                    <Text style={styles.sellerCallButtonText}>
                      Call
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 🟡 ACTIONS */}

              <View style={styles.productActions}>
                <TouchableOpacity
                  onPress={() => shareItem(item)}
                  style={styles.shareButton}
                >
                  <Text style={styles.shareButtonText}>
                    ↗️ Share
                  </Text>
                </TouchableOpacity>

                {item.type === "item" && item.user_id && (
                  <TouchableOpacity
                    onPress={() => openSellerChat(item)}
                    style={styles.chatButton}
                  >
                    <Text style={styles.chatButtonText}>
                      Chat
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 🟡 VIEW SELLER SHOP */}

{item.user_id && (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() =>
      router.push("/sellers/" + item.user_id)
    }
    style={styles.profileButton}
  >
    <Text style={styles.profileButtonText}>
      🛍️ View Seller Shop
    </Text>

    <Text style={styles.profileArrow}>
      →
    </Text>
  </TouchableOpacity>
)}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// 🟡 =====================================================
// 🟡 PRODUCT IMAGE GALLERY
// 🟡 AUTOMATIC SLIDESHOW + MANUAL SWIPING
// 🟡 =====================================================

function ProductImageGallery({
  images,
  width,
}: {
  images: string[];
  width: number;
}) {
  // 🔵 CURRENT IMAGE
  const [activeIndex, setActiveIndex] = useState(0);

  // 🔵 FLATLIST REFERENCE
  const galleryRef = useRef<FlatList<string>>(null);

  // 🔵 KEEP IMAGE INDEX WITHIN VALID RANGE
  useEffect(() => {
    setActiveIndex(0);

    galleryRef.current?.scrollToOffset({
      offset: 0,
      animated: false,
    });
  }, [images.length, width]);

  // 🟡 AUTOMATIC IMAGE SLIDING
  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const timer = setTimeout(() => {
      const nextIndex =
        (activeIndex + 1) % images.length;

      galleryRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });

      setActiveIndex(nextIndex);
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeIndex, images.length]);

  // 🔵 MANUAL SWIPE DETECTION
  const handleScrollEnd = (event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / width
    );

    const safeIndex = Math.max(
      0,
      Math.min(index, images.length - 1)
    );

    setActiveIndex(safeIndex);
  };

  return (
    <View style={styles.galleryContainer}>

      {/* 🟡 IMAGE SLIDESHOW */}

      <FlatList
        ref={galleryRef}
        data={images}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        keyExtractor={(image, index) =>
          `${index}-${image}`
        }
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={(info) => {
          galleryRef.current?.scrollToOffset({
            offset: info.index * width,
            animated: true,
          });
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{
              width,
              height: width * 1.05,
            }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        )}
      />

      {/* 🟡 IMAGE COUNTER */}

      {images.length > 1 && (
        <View style={styles.galleryCounter}>
          <Text style={styles.galleryCounterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>
      )}

      {/* 🟡 IMAGE INDICATORS */}

      {images.length > 1 && (
        <View style={styles.galleryDots}>
          {images.slice(0, 6).map((_, index) => (
            <View
              key={index}
              style={[
                styles.galleryDot,
                activeIndex === index &&
                  styles.galleryDotActive,
              ]}
            />
          ))}

          {images.length > 6 && (
            <Text style={styles.galleryMore}>
              +{images.length - 6}
            </Text>
          )}
        </View>
      )}

    </View>
  );
}

// 🟡 =====================================================
// 🟡 PROMOTIONAL BADGE
// 🟡 =====================================================

function Badge({ label }: { label: string }) {
  let backgroundColor = NAVY;

  if (label.includes("AD")) {
    backgroundColor = "#2563EB";
  } else if (label.includes("BANNER")) {
    backgroundColor = "#7C3AED";
  } else if (label.includes("PROMOTED")) {
    backgroundColor = "#C18428";
  } else if (label.includes("BOOSTED")) {
    backgroundColor = "#07865B";
  } else if (label.includes("DEAL")) {
    backgroundColor = "#DC2626";
  } else if (label.includes("NEGOTIABLE")) {
    backgroundColor = "#475569";
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
      ]}
    >
      <Text style={styles.badgeText}>
        {label}
      </Text>
    </View>
  );
}

// 🟡 =====================================================
// 🟡 STYLES
// 🟡 =====================================================

const styles = StyleSheet.create({

  // 🔵 HEADER

  header: {
    padding: 21,
    borderRadius: 25,
    marginBottom: 17,
    overflow: "hidden",
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  brandIconText: {
    color: NAVY,
    fontSize: 23,
    fontWeight: "900",
  },

  brandName: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },

  headerTagline: {
    color: "#D7DFEB",
    fontSize: 11,
    marginTop: 5,
    letterSpacing: 0.6,
  },

  headerActions: {
    flexDirection: "row",
    gap: 9,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  headerIcon: {
    fontSize: 18,
  },

  headerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    marginVertical: 19,
  },

  headerWelcome: {
    color: WHITE,
    fontSize: 25,
    fontWeight: "900",
  },

  headerWelcomeGold: {
    color: GOLD,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 2,
  },

  headerDescription: {
    color: "#D6DFEC",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 15,
  },

  signInButton: {
    backgroundColor: WHITE,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  signInText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "900",
  },

  signInArrow: {
    color: NAVY,
    fontSize: 20,
    fontWeight: "900",
  },

  downloadButton: {
    backgroundColor: "rgba(255,255,255,0.11)",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  downloadIcon: {
    marginRight: 8,
    fontSize: 15,
  },

  downloadText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 12,
  },

  // 🔵 SEARCH

  searchContainer: {
    backgroundColor: WHITE,
    minHeight: 55,
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    shadowColor: NAVY,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  searchIcon: {
    color: GOLD,
    fontSize: 27,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    paddingVertical: 12,
  },

  clearSearch: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F1F3F7",
    alignItems: "center",
    justifyContent: "center",
  },

  clearSearchText: {
    color: MUTED,
    fontSize: 20,
  },

  // 🔵 SECTION HEADINGS

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  // 🔵 LIVE SELLERS

  liveSection: {
    backgroundColor: WHITE,
    padding: 15,
    borderRadius: 18,
    marginBottom: 19,
    borderWidth: 1,
    borderColor: BORDER,
  },

  liveTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },

  liveCount: {
    color: "#DC2626",
    fontWeight: "900",
    fontSize: 10,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  liveCard: {
    width: 230,
    backgroundColor: "#F8F9FC",
    borderRadius: 14,
    padding: 11,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  liveAvatar: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  liveAvatarText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "900",
  },

  liveCardTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },

  liveCardSubtitle: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  liveArrow: {
    color: GOLD,
    fontSize: 24,
    marginLeft: 5,
  },

  // 🔵 FRIDAY MARKET

  fridayCard: {
    borderRadius: 21,
    overflow: "hidden",
    marginBottom: 23,
  },

  fridayGradient: {
    padding: 17,
  },

  fridayTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  fridayTag: {
    backgroundColor: "rgba(146,64,14,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    alignSelf: "flex-start",
  },

  fridayTagText: {
    color: "#92400E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  fridayTitle: {
    color: "#713F12",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 9,
  },

  fridayDescription: {
    color: "#92400E",
    fontSize: 11,
    marginTop: 5,
  },

  fridayEmojiContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  fridayEmoji: {
    fontSize: 38,
  },

  fridayBottom: {
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(146,64,14,0.17)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fridayCountdownLabel: {
    color: "#92400E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  fridayCountdown: {
    color: "#78350F",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
  },

  fridayExplore: {
    backgroundColor: "#713F12",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
  },

  fridayExploreText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },

  // 🔵 CATEGORIES

  categorySection: {
    marginBottom: 22,
  },

  categorySparkle: {
    color: GOLD,
    fontSize: 25,
    fontWeight: "900",
  },

  categoryButton: {
    backgroundColor: WHITE,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 13,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },

  categoryButtonActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },

  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  categoryIconActive: {
    color: GOLD,
  },

  categoryText: {
    color: "#455268",
    fontSize: 11,
    fontWeight: "800",
  },

  categoryTextActive: {
    color: WHITE,
  },

  // 🔵 FEED HEADING

  feedHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingTop: 5,
  },

  feedTitle: {
    color: NAVY,
    fontSize: 20,
    fontWeight: "900",
  },

  feedSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  feedIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: GOLD_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },

  feedIconText: {
    color: GOLD,
    fontSize: 23,
    fontWeight: "900",
  },

  // 🔵 PRODUCT CARD

  productCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: NAVY,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 3,
  },

  productImageContainer: {
    width: "100%",
    aspectRatio: 0.94,
    backgroundColor: "#EEF1F5",
    overflow: "hidden",
    position: "relative",
  },

  galleryContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EEF1F5",
  },

  galleryCounter: {
    position: "absolute",
    right: 9,
    bottom: 10,
    backgroundColor: "rgba(16,29,56,0.78)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  galleryCounterText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
  },

  galleryDots: {
    position: "absolute",
    bottom: 13,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  galleryDot: {
    width: 5,
    height: 5,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginRight: 4,
  },

  galleryDotActive: {
    width: 14,
    backgroundColor: GOLD,
  },

  galleryMore: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 3,
  },

  noMedia: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EDF0F5",
  },

  noMediaIcon: {
    fontSize: 38,
  },

  noMediaText: {
    color: MUTED,
    fontSize: 10,
    marginTop: 7,
  },

  imageCount: {
    position: "absolute",
    bottom: 10,
    right: 9,
    backgroundColor: "rgba(16,29,56,0.78)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  imageCountText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
  },

  badgeContainer: {
    position: "absolute",
    top: 9,
    left: 9,
    right: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 5,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  badgeText: {
    color: WHITE,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  adminDelete: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 32,
    height: 32,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },

  adminDeleteText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
  },

   // 🔵 PRODUCT DETAILS

  productDetails: {
    padding: 11,
  },

  productTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  productTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    flex: 1,
    minHeight: 34,
  },

  verifiedBadge: {
    color: "#FFFFFF",
    backgroundColor: "#2878E8",
    overflow: "hidden",
    borderRadius: 10,
    width: 17,
    height: 17,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 5,
  },

  productPrice: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 7,
  },

  dealPriceContainer: {
    marginTop: 5,
  },

  originalPrice: {
    color: "#9CA3AF",
    fontSize: 10,
    textDecorationLine: "line-through",
  },

  dealPrice: {
    color: "#DC2626",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },

  savingText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 3,
  },

  dealTime: {
    color: "#B45309",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  locationIcon: {
    color: GOLD,
    fontSize: 17,
    marginRight: 4,
  },

  locationText: {
    color: MUTED,
    fontSize: 10,
    flex: 1,
  },

  // 🔵 ACTION BUTTONS

  productActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
  },

  shareButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: "#F2F4F8",
    alignItems: "center",
  },

  shareButtonText: {
    color: NAVY,
    fontSize: 10,
    fontWeight: "900",
  },

  chatButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: NAVY,
    alignItems: "center",
  },

  chatButtonText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
  },

  profileButton: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  profileButtonText: {
    color: "#59677D",
    fontSize: 10,
    fontWeight: "800",
  },

  profileArrow: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
  },

  // 🔵 LOADING

  loadingFooter: {
    paddingVertical: 25,
    alignItems: "center",
  },

  loadingText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 9,
  },

  // 🔵 EMPTY STATE

  emptyState: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
  },

  resetButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 11,
    marginTop: 16,
  },

  resetButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },
  // 🟡 SELLER PHONE NUMBER

  sellerPhoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 9,
    marginTop: 9,
  },

  sellerPhoneIcon: {
    fontSize: 14,
    marginRight: 7,
  },

  sellerPhoneText: {
    flex: 1,
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },

  sellerCallButton: {
    backgroundColor: "#07865B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 7,
  },

  sellerCallButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});