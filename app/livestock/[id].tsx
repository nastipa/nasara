import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const screenWidth = Dimensions.get("window").width;

export default function LivestockDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [listing, setListing] = useState<any>(null);

  const [farm, setFarm] = useState<any>(null);

  const [farmer, setFarmer] = useState<any>(null);

  const [relatedAnimals, setRelatedAnimals] =
    useState<any[]>([]);

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [isFollowingFarm, setIsFollowingFarm] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [selectedImage, setSelectedImage] =
    useState(0);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user);

      const { data: animal, error } =
        await (supabase as any)
          .from("livestock_listings")
          .select("*")
          .eq("id", id)
          .single();

      if (error || !animal) {
        Alert.alert("Animal not found");
        router.back();
        return;
      }

      setListing(animal);

      await increaseViews(animal.id);

      const { data: farmData } =
        await (supabase as any)
          .from("farm_profiles")
          .select("*")
          .eq("id", animal.farm_id)
          .single();

      if (farmData) {
        setFarm(farmData);
      }

      const { data: farmerData } =
        await (supabase as any)
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            location,
            verified,
            rating,
            avatar_url
          `)
          .eq("id", animal.user_id)
          .single();

      if (farmerData) {
        setFarmer(farmerData);
      }

      if (user) {
        await checkFavorite(
          user.id,
          animal.id
        );

        if (farmData) {
          await checkFollowing(
            user.id,
            farmData.id
          );
        }
      }

      loadRelatedAnimals(
        animal.category,
        animal.id
      );

    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  const increaseViews = async (
    listingId: number
  ) => {
    try {
      await (supabase as any).rpc(
        "increment_livestock_views",
        {
          listing_id_input:
            listingId,
        }
      );
    } catch {
      const current =
        listing?.views || 0;

      await (supabase as any)
        .from(
          "livestock_listings"
        )
        .update({
          views: current + 1,
        })
        .eq("id", listingId);
    }
  };

  const checkFavorite = async (
    userId: string,
    listingId: number
  ) => {
    const { data } =
      await (supabase as any)
        .from(
          "livestock_favorites"
        )
        .select("id")
        .eq("user_id", userId)
        .eq(
          "listing_id",
          listingId
        )
        .maybeSingle();

    setIsFavorite(!!data);
  };

  const checkFollowing =
    async (
      userId: string,
      farmId: number
    ) => {
      const { data } =
        await (supabase as any)
          .from(
            "farm_followers"
          )
          .select("id")
          .eq(
            "follower_id",
            userId
          )
          .eq(
            "farm_id",
            farmId
          )
          .maybeSingle();

      setIsFollowingFarm(
        !!data
      );
    };

  const toggleFavorite =
    async () => {
      if (!currentUser) {
        router.push(
          "/(auth)/login"
        );
        return;
      }

      try {
        if (isFavorite) {
          await (supabase as any)
            .from(
              "livestock_favorites"
            )
            .delete()
            .eq(
              "user_id",
              currentUser.id
            )
            .eq(
              "listing_id",
              listing.id
            );

          setIsFavorite(false);
        } else {
          await (supabase as any)
            .from(
              "livestock_favorites"
            )
            .insert({
              user_id:
                currentUser.id,
              listing_id:
                listing.id,
            });

          setIsFavorite(true);
        }
      } catch (e) {
        console.log(e);
      }
    };

  const toggleFollowFarm =
    async () => {
      if (!currentUser) {
        router.push(
          "/(auth)/login"
        );
        return;
      }

      if (!farm) return;

      try {
        if (
          isFollowingFarm
        ) {
          await (supabase as any)
            .from(
              "farm_followers"
            )
            .delete()
            .eq(
              "follower_id",
              currentUser.id
            )
            .eq(
              "farm_id",
              farm.id
            );

          setIsFollowingFarm(
            false
          );
        } else {
          await (supabase as any)
            .from(
              "farm_followers"
            )
            .insert({
              farm_id:
                farm.id,
              follower_id:
                currentUser.id,
            });

          setIsFollowingFarm(
            true
          );
        }
      } catch (e) {
        console.log(e);
      }
    };

  const loadRelatedAnimals =
    async (
      category: string,
      currentId: number
    ) => {
      const { data } =
        await (supabase as any)
          .from(
            "livestock_listings"
          )
          .select("*")
          .eq(
            "category",
            category
          )
          .neq(
            "id",
            currentId
          )
          .eq(
            "status",
            "active"
          )
          .limit(8);

      setRelatedAnimals(
        data || []
      );
    };

  const startChat =
    async () => {
      if (!currentUser) {
        router.push(
          "/(auth)/login"
        );
        return;
      }

      if (
        currentUser.id ===
        listing.user_id
      ) {
        Alert.alert(
          "This is your own listing"
        );
        return;
      }

      try {
        const {
          data: existing,
        } =
          await (supabase as any)
            .from(
              "chat_rooms"
            )
            .select("*")
            .eq(
              "item_id",
              listing.id
            )
            .eq(
              "buyer_id",
              currentUser.id
            )
            .eq(
              "seller_id",
              listing.user_id
            )
            .maybeSingle();

        let roomId =
          existing?.id;

        if (!roomId) {
          const {
            data: room,
          } =
            await (supabase as any)
              .from(
                "chat_rooms"
              )
              .insert({
                item_id:
                  listing.id,
                seller_id:
                  listing.user_id,
                buyer_id:
                  currentUser.id,
              })
              .select()
              .single();

          roomId =
            room?.id;
        }

        router.push({
          pathname:
            "/chat/[id]",
          params: {
            id: roomId,
          },
        });

      } catch (e) {
        Alert.alert(
          "Could not open chat"
        );
      }
    };

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
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }
  const images =
    listing?.image_urls &&
    listing.image_urls.length > 0
      ? listing.image_urls
      : listing?.image_url
      ? [listing.image_url]
      : [];

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
      }}
    >
      {/* IMAGE GALLERY */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={
          false
        }
      >
        {images.map(
          (
            img: string,
            index: number
          ) => (
            <TouchableOpacity
              key={index}
              onPress={() =>
                setSelectedImage(
                  index
                )
              }
            >
              <Image
                source={{
                  uri: img,
                }}
                style={{
                  width:
                    screenWidth,
                  height: 320,
                }}
                contentFit="cover"
              />
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* IMAGE INDICATORS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "center",
          marginTop: 10,
        }}
      >
        {images.map(
          (
            _: any,
            index: number
          ) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 20,
                marginHorizontal: 4,
                backgroundColor:
                  selectedImage ===
                  index
                    ? "#22c55e"
                    : "#64748b",
              }}
            />
          )
        )}
      </View>

      {/* TITLE CARD */}
      <View
        style={{
          backgroundColor:
            "#111827",
          margin: 12,
          padding: 16,
          borderRadius: 16,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 24,
            fontWeight: "bold",
          }}
        >
          {listing.breed}
        </Text>

        <Text
          style={{
            color: "#22c55e",
            fontSize: 22,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          GH₵ {listing.price}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginTop: 10,
          }}
        >
          {listing.location}
        </Text>
      </View>

      {/* ANIMAL DETAILS */}
      <View
        style={{
          backgroundColor:
            "#111827",
          marginHorizontal: 12,
          marginBottom: 12,
          padding: 16,
          borderRadius: 16,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: 18,
            marginBottom: 12,
          }}
        >
          Animal Details
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Category:
          {" "}
          {listing.category}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Type:
          {" "}
          {listing.animal_type}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Quantity:
          {" "}
          {listing.quantity}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Age:
          {" "}
          {listing.age}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Weight:
          {" "}
          {listing.weight}
          kg
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Gender:
          {" "}
          {listing.gender}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Health:
          {" "}
          {listing.health_status}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginBottom: 8,
          }}
        >
          Vaccinated:
          {" "}
          {listing.vaccinated
            ? "Yes"
            : "No"}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            lineHeight: 22,
            marginTop: 10,
          }}
        >
          {listing.description}
        </Text>
      </View>

      {/* DELIVERY OPTIONS */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginHorizontal: 12,
          marginBottom: 12,
        }}
      >
        {listing.delivery_available && (
          <View
            style={{
              backgroundColor:
                "#166534",
              padding: 8,
              borderRadius: 8,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: "#fff",
              }}
            >
              Delivery Available
            </Text>
          </View>
        )}

        {listing.pickup_available && (
          <View
            style={{
              backgroundColor:
                "#1d4ed8",
              padding: 8,
              borderRadius: 8,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: "#fff",
              }}
            >
              Farm Pickup
            </Text>
          </View>
        )}

        {listing.transport_available && (
          <View
            style={{
              backgroundColor:
                "#9333ea",
              padding: 8,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: "#fff",
              }}
            >
              Transport Help
            </Text>
          </View>
        )}
      </View>

      {/* ACTION BUTTONS */}
      <View
        style={{
          paddingHorizontal: 12,
        }}
      >
        <TouchableOpacity
          onPress={startChat}
          style={{
            backgroundColor:
              "#16a34a",
            padding: 16,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign:
                "center",
              fontWeight: "bold",
            }}
          >
            💬 Chat Farmer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            toggleFavorite
          }
          style={{
            backgroundColor:
              "#2563eb",
            padding: 16,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign:
                "center",
              fontWeight: "bold",
            }}
          >
            {isFavorite
              ? "❤️ Saved"
              : "🤍 Save Animal"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            toggleFollowFarm
          }
          style={{
            backgroundColor:
              "#7c3aed",
            padding: 16,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign:
                "center",
              fontWeight: "bold",
            }}
          >
            {isFollowingFarm
              ? "Following Farm"
              : "Follow Farm"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/farm/request-inspection"
            )
          }
          style={{
            backgroundColor:
              "#f59e0b",
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign:
                "center",
              fontWeight: "bold",
            }}
          >
            🔍 Request Inspection
          </Text>
        </TouchableOpacity>
      </View>
      {/* FARM CARD */}
      {farm && (
        <View
          style={{
            backgroundColor:
              "#111827",
            margin: 12,
            padding: 16,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            Farm Information
          </Text>

          {(farm.profile_photo ||
            farm.farm_logo) && (
            <Image
              source={{
                uri:
                  farm.profile_photo ||
                  farm.farm_logo,
              }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 50,
                marginBottom: 10,
              }}
              contentFit="cover"
            />
          )}

          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            {farm.farm_name}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 6,
            }}
          >
            {farm.region}
            {" • "}
            {farm.district}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 6,
            }}
          >
            Farm Type:
            {" "}
            {farm.farm_type}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 6,
            }}
          >
            Years Active:
            {" "}
            {farm.years_active}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 6,
            }}
          >
            Rating:
            {" "}
            {farm.rating || 0}
            ⭐
          </Text>

          {farm.is_verified && (
            <Text
              style={{
                color:
                  "#22c55e",
                marginTop: 10,
                fontWeight:
                  "bold",
              }}
            >
              ✅ Verified Farm
            </Text>
          )}

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname:
                  "/farm/[id]",
                params: {
                  id: farm.id,
                },
              })
            }
            style={{
              marginTop: 14,
              backgroundColor:
                "#2563eb",
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign:
                  "center",
                fontWeight:
                  "bold",
              }}
            >
              View Farm
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FARMER CARD */}
      {farmer && (
        <View
          style={{
            backgroundColor:
              "#111827",
            marginHorizontal: 12,
            marginBottom: 12,
            padding: 16,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            Farmer
          </Text>

          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 17,
            }}
          >
            {farmer.full_name}
          </Text>

          {farmer.verified && (
            <Text
              style={{
                color:
                  "#22c55e",
                marginTop: 6,
              }}
            >
              Verified Seller
            </Text>
          )}

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 8,
            }}
          >
            Location:
            {" "}
            {farmer.location}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 8,
            }}
          >
            Phone:
            {" "}
            {farmer.phone}
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname:
                  "/profile/[id]",
                params: {
                  id: farmer.id,
                },
              })
            }
            style={{
              marginTop: 14,
              backgroundColor:
                "#0ea5e9",
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign:
                  "center",
                fontWeight:
                  "bold",
              }}
            >
              View Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STATS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "space-between",
          backgroundColor:
            "#111827",
          marginHorizontal: 12,
          marginBottom: 12,
          padding: 16,
          borderRadius: 16,
        }}
      >
        <View>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            {listing.views || 0}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
            }}
          >
            Views
          </Text>
        </View>

        <View>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            {listing.favorites ||
              0}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
            }}
          >
            Saved
          </Text>
        </View>

        <View>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            {listing.sold_count ||
              0}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
            }}
          >
            Sold
          </Text>
        </View>
      </View>

      {/* RELATED ANIMALS */}
      {relatedAnimals.length >
        0 && (
        <View
          style={{
            marginHorizontal:
              12,
            marginBottom: 30,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight:
                "bold",
              marginBottom: 12,
            }}
          >
            Similar Animals
          </Text>

          {relatedAnimals.map(
            (
              animal
            ) => (
              <TouchableOpacity
                key={
                  animal.id
                }
                onPress={() =>
                  router.push({
                    pathname:
                      "/livestock/[id]",
                    params: {
                      id: animal.id,
                    },
                  })
                }
                style={{
                  backgroundColor:
                    "#111827",
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow:
                    "hidden",
                }}
              >
                <Image
                  source={{
                    uri:
                      animal.image_url,
                  }}
                  style={{
                    width:
                      "100%",
                    height: 180,
                  }}
                  contentFit="cover"
                />

                <View
                  style={{
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#fff",
                      fontWeight:
                        "bold",
                    }}
                  >
                    {
                      animal.breed
                    }
                  </Text>

                  <Text
                    style={{
                      color:
                        "#22c55e",
                      marginTop:
                        6,
                    }}
                  >
                    GH₵
                    {" "}
                    {
                      animal.price
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )}
        </View>
      )}
    </ScrollView>
  );
}