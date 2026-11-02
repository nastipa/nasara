// ==========================================
// 🟡 NASARA — PREMIUM ITEM DETAIL SCREEN
// ==========================================

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { recordItemView } from "../../lib/itemViewTracking";
import { supabase } from "../../lib/supabase";
// ==========================================
// 🎨 NASARA THEME
// ==========================================

const COLORS = {
  navy: "#101D38",
  navyLight: "#1E3A63",
  gold: "#D9AD55",
  goldLight: "#FFF6E4",
  background: "#F5F6FA",
  white: "#FFFFFF",
  text: "#17243B",
  muted: "#7B8799",
  border: "#E9EDF3",
  green: "#07865B",
  greenLight: "#E8F7F0",
  red: "#E5484D",
  grayLight: "#F1F3F7",
};

// ==========================================
// 🛍️ PRODUCT CARD
// ==========================================

function ProductCard({
  product,
  onPress,
}: {
  product: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.productCard}
    >
      <View style={styles.productImageWrapper}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productPlaceholder}>
            <Text style={styles.placeholderIcon}>🛍️</Text>
          </View>
        )}
      </View>

      <View style={styles.productCardInfo}>
        <Text
          numberOfLines={1}
          style={styles.productCardTitle}
        >
          {product.title}
        </Text>

        <Text style={styles.productCardPrice}>
          GH₵ {Number(product.price || 0).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ==========================================
// 📱 MAIN ITEM DETAIL SCREEN
// ==========================================

export default function ItemDetail() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const router = useRouter();
  const { width } = useWindowDimensions();

  // ==========================================
  // 📦 STATES
  // ==========================================

  const [item, setItem] = useState<any>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [showOffer, setShowOffer] = useState(false);

  const [offerPrice, setOfferPrice] = useState("");

  const [isFav, setIsFav] = useState(false);

  const [seller, setSeller] = useState<any>(null);

  const [relatedItems, setRelatedItems] =
    useState<any[]>([]);

  const [viewsCount, setViewsCount] = useState(0);

  const [saveCount, setSaveCount] = useState(0);

  const [sellerFollowers, setSellerFollowers] =
    useState(0);

  const [isFollowing, setIsFollowing] = useState(false);

  

  const [recommendations, setRecommendations] =
    useState<any[]>([]);

  const [sellerItems, setSellerItems] =
    useState<any[]>([]);

  const [activeImage, setActiveImage] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  /// ==========================================
// 👤 LOAD USER
// ==========================================

useEffect(() => {
  const loadUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    } catch (error) {
      console.error("LOAD USER ERROR:", error);
      setUserId(null);
    } finally {
      setAuthReady(true);
    }
  };

  loadUser();
}, []);

  // ==========================================
// 🔄 LOAD ITEM
// ==========================================

useEffect(() => {
  if (!id || !authReady) return;

  loadItem();
}, [id, userId, authReady]);
  // ==========================================
  // 🧠 LOAD RECOMMENDATIONS
  // ==========================================

  useEffect(() => {
    if (!item) return;

    const loadRecommendations = async () => {
      try {
        const { data: categoryItems } =
          await supabase
            .from("items_live")
            .select("*")
            .eq("category", item.category)
            .neq("id", item.id)
            .eq("status", "active")
            .limit(12);

        const { data: sellerData } =
          await supabase
            .from("items_live")
            .select("*")
            .eq("user_id", item.user_id)
            .neq("id", item.id)
            .eq("status", "active")
            .limit(12);

        setRecommendations(categoryItems || []);
        setSellerItems(sellerData || []);
      } catch (e) {
        console.log("Recommendation error:", e);
      }
    };

    loadRecommendations();
  }, [item]);

  // ==========================================
  // 📥 LOAD ITEM FUNCTION
  // ==========================================

  const loadItem = async () => {
    setLoading(true);

    try {
      const { data, error }: any =
        await supabase
          .from("items_live")
          .select("*")
          .eq("id", Number(id))
          .single();

      if (error) {
        console.log(error);
        setLoading(false);
        return;
      }

      setItem(data);

      // ==========================================
// 👁️ RECORD ITEM VIEW
// ==========================================

const updatedViews = await recordItemView(data.id);

if (updatedViews !== null) {
  setViewsCount(updatedViews);
}

      // Check favorite
      if (data && userId) {
        const { data: fav } =
          await (supabase as any)
            .from("favorites")
            .select("id")
            .eq("user_id", userId)
            .eq("item_id", data.id)
            .maybeSingle();

        setIsFav(!!fav);
      }

      // Load seller information
      if (data?.user_id) {
        loadSeller(data.user_id);
        loadRelatedItems(data.category, data.id);
        checkFollowing(data.user_id);
        loadSellerFollowers(data.user_id);
       
      }

      await loadCounts(data.id);
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  };

  // ==========================================
  // 👤 LOAD SELLER
  // ==========================================

  const loadSeller = async (sellerId: string) => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", sellerId)
      .single();

    if (data) {
      setSeller(data);
    }
  };

  // ==========================================
  // 🛍️ LOAD RELATED ITEMS
  // ==========================================

  const loadRelatedItems = async (
    category: string,
    itemId: number
  ) => {
    const { data } = await supabase
      .from("items_live")
      .select("*")
      .eq("category", category)
      .neq("id", itemId)
      .eq("status", "active")
      .limit(10);

    setRelatedItems(data || []);
  };

  // ==========================================
// 📊 LOAD ITEM COUNTS
// ==========================================

const loadCounts = async (itemId: number) => {
  const { count: saves, error } =
    await (supabase as any)
      .from("favorites")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("item_id", itemId);

  if (error) {
    console.error("LOAD SAVES ERROR:", error.message);
  }

  setSaveCount(saves || 0);
};
 // ==========================================
// 👁️ TRACK ITEM VIEW
// ==========================================

const trackView = async (itemId: number) => {
  try {
    const { error } = await (supabase as any)
      .from("item_views")
      .insert({
        item_id: itemId,
        user_id: userId,
      });

    if (error) {
      console.error("ITEM VIEW ERROR:", error.message);
      return false;
    }

    // AI EVENT TRACKING
    if (userId) {
      const { error: analyticsError } =
        await (supabase as any)
          .from("analytics_events")
          .insert({
            user_id: userId,
            event_type: "view_item",
            item_id: itemId,
          });

      if (analyticsError) {
        console.error(
          "VIEW ANALYTICS ERROR:",
          analyticsError.message
        );
      }
    }

    return true;
  } catch (error) {
    console.error("TRACK VIEW FAILED:", error);
    return false;
  }
};
  // ==========================================
  // 👥 LOAD SELLER FOLLOWERS
  // ==========================================

  const loadSellerFollowers = async (
    sellerId: string
  ) => {
    const { count } =
      await (supabase as any)
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("following_id", sellerId);

    setSellerFollowers(count || 0);
  };

  // ==========================================
  // 🔍 CHECK FOLLOWING
  // ==========================================

  const checkFollowing = async (
    sellerId: string
  ) => {
    if (!userId) return;

    const { data } =
      await (supabase as any)
        .from("follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("following_id", sellerId)
        .maybeSingle();

    setIsFollowing(!!data);
  };

  // ==========================================
  // ➕ FOLLOW / UNFOLLOW SELLER
  // ==========================================

  const toggleFollow = async () => {
    if (!userId || !seller?.id) return;

    if (isFollowing) {
      await (supabase as any)
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", seller.id);

      setIsFollowing(false);

      setSellerFollowers((p) =>
        Math.max(0, p - 1)
      );
    } else {
      await (supabase as any)
        .from("follows")
        .insert({
          follower_id: userId,
          following_id: seller.id,
        });

      setIsFollowing(true);

      setSellerFollowers((p) => p + 1);
    }
  };

  

  // ==========================================
  // ❤️ FAVORITE ITEM
  // ==========================================

  const toggleFavorite = async () => {
    if (!userId || !item) return;

    if (isFav) {
      await (supabase as any)
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", item.id);

      setIsFav(false);

      setSaveCount((p) =>
        Math.max(0, p - 1)
      );
    } else {
      await (supabase as any)
        .from("item_engagement")
        .insert({
          item_id: item.id,
          user_id: userId,
          action: "favorite",
        });

      setIsFav(true);

      setSaveCount((p) => p + 1);

      await (supabase as any)
        .from("analytics_events")
        .insert({
          user_id: userId,
          event_type: "favorite_item",
          item_id: item.id,
        });
    }
  };

  // ==========================================
  // 🔗 SHARE ITEM
  // ==========================================

  const shareItem = async () => {
    try {
      const url =
        `https://nasara-six.vercel.app/item/${item.id}`;

      await Share.share({
        message: `🔥 ${item.title}\n\n${url}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // ==========================================
  // 🎥 VIDEO PLAYER
  // ==========================================

  const videoUrl =
    item?.video_url?.trim() || "";

  const player = useVideoPlayer(
    videoUrl ||
      "https://www.w3schools.com/html/mov_bbb.mp4",
    (p) => {
      p.loop = true;
    }
  );

  useEffect(() => {
    if (
      videoUrl &&
      videoUrl.startsWith("http")
    ) {
      try {
        player.replace(videoUrl);
        player.play();
      } catch (e) {
        console.log("Video error:", e);
      }
    }
  }, [videoUrl]);

  // ==========================================
  // 🖼️ ITEM IMAGES
  // ==========================================

  const imageList = useMemo(() => {
    if (
      item?.image_urls &&
      Array.isArray(item.image_urls)
    ) {
      return item.image_urls;
    }

    if (item?.image_url) {
      return [item.image_url];
    }

    return [];
  }, [item]);

  // ==========================================
  // ⏳ LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>
            N
          </Text>
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.gold}
        />

        <Text style={styles.loadingText}>
          Loading product...
        </Text>
      </View>
    );
  }

  // ==========================================
  // ❌ ITEM NOT FOUND
  // ==========================================

  if (!item) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundIcon}>
          🛍️
        </Text>

        <Text style={styles.notFoundTitle}>
          Item not found
        </Text>

        <Text style={styles.notFoundSubtitle}>
          This item may have been removed or is no longer available.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.notFoundButton}
        >
          <Text style={styles.notFoundButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // 👤 SELLER CHECK
  // ==========================================

  const isSeller = userId === item.user_id;

  // 🟡 =====================================================
// 🟡 START CHAT - REUSE EXISTING BUYER/SELLER CONVERSATION
// 🟡 Same chat system used by Browse
// 🟡 =====================================================
const startChat = async () => {
  try {
    // 🔵 GET CURRENT USER
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    const sellerId = item.user_id;
    if (authError || !currentUserId) {
      router.push("/(auth)/login");
      return;
    }
    if (!sellerId) {
      Alert.alert("Error", "Seller not found.");
      return;
    }
    if (currentUserId === sellerId) {
      Alert.alert("Notice", "This is your own item.");
      return;
    }
    let existingRoom: any = null;
    // 🔵 FIRST: SEARCH NORMAL BUYER/SELLER ORDER
    const {
      data: directRoom,
      error: directError,
    } = await (supabase as any)
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
    // 🔵 SECOND: SEARCH REVERSED BUYER/SELLER ORDER
    if (!existingRoom) {
      const {
        data: reverseRoom,
        error: reverseError,
      } = await (supabase as any)
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
    // 🟢 CREATE A ROOM ONLY WHEN NO OLD CONVERSATION EXISTS
    if (!roomId) {
      const { data: newRoom, error: createError } =
        await (supabase as any)
          .from("chat_rooms")
          .insert({
            item_id: item.id,
            buyer_id: currentUserId,
            seller_id: sellerId,
          })
          .select("id")
          .single();
      if (createError) {
        console.log("Chat creation error:", createError);
        // 🟡 IF ANOTHER REQUEST CREATED THE ROOM,
        // 🟡 SEARCH AGAIN AND REUSE THAT ROOM.
        const {
          data: retryDirect,
        } = await (supabase as any)
          .from("chat_rooms")
          .select("id")
          .eq("buyer_id", currentUserId)
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        let recoveredRoom = retryDirect;
        if (!recoveredRoom) {
          const {
            data: retryReverse,
          } = await (supabase as any)
            .from("chat_rooms")
            .select("id")
            .eq("buyer_id", sellerId)
            .eq("seller_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          recoveredRoom = retryReverse;
        }
        if (!recoveredRoom?.id) {
          Alert.alert(
            "Chat Failed",
            createError.message || "Could not create or open chat."
          );
          return;
        }
        roomId = recoveredRoom.id;
      } else {
        roomId = newRoom.id;
      }
    }
    // 🟡 RECORD CHAT ACTIVITY
    try {
      await (supabase as any)
        .from("item_engagement")
        .insert({
          item_id: item.id,
          user_id: currentUserId,
          action: "chat",
        });
    } catch (trackingError) {
      console.log("Chat activity tracking error:", trackingError);
    }
    // 🟢 OPEN THE EXISTING OR NEW CHAT
    router.push({
      pathname: "/chat/[id]",
      params: { id: String(roomId) },
    });
  } catch (error: any) {
    console.log("ItemDetail chat error:", error);
    Alert.alert(
      "Chat Error",
      error?.message || "Could not open chat. Please try again."
    );
  }
};

  // ==========================================
  // 💰 SUBMIT OFFER
  // ==========================================

  const submitOffer = async () => {
    if (!offerPrice.trim()) {
      Alert.alert("Enter amount");
      return;
    }

    const { error } =
      await (supabase as any)
        .from("offers")
        .insert({
          item_id: item.id,
          buyer_id: userId,
          seller_id: item.user_id,
          price: Number(offerPrice),
          status: "pending",
        });

    if (error) {
      Alert.alert("Offer Failed", error.message);
      return;
    }

    await (supabase as any)
      .from("item_engagement")
      .insert({
        item_id: item.id,
        user_id: userId,
        action: "offer",
      });

    setOfferPrice("");
    setShowOffer(false);

    Alert.alert("Success", "Offer sent");
  };

  // ==========================================
  // 🧭 OPEN RELATED ITEM
  // ==========================================

  const openRelatedItem = (relatedId: number) => {
    router.push(`/itemdetail/${relatedId}`);
  };

  // ==========================================
  // 🖥️ SCREEN
  // ==========================================

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ======================================
              🟡 TOP MEDIA GALLERY
          ====================================== */}

          <View style={styles.mediaSection}>
            <View
              style={[
                styles.mediaContainer,
                {
                  width: Math.min(width - 28, 520),
                },
              ]}
            >
              {/* MEDIA */}

              {videoUrl &&
              videoUrl.startsWith("http") ? (
                <VideoView
                  player={player}
                  style={styles.mediaImage}
                  contentFit="contain"
                  nativeControls
                />
              ) : imageList.length > 0 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x /
                        Math.min(width - 28, 520)
                    );

                    setActiveImage(index);
                  }}
                >
                  {imageList.map(
                    (img: string, index: number) => (
                      <Image
                        key={index}
                        source={{ uri: img }}
                        style={[
                          styles.mediaImage,
                          {
                            width: Math.min(
                              width - 28,
                              520
                            ),
                          },
                        ]}
                        resizeMode="cover"
                      />
                    )
                  )}
                </ScrollView>
              ) : (
                <View style={styles.noMedia}>
                  <Text style={styles.noMediaIcon}>
                    🛍️
                  </Text>

                  <Text style={styles.noMediaText}>
                    No product image available
                  </Text>
                </View>
              )}

              {/* TOP NAVIGATION */}

              <View style={styles.mediaTopBar}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.mediaIconButton}
                >
                  <Text style={styles.mediaIconText}>
                    ‹
                  </Text>
                </TouchableOpacity>

                <View style={styles.mediaActions}>
                  <TouchableOpacity
                    onPress={shareItem}
                    style={styles.mediaIconButton}
                  >
                    <Text style={styles.mediaIconText}>
                      ↗️
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={toggleFavorite}
                    style={styles.mediaIconButton}
                  >
                    <Text style={styles.favoriteIcon}>
                      {isFav ? "❤️" : "🤍"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* IMAGE COUNTER */}

              {imageList.length > 1 &&
                !videoUrl && (
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {activeImage + 1} / {imageList.length}
                    </Text>
                  </View>
                )}

              {/* IMAGE INDICATORS */}

              {imageList.length > 1 &&
                !videoUrl && (
                  <View style={styles.imageIndicators}>
                    {imageList.map(
                      (_: string, index: number) => (
                        <View
                          key={index}
                          style={[
                            styles.imageIndicator,
                            activeImage === index &&
                              styles.activeImageIndicator,
                          ]}
                        />
                      )
                    )}
                  </View>
                )}
            </View>
          </View>

          {/* ======================================
              🟡 PRODUCT INFORMATION
          ====================================== */}

          <View style={styles.content}>
            <View style={styles.productHeading}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {item.category || "Marketplace"}
                </Text>
              </View>

              {item.is_negotiable && (
                <View style={styles.negotiableBadge}>
                  <Text style={styles.negotiableBadgeText}>
                    NEGOTIABLE
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.itemTitle}>
              {item.title}
            </Text>

            {/* PRICE */}

            <View style={styles.priceContainer}>
              <Text style={styles.currencyLabel}>
                GH₵
              </Text>

              <Text style={styles.itemPrice}>
                {Number(item.price || 0).toLocaleString()}
              </Text>
            </View>

            {/* STATS */}

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>
                  👁️
                </Text>

                <Text style={styles.statValue}>
                  {viewsCount.toLocaleString()}
                </Text>

                <Text style={styles.statLabel}>
                  Views
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statIcon}>
                  ❤️
                </Text>

                <Text style={styles.statValue}>
                  {saveCount.toLocaleString()}
                </Text>

                <Text style={styles.statLabel}>
                  Saves
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statIcon}>
                  ⭐
                </Text>

                
              </View>
            </View>

            {/* ======================================
                📝 DESCRIPTION
            ====================================== */}

            {item.description && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  About this item
                </Text>

                <Text style={styles.descriptionText}>
                  {item.description}
                </Text>
              </View>
            )}

            {/* ======================================
                👤 SELLER INFORMATION
            ====================================== */}

            {seller && (
              <View style={styles.sellerCard}>
                <View style={styles.sectionHeadingRow}>
                  <Text style={styles.sectionTitle}>
                    Seller information
                  </Text>

                  <View style={styles.trustedBadge}>
                    <Text style={styles.trustedBadgeText}>
                      NASARA SELLER
                    </Text>
                  </View>
                </View>

                <View style={styles.sellerDetails}>
                  <Image
                    source={{
                      uri:
                        seller.avatar_url ||
                        "https://ui-avatars.com/api/?name=User",
                    }}
                    style={styles.sellerAvatar}
                  />

                  <View style={styles.sellerInfo}>
                    <View style={styles.sellerNameRow}>
                      <Text
                        numberOfLines={1}
                        style={styles.sellerName}
                      >
                        {seller.full_name || "Nasara Seller"}
                      </Text>

                      {seller.verified && (
                        <Text style={styles.verifiedIcon}>
                          ✓
                        </Text>
                      )}
                    </View>

                    <Text style={styles.sellerFollowers}>
                      {sellerFollowers.toLocaleString()} followers
                    </Text>

                    
                  </View>
                </View>

                {/* VISIT SELLER SHOP */}

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push("/sellers/" + seller.id)
                  }
                  style={styles.shopButton}
                >
                  <Text style={styles.shopButtonIcon}>
                    🛍️
                  </Text>

                  <Text style={styles.shopButtonText}>
                    Visit Seller Shop
                  </Text>

                  <Text style={styles.shopButtonArrow}>
                    →
                  </Text>
                </TouchableOpacity>

                {/* FOLLOW */}

                {!isSeller && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={toggleFollow}
                    style={[
                      styles.followButton,
                      isFollowing &&
                        styles.followingButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing &&
                          styles.followingButtonText,
                      ]}
                    >
                      {isFollowing
                        ? "✓ Following Seller"
                        : "+ Follow Seller"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ======================================
                💬 BUYER ACTIONS
            ====================================== */}

            {!isSeller && (
              <View style={styles.actionSection}>
                <Text style={styles.sectionTitle}>
                  Interested in this item?
                </Text>

                <Text style={styles.actionSubtitle}>
                  Contact the seller directly to make enquiries.
                </Text>

                {/* CHAT */}

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={startChat}
                  style={styles.chatButton}
                >
                  <Text style={styles.actionButtonIcon}>
                    💬
                  </Text>

                  <Text style={styles.chatButtonText}>
                    Chat with Seller
                  </Text>
                </TouchableOpacity>

                {/* CALL */}

                {!!item.seller_phone && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() =>
                      Linking.openURL(
                        `tel:${item.seller_phone}`
                      )
                    }
                    style={styles.callButton}
                  >
                    <Text style={styles.callButtonIcon}>
                      📞
                    </Text>

                    <Text style={styles.callButtonText}>
                      Call Seller
                    </Text>
                  </TouchableOpacity>
                )}

                {/* OFFER */}

                {item.is_negotiable && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() =>
                      setShowOffer(!showOffer)
                    }
                    style={styles.offerButton}
                  >
                    <Text style={styles.offerButtonIcon}>
                      💰
                    </Text>

                    <Text style={styles.offerButtonText}>
                      {showOffer
                        ? "Close Offer Form"
                        : "Make an Offer"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* OFFER FORM */}

                {showOffer && (
                  <View style={styles.offerCard}>
                    <Text style={styles.offerTitle}>
                      Your offer
                    </Text>

                    <Text style={styles.offerDescription}>
                      Enter the amount you would like to offer the seller.
                    </Text>

                    <View style={styles.offerInputContainer}>
                      <Text style={styles.offerCurrency}>
                        GH₵
                      </Text>

                      <TextInput
                        value={offerPrice}
                        onChangeText={setOfferPrice}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.muted}
                        style={styles.offerInput}
                      />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={submitOffer}
                      style={styles.submitOfferButton}
                    >
                      <Text style={styles.submitOfferText}>
                        Submit Offer
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ======================================
                🚀 SELLER MANAGEMENT
            ====================================== */}

            {isSeller && (
              <View style={styles.sellerManagement}>
                <Text style={styles.sectionTitle}>
                  Manage your listing
                </Text>

                <Text style={styles.actionSubtitle}>
                  Promote your item and manage customer reviews.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push(`/boost/${item.id}`)
                  }
                  style={styles.boostButton}
                >
                  <Text style={styles.boostIcon}>
                    🚀
                  </Text>

                  <Text style={styles.boostButtonText}>
                    Boost This Item
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push(`/reviews/${item.id}`)
                  }
                  style={styles.reviewsButton}
                >
                  <Text style={styles.reviewsButtonText}>
                    ⭐ View Item Reviews
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ======================================
              🛍️ SIMILAR ITEMS
          ====================================== */}

          {relatedItems.length > 0 && (
            <View style={styles.recommendationSection}>
              <View style={styles.recommendationHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Similar Items
                  </Text>

                  <Text style={styles.recommendationSubtitle}>
                    Discover more products in this category.
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProducts}
              >
                {relatedItems.map((related) => (
                  <ProductCard
                    key={related.id}
                    product={related}
                    onPress={() =>
                      openRelatedItem(related.id)
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ======================================
              🧠 RECOMMENDED ITEMS
          ====================================== */}

          {recommendations.length > 0 && (
            <View style={styles.recommendationSection}>
              <View style={styles.recommendationHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Recommended for You
                  </Text>

                  <Text style={styles.recommendationSubtitle}>
                    More products you may be interested in.
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProducts}
              >
                {recommendations.map((rec: any) => (
                  <ProductCard
                    key={rec.id}
                    product={rec}
                    onPress={() =>
                      openRelatedItem(rec.id)
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ======================================
              🏪 MORE FROM THIS SELLER
          ====================================== */}

          {sellerItems.length > 0 && (
            <View style={styles.recommendationSection}>
              <View style={styles.recommendationHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    More From This Seller
                  </Text>

                  <Text style={styles.recommendationSubtitle}>
                    Explore other items from this shop.
                  </Text>
                </View>

                {seller?.id && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/sellers/" + seller.id)
                    }
                  >
                    <Text style={styles.viewAllText}>
                      View Shop →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProducts}
              >
                {sellerItems.map((rec: any) => (
                  <ProductCard
                    key={rec.id}
                    product={rec}
                    onPress={async () => {
                      try {
                        await (supabase as any)
                          .from("item_engagement")
                          .insert({
                            item_id: rec.id,
                            user_id: userId,
                            action: "recommendation_click",
                          });
                      } catch (e) {
                        console.log(e);
                      }

                      openRelatedItem(rec.id);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ======================================
              🟡 FOOTER
          ====================================== */}

          <View style={styles.footer}>
            <Text style={styles.footerLogo}>
              NASARA
            </Text>

            <Text style={styles.footerText}>
              Discover more. Connect directly. Trade with confidence.
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// ==========================================
// 🎨 PREMIUM NASARA STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ==========================================
  // ⏳ LOADING
  // ==========================================

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingLogo: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },

  loadingLogoText: {
    color: COLORS.navy,
    fontSize: 38,
    fontWeight: "900",
  },

  loadingText: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 14,
  },

  // ==========================================
  // ❌ NOT FOUND
  // ==========================================

  notFoundContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  notFoundIcon: {
    fontSize: 65,
    marginBottom: 20,
  },

  notFoundTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: COLORS.navy,
  },

  notFoundSubtitle: {
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
  },

  notFoundButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 35,
    paddingVertical: 14,
    borderRadius: 13,
    marginTop: 25,
  },

  notFoundButtonText: {
    color: COLORS.white,
    fontWeight: "800",
  },

  // ==========================================
  // 🖼️ MEDIA GALLERY
  // ==========================================

  mediaSection: {
    backgroundColor: COLORS.navy,
    paddingTop: 45,
    paddingBottom: 22,
    alignItems: "center",
  },

  mediaContainer: {
    height: 390,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#263650",
    position: "relative",
  },

  mediaImage: {
    height: 390,
    backgroundColor: "#263650",
  },

  mediaTopBar: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  mediaActions: {
    flexDirection: "row",
    gap: 10,
  },

  mediaIconButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "rgba(16,29,56,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },

  mediaIconText: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "700",
  },

  favoriteIcon: {
    fontSize: 19,
  },

  imageCounter: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(16,29,56,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  imageCounterText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  imageIndicators: {
    position: "absolute",
    bottom: 21,
    left: 15,
    flexDirection: "row",
    gap: 5,
  },

  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  activeImageIndicator: {
    width: 18,
    backgroundColor: COLORS.gold,
  },

  noMedia: {
    height: 390,
    justifyContent: "center",
    alignItems: "center",
  },

  noMediaIcon: {
    fontSize: 55,
  },

  noMediaText: {
    color: COLORS.white,
    marginTop: 12,
    fontSize: 14,
  },

  // ==========================================
  // 📦 PRODUCT CONTENT
  // ==========================================

  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },

  productHeading: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  categoryBadge: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },

  categoryBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
  },

  negotiableBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },

  negotiableBadgeText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  itemTitle: {
    color: COLORS.text,
    fontSize: 27,
    lineHeight: 35,
    fontWeight: "900",
  },

  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 12,
    marginBottom: 20,
  },

  currencyLabel: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: "800",
    marginRight: 5,
  },

  itemPrice: {
    color: COLORS.green,
    fontSize: 30,
    fontWeight: "900",
  },

  // ==========================================
  // 📊 STATISTICS
  // ==========================================

  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 17,
    paddingVertical: 17,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statIcon: {
    fontSize: 17,
    marginBottom: 5,
  },

  statValue: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },

  // ==========================================
  // 📝 DESCRIPTION
  // ==========================================

  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
  },

  descriptionText: {
    color: "#536176",
    fontSize: 14,
    lineHeight: 24,
    marginTop: 12,
  },

  // ==========================================
  // 👤 SELLER CARD
  // ==========================================

  sellerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },

  trustedBadge: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },

  trustedBadgeText: {
    color: "#8C651E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  sellerDetails: {
    flexDirection: "row",
    alignItems: "center",
  },

  sellerAvatar: {
    width: 67,
    height: 67,
    borderRadius: 35,
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },

  sellerInfo: {
    flex: 1,
    marginLeft: 14,
  },

  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sellerName: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "900",
    flexShrink: 1,
  },

  verifiedIcon: {
    color: COLORS.white,
    backgroundColor: "#2787D9",
    width: 19,
    height: 19,
    borderRadius: 10,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontWeight: "900",
    fontSize: 12,
    marginLeft: 7,
  },

  sellerFollowers: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  sellerRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  sellerRating: {
    color: "#A8751F",
    fontSize: 12,
    fontWeight: "800",
  },

  reviewCount: {
    color: COLORS.muted,
    fontSize: 11,
    marginLeft: 5,
  },

  // ==========================================
  // 🛍️ SELLER SHOP BUTTON
  // ==========================================

  shopButton: {
    backgroundColor: COLORS.navy,
    padding: 15,
    borderRadius: 13,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  shopButtonIcon: {
    fontSize: 19,
    marginRight: 10,
  },

  shopButtonText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  shopButtonArrow: {
    color: COLORS.gold,
    fontSize: 23,
    fontWeight: "900",
  },

  // ==========================================
  // ➕ FOLLOW BUTTON
  // ==========================================

  followButton: {
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    padding: 13,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },

  followingButton: {
    backgroundColor: COLORS.grayLight,
    borderColor: COLORS.grayLight,
  },

  followButtonText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 13,
  },

  followingButtonText: {
    color: COLORS.muted,
  },

  // ==========================================
  // 💬 BUYER ACTIONS
  // ==========================================

  actionSection: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  actionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 15,
  },

  chatButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 13,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  actionButtonIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  chatButtonText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 14,
  },

  callButton: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 13,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  callButtonIcon: {
    marginRight: 9,
    fontSize: 17,
  },

  callButtonText: {
    color: COLORS.green,
    fontWeight: "900",
    fontSize: 14,
  },

  offerButton: {
    backgroundColor: COLORS.goldLight,
    borderRadius: 13,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  offerButtonIcon: {
    marginRight: 9,
    fontSize: 17,
  },

  offerButtonText: {
    color: "#8C651E",
    fontWeight: "900",
    fontSize: 14,
  },

  // ==========================================
  // 💰 OFFER FORM
  // ==========================================

  offerCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 15,
    marginTop: 15,
  },

  offerTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  offerDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 13,
  },

  offerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  offerCurrency: {
    color: COLORS.green,
    fontWeight: "900",
    fontSize: 15,
  },

  offerInput: {
    flex: 1,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },

  submitOfferButton: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    padding: 15,
    marginTop: 12,
    alignItems: "center",
  },

  submitOfferText: {
    color: COLORS.white,
    fontWeight: "900",
  },

  // ==========================================
  // 🚀 SELLER MANAGEMENT
  // ==========================================

  sellerManagement: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  boostButton: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  boostIcon: {
    marginRight: 9,
    fontSize: 18,
  },

  boostButtonText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  reviewsButton: {
    backgroundColor: COLORS.goldLight,
    padding: 15,
    borderRadius: 13,
    marginTop: 10,
    alignItems: "center",
  },

  reviewsButtonText: {
    color: "#8C651E",
    fontWeight: "900",
  },

  // ==========================================
  // 🛍️ RECOMMENDATIONS
  // ==========================================

  recommendationSection: {
    marginTop: 10,
    marginBottom: 22,
  },

  recommendationHeading: {
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  recommendationSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  horizontalProducts: {
    paddingHorizontal: 16,
    paddingBottom: 5,
  },

  productCard: {
    width: 175,
    marginRight: 13,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  productImageWrapper: {
    height: 155,
    backgroundColor: COLORS.grayLight,
  },

  productImage: {
    width: "100%",
    height: "100%",
  },

  productPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderIcon: {
    fontSize: 40,
  },

  productCardInfo: {
    padding: 11,
  },

  productCardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  productCardPrice: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 7,
  },

  viewAllText: {
    color: COLORS.navyLight,
    fontSize: 12,
    fontWeight: "900",
  },

  // ==========================================
  // 🟡 FOOTER
  // ==========================================

  footer: {
    alignItems: "center",
    paddingVertical: 28,
    marginTop: 5,
    backgroundColor: COLORS.navy,
  },

  footerLogo: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 3,
  },

  footerText: {
    color: "#D6DDE8",
    fontSize: 11,
    textAlign: "center",
    marginTop: 7,
  },
});