import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FridayMarketHome() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [countdown, setCountdown] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      updateCountdown();
    }, 1000);

    updateCountdown();

    return () => clearInterval(timer);
  }, []);

  const updateCountdown = () => {
    const now = new Date();

    if (
      now.getDay() === 5 &&
      now.getHours() >= 6 &&
      now.getHours() < 22
    ) {
      const closeTime = new Date();
      closeTime.setHours(22, 0, 0, 0);

      const diff =
        closeTime.getTime() -
        now.getTime();

      const hours = Math.floor(
        diff / 1000 / 60 / 60
      );

      const minutes = Math.floor(
        (diff / 1000 / 60) % 60
      );

      const seconds = Math.floor(
        (diff / 1000) % 60
      );

      setCountdown(
        `🔴 Market closes in ${hours}h ${minutes}m ${seconds}s`
      );

      return;
    }

    const nextFriday = new Date();

    const daysUntilFriday =
      (5 - nextFriday.getDay() + 7) % 7;

    nextFriday.setDate(
      nextFriday.getDate() +
        daysUntilFriday
    );

    nextFriday.setHours(
      6,
      0,
      0,
      0
    );

    const diff =
      nextFriday.getTime() -
      now.getTime();

    const days = Math.floor(
      diff / 1000 / 60 / 60 / 24
    );

    const hours = Math.floor(
      (diff / 1000 / 60 / 60) % 24
    );

    const minutes = Math.floor(
      (diff / 1000 / 60) % 60
    );

    setCountdown(
      `⏰ Opens in ${days}d ${hours}h ${minutes}m`
    );
  };

  const loadData = async () => {
    setLoading(true);

    const itemsRes =
      await (supabase as any)
        .from(
          "friday_market_items"
        )
        .select("*")
        .eq(
          "archived",
          false
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(20);

    const stallsRes =
      await (supabase as any)
        .from(
          "friday_market_stalls"
        )
        .select("*")
        .eq("active", true)
        .limit(10);

    const activityRes =
      await (supabase as any)
        .from(
          "friday_market_activity"
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(10);

    setItems(
      itemsRes.data || []
    );

    setStalls(
      stallsRes.data || []
    );

    setActivity(
      activityRes.data || []
    );

    setLoading(false);
  };

  const onRefresh =
    async () => {
      setRefreshing(true);

      await loadData();

      setRefreshing(false);
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
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={
            onRefresh
          }
        />
      }
      style={{
        flex: 1,
        backgroundColor:
          "#f8fafc",
      }}
    >
      {/* HEADER */}

      <View
        style={{
          backgroundColor:
            "#16a34a",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight:
              "bold",
            color: "#fff",
          }}
        >
          🛒 Friday Market
        </Text>

        <Text
          style={{
            color:
              "#ffffff",
            marginTop: 8,
          }}
        >
          Every Friday
          6AM - 10PM
        </Text>

        <Text
          style={{
            color:
              "#ffffff",
            marginTop: 12,
            fontWeight:
              "bold",
          }}
        >
          {countdown}
        </Text>
      </View>

      {/* QUICK ACTIONS */}

      <View
        style={{
          flexDirection:
            "row",
          flexWrap: "wrap",
          justifyContent:
            "space-between",
          padding: 16,
        }}
      >
        <QuickButton
          title="Create Stall"
          icon="storefront"
          onPress={() =>
            router.push(
              "/friday-market/create-stall"
            )
          }
        />

        <QuickButton
          title="My Stall"
          icon="briefcase"
          onPress={() =>
            router.push(
              "/friday-market/my-stall"
            )
          }
        />

        <QuickButton
          title="Market Chat"
          icon="chatbubbles"
          onPress={() =>
            router.push(
              "/friday-market/chat"
            )
          }
        />

        <QuickButton
          title="Flash Deals"
          icon="flash"
          onPress={() =>
            router.push(
              "/friday-market/flash-sales"
            )
          }
        />
      </View>

      {/* LIVE ACTIVITY */}

      <Text
        style={{
          fontSize: 18,
          fontWeight:
            "bold",
          paddingHorizontal:
            16,
        }}
      >
        🔴 Live Market
      </Text>

      {activity.map(
        (a, index) => (
          <Text
            key={index}
            style={{
              paddingHorizontal:
                16,
              paddingVertical:
                4,
            }}
          >
            {a.activity}
          </Text>
        )
      )}

      {/* STALLS */}

      <Text
        style={{
          fontSize: 18,
          fontWeight:
            "bold",
          padding: 16,
        }}
      >
        ⭐ Premium Stalls
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
      >
        {stalls.map(
          (stall) => (
            <TouchableOpacity
              key={
                stall.id
              }
              onPress={() =>
                router.push(
                  `/friday-market/stall/${stall.id}`
                )
              }
              style={{
                width: 200,
                backgroundColor:
                  "#fff",
                marginLeft:
                  16,
                borderRadius:
                  12,
                overflow:
                  "hidden",
              }}
            >
              {stall.banner_url ? (
                <Image
                  source={{
                    uri: stall.banner_url,
                  }}
                  style={{
                    height: 100,
                  }}
                />
              ) : null}

              <Text
                style={{
                  padding: 10,
                  fontWeight:
                    "bold",
                }}
              >
                {
                  stall.stall_name
                }
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* PRODUCTS */}

      <Text
        style={{
          fontSize: 18,
          fontWeight:
            "bold",
          padding: 16,
        }}
      >
        🔥 Latest Products
      </Text>

      {items.map(
        (item) => (
          <TouchableOpacity
            key={item.id}
            style={{
              backgroundColor:
                "#fff",
              marginHorizontal:
                16,
              marginBottom:
                12,
              borderRadius:
                12,
              overflow:
                "hidden",
            }}
          >
            {item.image_url ? (
              <Image
                source={{
                  uri: item.image_url,
                }}
                style={{
                  height: 200,
                }}
              />
            ) : null}

            <View
              style={{
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",
                  fontSize: 16,
                }}
              >
                {item.title}
              </Text>

              <Text>
                GH₵
                {
                  item.discount_price ||
                  item.price
                }
              </Text>

              <View
                style={{
                  flexDirection:
                    "row",
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor:
                      "#2563eb",
                    padding: 10,
                    borderRadius:
                      8,
                    marginRight:
                      10,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#fff",
                    }}
                  >
                    Chat Seller
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor:
                      "#16a34a",
                    padding: 10,
                    borderRadius:
                      8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#fff",
                    }}
                  >
                    View Stall
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  );
}

function QuickButton({
  title,
  icon,
  onPress,
}: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: "48%",
        backgroundColor:
          "#ffffff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems:
          "center",
      }}
    >
      <Ionicons
        name={icon}
        size={28}
        color="#16a34a"
      />

      <Text
        style={{
          marginTop: 8,
          fontWeight:
            "bold",
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}