import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

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
          "my-deliveries"
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
        .removeChannel(
          channel
        );
    };

  }, []);

  /* ================= COLOR ================= */

  function getStatusColor(
    status: string
  ) {

    if (
      status === "pending"
    )
      return "#f59e0b";

    if (
      status === "accepted"
    )
      return "#2563eb";

    if (
      status === "picked_up"
    )
      return "#9333ea";

    if (
      status === "in_transit"
    )
      return "#0f766e";

    if (
      status === "delivered"
    )
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

          <Text
            style={{
              textAlign:
                "center",
              marginTop: 50,
              color: "#777",
            }}
          >
            No deliveries yet
          </Text>
        }
        renderItem={({ item }) => (
  <TouchableOpacity
    onPress={() =>
      router.push({
        pathname: "/delivery-detail",
        params: { id: item.id },
      })
    }
    style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#ddd",
      padding: 15,
      marginBottom: 15,
    }}
  >
    {item.package_image ? (
      <Image
        source={{ uri: item.package_image }}
        style={{
          width: "100%",
          height: 180,
          borderRadius: 12,
          marginBottom: 12,
        }}
      />
    ) : null}

    <Text
      style={{
        fontWeight: "bold",
        fontSize: 17,
      }}
    >
      📦 {item.item_name}
    </Text>

    <Text style={{ marginTop: 8 }}>
      📍 {item.pickup_address}
    </Text>

    <Text style={{ marginTop: 5 }}>
      🏁 {item.dropoff_address}
    </Text>

    <Text
      style={{
        marginTop: 5,
        fontWeight: "bold",
      }}
    >
      💰 GH₵ {Number(item.amount || 0).toLocaleString()}
    </Text>

    {item.status === "pending_pricing" && (
      <View
        style={{
          marginTop: 12,
          backgroundColor: "#fef3c7",
          padding: 12,
          borderRadius: 10,
        }}
      >
        <Text>
          Waiting for admin to set price
        </Text>
      </View>
    )}

    {item.status === "awaiting_payment" && (
      <View
        style={{
          marginTop: 12,
          backgroundColor: "#eff6ff",
          padding: 12,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          Delivery fee:
          {" "}
          GH₵ {item.amount}
        </Text>

        <Text style={{ marginTop: 8 }}>
          Pay to Nasara
        </Text>

        <Text>
          MTN MoMo: 0539703374
        </Text>
      </View>
    )}

    <View
      style={{
        marginTop: 12,
        alignSelf: "flex-start",
        backgroundColor: getStatusColor(item.status),
        paddingHorizontal: 12,
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