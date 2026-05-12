import { useEffect, useMemo, useState } from "react";

import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function DeliveryAnalytics() {
  const [deliveries, setDeliveries] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ================= LOAD ================= */

  async function loadAnalytics() {
    try {
      const {
        data,
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        console.log(error);

        return;
      }

      setDeliveries(data || []);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
    setRefreshing(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {
    loadAnalytics();
  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {
    const channel =
      (supabase as any)
        .channel(
          "delivery-analytics"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "deliveries",
          },
          () => {
            loadAnalytics();
          }
        )

        .subscribe();

    return () => {
      (supabase as any)
        .removeChannel(channel);
    };
  }, []);

  /* ================= STATS ================= */

  const totalDeliveries =
    deliveries.length;

  const completedDeliveries =
    deliveries.filter(
      (d) =>
        d.status ===
        "delivered"
    ).length;

  const pendingDeliveries =
    deliveries.filter(
      (d) =>
        d.status !==
        "delivered"
    ).length;

  const totalRevenue =
    useMemo(() => {
      return deliveries.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );
    }, [deliveries]);

  const totalPlatformFees =
    useMemo(() => {
      return deliveries.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.platform_fee || 0
          ),
        0
      );
    }, [deliveries]);

  const totalRiderEarnings =
    useMemo(() => {
      return deliveries.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.rider_earning || 0
          ),
        0
      );
    }, [deliveries]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        style={{
          flex: 1,
        }}
      />
    );
  }

  /* ================= UI ================= */

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={() => {
            setRefreshing(
              true
            );

            loadAnalytics();
          }}
        />
      }
      contentContainerStyle={{
        padding: 15,
      }}
    >
      <Text
        style={{
          fontSize: 26,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        📊 Delivery Analytics
      </Text>

      {/* ================= TOP STATS ================= */}

      <View
        style={{
          backgroundColor:
            "#16a34a",
          borderRadius: 16,
          padding: 20,
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
          }}
        >
          Total Revenue
        </Text>

        <Text
          style={{
            color: "#fff",
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          GH₵
          {" "}
          {Number(
            totalRevenue
          ).toLocaleString()}
        </Text>
      </View>

      {/* ================= GRID ================= */}

      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "space-between",
          flexWrap: "wrap",
        }}
      >
        <View
          style={{
            width: "48%" as any,
            backgroundColor:
              "#fff",
            borderRadius: 14,
            padding: 18,
            marginBottom: 15,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text
            style={{
              color: "#666",
            }}
          >
            Total Deliveries
          </Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 10,
            }}
          >
            {totalDeliveries}
          </Text>
        </View>

        <View
          style={{
            width: "48%" as any,
            backgroundColor:
              "#fff",
            borderRadius: 14,
            padding: 18,
            marginBottom: 15,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text
            style={{
              color: "#666",
            }}
          >
            Completed
          </Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 10,
              color: "#16a34a",
            }}
          >
            {
              completedDeliveries
            }
          </Text>
        </View>

        <View
          style={{
            width: "48%" as any,
            backgroundColor:
              "#fff",
            borderRadius: 14,
            padding: 18,
            marginBottom: 15,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text
            style={{
              color: "#666",
            }}
          >
            Pending
          </Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 10,
              color: "#f59e0b",
            }}
          >
            {
              pendingDeliveries
            }
          </Text>
        </View>

        <View
          style={{
            width: "48%" as any,
            backgroundColor:
              "#fff",
            borderRadius: 14,
            padding: 18,
            marginBottom: 15,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text
            style={{
              color: "#666",
            }}
          >
            Platform Fees
          </Text>

          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginTop: 10,
              color: "#2563eb",
            }}
          >
            GH₵
            {" "}
            {Number(
              totalPlatformFees
            ).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ================= RIDER PAYOUT ================= */}

      <View
        style={{
          backgroundColor:
            "#fff",
          borderRadius: 16,
          padding: 20,
          marginTop: 5,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          🚴 Rider Earnings
        </Text>

        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            color: "#9333ea",
          }}
        >
          GH₵
          {" "}
          {Number(
            totalRiderEarnings
          ).toLocaleString()}
        </Text>
      </View>

      {/* ================= RECENT DELIVERIES ================= */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginTop: 30,
          marginBottom: 15,
        }}
      >
        Recent Deliveries
      </Text>

      {deliveries
        .slice(0, 10)
        .map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor:
                "#fff",
              borderRadius: 14,
              padding: 16,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: "#ddd",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "bold",
              }}
            >
              📦 {item.item_name}
            </Text>

            <Text
              style={{
                marginTop: 8,
              }}
            >
              📍 {
                item.pickup_address
              }
            </Text>

            <Text
              style={{
                marginTop: 5,
              }}
            >
              🏁 {
                item.dropoff_address
              }
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontWeight: "bold",
              }}
            >
              💰 GH₵
              {" "}
              {Number(
                item.amount || 0
              ).toLocaleString()}
            </Text>

            <View
              style={{
                marginTop: 10,
                alignSelf:
                  "flex-start",
                backgroundColor:
                  item.status ===
                  "delivered"
                    ? "#16a34a"
                    : "#f59e0b",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight:
                    "bold",
                }}
              >
                {item.status}
              </Text>
            </View>
          </View>
        ))}
    </ScrollView>
  );
}