import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmIndex() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      setLoading(true);

      const { data } = await (supabase as any)
        .from("farm_profiles")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      const enriched = await Promise.all(
        (data || []).map(async (farm: any) => {
          const { count } = await (supabase as any)
            .from("farm_followers")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("farm_id", farm.id);

          return {
            ...farm,
            followers_count: count || 0,
          };
        })
      );

      setFarms(enriched);
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  };

  const filtered = farms.filter((farm) => {
    const q = search.toLowerCase();

    return (
      farm.farm_name?.toLowerCase().includes(q) ||
      farm.region?.toLowerCase().includes(q) ||
      farm.district?.toLowerCase().includes(q) ||
      farm.farm_type?.toLowerCase().includes(q)
    );
  });

  const renderFarm = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/farm/[id]",
          params: { id: item.id },
        })
      }
      style={{
        backgroundColor: "#fff",
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      {!!(item.cover_photo || item.farm_cover) && (
        <Image
          source={{
            uri: item.cover_photo || item.farm_cover,
          }}
          style={{
            width: "100%",
            height: 180,
          }}
          contentFit="cover"
        />
      )}

      <View style={{ padding: 14 }}>
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
              width: 70,
              height: 70,
              borderRadius: 35,
              marginRight: 12,
            }}
            contentFit="cover"
          />

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              {item.farm_name}
            </Text>

            <Text
              style={{
                color: "#6b7280",
                marginTop: 3,
              }}
            >
              {item.farm_type || "Farm"}
            </Text>

            <Text
              style={{
                color: "#6b7280",
                marginTop: 3,
              }}
            >
              {item.region} • {item.district}
            </Text>

            {item.is_verified && (
              <Text
                style={{
                  color: "#16a34a",
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                ✅ Verified Farm
              </Text>
            )}
          </View>
        </View>

        {!!item.bio && (
          <Text
            numberOfLines={2}
            style={{
              marginTop: 12,
              color: "#374151",
            }}
          >
            {item.bio}
          </Text>
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <Text>
            Followers: {item.followers_count}
          </Text>

          <Text>
            Rating: {item.rating || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
    >
      <Text
        style={{
          fontSize: 26,
          fontWeight: "bold",
          marginTop: 20,
          marginHorizontal: 16,
          marginBottom: 12,
        }}
      >
        Farms
      </Text>

      <TextInput
        placeholder="Search farms..."
        value={search}
        onChangeText={setSearch}
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 12,
          padding: 12,
          backgroundColor: "#fff",
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={renderFarm}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 30,
        }}
      />
    </View>
  );
}