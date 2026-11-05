// 🌾 ==========================================
// 🌾 NASARA — BROWSE FARMS
// 🌾 BEAUTIFUL FARM DISCOVERY EXPERIENCE
// 🌾 ==========================================

import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

// 🎨 ==========================================
// 🎨 COLOURS
// 🎨 ==========================================

const COLORS = {
  primary: "#176B3A",
  primaryDark: "#104D2A",
  lightGreen: "#EAF5ED",
  background: "#F5F8F5",
  white: "#FFFFFF",
  text: "#17251B",
  muted: "#78847B",
  border: "#E5ECE6",
  gold: "#E5A52B",
  red: "#D94841",
};

// 🌾 ==========================================
// 🌾 MAIN FARM SCREEN
// 🌾 ==========================================

export default function FarmIndex() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [farms, setFarms] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);

  const [search, setSearch] = useState("");

  // 🔄 ==========================================
  // 🔄 LOAD FARMS AND APPROVED ADVERTISEMENTS
  // 🔄 ==========================================

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      setLoading(true);

      // 🌱 GET FARM PROFILES
      const { data, error } = await (supabase as any)
        .from("farm_profiles")
        .select("*")
        .order("is_featured", {
          ascending: false,
        })
        .order("is_boosted", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.log("Farm loading error:", error.message);
        setFarms([]);
      } else {
        // 👥 GET FOLLOWER COUNTS
        const enriched = await Promise.all(
          (data || []).map(async (farm: any) => {
            const { count, error: followerError } =
              await (supabase as any)
                .from("farm_followers")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq("farm_id", farm.id);

            if (followerError) {
              console.log(
                "Follower count error:",
                followerError.message
              );
            }

            return {
              ...farm,
              followers_count: count || 0,
            };
          })
        );

        setFarms(enriched);
      }

      // 📢 GET APPROVED FARM ADVERTISEMENTS
      const { data: adData, error: adError } =
        await (supabase as any)
          .from("farm_ad_requests")
          .select("*")
          .eq("status", "approved")
          .gt(
            "expires_at",
            new Date().toISOString()
          );

      if (adError) {
        console.log(
          "Farm advertisements error:",
          adError.message
        );
      }

      setAds(adData || []);
    } catch (error) {
      console.log("Farm loading error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔄 ==========================================
  // 🔄 REFRESH
  // 🔄 ==========================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFarms();
  };

  // 🔍 ==========================================
  // 🔍 SEARCH FARMS
  // 🔍 ==========================================

  const filtered = farms.filter((farm) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return (
      farm.farm_name?.toLowerCase().includes(q) ||
      farm.region?.toLowerCase().includes(q) ||
      farm.district?.toLowerCase().includes(q) ||
      farm.farm_type?.toLowerCase().includes(q) ||
      farm.bio?.toLowerCase().includes(q)
    );
  });

  // 🖼️ ==========================================
  // 🖼️ FARM PROFILE IMAGE
  // 🖼️ ==========================================

  const renderFarmAvatar = (farm: any) => {
    const avatar =
      farm.profile_photo || farm.farm_logo;

    if (avatar) {
      return (
        <Image
          source={{ uri: avatar }}
          style={{
            width: 62,
            height: 62,
            borderRadius: 18,
            backgroundColor: COLORS.lightGreen,
          }}
          contentFit="cover"
        />
      );
    }

    return (
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 18,
          backgroundColor: COLORS.lightGreen,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 30 }}>🌾</Text>
      </View>
    );
  };

  // 🌱 ==========================================
  // 🌱 FARM CARD
  // 🌱 ==========================================

  const renderFarm = ({ item }: { item: any }) => {
    const cover = item.cover_photo || item.farm_cover;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/farm/[id]",
            params: {
              id: String(item.id),
            },
          })
        }
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 22,
          marginBottom: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* 🖼️ FARM COVER */}
        <View
          style={{
            height: 175,
            backgroundColor: "#E5F0E6",
          }}
        >
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{
                width: "100%",
                height: "100%",
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#E7F2E8",
              }}
            >
              <Text style={{ fontSize: 55 }}>🌳</Text>
              <Text
                style={{
                  color: COLORS.primary,
                  fontWeight: "700",
                  marginTop: 5,
                }}
              >
                NASARA FARMS
              </Text>
            </View>
          )}

          {/* 🌟 FEATURED BADGE */}
          {item.is_featured && (
            <View
              style={{
                position: "absolute",
                top: 13,
                left: 13,
                backgroundColor: COLORS.white,
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                ⭐ FEATURED
              </Text>
            </View>
          )}

          {/* 🚀 BOOSTED BADGE */}
          {item.is_boosted && (
            <View
              style={{
                position: "absolute",
                top: 13,
                right: 13,
                backgroundColor: COLORS.gold,
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 11,
                  fontWeight: "900",
                }}
              >
                🚀 BOOSTED
              </Text>
            </View>
          )}
        </View>

        {/* 📋 FARM DETAILS */}
        <View style={{ padding: 16 }}>
          {/* 👤 PROFILE ROW */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {renderFarmAvatar(item)}

            <View
              style={{
                flex: 1,
                marginLeft: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: COLORS.text,
                    flexShrink: 1,
                  }}
                >
                  {item.farm_name || "Unnamed Farm"}
                </Text>

                {item.is_verified && (
                  <Text
                    style={{
                      marginLeft: 5,
                      fontSize: 14,
                    }}
                  >
                    ✅
                  </Text>
                )}
              </View>

              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 13,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                {item.farm_type || "Agricultural Farm"}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                📍 {item.region || "Location unavailable"}
                {item.district ? ` • ${item.district}` : ""}
              </Text>
            </View>
          </View>

          {/* 🌿 BIO */}
          {!!item.bio && (
            <Text
              numberOfLines={2}
              style={{
                color: "#56645A",
                fontSize: 13,
                lineHeight: 20,
                marginTop: 15,
              }}
            >
              {item.bio}
            </Text>
          )}

          {/* 📊 FARM STATISTICS */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              marginTop: 15,
              paddingTop: 13,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.muted,
                }}
              >
                FOLLOWERS
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: COLORS.text,
                  marginTop: 3,
                }}
              >
                👥 {item.followers_count || 0}
              </Text>
            </View>

            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.muted,
                }}
              >
                RATING
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: COLORS.text,
                  marginTop: 3,
                }}
              >
                ⭐ {item.rating || 0}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: COLORS.lightGreen,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                View Farm →
              </Text>
            </View>
          </View>

          {/* 📢 SPONSORED LABEL */}
          {item.is_advertised && (
            <View
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                backgroundColor: "#FFF1F0",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: COLORS.red,
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                📢 SPONSORED FARM
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 📢 ==========================================
  // 📢 SPONSORED ADVERTISEMENT CARD
  // 📢 ==========================================

  const renderAd = (item: any) => (
    <View
      key={`ad-${item.id}`}
      style={{
        width: 285,
        marginRight: 13,
        borderRadius: 19,
        overflow: "hidden",
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      {item.banner_url ? (
        <Image
          source={{ uri: item.banner_url }}
          style={{
            width: "100%",
            height: 145,
          }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            height: 145,
            backgroundColor: COLORS.lightGreen,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 42 }}>🌱</Text>
        </View>
      )}

      <View style={{ padding: 13 }}>
        <Text
          style={{
            color: COLORS.red,
            fontSize: 10,
            fontWeight: "900",
            marginBottom: 6,
          }}
        >
          📢 SPONSORED
        </Text>

        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: "900",
            color: COLORS.text,
          }}
        >
          {item.title || "Farm Advertisement"}
        </Text>

        {!!item.phone && (
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 12,
              marginTop: 7,
            }}
          >
            📞 {item.phone}
          </Text>
        )}
      </View>
    </View>
  );

  // ⏳ ==========================================
  // ⏳ LOADING SCREEN
  // ⏳ ==========================================

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 75,
            height: 75,
            borderRadius: 25,
            backgroundColor: COLORS.lightGreen,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 35 }}>🌾</Text>
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 18 }}
        />

        <Text
          style={{
            color: COLORS.primary,
            fontWeight: "700",
            marginTop: 12,
          }}
        >
          Discovering farms...
        </Text>
      </View>
    );
  }

  // 🌾 ==========================================
  // 🌾 MAIN SCREEN UI
  // 🌾 ==========================================

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
      }}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFarm}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={{
          paddingBottom: 35,
          paddingHorizontal: 16,
        }}
        ListHeaderComponent={
          <View>
            {/* 🌿 HEADER */}
            <View
              style={{
                paddingTop: 25,
                paddingBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 2,
                    }}
                  >
                    NASARA AGRICULTURE
                  </Text>

                  <Text
                    style={{
                      fontSize: 29,
                      fontWeight: "900",
                      color: COLORS.text,
                      marginTop: 5,
                    }}
                  >
                    Explore Farms 🌱
                  </Text>

                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  >
                    Discover farmers and agricultural businesses.
                  </Text>
                </View>

                <View
                  style={{
                    width: 51,
                    height: 51,
                    borderRadius: 18,
                    backgroundColor: COLORS.lightGreen,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 27 }}>🌾</Text>
                </View>
              </View>
            </View>

            {/* 🔍 SEARCH */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: COLORS.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 14,
                marginBottom: 21,
                height: 54,
              }}
            >
              <Text style={{ fontSize: 19 }}>🔍</Text>

              <TextInput
                placeholder="Search farms, locations, types..."
                placeholderTextColor="#9AA69C"
                value={search}
                onChangeText={setSearch}
                style={{
                  flex: 1,
                  marginLeft: 10,
                  color: COLORS.text,
                  fontSize: 13,
                  height: "100%",
                }}
              />

              {!!search && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  style={{
                    padding: 6,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 18,
                      fontWeight: "700",
                    }}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 📊 FARM COUNT */}
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 20,
                padding: 17,
                marginBottom: 23,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#D5EBDD",
                    fontSize: 11,
                    fontWeight: "800",
                    letterSpacing: 1,
                  }}
                >
                  NASARA FARM NETWORK
                </Text>

                <Text
                  style={{
                    color: COLORS.white,
                    fontSize: 25,
                    fontWeight: "900",
                    marginTop: 5,
                  }}
                >
                  {farms.length} Farms
                </Text>

                <Text
                  style={{
                    color: "#D5EBDD",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Connecting farmers and buyers.
                </Text>
              </View>

              <View
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 35 }}>🚜</Text>
              </View>
            </View>

            {/* 📢 SPONSORED FARMS */}
            {ads.length > 0 && (
              <View style={{ marginBottom: 23 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 13,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: "900",
                        color: COLORS.text,
                      }}
                    >
                      Sponsored Farms
                    </Text>

                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.muted,
                        marginTop: 3,
                      }}
                    >
                      Featured agricultural promotions
                    </Text>
                  </View>

                  <Text style={{ fontSize: 22 }}>📢</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {ads.map(renderAd)}
                </ScrollView>
              </View>
            )}

            {/* 🌱 FARM LIST HEADING */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: COLORS.text,
                  }}
                >
                  Discover Farms
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.muted,
                    marginTop: 4,
                  }}
                >
                  {search
                    ? `${filtered.length} matching farms`
                    : "Explore agricultural businesses"}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: COLORS.lightGreen,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  {filtered.length} Results
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
              marginTop: 5,
            }}
          >
            <Text style={{ fontSize: 45 }}>
              {search ? "🔍" : "🌱"}
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: COLORS.text,
                marginTop: 12,
              }}
            >
              {search ? "No farms found" : "No farms available yet"}
            </Text>

            <Text
              style={{
                textAlign: "center",
                color: COLORS.muted,
                fontSize: 13,
                lineHeight: 20,
                marginTop: 7,
              }}
            >
              {search
                ? "Try searching with another farm name, location or farm type."
                : "New farms will appear here when farmers join the Nasara network."}
            </Text>

            {!!search && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  borderRadius: 12,
                  marginTop: 17,
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "800",
                  }}
                >
                  Clear Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}