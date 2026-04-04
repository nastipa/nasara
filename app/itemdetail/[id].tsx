import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showOffer, setShowOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");

  // ❤️ FAVORITE STATE (ADDED)
  const [isFav, setIsFav] = useState(false);

  /* ============================
     LOAD USER
  ============================ */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user ? data.user.id : null);
    });
  }, []);

  /* ============================
     LOAD ITEM + FAVORITE CHECK
  ============================ */
  useEffect(() => {
    if (!id) return;

    const loadItem = async () => {
      const { data }: any = await supabase
        .from("items_live")
        .select("*")
        .eq("id", Number(id))
        .single();

      setItem(data);
      setLoading(false);

      // ❤️ CHECK FAVORITE
      if (data && userId) {
        const { data: fav } = await (supabase as any)
          .from("favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("item_id", data.id)
          .maybeSingle();

        setIsFav(!!fav);
      }
    };

    loadItem();
  }, [id, userId]);

  /* ============================
     TOGGLE FAVORITE (ADDED)
  ============================ */
  const toggleFavorite = async () => {
    if (!userId || !item) return;

    if (isFav) {
      await (supabase as any)
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", item.id);

      setIsFav(false);
    } else {
      await (supabase as any)
        .from("favorites")
        .insert({
          user_id: userId,
          item_id: item.id,
        });

      setIsFav(true);
    }
  };

  /* ============================
     VIDEO PLAYER
  ============================ */
  const videoUrl = item?.video_url ?? "";

  const player = useVideoPlayer(videoUrl, (p) => {
    if (videoUrl) {
      p.loop = true;
      p.play();
    }
  });

  /* ============================
     LOADING STATES
  ============================ */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <Text style={{ marginTop: 50, textAlign: "center" }}>
        Item not found
      </Text>
    );
  }

  const isSeller = userId === item.user_id;

  /* ============================
     CHAT ROOM ID
  ============================ */
  const getRoomId = function () {
    if (!userId) return "";

    const buyerId = userId;
    const sellerId = item.user_id;
    const itemId = item.id;

    return buyerId < sellerId
      ? buyerId + "" + sellerId + "" + itemId
      : sellerId + "" + buyerId + "" + itemId;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* BACK */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: 45,
          left: 15,
          zIndex: 100,
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: "white" }}>Back</Text>
      </TouchableOpacity>

      <ScrollView>
        {/* ============================
            MEDIA
        ============================ */}
        <View
          style={{
            marginTop: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "90%",
              maxWidth: 360,
              height: 350,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#eee",
            }}
          >
            {/* ❤️ FAVORITE BUTTON (ADDED) */}
            <TouchableOpacity
              onPress={toggleFavorite}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: 10,
                borderRadius: 20,
              }}
            >
              <Text style={{ fontSize: 18 }}>
                {isFav ? "❤️" : "🤍"}
              </Text>
            </TouchableOpacity>

            {item.video_url ? (
              <VideoView
                player={player}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text>No media</Text>
              </View>
            )}
          </View>
        </View>

        {/* INFO */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            {item.title}
          </Text>

          <Text style={{ fontSize: 18, color: "green" }}>
            GHS {item.price}
          </Text>

          {item.is_negotiable && (
            <Text
              style={{
                marginTop: 6,
                fontWeight: "bold",
                color: "green",
              }}
            >
              Negotiable
            </Text>
          )}

          {item.description && (
            <Text style={{ marginTop: 12 }}>{item.description}</Text>
          )}
        </View>

        {/* ACTIONS */}
        <View style={{ padding: 16 }}>
          {!isSeller && userId && (
            <>
              <TouchableOpacity
                onPress={() => {
                  const roomId = getRoomId();
                  router.push("/chat/" + roomId);
                }}
                style={{
                  backgroundColor: "#2563eb",
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  Chat Seller
                </Text>
              </TouchableOpacity>

              {item.is_negotiable && (
                <TouchableOpacity
                  onPress={() => setShowOffer(!showOffer)}
                  style={{
                    backgroundColor: "black",
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 12,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center" }}>
                    Send Offer
                  </Text>
                </TouchableOpacity>
              )}

              {showOffer && (
                <View style={{ marginTop: 15 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
                    Enter your offer price:
                  </Text>

                  <TextInput
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    placeholder="e.g. 200"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: "#ccc",
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 10,
                    }}
                  />

                  <TouchableOpacity
                    onPress={async () => {
                      if (!offerPrice.trim()) {
                        Alert.alert("Enter an offer amount");
                        return;
                      }

                      const { error } = await (supabase as any)
                        .from("offers")
                        .insert({
                          item_id: item.id,
                          buyer_id: userId,
                          seller_id: item.user_id,
                          price: Number(offerPrice),
                          status: "pending",
                          counter_price: null,
                          last_counter_by: null,
                        });

                      if (error) {
                        Alert.alert("Offer Failed", error.message);
                        return;
                      }

                      setOfferPrice("");
                      setShowOffer(false);

                      Alert.alert("Success", "Offer sent successfully!");
                    }}
                    style={{
                      backgroundColor: "green",
                      padding: 12,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: "white", textAlign: "center" }}>
                      Submit Offer
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {isSeller && (
            <>
              <TouchableOpacity
                onPress={() => router.push("/sellers/" + item.user_id)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "blue", fontWeight: "700" }}>
                  View My Seller Shop
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  router.push(`/boost/${item.id}`);
                }}
                style={{
                  backgroundColor: "#f59e0b",
                  padding: 14,
                  borderRadius: 8,
                  marginTop: 14,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  🚀 Boost Item Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/reviews/${item.id}`)}
              >
                <Text style={{ color: "#2563eb", marginTop: 10 }}>
                  View Reviews
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}