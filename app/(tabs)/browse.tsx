import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  useCallback,
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
  View
} from "react-native";

import SafeVideo from "../../components/SafeVideo";
import { supabase } from "../../lib/supabase";

/* ================= ULTRA SCALE CONFIG ================= */
const CACHE_KEY = "BROWSE_ULTRA_CACHE";
const MAX_FEED_ITEMS = 500;
const PAGE_SIZE = 12;
let isRefreshing = false;

/* ================= TYPES ================= */
type Item = {
  id: string;
  title?: string;
  price?: number;
  image_url?: string | null;
  image_urls?: string[];
  video_url?: string | null;
  location?: string | null;
  category?: string | null;
  negotiable?: boolean;
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
export default function BrowseScreen() {
  const router = useRouter();

  /* ================= SHARE FUNCTION ================= */
  const shareItem = async (item: Item) => {
    try {
      const link = `https://nasara-six.vercel.app/item/${item.id}`;
      trackInteraction(item, "share");
      await trackFeedAction(
  item,
  "share"
);
      await Share.share({
        message: `🔥 Check this on Nasara:\n${item.title}\n${link}`,
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  /* ================= STATES ================= */
  const [items, setItems] = useState<Item[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [ads, setAds] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Item[]>([]);
  const [promoted, setPromoted] = useState<Item[]>([]);
  const [boosted, setBoosted] = useState<Item[]>([]);

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
 /* ================= AI PERSONALIZATION ================= */
const [likedCategories, setLikedCategories] = useState<string[]>([]);
const [likedLocations, setLikedLocations] = useState<string[]>([]);
const [recentViews, setRecentViews] = useState<string[]>([]);
  /* ================= CURSOR PAGINATION ================= */
  const lastCursor = useRef<string | null>(null);

  /* ================= APP REFRESH THROTTLE ================= */
  const lastRefreshRef = useRef(0);

  /* ================= CATEGORY LIST ================= */
  const categories = [
    "All",
    "education",
    "electronics",
    "fashion",
    "vehicles",
    "real estate",
    "food & grocery",
    "home & living",
    "jobs",
    "services",
  ];

  /* ================= GRID ================= */
  const screenWidth = Dimensions.get("window").width;
  const numCols = screenWidth > 900 ? 4 : 2;
  const cardWidth = screenWidth / numCols - 18;

  /* ================= LOAD CACHE FIRST ================= */
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);

        if (cached) {
          setItems(JSON.parse(cached));
        }
      } catch {
        console.log("Cache load error");
      }
    };

    loadCache();
  }, []);

  /* ================= SEARCH DEBOUNCE ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  /* ================= CHECK VERIFICATION ================= */
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
        return;
      }
    };

    checkVerification();
  }, []);

  /* ================= AUTH LISTENER (MERGED) ================= */
  useEffect(() => {
    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
          setIsAdmin(
            session?.user?.email ===
              "dinnanitipa@gmail.com"
          );

          if (!session) {
            router.replace("/browse");
          }

          refreshAll();
        }
      );

    return () =>
      listener.subscription.unsubscribe();
  }, []);

  /* ================= LOGOUT ================= */
  const logoutUser = async () => {
    await supabase.auth.signOut();

    Alert.alert(
      "Logged Out",
      "You are now signed out."
    );

    router.replace("/browse");
  };

  /* ================= ADMIN DELETE ================= */
  const deleteItem = async (item: any) => {
  Alert.alert(
    "Delete",
    "Remove one image or whole post?",
    [
      { text: "Cancel", style: "cancel" },

      {
        text: "Delete Image",
        onPress: async () => {
          try {
            const postId = item.original_id || item.id;

            const { data: post, error: fetchErr } = await (supabase as any)
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

            // remove by exact match first, fallback by index/url ending
            let updated = images.filter(
              (img: string) => img !== item.image_url
            );

            if (updated.length === images.length && item.image_url) {
              updated = images.filter(
                (img: string) =>
                  !img.includes(item.image_url.split("/").pop() || "")
              );
            }

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
          } catch (e: any) {
            console.log("delete image error", e);
            Alert.alert("Delete failed", e.message || "Try again");
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
          } catch (e: any) {
            console.log("delete post error", e);
            Alert.alert("Delete failed", e.message || "Try again");
          }
        },
      },
    ]
  );
};

  /* ================= ADMIN DELETE SPECIAL ITEMS (FIXED) ================= */
  const deleteSpecialItem = async (
    item: Item
  ) => {
    if (!isAdmin) return;

    Alert.alert(
      "Delete?",
      "Remove this item permanently?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              let query;

              if (item.type === "ad") {
                const realId =
                  item.id.replace("ad-", "");

                query = supabase
                  .from("ads")
                  .delete()
                  .eq("id", realId);
              }

              else if (
                item.type === "banner"
              ) {
                const realId =
                  item.id.replace(
                    "banner-",
                    ""
                  );

                query = supabase
                  .from("banner")
                  .delete()
                  .eq("id", realId);
              }

              else if (
                item.type === "promoted"
              ) {
                query = supabase
                  .from("promoted")
                  .delete()
                  .eq("id", item.id);
              }

              else if (
                item.type === "boosted"
              ) {
                query = (supabase as any)
                  .from("items_live")
                  .update({
                    is_boosted: false,
                    boosted_until: null,
                  })
                  .eq("id", item.id);
              }

              else {
                query = supabase
                  .from("items_live")
                  .delete()
                  .eq("id", item.id);
              }

              const { error } =
                await query;

              if (error) {
                Alert.alert(
                  "Delete Failed",
                  error.message
                );
                return;
              }

              Alert.alert(
                "Success",
                "Item removed"
              );

              refreshAll();
            } catch (err: any) {
              console.log(err);

              Alert.alert(
                "Error",
                "Something went wrong"
              );
            }
          },
        },
      ]
    );
  };
  /* ================= LOAD LIVE STREAMS ================= */
  const loadLiveStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select(`
        id,
        title,
        youtube_url,
        status,
        user_id,
        created_at
      `)
      .eq("status", "live")
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.log(
        "❌ Live load error:",
        error.message
      );
      return;
    }

    if (data) {
      setLiveStreams(data ?? []);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLiveStreams();
    }, [])
  );
  /* ================= LOAD AI PREFERENCES ================= */
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
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (!data) return;

    const categories = data
      .map((x: any) => x.category)
      .filter(Boolean);

    const locations = data
      .map((x: any) => x.location)
      .filter(Boolean);

    const views = data
      .map((x: any) => x.item_id)
      .filter(Boolean);

    setLikedCategories(categories);
    setLikedLocations(locations);
    setRecentViews(views);

  } catch (e) {
    console.log("AI preference error", e);
  }
};
  /* ================= REFRESH ALL ================= */
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
// load others lazily (non-blocking)
loadPromoted();
loadBoosted();
loadAds();
loadBanners();
    } catch (err) {
      console.log(
        "Refresh error:",
        err
      );
    }

    isRefreshing = false;
    lastRefreshRef.current =
      Date.now();
  };
  

  /* ================= LOAD ITEMS (CURSOR PAGINATION) ================= */
  const loadItems = async (reset = false) => {
  if (loadingMore) return;

  setLoadingMore(true);

  let query = supabase
    .from("items_live")
    .select(`
      id,
      title,
      price,
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

  // ✅ CURSOR (FAST)
  if (!reset && lastCursor.current) {
    query = query.lt("created_at", lastCursor.current);
  }

  // ✅ CATEGORY
  if (selectedCategory !== "All") {
    query = query.eq("category", selectedCategory);
  }

  if (debouncedSearch) {
  query = query.or(
    `title.ilike.%${debouncedSearch}%,location.ilike.%${debouncedSearch}%`
  );
}

  const { data, error } = await query;

  if (error || !data) {
    setLoadingMore(false);
    return;
  }

  const mapped: Item[] = data.flatMap(
  (i: any) => {
    const images =
      i.image_urls &&
      i.image_urls.length > 0
        ? i.image_urls
        : i.image_url
        ? [i.image_url]
        : [];

    /* VIDEO POST */
    if (i.video_url) {
      return [
        {
          id: String(i.id),
          title: i.title,
          price: i.price,
          image_url: null,
          video_url: i.video_url,
          location: i.location,
          category: i.category,
          negotiable: Boolean(
            i.is_negotiable
          ),
          seller_phone:
            i.seller_phone,
          user_id: i.user_id,
          created_at:
            i.created_at,
          type: "item",
        },
      ];
    }

    /* MULTIPLE IMAGES */
    return images.map(
      (
        img: string,
        index: number
      ) => ({
        id:
          String(i.id) +
          "-" +
          index,

        original_id:
          i.id,

        title: i.title,

        price: i.price,

        image_url: img,

        video_url: null,

        location: i.location,

        category: i.category,

        negotiable: Boolean(
          i.is_negotiable
        ),

        seller_phone:
          i.seller_phone,

        user_id: i.user_id,

        created_at:
          i.created_at,

        type: "item",
      })
    );
  }
);
   // ✅ LOAD VERIFIED USERS
setTimeout(() => {
  loadVerifiedUsers(mapped);
}, 200)
  if (mapped.length > 0) {
    lastCursor.current = mapped[mapped.length - 1].created_at || null;
  }

  if (mapped.length < PAGE_SIZE) {
    setHasMore(false);
  }

  if (reset) {
    setItems(mapped);
  } else {
    setItems(prev => {
      const merged = [...prev, ...mapped];
      return Array.from(new Map(merged.map(i => [i.id, i])).values()).slice(0, 300);
    });
  }
try {
  const mergedCache = reset
    ? mapped
    : [...items, ...mapped];

  await AsyncStorage.setItem(
    CACHE_KEY,
    JSON.stringify(mergedCache.slice(0, MAX_FEED_ITEMS))
  );
} catch {}
  setLoadingMore(false);
};
/* ================= VERIFIED USERS ================= */
const loadVerifiedUsers = async (itemsList: Item[]) => {
  const ids = [
    ...new Set(
      itemsList
        .map((i) => i.user_id)
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

    data.forEach((u: any) => {
      map[u.id] = u.verified === true;
    });

    setUserVerifiedMap(map);
  }
};
/* ================= AI TRACK USER BEHAVIOR ================= */
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

  } catch (e) {
    console.log("AI tracking error", e);
  }
};
  /* ================= LOAD PROMOTED ================= */
  const loadPromoted =
    async () => {
      const today =
        new Date().toISOString();

      const {
        data,
        error
      } = await supabase
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
          video_url,
          location,
          category
        )
      `)
        .eq(
          "status",
          "approved"
        )
        .gt(
          "promoted_until",
          today
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(20);

      if (error) {
        console.log(
          "Promoted Error:",
          error.message
        );
        return;
      }

      if (!data) return;

      const formatted =
        data
          .map(
            (p: any) => ({
              ...p.items_live,
              created_at:
                p.created_at,
            })
          )
          .filter(Boolean)
          .map(
            (item: any) => ({
              id: String(
                item.id
              ),
              title:
                item.title,
              price:
                item.price,
              image_url:
                item.image_url,
              video_url:
                item.video_url,
              location:
                item.location,
              negotiable:
                false,
              created_at:
                item.created_at,
              type:
                "promoted" as const,
            })
          );

      formatted.sort(
        (a, b) =>
          new Date(
            b.created_at ||
              ""
          ).getTime() -
          new Date(
            a.created_at ||
              ""
          ).getTime()
      );

      setPromoted(
        formatted
      );
    };

  /* ================= LOAD BOOSTED ================= */
  const loadBoosted =
    async () => {
      const today =
        new Date().toISOString();

      let query =
        supabase
          .from(
            "items_live"
          )
          .select("*")
          .eq(
            "is_boosted",
            true
          )
          .gt(
            "boosted_until",
            today
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(20);

      if (
        selectedCategory !==
        "All"
      ) {
        query =
          query.eq(
            "category",
            selectedCategory
          );
      }

      const {
        data
      } =
        await query;

      if (data) {
        setBoosted(
          data.map(
            (
              b: any
            ) => ({
              id: String(
                b.id
              ),
              title:
                b.title,
              price:
                b.price,
              image_url:
                b.image_url,
              video_url:
                b.video_url,
              location:
                b.location,
              negotiable:
                false,
              type:
                "boosted",
            })
          )
        );
      }
    };
    /* ================= LOAD ADS ================= */
  const loadAds = async () => {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .in("status", ["approved", "active"])
      .eq("is_active", true)
      .or(`expires_at.gt.${today},expires_at.is.null`)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.log(
        "Ads Load Error:",
        error.message
      );
      return;
    }

    if (!data) {
      setAds([]);
      return;
    }

    const cleaned = data
      .filter(
        (ad: any) =>
          !ad.expires_at ||
          ad.expires_at > today
      )
      .filter(
        (ad: any) =>
          ad.title &&
          ad.title.trim() !== ""
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

  /* ================= LOAD BANNERS ================= */
  const loadBanners = async () => {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("banner")
      .select("*")
      .in("status", ["approved", "active"])
      .eq("is_active", true)
      .or(`expires_at.gt.${today},expires_at.is.null`)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.log(
        "Banner Load Error:",
        error.message
      );
      return;
    }

    if (!data) {
      setBanners([]);
      return;
    }

    const cleaned = data
      .filter(
        (b: any) =>
          !b.expires_at ||
          b.expires_at > today
      )
      .filter(
        (b: any) =>
          b.title &&
          b.title.trim() !== ""
      )
      .map((b: any) => ({
        id: "banner-" + b.id,
        title: b.title,
        image_url: b.image_url,
        video_url: b.video_url,
        url: b.url,
        expires_at: b.expires_at,
        created_at: b.created_at,
        type: "banner" as const,
      }));

    setBanners(cleaned);
  };
 /* ================= AUTO REFRESH ITEMS ================= */
useEffect(() => {
  const interval = setInterval(() => {
    refreshAll();
  }, 60000);

  return () => clearInterval(interval);
}, []);

  /* ================= REALTIME LIVE STREAMS ================= */
useEffect(() => {
  const channelName =
    "live-streams-" +
    Math.random().toString();

  const channel = supabase
    .channel(channelName)
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

  /* ================= APP REFRESH ON RETURN (THROTTLED) ================= */
  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (state) => {
          if (
            state === "active" &&
            Date.now() -
              lastRefreshRef.current >
              30000
          ) {
            console.log(
              "📱 App active → Refreshing Browse..."
            );

            refreshAll();
          }
        }
      );

    return () =>
      subscription.remove();
  }, []);

  /* ================= INITIAL LOAD ================= */
 useEffect(() => {
  setItems([]);
  lastCursor.current = null;
  setHasMore(true);

  refreshAll();
}, [selectedCategory, debouncedSearch]);
  /* ================= CLEAN ITEMS ================= */
  const cleanItems =
    useMemo(() => {
      const specialIds =
        new Set([
          ...promoted.map(
            (x) => x.id
          ),
          ...boosted.map(
            (x) => x.id
          ),
        ]);

      return items.filter(
        (x) =>
          !specialIds.has(
            x.id
          )
      );
    }, [
      items,
      promoted,
      boosted,
    ]);

 /* ================= FINAL AI FEED ================= */
const combined: Item[] =
  useMemo(() => {
    const all =
      selectedCategory ===
      "All"
        ? [
            ...promoted,
            ...boosted,
            ...ads,
            ...banners,
            ...cleanItems,
          ]
        : [
            ...promoted,
            ...boosted,
            ...cleanItems,
          ];

    const scored = all.map(
      (item) => {
        let score = 0;

        /* PROMOTED BOOST */
        if (
          item.type ===
          "promoted"
        )
          score += 100;

        if (
          item.type ===
          "boosted"
        )
          score += 80;

        /* RECENCY BOOST */
        const ageHours =
          Math.max(
            1,
            (
              Date.now() -
              new Date(
                item.created_at ||
                  ""
              ).getTime()
            ) /
              3600000
          );

        score +=
          50 / ageHours;

        /* SEARCH BOOST */
        if (
          debouncedSearch &&
          item.title
            ?.toLowerCase()
            .includes(
              debouncedSearch.toLowerCase()
            )
        ) {
          score += 40;
        }

        /* CATEGORY BOOST */
        if (
          selectedCategory !==
            "All" &&
          item.category ===
            selectedCategory
        ) {
          score += 60;
        }

        return {
          ...item,
          aiScore: score,
        };
      }
    );

    return scored.sort(
      (a: any, b: any) =>
        b.aiScore -
        a.aiScore
    );
  }, [
    promoted,
    boosted,
    ads,
    banners,
    cleanItems,
    selectedCategory,
    debouncedSearch,
  ]);
const loadMore = () => {
  if (!hasMore || loadingMore) return;
  loadItems(false);
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
        item_id:
          Number(
            item.original_id ||
            item.id
          ),
        action,
        category:
          item.category || null,
      });
  } catch (e) {
    console.log(
      "Track error:",
      e
    );
  }
};

const handlePress = async (
  item: Item
) => {
  console.log(
    "CLICKED",
    item.type,
    item.url
  );

  await trackFeedAction(
    item,
    "click"
  );

  if (
  item.type === "ad" ||
  item.type === "banner"
) {
  if (item.url) {
    if (
      typeof window !==
      "undefined"
    ) {
      window.location.href =
        item.url;
    } else {
      Linking.openURL(
        item.url
      );
    }
  }

  return;
}
  router.push(
    "/itemdetail/" +
      (item.original_id ||
        item.id)
  );
};
  /* ================= UI ================= */
  return (
    <FlatList
      data={combined}
      keyExtractor={(item, index) => item.type + "-" + item.id + "-" + index}
      numColumns={numCols}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={4}
      removeClippedSubviews={true}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{
  padding: 12,
  backgroundColor: "#0f172a",
}}
style={{ backgroundColor: "#0f172a" }}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ padding: 20 }}>
            <ActivityIndicator size="large" />
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View style={{ marginBottom: 18 }}>
          {/* 🔴 LIVE SELLERS SECTION */}
          {liveStreams.length > 0 ? (
            <View
              style={{
                padding: 14,
                backgroundColor: "#fee2e2",
                borderRadius: 14,
                marginBottom: 15,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "red" }}>
                🔴 Sellers Live Now
              </Text>

              {liveStreams.map((live) => (
                <TouchableOpacity
                  key={live.id}
                  onPress={() => router.push(`/watch-video/${live.id}`)}
                  style={{
                    marginTop: 10,
                    padding: 12,
                    backgroundColor: "white",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#ddd",
                  }}
                >
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                    🔴 Seller is Live!
                  </Text>

                  <Text style={{ marginTop: 4 }}>{live.title}</Text>

                  <Text style={{ marginTop: 4, color: "#444" }}>
                    Tap to Watch 🎥
                  </Text>
                </TouchableOpacity>

              ))}
              
            </View>
            
          ) : (
            <Text style={{ marginBottom: 15, color: "#cbd5e1" }}>
              No sellers are live right now.
            </Text>
          )}
            {/* TOP BAR */}
<LinearGradient
  colors={["#0f172a", "#1e293b"]}
  style={{
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
  }}
>
  {/* Row 1: Logo */}
  <View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  }}
>
  <Text
    style={{
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
    }}
  >
    ✨ Nasara
  </Text>

  <TouchableOpacity
    onPress={() => router.push("/settings")}
    style={{
      backgroundColor: "#111827",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    }}
  >
    <Text style={{ color: "white", fontWeight: "bold" }}>
      ⚙️ Settings
    </Text>
  </TouchableOpacity>
  
</View>
<TouchableOpacity
  onPress={() =>
    router.push("/discover")
  }
  style={{
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontWeight: "bold",
      textAlign: "center",
      fontSize: 16,
    }}
  >
    Discover Users
  </Text>
</TouchableOpacity>

  <TouchableOpacity
  onPress={() =>
    Linking.openURL(
      "https://expo.dev/artifacts/eas/dgMidBdTasWGF8PsuRtk3c.apk"
    )
  }
  style={{
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  }}
>
  
  <Text style={{ color: "white", fontWeight: "bold" }}>
    📱 Download Android App
  </Text>
</TouchableOpacity>

  {/* Row 2: Search */}
  <TextInput
    placeholder="Search anything..."
    placeholderTextColor="#aaa"
    value={searchText}
    onChangeText={setSearchText}
    style={{
      width: "100%",
      backgroundColor: "#1f2937",
      color: "white",
      borderRadius: 25,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    }}
  />

  {/* Row 3: Buttons */}
  {!user && (
  <TouchableOpacity
    onPress={() => router.push("/(auth)/login")}
    style={{
      backgroundColor: "#22c55e",
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
    }}
  >
    <Text style={{ color: "white", fontWeight: "bold" }}>
      Sign In / Create Account
    </Text>
  </TouchableOpacity>
)}
</LinearGradient>
        

         {/* CATEGORY BAR */}
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {categories.map((cat) => (
    <TouchableOpacity
      key={cat}
      onPress={() => {
        setSelectedCategory(cat);
       
      }}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor:
          selectedCategory === cat ? "black" : "#eee",
      }}
    >
      <Text
        style={{
          fontWeight: "bold",
          color: selectedCategory === cat ? "white" : "black",
        }}
      >
        {cat === "All"
          ? "All"
          : cat
              .split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1)
              )
              .join(" ")}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

        </View>
        
      }
     renderItem={({ item }: { item: any }) => (
        <TouchableOpacity
          onPress={() => handlePress(item)}
          style={{
  width: cardWidth,
  borderRadius: 18,
  overflow: "hidden",
  marginBottom: 16,
  backgroundColor: "rgba(255,255,255,0.05)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
}}
        >
    {/* MEDIA */}
{item?.video_url ? (
  <SafeVideo url={item.video_url} />
) : item?.image_urls?.length > 0 ? (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
  >
    {item.image_urls.map(
      (
        img: string,
        index: number
      ) => (
        <Image
          key={index}
          source={{ uri: img }}
          style={{
            width: cardWidth,
            height: cardWidth,
            marginRight: 4,
            borderRadius: 10,
          }}
          contentFit="cover"
        />
      )
    )}
  </ScrollView>
) : item?.image_url ? (
  <Image
    source={{ uri: item.image_url }}
    style={styles.squareImage}
    contentFit="cover"
  />
) : (
  <View style={styles.noMedia}>
    <ActivityIndicator size="small" />
  </View>
)}
          {/* BADGES */}
          {item.type === "ad" && <Badge label="📢 AD" />}
          {item.type === "banner" && <Badge label="🎯 BANNER" />}
          {item.type === "promoted" && <Badge label="⭐ PROMOTED" />}
          {item.type === "boosted" && <Badge label="🚀 BOOSTED" />}

          {/* NEGOTIABLE */}
          {item.type === "item" && item.negotiable && (
            <Badge label="💬 Negotiable" />
          )}

          {/* ADMIN DELETE */}
{isAdmin && (
  <TouchableOpacity
    onPress={() => {
      if (item.type === "item") {
        deleteItem(item);   // ✅ full object
      } else {
        deleteSpecialItem(item);
      }
    }}
    style={{
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "red",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      zIndex: 999,
    }}
  >
    <Text
      style={{
        color: "white",
        fontWeight: "bold",
      }}
    >
      🗑️
    </Text>
  </TouchableOpacity>
)}
          
          {/* DETAILS */}
          <View style={{ padding: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
  <Text
    numberOfLines={1}
    style={{ fontWeight: "700", color: "white", flex: 1 }}
  >
    {item.title}
  </Text>

  {userVerifiedMap[item.user_id || ""] && (
    <Text
      style={{
        marginLeft: 6,
        color: "#3b82f6",
        fontSize: 12,
        fontWeight: "bold",
      }}
    >
       🔵
    </Text>
  )}
</View>

            {item.price && (
              <Text style={{ fontWeight: "bold", color: "#22c55e" }}>GH₵ {item.price}</Text>
            )}

            <Text style={{ fontSize: 12, color: "#9ca3af" }}>
              {item.location}
            </Text>
            <TouchableOpacity
  onPress={() => shareItem(item)}
  style={{
    marginTop: 6,
    backgroundColor: "#3b82f6",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  }}
>
  <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
    🔗 Share
  </Text>
</TouchableOpacity>
            {/* CHAT BUTTON */}
{item.type === "item" && item.user_id && (
  <TouchableOpacity
    onPress={async () => {
      const { data } = await supabase.auth.getUser();

      const buyerId = data.user?.id;

      if (!buyerId) {
        router.push("/(auth)/login");
        return;
      }

      if (buyerId === item.user_id) {
        Alert.alert("This is your own item");
        return;
      }

      try {
        const { data: existing } = await (supabase as any)
          .from("chat_rooms")
          .select("*")
          .eq("item_id", item.id)
          .eq("buyer_id", buyerId)
          .eq("seller_id", item.user_id)
          .maybeSingle();

        let roomId = existing?.id;

        if (!roomId) {
          const { data: newRoom, error } = await (supabase as any)
            .from("chat_rooms")
            .insert({
             item_id:
  item.original_id ||
  item.id,
              buyer_id: buyerId,
              seller_id: item.user_id,
            })
            .select()
            .single();

          if (error) {
            Alert.alert("Chat failed", error.message);
            return;
          }

          roomId = newRoom.id;
          await (supabase as any)
  .from("item_engagement")
  .insert({
    item_id: item.id,
    user_id: buyerId,
    action: "chat",
  });
        }
        trackInteraction(item, "chat");
        await trackFeedAction(
  item,
  "chat"
);
        router.push({
          pathname: "/chat/[id]",
          params: { id: roomId },
        });

      } catch (err: any) {
        Alert.alert("Error", "Could not open chat");
      }
    }}
    style={{
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  }}
  >
    <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
      💬 Chat Seller
    </Text>
  </TouchableOpacity>
)}
<TouchableOpacity
  onPress={() => {
    if (!item.user_id) {
      Alert.alert("Error", "User not found");
      return;
    }

    router.push({
      pathname: "/profile/[id]",
      params: { id: item.user_id },
    });
  }}
  style={{
    marginTop: 6,
    backgroundColor: "#111827",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  }}
>
  <Text
    style={{
      color: "white",
      fontSize: 12,
      fontWeight: "bold",
    }}
  >
    👤 View Profile
  </Text>
</TouchableOpacity>
            
          </View>
        </TouchableOpacity>
        
      )}
    />
    
  );
}

/* ================= BADGE ================= */
function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        backgroundColor: "black",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>
        {label}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  squareImage: {
    width: "100%",
    aspectRatio: 1,
  },
  noMedia: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f1f1f1",
    justifyContent: "center",
    alignItems: "center",
  },
});