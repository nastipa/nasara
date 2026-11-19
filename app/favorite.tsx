import { useFocusEffect, useRouter } from "expo-router";
import { createElement, useCallback, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { VideoView, useVideoPlayer } from "expo-video";

import { supabase } from "../lib/supabase";

// ==================================================
// 📦 TYPES
// ==================================================

interface FavoriteItem {
  id: number;
  user_id: string;
  title: string;
  price: number | null;
  description?: string | null;
  image_url?: string | null;
  image_urls?: string[] | string | null;
  video_url?: string | null;
  location?: string | null;
  seller_phone?: string | null;
}

// ==================================================
// 🖼️ GET ALL PRODUCT IMAGES
// ==================================================

const getProductImages = (item: FavoriteItem): string[] => {
  let images: string[] = [];

  if (Array.isArray(item.image_urls)) {
    images = item.image_urls;
  } else if (typeof item.image_urls === "string") {
    try {
      const parsed = JSON.parse(item.image_urls);

      if (Array.isArray(parsed)) {
        images = parsed;
      } else if (typeof parsed === "string") {
        images = [parsed];
      }
    } catch {
      if (item.image_urls.trim()) {
        images = [item.image_urls.trim()];
      }
    }
  }

  // FALL BACK TO image_url
  if (images.length === 0 && item.image_url) {
    images = [item.image_url];
  }

  // REMOVE EMPTY AND DUPLICATE IMAGES
  return [
    ...new Set(
      images
        .filter(
          (image): image is string =>
            typeof image === "string" &&
            image.trim().length > 0
        )
        .map((image) => image.trim())
    ),
  ];
};

// ==================================================
// 🎥 NATIVE VIDEO PREVIEW
// ANDROID + IOS
// ==================================================

function FavoriteNativeVideo({
  uri,
}: {
  uri: string;
}) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <View
      style={{
        width: 180,
        height: 180,
        alignSelf: "center",
        marginTop: 15,
        borderRadius: 15,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: "100%",
        }}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}

// ==================================================
// 🌐 WEB VIDEO PREVIEW
// ==================================================

function FavoriteWebVideo({
  uri,
}: {
  uri: string;
}) {
  return (
    <View
      style={{
        width: 180,
        height: 180,
        alignSelf: "center",
        marginTop: 15,
        borderRadius: 15,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      {createElement("video" as any, {
        src: uri,
        autoPlay: true,
        muted: true,
        loop: true,
        playsInline: true,
        controls: true,
        preload: "metadata",
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "#000",
        },
      })}
    </View>
  );
}

// ==================================================
// 🎥 VIDEO COMPONENT
// ==================================================

function FavoriteVideo({
  uri,
}: {
  uri: string;
}) {
  if (!uri) return null;

  if (Platform.OS === "web") {
    return <FavoriteWebVideo uri={uri} />;
  }

  return <FavoriteNativeVideo uri={uri} />;
}

// ==================================================
// ❤️ NASARA FAVORITES
// ==================================================

export default function Favorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ==================================================
  // 📥 LOAD FAVORITES
  // ==================================================

  const loadFavorites = async () => {
    try {
      setLoading(true);

      // GET SIGNED-IN USER
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setItems([]);
        return;
      }

      // ==============================================
      // STEP 1: GET FAVORITE RECORDS
      // ==============================================

      const {
        data: favorites,
        error: favoritesError,
      } = await supabase
        .from("favorites")
        .select("id, item_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (favoritesError) {
        throw favoritesError;
      }

      if (!favorites || favorites.length === 0) {
        setItems([]);
        return;
      }

      // ==============================================
      // STEP 2: GET PRODUCT IDS
      // ==============================================

      const itemIds = [
        ...new Set(
          favorites
            .map((favorite: any) =>
              Number(favorite.item_id)
            )
            .filter((id: number) =>
              Number.isFinite(id)
            )
        ),
      ];

      if (itemIds.length === 0) {
        setItems([]);
        return;
      }

      // ==============================================
      // STEP 3: FETCH PRODUCTS
      // INCLUDE ALL IMAGES AND VIDEO
      // ==============================================

      const {
        data: products,
        error: productsError,
      } = await supabase
        .from("items_live")
        .select(
          `
            id,
            user_id,
            title,
            price,
            description,
            image_url,
            image_urls,
            video_url,
            location,
            seller_phone
          `
        )
        .in("id", itemIds);

      if (productsError) {
        throw productsError;
      }

      // ==============================================
      // STEP 4: MATCH PRODUCTS WITH FAVORITES
      // PRESERVE FAVORITE ORDER
      // ==============================================

      const productMap = new Map<number, FavoriteItem>(
        (products || []).map((product: any) => [
          Number(product.id),
          product as FavoriteItem,
        ])
      );

      const orderedItems = favorites
        .map((favorite: any) =>
          productMap.get(Number(favorite.item_id))
        )
        .filter(
          (product): product is FavoriteItem =>
            Boolean(product)
        );

      setItems(orderedItems);

    } catch (error: any) {
      console.error(
        "LOAD FAVORITES ERROR:",
        error?.message || error
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // 🔄 RELOAD WHEN SCREEN OPENS
  // ==================================================

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  // ==================================================
  // 🎨 SCREEN
  // ==================================================

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* ==========================================
          BACK TO HOME
      ========================================== */}

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          padding: 12,
        }}
      >
        <Text
          style={{
            color: "#2563eb",
            fontWeight: "600",
          }}
        >
          ← Back to Home
        </Text>
      </TouchableOpacity>

      {/* ==========================================
          FAVORITES LIST
      ========================================== */}

      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.id.toString()
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadFavorites}
          />
        }
        contentContainerStyle={{
          padding: 12,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color="#2563eb"
              style={{
                marginTop: 40,
              }}
            />
          ) : (
            <Text
              style={{
                textAlign: "center",
                marginTop: 40,
                color: "#666",
              }}
            >
              No favorites yet ❤️
            </Text>
          )
        }
        renderItem={({ item }) => {
          const productImages = getProductImages(item);

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                router.push(
                  `/itemdetail/${item.id}`
                )
              }
              style={{
                backgroundColor: "#fff",
                marginBottom: 12,
                padding: 10,
                borderRadius: 10,
                elevation: 2,
              }}
            >
              {/* ==================================
                  PRODUCT IMAGES
              ================================== */}

              {productImages.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    alignItems: "center",
                    paddingHorizontal: 2,
                  }}
                >
                  {productImages.map(
                    (image, index) => (
                      <Image
                        key={`${item.id}-image-${index}`}
                        source={{
                          uri: image,
                        }}
                        style={{
                          width: 200,
                          height: 200,
                          alignSelf: "center",
                          borderRadius: 15,
                          marginTop: 15,
                          marginRight: 10,
                        }}
                        resizeMode="cover"
                      />
                    )
                  )}
                </ScrollView>
              ) : (
                !item.video_url && (
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      alignSelf: "center",
                      marginTop: 15,
                      borderRadius: 15,
                      backgroundColor: "#eee",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text>No Image</Text>
                  </View>
                )
              )}

              {/* ==================================
                  PRODUCT VIDEO
              ================================== */}

              {item.video_url ? (
                <FavoriteVideo
                  uri={item.video_url}
                />
              ) : null}

              {/* ==================================
                  PRODUCT DETAILS
              ================================== */}

              <Text
                style={{
                  fontWeight: "bold",
                  marginTop: 12,
                  color: "#111",
                  fontSize: 16,
                }}
              >
                {item.title}
              </Text>

              <Text
                style={{
                  color: "green",
                  marginTop: 4,
                  fontWeight: "600",
                }}
              >
                ₵ {item.price ?? 0}
              </Text>

              {item.description ? (
                <Text
                  numberOfLines={2}
                  style={{
                    color: "#555",
                    marginTop: 5,
                  }}
                >
                  {item.description}
                </Text>
              ) : null}

              {item.location ? (
                <Text
                  style={{
                    color: "#555",
                    marginTop: 5,
                  }}
                >
                  📍 {item.location}
                </Text>
              ) : null}

              {/* ==================================
                  OPEN PRODUCT
              ================================== */}

              <Text
                style={{
                  color: "#2563eb",
                  fontWeight: "600",
                  marginTop: 10,
                }}
              >
                View Product →
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}