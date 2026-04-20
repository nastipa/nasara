import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
const MAX_FEED_ITEMS = 60;
let isRefreshing = false;

/* ================= TYPES ================= */
type Item = {
  id: string;
  title?: string;
  price?: number;
  image_url?: string | null;
  video_url?: string | null;
  location?: string | null;
  category?: string | null;
  negotiable?: boolean;
    seller_phone?: string | null; // ✅ ADD THIS
  url?: string | null;
  type?: "item" | "ad" | "banner" | "promoted" | "boosted";
};

export default function BrowseScreen() {
  const router = useRouter();
   /* ================= SHARE FUNCTION ================= */
  const shareItem = async (item: Item) => {
    try {
      const link =` https://nasara-six.vercel.app/item/${item.id}`;

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
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
   /* ================= LOAD CACHE FIRST ================= */
useEffect(() => {
  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setItems(JSON.parse(cached));
      }
    } catch (e) {
      console.log("Cache load error");
    }
  };

  loadCache();
}, []);
  

useEffect(() => {
  const checkVerification = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ✅ IMPORTANT: DO NOT block guest users
    if (!user) return;

    const { data: profile, error } = await (supabase as any)
      .from("profiles")
      .select("phone, phone_verified, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) return;

    // ✅ ADMIN BYPASS
    if (profile.role === "admin") return;

    // ❗ Only redirect logged-in users without phone
    if (!profile.phone) {
      router.replace("/verify-phone");
      return;
    }
  };

  checkVerification();
}, []);
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

  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 12;

  /* ================= GRID ================= */
  const screenWidth = Dimensions.get("window").width;
  const numCols = screenWidth > 900 ? 4 : 2;
  const cardWidth = screenWidth / numCols - 18;
 

  /* ================= AUTH LISTENER ================= */
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsAdmin(session?.user?.email === "dinnanitipa@gmail.com");
        refreshAll();
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ================= LOGOUT ================= */
  const logoutUser = async () => {
    await supabase.auth.signOut();
    Alert.alert("Logged Out", "You are now signed out.");
    router.replace("/browse");
  };

  /* ================= ADMIN DELETE ================= */
  const deleteItem = async (id: string) => {
    Alert.alert("Delete Item?", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes Delete",
        style: "destructive",
        onPress: async () => {
          setItems((prev) => prev.filter((x) => x.id !== id));

          const { error } = await supabase
            .from("items_live")
            .delete()
            .eq("id", id);

          if (error) {
            Alert.alert("Delete Failed", error.message);
            refreshAll();
            return;
          }

          Alert.alert("Deleted ✅", "Item removed successfully!");
          refreshAll();
        },
      },
    ]);
  };
   /* ================= ADMIN DELETE SPECIAL ITEMS (FIXED) ================= */
const deleteSpecialItem = async (item: Item) => {
  if (!isAdmin) return;

  Alert.alert("Delete?", "Remove this item permanently?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          let query;

          /* ================= ADS ================= */
          if (item.type === "ad") {
            const realId = item.id.replace("ad-", "");

            query = supabase
              .from("ads")
              .delete()
              .eq("id", realId);
          }

          /* ================= BANNERS ================= */
          else if (item.type === "banner") {
            const realId = item.id.replace("banner-", "");

            query = supabase
              .from("banner")
              .delete()
              .eq("id", realId);
          }

          /* ================= PROMOTED ================= */
          else if (item.type === "promoted") {
            const realId = item.id;

            query = supabase
              .from("promoted")
              .delete()
              .eq("id", realId);
          }

          /* ================= BOOSTED (NOT DELETE → UNBOOST) ================= */
          else if (item.type === "boosted") {
            query = (supabase as any)
              .from("items_live")
              .update({
                is_boosted: false,
                boosted_until: null,
              })
              .eq("id", item.id);
          }

          /* ================= NORMAL ITEM ================= */
          else {
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
        } catch (err: any) {
          console.log(err);
          Alert.alert("Error", "Something went wrong");
        }
      },
    },
  ]);
};
  /* ================= LOAD LIVE STREAMS ================= */
  const loadLiveStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select(
        `
        id,
        title,
        youtube_url,
        status,
        user_id,
        created_at
        `
      )
      .eq("status", "live")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("❌ Live load error:", error.message);
      return;
    }

    if (data) setLiveStreams(data ?? []);
  };
  useFocusEffect(
  useCallback(() => {
    loadLiveStreams();
  }, [])
);

  /* ================= REFRESH ALL ================= */
 const refreshAll = async () => {
  if (isRefreshing) return;
  isRefreshing = true;

  setHasMore(true);
  setPage(1);

  try {
    await Promise.all([
      loadPromoted(),
      loadBoosted(),
      loadAds(),
      loadBanners(),
      loadLiveStreams(),
      loadItems(1, true),
    ]);
  } catch (err) {
    console.log("Refresh error:", err);
  }

  isRefreshing = false;
};

  /* ================= LOAD ITEMS ================= */
  const loadItems = async (pageNumber: number, reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    let query = supabase
      .from("items_live")
     .select("id,title,price,image_url,video_url,location,category,is_negotiable, seller_phone,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (searchText.trim()) {
      query = query.ilike("title", `%${searchText.trim()}%`);
    }

    if (selectedCategory !== "All") {
      query = query.ilike("category", selectedCategory.trim().toLowerCase());
    }

    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query.range(from, to);

    if (!data || error) {
      setLoadingMore(false);
      return;
    }

    const mapped: Item[] = data.map((i: any) => ({
      id: String(i.id),
      title: i.title,
      price: i.price,
      image_url: i.image_url,
      video_url: i.video_url,
      location: i.location,
      category: i.category,
      negotiable: Boolean(i.is_negotiable),
      seller_phone: i.seller_phone,
      type: "item",
    }));

const limited = mapped.slice(0, MAX_FEED_ITEMS);

/* ✅ SAVE CACHE */
try {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(limited));
} catch (e) {
  console.log("Cache save error");
}

if (mapped.length < pageSize) setHasMore(false);

if (reset) {
  setItems(limited);
} else {
  setItems((prev) => {
    const merged = [...prev, ...limited];
    const unique = Array.from(
      new Map(merged.map((i) => [i.id, i])).values()
    );
    return unique.slice(0, MAX_FEED_ITEMS);
  });
}

setLoadingMore(false);
  };
  /* ================= LOAD PROMOTED ================= */
  const loadPromoted = async () => {
  const today = new Date().toISOString();

  const { data, error } = await supabase
    .from("promoted")
    .select(
      `
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
    `
    )
    .eq("status", "approved")
    .gt("promoted_until", today)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Promoted Error:", error.message);
    return;
  }

  if (!data) return;

  const formatted: any[] = data
    .map((p: any) => ({
      ...p.items_live,
      created_at: p.created_at,
    }))
    .filter(Boolean)
    .map((item: any) => ({
      id: String(item.id),
      title: item.title,
      price: item.price,
      image_url: item.image_url,
      video_url: item.video_url,
      location: item.location,
      negotiable: false,
      created_at: item.created_at,
      type: "promoted",
    }));

  // 🔥 ENSURE LATEST FIRST
  formatted.sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  setPromoted(formatted);
};

  /* ================= LOAD BOOSTED ================= */
  const loadBoosted = async () => {
    const today = new Date().toISOString();

    let query = supabase
      .from("items_live")
      .select("*")
      .eq("is_boosted", true)
      .gt("boosted_until", today)
      .order("created_at", { ascending: false });

    if (selectedCategory !== "All") {
      query = query.ilike("category", selectedCategory.trim());
    }

    const { data } = await query;

    if (data) {
      setBoosted(
        data.map((b: any) => ({
          id: String(b.id),
          title: b.title,
          price: b.price,
          image_url: b.image_url,
          video_url: b.video_url,
          location: b.location,
          negotiable: false,
          type: "boosted",
        }))
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
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Ads Load Error:", error.message);
    return;
  }

  if (!data) {
    setAds([]);
    return;
  }

  const cleaned = data
  .filter((ad: any) => !ad.expires_at || ad.expires_at > today)
  .filter((ad: any) => ad.title && ad.title.trim() !== "")
  .map((ad: any) => ({
    id: "ad-" + ad.id,
    title: ad.title,
    image_url: ad.image_url,
    video_url: ad.video_url,
    url: ad.link || ad.url,
    expires_at: ad.expires_at,
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
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Banner Load Error:", error.message);
    return;
  }

  if (!data) {
    setBanners([]);
    return;
  }

  const cleaned = data
    .filter((b: any) => !b.expires_at || b.expires_at > today)
    .filter((b: any) => b.title && b.title.trim() !== "")
    .map((b: any) => ({
      id: "banner-" + b.id,
      title: b.title,
      image_url: b.image_url,
      video_url: b.video_url,
      url: b.url,
       expires_at: b.expires_at, // ADD THIS
      type: "banner" as const,
    }));

  setBanners(cleaned);
};
 /* ================= ULTRA REALTIME FIXED ================= */
useEffect(() => {
  const channel = supabase
    .channel("browse-live-items-" + Math.random()) // ✅ UNIQUE

    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items_live" },
      (payload: any) => {
        const item = payload.new || payload.old;
        if (!item) return;

        if (payload.eventType === "INSERT") {
          setItems((prev) => {
            const exists = prev.some((x) => x.id === String(item.id));
            if (exists) return prev;

            return [
              {
                id: String(item.id),
                title: item.title,
                price: item.price,
                image_url: item.image_url ?? null,
                video_url: item.video_url ?? null,
                location: item.location,
                category: item.category,
                negotiable: Boolean(item.is_negotiable),
                seller_phone: item.seller_phone,
                type: "item",
              },
              ...prev.slice(0, MAX_FEED_ITEMS),
            ];
          });
        }

        if (payload.eventType === "UPDATE") {
          setItems((prev) =>
            prev.map((x) =>
              x.id === String(item.id)
                ? {
                    ...x,
                    title: item.title,
                    price: item.price,
                    image_url: item.image_url ?? x.image_url,
                    video_url: item.video_url ?? x.video_url,
                  }
                : x
            )
          );
        }

        if (payload.eventType === "DELETE") {
          setItems((prev) =>
            prev.filter((x) => x.id !== String(item.id))
          );
        }
      }
    )

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);



  /* ================= APP ALWAYS REFRESH ON RETURN ================= */
useEffect(() => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      console.log("📱 App back active → Refreshing Browse...");
      refreshAll();
    }
  });

  return () => subscription.remove();
}, []);
  /* ================= REALTIME LIVE STREAMS ================= */
  useEffect(() => {
    const channel = supabase
      .channel("live-streams-live-" + Math.random())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => {
          console.log("🔴 Live stream changed → refreshing...");
          loadLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    refreshAll();
  }, []);
  
  
  /* ================= CLEAN ITEMS ================= */
  const cleanItems = useMemo(() => {
    const specialIds = new Set([
      ...promoted.map((x) => x.id),
      ...boosted.map((x) => x.id),
    ]);

    return items.filter((x) => !specialIds.has(x.id));
  }, [items, promoted, boosted]);

  /* ================= FINAL FEED ================= */
  const combined: Item[] =
    selectedCategory === "All"
      ? [...promoted, ...boosted, ...ads, ...banners, ...cleanItems]
      : [...promoted, ...boosted, ...cleanItems];

  const filteredCombined = useMemo(() => {
    return combined.filter((item) => {
      const matchesSearch =
        searchText.trim() === "" ||
        item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        item.type === "ad" ||
        item.type === "banner" ||
        item.category
          ?.trim()
          .toLowerCase()
          .includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [combined, searchText, selectedCategory]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    loadItems(next);
  };

  const handlePress = (item: Item) => {
    if (item.type === "ad" || item.type === "banner") {
      if (item.url) Linking.openURL(item.url);
      return;
    }

    router.push("/itemdetail/" + item.id);
  };
  const formatPhone = (phone: string) => {
  if (phone.startsWith("0")) {
    return "233" + phone.slice(1);
  }
  return phone;
};

  /* ================= UI ================= */
  return (
    <FlatList
      data={filteredCombined}
      keyExtractor={(item, index) => item.type + "-" + item.id + "-" + index}
      numColumns={numCols}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
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
  <Text
    style={{
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
      marginBottom: 10,
    }}
  >
    ✨ Nasara
  </Text>
  <TouchableOpacity
  onPress={() =>
    Linking.openURL(
      "https://expo.dev/artifacts/eas/aYfWnyGG1XaELRkHxJ8QpV.apk"
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
  {!user ? (
    <TouchableOpacity
      onPress={() => router.push("/(auth)/login")}
      style={{
        backgroundColor: "#22c55e",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "bold" }}>Sign In</Text>
    </TouchableOpacity>
  ) : (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
      }}
    >
      <TouchableOpacity
        onPress={() => router.push("/profile")}
        style={{
          flex: 1,
          backgroundColor: "#f97316",
          paddingVertical: 10,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Profile
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={logoutUser}
        style={{
          flex: 1,
          backgroundColor: "#ef4444",
          paddingVertical: 10,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
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
      renderItem={({ item }) => (
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
) : item?.image_url ? (
  <Image
    source={{ uri: item.image_url }}
    style={styles.squareImage}
  />
) : (
  <View style={styles.noMedia}>
    <ActivityIndicator size="small" />
    <Text style={{ color: "#9ca3af", marginTop: 6 }}>
      Uploading...
    </Text>
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
    onPress={() =>
      item.type === "item"
        ? deleteItem(item.id)
        : deleteSpecialItem(item)
    }
    style={{
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "red",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    }}
  >
    <Text style={{ color: "white", fontWeight: "bold" }}>🗑</Text>
  </TouchableOpacity>
)}
          
          {/* DETAILS */}
          <View style={{ padding: 8 }}>
            <Text numberOfLines={1} style={{ fontWeight: "700", color: "white" }}>
              {item.title}
            </Text>

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
            {/* WHATSAPP BUTTON */}
{item.type === "item" && item.seller_phone && (
  <TouchableOpacity
    onPress={() =>
      Linking.openURL(`https://wa.me/${item.seller_phone}`)
    }
    style={{
      marginTop: 6,
      backgroundColor: "#25D366",
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: "center",
    }}
  >
    <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
      💬 WhatsApp Seller
    </Text>
  </TouchableOpacity>
)}
            
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