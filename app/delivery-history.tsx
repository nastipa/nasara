import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

export default function DeliveryHistory() {

  const router = useRouter();

  const [deliveries, setDeliveries] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ================= LOAD ================= */

  async function loadDeliveries() {

    try {

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        setLoading(false);

        return;
      }

      const {
        data,
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .eq(
  "customer_id",
  user.id
)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (!error) {

        setDeliveries(
          data || []
        );
      }

    } catch (err) {

      console.log(err);
    }

    setLoading(false);

    setRefreshing(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadDeliveries();

  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    const channel =
      (supabase as any)
        .channel(
          "customer-delivery-history"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "deliveries",
          },
          () => {

            loadDeliveries();
          }
        )

        .subscribe();

    return () => {

      (supabase as any)
        .removeChannel(channel);
    };

  }, []);

  /* ================= STATUS COLOR ================= */

  function getStatusColor(
    status: string
  ) {

    if (
      status === "pending"
    )
      return "#f59e0b";

    if (
      status === "pending_rider"
    )
      return "#2563eb";

    if (
      status === "accepted"
    )
      return "#0f766e";

    if (
      status === "picked_up"
    )
      return "#9333ea";

    if (
      status === "in_transit"
    )
      return "#0891b2";

    if (
      status === "delivered"
    )
      return "#16a34a";

    if (
      status === "cancelled"
    )
      return "#dc2626";

    return "#6b7280";
  }

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
        size="large"
      />
    );
  }

  /* ================= UI ================= */

  return (

    <View
      style={{
        flex: 1,
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
        📦 My Deliveries
      </Text>

      <FlatList
        data={deliveries}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {

              setRefreshing(
                true
              );

              loadDeliveries();
            }}
          />
        }
        ListEmptyComponent={

          <View
            style={{
              marginTop: 80,
              alignItems: "center",
            }}
          >

            <Text
              style={{
                fontSize: 18,
                color: "#666",
              }}
            >
              No deliveries yet
            </Text>

          </View>
        }
        renderItem={({
          item,
        }) => (

          <TouchableOpacity
            onPress={() =>
              router.push(
                `/delivery-detail?id=${item.id}`
              )
            }
            style={{
              backgroundColor:
                "#fff",
              borderRadius: 14,
              padding: 16,
              marginBottom: 15,
              borderWidth: 1,
              borderColor: "#ddd",
            }}
          >

            <Text
              style={{
                fontSize: 18,
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
              📍 Pickup:
              {" "}
              {item.pickup_address}
            </Text>

            <Text
              style={{
                marginTop: 5,
              }}
            >
              🏁 Dropoff:
              {" "}
              {item.dropoff_address}
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
                marginTop: 12,
                alignSelf:
                  "flex-start",
                backgroundColor:
                  getStatusColor(
                    item.status
                  ),
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >

              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                }}
              >
                {item.status}
              </Text>

            </View>

          </TouchableOpacity>
        )}
      />

    </View>
  );
}