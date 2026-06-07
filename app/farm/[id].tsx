import {
  useFocusEffect,
} from "@react-navigation/native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
const categoryIcons: any = {
  Crops: "🌾",
  Livestock: "🐄",
  Poultry: "🐔",
  Eggs: "🥚",

  Fertilizers: "🧪",
  Seeds: "🌱",
  "Agro Chemicals": "🧴",
  "Animal Feed": "🌽",

  "Farm Tools": "🛠️",
  "Farm Implements": "🚜",
  Tractors: "🚜",
  "Irrigation Equipment": "💧",

  "Veterinary Products": "💉",
  "Fish Farming": "🐟",
  "Bee Keeping": "🐝",

  "Farm Services": "👨‍🌾",
};

export default function FarmProfileScreen() {
  const { id } = useLocalSearchParams();

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [farm, setFarm] =
    useState<any>(null);

  
    const [stocks, setStocks] =
  useState<any[]>([]);

  const [followers, setFollowers] =
    useState(0);

  const [following, setFollowing] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [owner, setOwner] =
    useState<any>(null);

  
useFocusEffect(
  useCallback(() => {
    loadFarm();
  }, [id])
);

  const loadFarm =
    async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        setCurrentUser(user);

        const {
          data: farmData,
        } =
          await (supabase as any)
            .from(
              "farm_profiles"
            )
            .select("*")
            .eq("id", id)
            .single();

        if (!farmData) {
          Alert.alert(
            "Farm not found"
          );

          router.back();

          return;
        }

        setFarm(farmData);

        const {
          data: ownerData,
        } =
          await (supabase as any)
            .from(
              "profiles"
            )
            .select(`
              id,
              full_name,
              verified,
              rating,
              phone,
              location
            `)
            .eq(
              "id",
              farmData.user_id
            )
            .single();

        setOwner(ownerData);

        
        loadStocks(
  farmData.id
)

        loadFollowers(
          farmData.id
        );

        if (user) {
          checkFollow(
            user.id,
            farmData.id
          );
        }
      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

 

   const loadStocks = async (
  farmId: number
) => {
  const { data } =
    await (supabase as any)
      .from("farm_stocks")
      .select("*")
      .eq("farm_id", farmId)
      .order("created_at", {
      ascending: false,
    });
     console.log(
    "FARM STOCKS",
    data
  );
  const fixed =
    (data || []).map(
      (item: any) => ({
        ...item,

        images:
  typeof item.images === "string"
    ? JSON.parse(item.images)
    : item.images || [],
      })
    );

  setStocks(fixed);
};
  const loadFollowers =
    async (
      farmId: number
    ) => {
      const {
        count,
      } =
        await (supabase as any)
          .from(
            "farm_followers"
          )
          .select("*", {
            count:
              "exact",
            head: true,
          })
          .eq(
            "farm_id",
            farmId
          );

      setFollowers(
        count || 0
      );
    };

  const checkFollow =
    async (
      userId: string,
      farmId: number
    ) => {
      const {
        data,
      } =
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

      setFollowing(
        !!data
      );
    };

  const toggleFollow =
    async () => {
      if (!currentUser) {
        router.push(
          "/(auth)/login"
        );

        return;
      }

      if (!farm) return;

      try {
        if (following) {
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

          setFollowing(
            false
          );

          setFollowers(
            (x) =>
              Math.max(
                0,
                x - 1
              )
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

          setFollowing(
            true
          );

          setFollowers(
            (x) =>
              x + 1
          );
        }
      } catch (e) {
        console.log(e);
      }
    };

  const openChat =
    async () => {
      if (!currentUser) {
        router.push(
          "/(auth)/login"
        );

        return;
      }

      if (
        currentUser.id ===
        farm.user_id
      ) {
        Alert.alert(
          "This is your farm"
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
              "seller_id",
              farm.user_id
            )
            .eq(
              "buyer_id",
              currentUser.id
            )
            .is(
              "item_id",
              null
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
                seller_id:
                  farm.user_id,
                buyer_id:
                  currentUser.id,
              })
              .select()
              .single();

          roomId =
            room.id;
        }

        router.push({
          pathname:
            "/chat/[id]",
          params: {
            id: roomId,
          },
        });
      } catch {
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
  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
      }}
    >
      {/* COVER PHOTO */}
      {(farm.cover_photo ||
        farm.farm_cover) && (
        <Image
          source={{
            uri:
              farm.cover_photo ||
              farm.farm_cover,
          }}
          style={{
            width: "100%",
            height: 220,
          }}
          contentFit="cover"
        />
      )}

      {/* FARM HEADER */}
      <View
        style={{
          marginTop: -50,
          paddingHorizontal: 16,
        }}
      >
        <Image
          source={{
            uri:
              farm.profile_photo ||
              farm.farm_logo,
          }}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 4,
            borderColor: "#0f172a",
            backgroundColor:
              "#fff",
          }}
          contentFit="cover"
        />

        <Text
          style={{
            color: "#fff",
            fontSize: 24,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          {farm.farm_name}
        </Text>
        <Text
  style={{
    color: "#38bdf8",
    fontWeight: "bold",
    marginTop: 4,
  }}
>
  {farm.seller_type}
</Text>

        {farm.is_verified && (
          <Text
            style={{
              color:
                "#22c55e",
              marginTop: 4,
              fontWeight:
                "bold",
            }}
          >
            ✅ Verified Farm
          </Text>
        )}
        {farm.is_supplier && (
  <Text
    style={{
      color: "#facc15",
      fontWeight: "bold",
    }}
  >
    ⭐ Certified Supplier
  </Text>
)}
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
            marginTop: 8,
            lineHeight: 22,
          }}
        >
          {farm.bio ||
            farm.farm_description}
        </Text>
      </View>

      {/* FOLLOWERS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "space-around",
          marginTop: 20,
          marginHorizontal: 16,
          backgroundColor:
            "#111827",
          padding: 16,
          borderRadius: 16,
        }}
      >
        <View>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            {followers}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
            }}
          >
            Followers
          </Text>
        </View>

        <View>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            {farm.rating ||
              0}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
            }}
          >
            Rating
          </Text>
        </View>

        <View>
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            {farm.total_sales ||
              0}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
            }}
          >
            Sales
          </Text>
        </View>
      </View>

      {/* ACTION BUTTONS */}
      <View
        style={{
          padding: 16,
        }}
      >
        <TouchableOpacity
          onPress={
            toggleFollow
          }
          style={{
            backgroundColor:
              following
                ? "#475569"
                : "#16a34a",
            padding: 15,
            borderRadius: 12,
            marginBottom: 10,
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
            {following
              ? "Following"
              : "Follow Farm"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openChat}
          style={{
            backgroundColor:
              "#2563eb",
            padding: 15,
            borderRadius: 12,
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
            💬 Chat Farm
          </Text>
        </TouchableOpacity>
      </View>

      {/* FARM STOCK */}
<View
  style={{
    marginHorizontal: 16,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontWeight: "bold",
      fontSize: 18,
      marginBottom: 14,
    }}
  >
    Farm Stock
  </Text>

  {stocks.length === 0 ? (
    <Text
      style={{
        color: "#94a3b8",
      }}
    >
      No stock added yet
    </Text>
  ) : (
    stocks.map((item: any) => (
      <View
        key={item.id}
        style={{
          backgroundColor: "#1f2937",
          padding: 12,
          borderRadius: 12,
          marginBottom: 10,
        }}
      >
        {item.listing_type === "service" && (
  <Text
    style={{
      color: "#f59e0b",
      fontWeight: "bold",
      marginBottom: 4,
    }}
  >
    🛠️ SERVICE
  </Text>
)}
        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          {item.product_name}
        </Text>

        <Text
          style={{
            color: "#cbd5e1",
            marginTop: 4,
          }}
        >
          Quantity: {item.quantity}
          {item.unit ? ` ${item.unit}` : ""}
        </Text>

        {item.price ? (
          <Text
            style={{
              color: "#22c55e",
              marginTop: 4,
              fontWeight: "bold",
            }}
          >
            GH₵ {item.price}
          </Text>
        ) : null}
      </View>
    ))
  )}
</View>

      {/* FARM OWNER */}
      {owner && (
        <View
          style={{
            marginHorizontal:
              16,
            backgroundColor:
              "#111827",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight:
                "bold",
              fontSize: 18,
              marginBottom: 10,
            }}
          >
            Farm Owner
          </Text>

          <Text
            style={{
              color: "#fff",
              fontWeight:
                "bold",
            }}
          >
            {owner.full_name}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              marginTop: 6,
            }}
          >
            {owner.location}
          </Text>

          {owner.verified && (
            <Text
              style={{
                color:
                  "#22c55e",
                marginTop: 6,
              }}
            >
              Verified User
            </Text>
          )}

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname:
                  "/profile/[id]",
                params: {
                  id: owner.id,
                },
              })
            }
            style={{
              marginTop: 12,
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
      {/* ANIMALS SECTION */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 30,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Farm Products
        </Text>

        {stocks.length === 0 ? (
          <View
            style={{
              backgroundColor: "#111827",
              padding: 20,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              No Farm Products available.
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {stocks.map((item: any) => (
 <TouchableOpacity
  key={item.id}
  onPress={() =>
    router.push({
      pathname: "/farm/product",
      params: {
        id: item.id,
      },
    })
  }
    style={{
      width: "48%",
      backgroundColor: "#111827",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
    }}
  >
    
    {item.is_sold && (
  <View
    style={{
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "#ef4444",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      zIndex: 100,
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "bold",
      }}
    >
      SOLD
    </Text>
  </View>
)}
    
{item.video_url && (
  <View
    style={{
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: "#000",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      zIndex: 100,
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "bold",
      }}
    >
      🎥 VIDEO
    </Text>
  </View>
)}
    {/* IMAGE/VIDEO */}
    {item.video_url ? (
  <View
    style={{
      width: "100%",
      height: 180,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontSize: 50,
      }}
    >
      ▶️
    </Text>

    <Text
      style={{
        color: "#fff",
        fontWeight: "bold",
      }}
    >
      Tap to watch video
    </Text>
  </View>
) : item.images?.length > 0 ? (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
  >
    {item.images.map(
      (
        img: string,
        index: number
      ) => (
        <Image
          key={index}
          source={{ uri: img }}
          style={{
            width: 160,
            height: 160,
            borderRadius: 12,
            marginRight: 8,
          }}
          contentFit="cover"
        />
      )
    )}
  </ScrollView>
) : item.image_url ? (
  <Image
    source={{
      uri: item.image_url,
    }}
    style={{
      width: "100%",
      height: 180,
    }}
    contentFit="cover"
  />
) : (
  <View
    style={{
      width: "100%",
      height: 180,
      backgroundColor: "#1f2937",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        color: "#94a3b8",
      }}
    >
      No Media
    </Text>
  </View>
)}
    <View
      style={{
        padding: 12,
      }}
    >
      <Text
  style={{
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  }}
>
  {categoryIcons[item.category] || "📦"} {item.category}
</Text>
{[
  "Seeds",
  "Fertilizer",
  "Pesticides",
  "Farm Tools",
  "Farm Equipment",
  "Animal Feed",
  "Veterinary Products",
].includes(item.category) && (
  <Text
    style={{
      color: "#facc15",
      fontWeight: "bold",
      marginTop: 4,
    }}
  >
    🏪 Farm Input Shop
  </Text>
)}

      <Text
        numberOfLines={1}
        style={{
          color: "#fff",
          fontWeight: "bold",
          fontSize: 15,
        }}
      >
        {item.product_name}
      </Text>

      <Text
        style={{
          color: "#cbd5e1",
          marginTop: 4,
          fontSize: 12,
        }}
      >
        Qty: {item.quantity} {item.unit || ""}
      </Text>

      {item.price ? (
        <Text
          style={{
            color: "#22c55e",
            fontWeight: "bold",
            marginTop: 6,
          }}
        >
          GH₵ {Number(item.price).toLocaleString()}
        </Text>
      ) : null}

      {item.images?.length > 1 && (
  <Text
    style={{
      color: "#38bdf8",
      marginTop: 4,
      fontSize: 12,
    }}
  >
    {item.images.length} Photos
  </Text>
)}

      {farm.is_verified && (
        <Text
          style={{
            color: "#22c55e",
            marginTop: 6,
            fontSize: 12,
            fontWeight: "bold",
          }}
        >
          ✅ Verified Farm
        </Text>
      )}
       {currentUser?.id === farm?.user_id && (
  <TouchableOpacity
    onPress={() =>
      router.push({
        pathname:
          "/farm/edit-stock",
        params: {
          id: item.id,
        },
      })
    }
    style={{
      backgroundColor:
        "#2563eb",
      padding: 8,
      borderRadius: 8,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
      }}
    >
      Edit Product
    </Text>
  </TouchableOpacity>
)}
</View>
    
  </TouchableOpacity>
  
))}
      
          </View>
        )}
      </View>
    </ScrollView>
  );
}