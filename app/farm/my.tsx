import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function MyFarmScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<any>(null);

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data } = await (supabase as any)
        .from("farm_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setFarm(data || null);
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  };

  const deleteFarm = async () => {
    Alert.alert(
      "Delete Farm",
      "Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await (supabase as any)
                .from("farm_profiles")
                .delete()
                .eq("id", farm.id);

              setFarm(null);
            } catch (e) {
              console.log(e);
            }
          },
        },
      ]
    );
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

  if (!farm) {
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
            fontSize: 22,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          No Farm Yet
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push("/farm/create")
          }
          style={{
            backgroundColor: "#16a34a",
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            Create Farm
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
    >
      {!!(farm.cover_photo || farm.farm_cover) && (
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

      <View
        style={{
          padding: 16,
          marginTop: -40,
        }}
      >
        <Image
          source={{
            uri:
              farm.profile_photo ||
              farm.farm_logo,
          }}
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            borderWidth: 3,
            borderColor: "#fff",
            backgroundColor: "#fff",
          }}
          contentFit="cover"
        />

        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          {farm.farm_name}
        </Text>

        <Text
          style={{
            color: "#64748b",
            marginTop: 4,
          }}
        >
          {farm.farm_type}
        </Text>

        <Text
          style={{
            color: "#64748b",
            marginTop: 4,
          }}
        >
          {farm.region} • {farm.district}
        </Text>

        {!!farm.bio && (
          <Text
            style={{
              marginTop: 12,
              color: "#334155",
            }}
          >
            {farm.bio}
          </Text>
        )}

        <View
          style={{
            marginTop: 24,
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/farm/[id]",
                params: {
                  id: farm.id,
                },
              })
            }
            style={{
              backgroundColor: "#2563eb",
              padding: 15,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              View Farm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push("/farm/edit")
            }
            style={{
              backgroundColor: "#16a34a",
              padding: 15,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Edit Farm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push("/farm/add-stock")
            }
            style={{
              backgroundColor: "#7c3aed",
              padding: 15,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Add Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={deleteFarm}
            style={{
              backgroundColor: "#dc2626",
              padding: 15,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Delete Farm
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}