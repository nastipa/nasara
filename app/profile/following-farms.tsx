import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FollowingFarmsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<any[]>([]);

  useEffect(() => {
    loadFollowingFarms();
  }, []);

  const loadFollowingFarms = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data: follows } = await (supabase as any)
        .from("farm_followers")
        .select("farm_id")
        .eq("follower_id", user.id);

      if (!follows || follows.length === 0) {
        setFarms([]);
        return;
      }

      const farmIds = follows.map(
        (x: any) => x.farm_id
      );

      const { data: farmData } =
        await (supabase as any)
          .from("farm_profiles")
          .select("*")
          .in("id", farmIds);

      const enriched = await Promise.all(
        (farmData || []).map(
          async (farm: any) => {
            const { count } =
              await (supabase as any)
                .from("farm_followers")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq("farm_id", farm.id);

            return {
              ...farm,
              followers_count:
                count || 0,
            };
          }
        )
      );

      setFarms(enriched);
    } catch (e) {
      console.log(e);
      Alert.alert(
        "Error",
        "Could not load farms"
      );
    } finally {
      setLoading(false);
    }
  };

  const unfollowFarm = async (
    farmId: number
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await (supabase as any)
        .from("farm_followers")
        .delete()
        .eq("farm_id", farmId)
        .eq("follower_id", user.id);

      setFarms((prev) =>
        prev.filter(
          (farm) => farm.id !== farmId
        )
      );
    } catch {
      Alert.alert(
        "Error",
        "Could not unfollow farm"
      );
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (farms.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          No Followed Farms
        </Text>

        <Text
          style={{
            marginTop: 10,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          Follow farms to see them here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={farms}
      keyExtractor={(item) =>
        String(item.id)
      }
      contentContainerStyle={{
        padding: 16,
      }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/farm/[id]",
              params: { id: item.id },
            })
          }
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            marginBottom: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          {!!(item.cover_photo ||
            item.farm_cover) && (
            <Image
              source={{
                uri:
                  item.cover_photo ||
                  item.farm_cover,
              }}
              style={{
                width: "100%",
                height: 150,
              }}
              contentFit="cover"
            />
          )}

          <View
            style={{
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                source={{
                  uri:
                    item.profile_photo ||
                    item.farm_logo,
                }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  marginRight: 12,
                }}
                contentFit="cover"
              />

              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                  }}
                >
                  {item.farm_name}
                </Text>

                <Text
                  style={{
                    color: "#6b7280",
                  }}
                >
                  {item.region} •{" "}
                  {item.district}
                </Text>

                {item.is_verified && (
                  <Text
                    style={{
                      color: "#16a34a",
                      marginTop: 4,
                    }}
                  >
                    ✅ Verified Farm
                  </Text>
                )}
              </View>
            </View>

            <Text
              style={{
                marginTop: 10,
                color: "#6b7280",
              }}
            >
              Followers:{" "}
              {item.followers_count}
            </Text>

            <TouchableOpacity
              onPress={() =>
                unfollowFarm(item.id)
              }
              style={{
                marginTop: 12,
                backgroundColor:
                  "#ef4444",
                padding: 12,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                Unfollow
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}