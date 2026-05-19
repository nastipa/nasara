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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function ItemDetail() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const router = useRouter();

  /* ============================
     STATES
  ============================ */
  const [item, setItem] =
    useState<any>(null);

  const [userId, setUserId] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [showOffer, setShowOffer] =
    useState(false);

  const [offerPrice, setOfferPrice] =
    useState("");

  const [isFav, setIsFav] =
    useState(false);

  const [seller, setSeller] =
    useState<any>(null);

  const [relatedItems, setRelatedItems] =
    useState<any[]>([]);

  const [viewsCount, setViewsCount] =
    useState(0);

  const [saveCount, setSaveCount] =
    useState(0);

  const [sellerFollowers, setSellerFollowers] =
    useState(0);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [avgRating, setAvgRating] =
    useState(0);

  const [reviewsCount, setReviewsCount] =
    useState(0);
    const [recommendations, setRecommendations] =
  useState<any[]>([]);

const [sellerItems, setSellerItems] =
  useState<any[]>([]);

  /* ============================
     LOAD USER
  ============================ */
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setUserId(
          data.user
            ? data.user.id
            : null
        );
      });
  }, []);
/* ============================
   RUN LOAD ITEM
============================ */
useEffect(() => {
  if (!id) return;

  loadItem();
}, [id, userId]);
  

/* ============================
   LOAD RECOMMENDATIONS
============================ */
useEffect(() => {
  if (!item) return;

  const loadRecommendations =
    async () => {
      try {
        /* SAME CATEGORY */
        const {
          data: categoryItems,
        } = await supabase
          .from("items_live")
          .select("*")
          .eq(
            "category",
            item.category
          )
          .neq("id", item.id)
          .eq("status", "active")
          .limit(12);

        /* SAME SELLER */
        const {
          data: sellerData,
        } = await supabase
          .from("items_live")
          .select("*")
          .eq(
            "user_id",
            item.user_id
          )
          .neq("id", item.id)
          .eq("status", "active")
          .limit(12);

        setRecommendations(
          categoryItems || []
        );

        setSellerItems(
          sellerData || []
        );
      } catch (e) {
        console.log(
          "Recommendation error:",
          e
        );
      }
    };

  loadRecommendations();
}, [item]);
  

  /* ============================
     LOAD ITEM FUNCTION
  ============================ */
  const loadItem =
    async () => {
      setLoading(true);

      try {
        const { data, error }: any =
          await supabase
            .from("items_live")
            .select("*")
            .eq(
              "id",
              Number(id)
            )
            .single();

        if (error) {
          console.log(error);
          setLoading(false);
          return;
        }

        setItem(data);
        

        /* ============================
           TRACK VIEW
        ============================ */
        if (
          data &&
          userId &&
          userId !==
            data.user_id
        ) {
          await trackView(
            data.id
          );
        }

        /* ============================
           FAVORITE CHECK
        ============================ */
        if (data && userId) {
          const {
            data: fav,
          } =
            await (
              supabase as any
            )
              .from(
                "favorites"
              )
              .select("id")
              .eq(
                "user_id",
                userId
              )
              .eq(
                "item_id",
                data.id
              )
              .maybeSingle();

          setIsFav(!!fav);
        }

        /* ============================
           LOAD SELLER
        ============================ */
        if (data?.user_id) {
          loadSeller(
            data.user_id
          );

          loadRelatedItems(
            data.category,
            data.id
          );

          checkFollowing(
            data.user_id
          );

          loadSellerFollowers(
            data.user_id
          );

          loadRatings(
            data.user_id
          );
        }

        /* ============================
           LOAD COUNTS
        ============================ */
        loadCounts(data.id);

      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

  /* ============================
     LOAD SELLER
  ============================ */
  const loadSeller =
    async (
      sellerId: string
    ) => {
      const {
        data,
      } = await (
        supabase as any
      )
        .from("profiles")
        .select("*")
        .eq("id", sellerId)
        .single();

      if (data) {
        setSeller(data);
      }
    };

  /* ============================
     LOAD RELATED ITEMS
  ============================ */
  const loadRelatedItems =
    async (
      category: string,
      itemId: number
    ) => {
      const {
        data,
      } = await supabase
        .from("items_live")
        .select("*")
        .eq(
          "category",
          category
        )
        .neq("id", itemId)
        .eq(
          "status",
          "active"
        )
        .limit(10);

      setRelatedItems(
        data || []
      );
    };

  /* ============================
     LOAD COUNTS
  ============================ */
  const loadCounts =
    async (
      itemId: number
    ) => {
      const {
        count: views,
      } = await (
        supabase as any
      )
        .from(
          "item_views"
        )
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "item_id",
          itemId
        );

      setViewsCount(
        views || 0
      );

      const {
        count: saves,
      } = await (
        supabase as any
      )
        .from(
          "favorites"
        )
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "item_id",
          itemId
        );

      setSaveCount(
        saves || 0
      );
    };

  /* ============================
     TRACK VIEW
  ============================ */
  const trackView =
    async (
      itemId: number
    ) => {
      try {
        await (
          supabase as any
        )
          .from(
            "item_views"
          )
          .insert({
            item_id:
              itemId,
            user_id:
              userId,
          });

        /* ============================
           AI EVENT TRACKING
        ============================ */
        await (
          supabase as any
        )
          .from(
            "analytics_events"
          )
          .insert({
            user_id:
              userId,
            event_type:
              "view_item",
            item_id:
              itemId,
          });
      } catch {}
    };

  /* ============================
     LOAD SELLER FOLLOWERS
  ============================ */
  const loadSellerFollowers =
    async (
      sellerId: string
    ) => {
      const {
        count,
      } = await (
        supabase as any
      )
        .from(
          "followers"
        )
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "following_id",
          sellerId
        );

      setSellerFollowers(
        count || 0
      );
    };

  /* ============================
     CHECK FOLLOWING
  ============================ */
  const checkFollowing =
    async (
      sellerId: string
    ) => {
      if (!userId) return;

      const {
        data,
      } = await (
        supabase as any
      )
        .from(
          "followers"
        )
        .select("id")
        .eq(
          "follower_id",
          userId
        )
        .eq(
          "following_id",
          sellerId
        )
        .maybeSingle();

      setIsFollowing(
        !!data
      );
    };

  /* ============================
     FOLLOW SELLER
  ============================ */
  const toggleFollow =
    async () => {
      if (
        !userId ||
        !seller?.id
      )
        return;

      if (isFollowing) {
        await (
          supabase as any
        )
          .from(
            "followers"
          )
          .delete()
          .eq(
            "follower_id",
            userId
          )
          .eq(
            "following_id",
            seller.id
          );

        setIsFollowing(
          false
        );

        setSellerFollowers(
          (p) =>
            p - 1
        );
      } else {
        await (
          supabase as any
        )
          .from(
            "followers"
          )
          .insert({
            follower_id:
              userId,
            following_id:
              seller.id,
          });

        setIsFollowing(
          true
        );

        setSellerFollowers(
          (p) =>
            p + 1
        );
      }
    };

  /* ============================
     LOAD RATINGS
  ============================ */
  const loadRatings =
    async (
      sellerId: string
    ) => {
      const {
        data,
      } = await (
        supabase as any
      )
        .from(
          "seller_reviews"
        )
        .select(
          "rating"
        )
        .eq(
          "seller_id",
          sellerId
        );

      if (!data) return;

      setReviewsCount(
        data.length
      );

      if (
        data.length > 0
      ) {
        const total =
          data.reduce(
            (
              sum: number,
              r: any
            ) =>
              sum +
              Number(
                r.rating ||
                  0
              ),
            0
          );

        setAvgRating(
          total /
            data.length
        );
      }
    };

  /* ============================
     FAVORITE TOGGLE
  ============================ */
  const toggleFavorite =
    async () => {
      if (
        !userId ||
        !item
      )
        return;

      if (isFav) {
        await (
          supabase as any
        )
          .from(
            "favorites"
          )
          .delete()
          .eq(
            "user_id",
            userId
          )
          .eq(
            "item_id",
            item.id
          );

        setIsFav(false);

        setSaveCount(
          (p) =>
            p - 1
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

        setSaveCount(
          (p) =>
            p + 1
        );

        /* AI EVENT */
        await (
          supabase as any
        )
          .from(
            "analytics_events"
          )
          .insert({
            user_id:
              userId,
            event_type:
              "favorite_item",
            item_id:
              item.id,
          });
      }
    };

  /* ============================
     SHARE ITEM
  ============================ */
  const shareItem =
    async () => {
      try {
        const url = `https://nasara-six.vercel.app/item/${item.id}`;

        await Share.share({
          message: `🔥 ${item.title}\n\n${url}`,
        });
      } catch (e) {
        console.log(e);
      }
    };

  /* ============================
     VIDEO PLAYER
  ============================ */
  const videoUrl =
    item?.video_url?.trim() ||
    "";

  const player =
    useVideoPlayer(
      videoUrl ||
        "https://www.w3schools.com/html/mov_bbb.mp4",
      (p) => {
        p.loop = true;
      }
    );

  useEffect(() => {
    if (
      videoUrl &&
      videoUrl.startsWith(
        "http"
      )
    ) {
      try {
        player.replace(
          videoUrl
        );

        player.play();
      } catch (e) {
        console.log(
          "Video error:",
          e
        );
      }
    }
  }, [videoUrl]);

  /* ============================
     IMAGES
  ============================ */
  const imageList =
    useMemo(() => {
      if (
        item?.image_urls &&
        Array.isArray(
          item.image_urls
        )
      ) {
        return item.image_urls;
      }

      if (
        item?.image_url
      ) {
        return [
          item.image_url,
        ];
      }

      return [];
    }, [item]);

  /* ============================
     LOADING
  ============================ */
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <Text
        style={{
          marginTop: 80,
          textAlign:
            "center",
        }}
      >
        Item not found
      </Text>
    );
  }

  const isSeller =
    userId ===
    item.user_id;

  /* ============================
     START CHAT
  ============================ */
  const startChat =
    async () => {
      if (
        !userId ||
        !item?.id ||
        !item?.user_id
      ) {
        return;
      }

      const buyerId =
        userId;

      const sellerId =
        item.user_id;

      try {
        const {
          data: existing,
        } =
          await (
            supabase as any
          )
            .from(
              "chat_rooms"
            )
            .select("*")
            .eq(
              "item_id",
              item.id
            )
            .eq(
              "buyer_id",
              buyerId
            )
            .eq(
              "seller_id",
              sellerId
            )
            .maybeSingle();

        let roomId =
          existing?.id;

        if (!roomId) {
          const {
            data: newRoom,
            error,
          } =
            await (
              supabase as any
            )
              .from(
                "chat_rooms"
              )
              .insert({
                item_id:
                  item.id,
                buyer_id:
                  buyerId,
                seller_id:
                  sellerId,
              })
              .select()
              .single();
              

          if (error) {
            Alert.alert(
              "Error",
              error.message
            );

            return;
          }

          roomId =
            newRoom.id;
            await (supabase as any)
  .from("item_engagement")
  .insert({
    item_id: item.id,
    user_id: buyerId,
    action: "chat",
  });
        }
        
        /* AI EVENT */
        await (
          supabase as any
        )
          .from(
            "analytics_events"
          )
          .insert({
            user_id:
              userId,
            event_type:
              "chat_started",
            item_id:
              item.id,
          });

        router.push({
          pathname:
            "/chat/[id]",
          params: {
            id: roomId,
          },
        });
      } catch (err) {
        console.log(err);
      }
    };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:
            false,
        }}
      />

      {/* BACK */}
      <TouchableOpacity
        onPress={() =>
          router.back()
        }
        style={{
          position:
            "absolute",
          top: 45,
          left: 15,
          zIndex: 100,
          backgroundColor:
            "rgba(0,0,0,0.6)",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Text
          style={{
            color:
              "white",
          }}
        >
          Back
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={{
          backgroundColor:
            "#fff",
        }}
      >
        {/* ============================
            MEDIA
        ============================ */}
        <View
          style={{
            marginTop: 20,
            alignItems:
              "center",
          }}
        >
          <View
            style={{
              width: "92%",
              maxWidth: 420,
              borderRadius: 20,
              overflow:
                "hidden",
              backgroundColor:
                "#eee",
            }}
          >
            {/* FAVORITE */}
            <TouchableOpacity
              onPress={
                toggleFavorite
              }
              style={{
                position:
                  "absolute",
                top: 12,
                right: 12,
                zIndex: 20,
                backgroundColor:
                  "rgba(0,0,0,0.5)",
                padding: 10,
                borderRadius: 22,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                }}
              >
                {isFav
                  ? "❤️"
                  : "🤍"}
              </Text>
            </TouchableOpacity>

            {/* SHARE */}
            <TouchableOpacity
              onPress={
                shareItem
              }
              style={{
                position:
                  "absolute",
                top: 12,
                left: 12,
                zIndex: 20,
                backgroundColor:
                  "rgba(0,0,0,0.5)",
                padding: 10,
                borderRadius: 22,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                }}
              >
                🔗
              </Text>
            </TouchableOpacity>

            {/* VIDEO */}
            {videoUrl &&
            videoUrl.startsWith(
              "http"
            ) ? (
              <VideoView
                player={
                  player
                }
                style={{
                  width:
                    "100%",
                  height: 360,
                }}
              />
            ) : imageList.length >
              0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={
                  false
                }
              >
                {imageList.map(
                  (
                    img: string,
                    index: number
                  ) => (
                    <Image
                      key={
                        index
                      }
                      source={{
                        uri: img,
                      }}
                      style={{
                        width: 360,
                        height: 360,
                      }}
                      resizeMode="cover"
                    />
                  )
                )}
              </ScrollView>
            ) : (
              <View
                style={{
                  height: 320,
                  justifyContent:
                    "center",
                  alignItems:
                    "center",
                }}
              >
                <Text>
                  No
                  Media
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ============================
            ITEM INFO
        ============================ */}
        <View
          style={{
            padding: 18,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight:
                "bold",
            }}
          >
            {item.title}
          </Text>

          <Text
            style={{
              fontSize: 24,
              color:
                "#16a34a",
              fontWeight:
                "bold",
              marginTop: 8,
            }}
          >
            GH₵{" "}
            {item.price}
          </Text>

          {item.is_negotiable && (
            <View
              style={{
                marginTop: 10,
                alignSelf:
                  "flex-start",
                backgroundColor:
                  "#dcfce7",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color:
                    "#166534",
                  fontWeight:
                    "bold",
                }}
              >
                💬
                Negotiable
              </Text>
            </View>
          )}

          {/* STATS */}
          <View
            style={{
              flexDirection:
                "row",
              marginTop: 14,
              gap: 18,
              flexWrap:
                "wrap",
            }}
          >
            <Text>
              👁️{" "}
              {
                viewsCount
              }{" "}
              views
            </Text>

            <Text>
              ❤️{" "}
              {
                saveCount
              }{" "}
              saves
            </Text>

            <Text>
              ⭐{" "}
              {avgRating.toFixed(
                1
              )}{" "}
              (
              {
                reviewsCount
              }
              )
            </Text>
          </View>

          {/* DESCRIPTION */}
          {item.description && (
            <View
              style={{
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                Description
              </Text>

              <Text
                style={{
                  lineHeight: 22,
                  color:
                    "#374151",
                }}
              >
                {
                  item.description
                }
              </Text>
            </View>
          )}
        </View>

        {/* ============================
            SELLER CARD
        ============================ */}
        {seller && (
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor:
                "#f8fafc",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection:
                  "row",
                alignItems:
                  "center",
              }}
            >
              <Image
                source={{
                  uri:
                    seller.avatar_url ||
                    "https://ui-avatars.com/api/?name=User",
                }}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  marginRight: 14,
                }}
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <View
                  style={{
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                  }}
                >
                  <Text
                    style={{
                      fontWeight:
                        "bold",
                      fontSize: 18,
                    }}
                  >
                    {
                      seller.full_name
                    }
                  </Text>

                  {seller.verified && (
                    <Text
                      style={{
                        marginLeft: 6,
                        color:
                          "#2563eb",
                      }}
                    >
                      🔵
                    </Text>
                  )}
                </View>

                <Text
                  style={{
                    color:
                      "#6b7280",
                    marginTop: 4,
                  }}
                >
                  {
                    sellerFollowers
                  }{" "}
                  followers
                </Text>
              </View>
            </View>

            {!isSeller && (
              <>
                {/* FOLLOW */}
                <TouchableOpacity
                  onPress={
                    toggleFollow
                  }
                  style={{
                    backgroundColor:
                      isFollowing
                        ? "#111827"
                        : "#2563eb",
                    padding: 14,
                    borderRadius: 12,
                    marginTop: 16,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "white",
                      textAlign:
                        "center",
                      fontWeight:
                        "bold",
                    }}
                  >
                    {isFollowing
                      ? "Following"
                      : "Follow Seller"}
                  </Text>
                </TouchableOpacity>

                {/* CHAT */}
                <TouchableOpacity
                  onPress={
                    startChat
                  }
                  style={{
                    backgroundColor:
                      "#16a34a",
                    padding: 14,
                    borderRadius: 12,
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "white",
                      textAlign:
                        "center",
                      fontWeight:
                        "bold",
                    }}
                  >
                    💬 Chat
                    Seller
                  </Text>
                </TouchableOpacity>

                {/* CALL */}
                {!!item.seller_phone && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `tel:${item.seller_phone}`
                      )
                    }
                    style={{
                      backgroundColor:
                        "#0f172a",
                      padding: 14,
                      borderRadius: 12,
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "white",
                        textAlign:
                          "center",
                        fontWeight:
                          "bold",
                      }}
                    >
                      📞 Call
                      Seller
                    </Text>
                  </TouchableOpacity>
                )}

                {/* OFFER */}
                {item.is_negotiable && (
                  <TouchableOpacity
                    onPress={() =>
                      setShowOffer(
                        !showOffer
                      )
                    }
                    style={{
                      backgroundColor:
                        "#f59e0b",
                      padding: 14,
                      borderRadius: 12,
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "white",
                        textAlign:
                          "center",
                        fontWeight:
                          "bold",
                      }}
                    >
                      💰 Send
                      Offer
                    </Text>
                  </TouchableOpacity>
                )}

                {/* OFFER BOX */}
                {showOffer && (
                  <View
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <TextInput
                      value={
                        offerPrice
                      }
                      onChangeText={
                        setOfferPrice
                      }
                      placeholder="Enter your offer"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor:
                          "#d1d5db",
                        padding: 12,
                        borderRadius: 10,
                        marginBottom: 12,
                      }}
                    />

                    <TouchableOpacity
                      onPress={async () => {
                        if (
                          !offerPrice.trim()
                        ) {
                          Alert.alert(
                            "Enter amount"
                          );

                          return;
                        }

                        const {
                          error,
                        } =
                          await (
                            supabase as any
                          )
                            .from(
                              "offers"
                            )
                            .insert(
                              {
                                item_id:
                                  item.id,
                                buyer_id:
                                  userId,
                                seller_id:
                                  item.user_id,
                                price:
                                  Number(
                                    offerPrice
                                  ),
                                status:
                                  "pending",
                              }
                            );

                        if (
                          error
                        ) {
                          Alert.alert(
                            "Offer Failed",
                            error.message
                          );

                          return;
                        }
                        await (supabase as any)
  .from("item_engagement")
  .insert({
    item_id: item.id,
    user_id: userId,
    action: "offer",
  });

                        setOfferPrice(
                          ""
                        );

                        setShowOffer(
                          false
                        );

                        Alert.alert(
                          "Success",
                          "Offer sent"
                        );
                      }}
                      style={{
                        backgroundColor:
                          "#16a34a",
                        padding: 14,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            "white",
                          textAlign:
                            "center",
                          fontWeight:
                            "bold",
                        }}
                      >
                        Submit
                        Offer
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* SELLER BUTTONS */}
            <TouchableOpacity
              onPress={() =>
                router.push(
                  "/profile/" +
                    seller.id
                )
              }
              style={{
                marginTop: 14,
              }}
            >
              <Text
                style={{
                  color:
                    "#2563eb",
                  fontWeight:
                    "bold",
                }}
              >
                👤 View
                Seller
                Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  "/sellers/" +
                    seller.id
                )
              }
              style={{
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color:
                    "#2563eb",
                  fontWeight:
                    "bold",
                }}
              >
                🛍️ View
                Seller Shop
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================
            SELLER ACTIONS
        ============================ */}
        {isSeller && (
          <View
            style={{
              padding: 16,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/boost/${item.id}`
                )
              }
              style={{
                backgroundColor:
                  "#f59e0b",
                padding: 16,
                borderRadius: 14,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                  textAlign:
                    "center",
                  fontWeight:
                    "bold",
                }}
              >
                🚀 Boost
                Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/reviews/${item.id}`
                )
              }
              style={{
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  color:
                    "#2563eb",
                  fontWeight:
                    "bold",
                }}
              >
                ⭐ View
                Reviews
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================
            RELATED ITEMS
        ============================ */}
        {relatedItems.length >
          0 && (
          <View
            style={{
              padding: 16,
            }}
          >
            <Text
              style={{
                fontWeight:
                  "bold",
                fontSize: 20,
                marginBottom: 14,
              }}
            >
              Similar
              Items
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
            >
              {relatedItems.map(
                (
                  related
                ) => (
                  <TouchableOpacity
                    key={
                      related.id
                    }
                    onPress={() =>
                      router.push(
                        `/itemdetail/${related.id}`
                      )
                    }
                    style={{
                      width: 180,
                      marginRight: 14,
                      backgroundColor:
                        "#f8fafc",
                      borderRadius: 16,
                      overflow:
                        "hidden",
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          related.image_url,
                      }}
                      style={{
                        width:
                          "100%",
                        height: 160,
                      }}
                    />

                    <View
                      style={{
                        padding: 10,
                      }}
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        {
                          related.title
                        }
                      </Text>

                      <Text
                        style={{
                          marginTop: 6,
                          color:
                            "#16a34a",
                          fontWeight:
                            "bold",
                        }}
                      >
                        GH₵{" "}
                        {
                          related.price
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </View>
        )}
         /* ============================
   BECAUSE YOU VIEWED THIS
============================ */
{recommendations.length > 0 && (
  <View
    style={{
      paddingHorizontal: 16,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 14,
      }}
    >
      Because You Viewed This
    </Text>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
    >
      {recommendations.map(
        (rec: any) => (
          <TouchableOpacity
            key={rec.id}
            onPress={() =>
              router.push(
                `/itemdetail/${rec.id}`
              )
            }
            style={{
              width: 180,
              marginRight: 14,
              backgroundColor:
                "#111827",
              borderRadius: 16,
              overflow:
                "hidden",
            }}
          >
            <Image
              source={{
                uri:
                  rec.image_url,
              }}
              style={{
                width: "100%",
                height: 170,
              }}
            />

            <View
              style={{
                padding: 10,
              }}
            >
              <Text
                numberOfLines={
                  1
                }
                style={{
                  color:
                    "white",
                  fontWeight:
                    "bold",
                }}
              >
                {rec.title}
              </Text>

              <Text
                style={{
                  color:
                    "#22c55e",
                  marginTop: 6,
                  fontWeight:
                    "bold",
                }}
              >
                GH₵ {rec.price}
              </Text>
            </View>
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  </View>
)}

/* ============================
   MORE FROM THIS SELLER
============================ */
{sellerItems.length > 0 && (
  <View
    style={{
      paddingHorizontal: 16,
      marginTop: 24,
    }}
  >
    <Text
      style={{
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 14,
      }}
    >
      More From This Seller
    </Text>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
    >
      {sellerItems.map(
        (rec: any) => (
          <TouchableOpacity
            key={rec.id}
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

  router.push(
    `/itemdetail/${rec.id}`
  );
}}
            style={{
              width: 180,
              marginRight: 14,
              backgroundColor:
                "#f8fafc",
              borderRadius: 16,
              overflow:
                "hidden",
            }}
          >
            <Image
              source={{
                uri:
                  rec.image_url,
              }}
              style={{
                width: "100%",
                height: 170,
              }}
            />

            <View
              style={{
                padding: 10,
              }}
            >
              <Text
                numberOfLines={
                  1
                }
                style={{
                  fontWeight:
                    "bold",
                }}
              >
                {rec.title}
              </Text>

              <Text
                style={{
                  color:
                    "#16a34a",
                  marginTop: 6,
                  fontWeight:
                    "bold",
                }}
              >
                GH₵ {rec.price}
              </Text>
            </View>
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  </View>
)}
        <View
          style={{
            height: 50,
          }}
        />
      </ScrollView>
    </>
  );
}