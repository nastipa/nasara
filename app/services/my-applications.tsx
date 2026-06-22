import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function MyApplications() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [apps, setApps] =
    useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } =
        await supabase
          .from(
            "utility_applications"
          )
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) throw error;

      setApps(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (
    status: string
  ) => {
    switch (
      status?.toLowerCase()
    ) {
      case "approved":
        return "#16a34a";

      case "rejected":
        return "#dc2626";

      case "completed":
        return "#2563eb";

      case "under review":
        return "#d97706";

      default:
        return "#6b7280";
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
  <View
    style={{
      flex: 1,
      backgroundColor: "#f3f4f6",
    }}
  >
    {/* HEADER */}
    <View
      style={{
        backgroundColor: "#2563eb",
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 30,
          fontWeight: "800",
        }}
      >
        📄 My Applications
      </Text>

      <Text
        style={{
          color: "rgba(255,255,255,0.9)",
          marginTop: 8,
          fontSize: 15,
        }}
      >
        Track all your utility service applications.
      </Text>

      <View
        style={{
          marginTop: 18,
          backgroundColor: "rgba(255,255,255,0.18)",
          alignSelf: "flex-start",
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 30,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
          }}
        >
          Total Applications: {apps.length}
        </Text>
      </View>
    </View>

    <FlatList
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 40,
      }}
      data={apps}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={load}
      ListEmptyComponent={
        <View
          style={{
            marginTop: 50,
            backgroundColor: "#fff",
            borderRadius: 22,
            padding: 35,
            alignItems: "center",
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 55,
            }}
          >
            ⚡
          </Text>

          <Text
            style={{
              marginTop: 15,
              fontSize: 20,
              fontWeight: "700",
            }}
          >
            No Applications Yet
          </Text>

          <Text
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Your submitted utility applications will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname:
                "/services/application-details",
              params: {
                id: item.id,
              },
            })
          }
          style={{
            backgroundColor: "#fff",
            borderRadius: 22,
            padding: 18,
            marginBottom: 16,
            elevation: 4,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: {
              width: 0,
              height: 3,
            },
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                {item.application_no}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  color: "#6b7280",
                  textTransform: "capitalize",
                }}
              >
                {item.service_type.replace(
                  /_/g,
                  " "
                )}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: getStatusColor(
                  item.status
                ),
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 30,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {item.status}
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 16,
              borderTopWidth: 1,
              borderTopColor: "#f1f5f9",
              paddingTop: 14,
            }}
          >
            <Text
              style={{
                color: "#374151",
                marginBottom: 6,
              }}
            >
              📍 {item.area} • {item.station}
            </Text>

            <Text
              style={{
                color: "#9ca3af",
              }}
            >
              📅 Applied on{" "}
              {new Date(
                item.created_at
              ).toLocaleDateString()}
            </Text>
          </View>

          <View
            style={{
              marginTop: 18,
              backgroundColor: "#eff6ff",
              padding: 14,
              borderRadius: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#2563eb",
                fontWeight: "700",
              }}
            >
              View Full Details
            </Text>

            <Text
              style={{
                color: "#2563eb",
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              →
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  </View>
);
}