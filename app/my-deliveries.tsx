import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function MyDeliveries() {

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
            "sender_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {

        console.log(error);

        setLoading(false);

        return;
      }

      setDeliveries(data || []);

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
    setRefreshing(false);
  }

  /* ================= FOCUS ================= */

  useFocusEffect(
    useCallback(() => {

      loadDeliveries();

    }, [])
  );

  /* ================= STATUS COLOR ================= */

  function getStatusColor(
    status: string
  ) {

    if (status === "pending")
      return "#f59e0b";

    if (status === "accepted")
      return "#2563eb";

    if (status === "picked_up")
      return "#9333ea";

    if (status === "in_transit")
      return "#0f766e";

    if (status === "delivered")
      return "#16a34a";

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
          fontSize: 24,
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
              router.push({
                pathname:
                  "/delivery-detail",
                params: {
                  id: item.id,
                },
              })
            }
            style={{
              borderWidth: 1,
              borderColor:
                "#ddd",
              borderRadius: 12,
              padding: 15,
              marginBottom: 15,
              backgroundColor:
                "#fff",
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
                marginTop: 10,
              }}
            >
              📍 Pickup:
              {" "}
              {
                item.pickup_address
              }
            </Text>

            <Text
              style={{
                marginTop: 5,
              }}
            >
              🏁 Dropoff:
              {" "}
              {
                item.dropoff_address
              }
            </Text>

            <Text
              style={{
                marginTop: 5,
                fontWeight:
                  "bold",
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
                backgroundColor:
                  getStatusColor(
                    item.status
                  ),
                alignSelf:
                  "flex-start",
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

          </TouchableOpacity>
        )}
      />

    </View>
  );
}