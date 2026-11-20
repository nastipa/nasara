import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import SafeVideo from "../../components/SafeVideo";
import { supabase } from "../../lib/supabase";

type Seller = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  [key: string]: any;
};

type SellerItem = {
  id: number | string;
  title: string;
  price: number | string | null;
  image_url?: string | null;
  image_urls?: string[] | string | null;
  video_url?: string | null;
  user_id: string;
  status?: string;
  [key: string]: any;
};

type MediaItem = {
  item: SellerItem;
  mediaType: "image" | "video" | "empty";
  mediaUrl: string | null;
  splitKey: string;
  mediaIndex: number;
};

export default function SellersShopScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const router = useRouter();

  const sellerId = Array.isArray(id) ? id[0] : id;

  const [seller, setSeller] = useState<Seller | null>(null);
  const [items, setItems] = useState<SellerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  // ==========================================
  // LOAD CURRENT USER
  // ==========================================

  const loadCurrentUser = useCallback(async () => {
    const {
      data,
      error,
    } = await supabase.auth.getUser();

    if (error) {
      setCurrentUserId(null);
      return;
    }

    setCurrentUserId(data.user?.id ?? null);
  }, []);

  // ==========================================
  // LOAD SELLER PROFILE
  // ==========================================

  const loadSeller = useCallback(async () => {
    if (!sellerId) {
      throw new Error("Seller ID is missing.");
    }

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sellerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("This seller could not be found.");
    }

    setSeller(data as Seller);
  }, [sellerId]);

  // ==========================================
  // LOAD SELLER PRODUCTS
  // ==========================================

  const loadSellerItems = useCallback(async () => {
    if (!sellerId) {
      throw new Error("Seller ID is missing.");
    }

    const {
      data,
      error,
    } = await supabase
      .from("items_live")
      .select("*")
      .eq("user_id", sellerId)
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    setItems((data || []) as SellerItem[]);
  }, [sellerId]);

  // ==========================================
  // LOAD ALL STOREFRONT DATA
  // ==========================================

  const loadStorefront = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      await Promise.all([
        loadCurrentUser(),
        loadSeller(),
        loadSellerItems(),
      ]);
    } catch (error: any) {
      console.log("SELLER SHOP ERROR:", error);

      setErrorMessage(
        error?.message || "Unable to load this seller's shop."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    loadCurrentUser,
    loadSeller,
    loadSellerItems,
  ]);

  useEffect(() => {
    loadStorefront();
  }, [loadStorefront]);

  // ==========================================
  // EXPAND PRODUCT MEDIA
  // ==========================================

  const expandedItems = useMemo(() => {
    const result: MediaItem[] = [];

    items.forEach((item) => {
      let images: string[] = [];

      try {
        if (Array.isArray(item.image_urls)) {
          images = item.image_urls.filter(
            (url): url is string =>
              typeof url === "string" && url.trim().length > 0
          );
        } else if (typeof item.image_urls === "string") {
          const parsed = JSON.parse(item.image_urls);

          if (Array.isArray(parsed)) {
            images = parsed.filter(
              (url): url is string =>
                typeof url === "string" && url.trim().length > 0
            );
          } else if (typeof parsed === "string") {
            images = [parsed];
          }
        }
      } catch {
        images = [];
      }

      // Include the main image if it is not already included.
      if (
        item.image_url &&
        !images.includes(item.image_url)
      ) {
        images.unshift(item.image_url);
      }

      // Show video as its own media card.
      if (item.video_url) {
        result.push({
          item,
          mediaType: "video",
          mediaUrl: item.video_url,
          splitKey: `${item.id}-video`,
          mediaIndex: 0,
        });
      }

      // Show every product image.
      images.forEach((imageUrl, index) => {
        result.push({
          item,
          mediaType: "image",
          mediaUrl: imageUrl,
          splitKey: `${item.id}-image-${index}`,
          mediaIndex: index,
        });
      });

      // Product without media.
      if (!item.video_url && images.length === 0) {
        result.push({
          item,
          mediaType: "empty",
          mediaUrl: null,
          splitKey: `${item.id}-empty`,
          mediaIndex: 0,
        });
      }
    });

    return result;
  }, [items]);

  // ==========================================
  // OPEN PRODUCT
  // ==========================================

  const openProduct = (item: SellerItem) => {
    router.push(
      `/itemdetail/${item.id}` as any
    );
  };

  // ==========================================
  // FIND EXISTING DIRECT CHAT
  // ==========================================

  const findExistingChat = async (
    buyerId: string,
    targetSellerId: string
  ) => {
    // First check buyer -> seller.
    const firstResult = await (supabase as any)
      .from("chat_rooms")
      .select("id")
      .eq("buyer_id", buyerId)
      .eq("seller_id", targetSellerId)
      .maybeSingle();

    if (firstResult.error) {
      throw firstResult.error;
    }

    if (firstResult.data?.id) {
      return firstResult.data.id;
    }

    // Also check seller -> buyer in case the room
    // was originally created from the other direction.
    const secondResult = await (supabase as any)
      .from("chat_rooms")
      .select("id")
      .eq("buyer_id", targetSellerId)
      .eq("seller_id", buyerId)
      .maybeSingle();

    if (secondResult.error) {
      throw secondResult.error;
    }

    return secondResult.data?.id ?? null;
  };

  // ==========================================
  // CONTACT SELLER — OPEN DIRECT NASARA CHAT
  // ==========================================

  const contactSeller = async () => {
    if (!sellerId || contactLoading) {
      return;
    }

    try {
      setContactLoading(true);

      const {
        data,
        error,
      } = await supabase.auth.getUser();

      // Login is required before messaging.
      if (error || !data.user) {
        router.push({
          pathname: "/(auth)/login" as any,
          params: {
            returnTo: `/sellers/${sellerId}`,
            sellerId: sellerId,
            action: "contact",
          },
        } as any);

        return;
      }

      const currentUser = data.user;

      setCurrentUserId(currentUser.id);

      // Do not allow sellers to contact themselves.
      if (currentUser.id === sellerId) {
        Alert.alert(
          "Your Shop",
          "You cannot contact yourself."
        );

        return;
      }

      // Check whether a direct conversation already exists.
      let roomId = await findExistingChat(
        currentUser.id,
        sellerId
      );

      // Create a new direct conversation if necessary.
      if (!roomId) {
        const {
          data: newRoom,
          error: createError,
        } = await (supabase as any)
          .from("chat_rooms")
          .insert({
            buyer_id: currentUser.id,
            seller_id: sellerId,
            item_id: null,
          })
          .select("id")
          .single();

        if (createError) {
          // Another request may have created the room
          // at almost the same time. Look it up again.
          if (createError.code === "23505") {
            roomId = await findExistingChat(
              currentUser.id,
              sellerId
            );
          } else {
            throw createError;
          }
        } else {
          roomId = newRoom?.id ?? null;
        }
      }

      if (!roomId) {
        throw new Error(
          "Unable to open this conversation. Please try again."
        );
      }

      // Open the existing Nasara chat screen.
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(roomId),
        },
      } as any);
    } catch (error: any) {
      console.log("CONTACT SELLER ERROR:", error);

      Alert.alert(
        "Unable to Contact Seller",
        error?.message ||
          "Something went wrong while opening the conversation. Please try again."
      );
    } finally {
      setContactLoading(false);
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator
          size="large"
          color="#D4AF37"
        />

        <Text style={styles.loadingText}>
          Loading Seller Shop...
        </Text>
      </View>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (errorMessage || !seller) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorTitle}>
          Shop Unavailable
        </Text>

        <Text style={styles.errorText}>
          {errorMessage || "This seller's shop could not be found."}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadStorefront()}
        >
          <Text style={styles.retryButtonText}>
            Try Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // MAIN STOREFRONT
  // ==========================================

  return (
    <View style={styles.container}>
      <FlatList
        data={expandedItems}
        keyExtractor={(item) => item.splitKey}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStorefront(true)}
            tintColor="#D4AF37"
          />
        }
        ListHeaderComponent={
          <View>
            {/* SELLER HEADER */}

            <View style={styles.sellerHeader}>
              <Image
                source={{
                  uri:
                    seller.avatar_url ||
                    "https://ui-avatars.com/api/?background=ccc&size=200",
                }}
                style={styles.avatar}
              />

              <Text style={styles.sellerName}>
                {seller.full_name ||
                  seller.username ||
                  "Nasara Seller"}
              </Text>

              {seller.username ? (
                <Text style={styles.username}>
                  @{seller.username}
                </Text>
              ) : null}

              {seller.location ? (
                <Text style={styles.location}>
                  📍 {seller.location}
                </Text>
              ) : null}

              <View style={styles.shopStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {items.length}
                  </Text>

                  <Text style={styles.statLabel}>
                    Products
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {expandedItems.length}
                  </Text>

                  <Text style={styles.statLabel}>
                    Media
                  </Text>
                </View>
              </View>

             {/* CONTACT SELLER — ALWAYS VISIBLE */}

<TouchableOpacity
  style={[
    styles.contactButton,
    contactLoading ? styles.contactButtonDisabled : null,
  ]}
  onPress={contactSeller}
  disabled={contactLoading}
  activeOpacity={0.8}
>
  {contactLoading ? (
    <ActivityIndicator
      color="#D4AF37"
      size="small"
    />
  ) : (
    <Text style={styles.contactButtonText}>
      💬 Contact Seller
    </Text>
  )}
</TouchableOpacity>

{!currentUserId && (
  <Text style={styles.loginHint}>
    Sign in to chat with this seller
  </Text>
)}

{currentUserId === sellerId && (
  <Text style={styles.ownShopText}>
    This is your shop
  </Text>
)}
</View>

            {/* PRODUCT HEADING */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Seller Products
              </Text>

              <Text style={styles.sectionSubtitle}>
                Browse products from this seller
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              🛍️
            </Text>

            <Text style={styles.emptyTitle}>
              No Products Yet
            </Text>

            <Text style={styles.emptyText}>
              This seller has not listed any active products.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => openProduct(item.item)}
            style={styles.card}
          >
            {/* PRODUCT MEDIA */}

            {item.mediaType === "video" && item.mediaUrl ? (
              <View style={styles.videoContainer}>
                <SafeVideo url={item.mediaUrl} />
              </View>
            ) : item.mediaType === "image" && item.mediaUrl ? (
              <Image
                source={{
                  uri: item.mediaUrl,
                }}
                style={styles.squareMedia}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noMedia}>
                <Text style={styles.noMediaText}>
                  No Media
                </Text>
              </View>
            )}

            {/* PRODUCT DETAILS */}

            <View style={styles.productDetails}>
              <Text
                numberOfLines={1}
                style={styles.productTitle}
              >
                {item.item.title || "Untitled Product"}
              </Text>

              <Text style={styles.productPrice}>
                GH₵ {item.item.price ?? "Contact seller"}
              </Text>

              {item.mediaType === "video" ? (
                <Text style={styles.mediaLabel}>
                  ▶️ Video
                </Text>
              ) : item.mediaType === "image" ? (
                <Text style={styles.mediaLabel}>
                  Photo {item.mediaIndex + 1}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  centerScreen: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingText: {
    color: "white",
    marginTop: 15,
    fontSize: 15,
  },

  errorTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },

  errorText: {
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  retryButtonText: {
    color: "#0f172a",
    fontWeight: "bold",
  },

  backButton: {
    padding: 15,
  },

  backButtonText: {
    color: "white",
  },

  listContent: {
    padding: 15,
    paddingBottom: 35,
  },

  sellerHeader: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 22,
    alignItems: "center",
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: "center",
    backgroundColor: "#eee",
  },

  sellerName: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginTop: 12,
  },

  username: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 3,
  },

  location: {
    textAlign: "center",
    color: "gray",
    marginTop: 7,
  },

  shopStats: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    gap: 35,
  },

  statBox: {
    alignItems: "center",
  },

  statNumber: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#0f172a",
  },

  statLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },

  contactButton: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    minWidth: 180,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  contactButtonDisabled: {
    opacity: 0.7,
  },

  contactButtonText: {
    color: "#D4AF37",
    fontWeight: "bold",
  },

  loginHint: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },

  ownShopText: {
    color: "#64748b",
    marginTop: 18,
    fontWeight: "600",
  },

  sectionHeader: {
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 4,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    marginBottom: 13,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },

  squareMedia: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#e5e7eb",
  },

  videoContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
    overflow: "hidden",
    justifyContent: "center",
  },

  noMedia: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },

  noMediaText: {
    color: "#64748b",
  },

  productDetails: {
    padding: 9,
  },

  productTitle: {
    fontWeight: "bold",
    color: "#111827",
  },

  productPrice: {
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 4,
  },

  mediaLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 5,
  },

  emptyContainer: {
    alignItems: "center",
    padding: 35,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 5,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 12,
  },

  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 7,
  },
});