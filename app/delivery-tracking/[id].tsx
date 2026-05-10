import { useLocalSearchParams } from "expo-router";

import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function DeliveryTracking() {

  const { id } =
    useLocalSearchParams();

  const [delivery, setDelivery] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  /* ================= LOAD ================= */

  async function loadDelivery() {

    if (!id) return;

    try {

      const {
        data,
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .eq("id", id)
          .single();

      if (error) {

        console.log(error);

        return;
      }

      setDelivery(data);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);
    }
  }

  /* ================= INIT ================= */

  useEffect(() => {

    loadDelivery();

  }, [id]);

  /* ================= REALTIME ================= */

  useEffect(() => {

    if (!id) return;

    const channel =
      (supabase as any)
        .channel(
          `delivery-${id}`
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "deliveries",
            filter: `id=eq.${id}`,
          },
          () => {

            loadDelivery();
          }
        )

        .subscribe();

    return () => {

      (supabase as any)
        .removeChannel(
          channel
        );
    };

  }, [id]);

  /* ================= STATUS COLOR ================= */

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

  if (!delivery) {

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

        <Text>
          Delivery not found
        </Text>

      </View>
    );
  }

  return (

    <ScrollView
      contentContainerStyle={{
        padding: 20,
      }}
    >

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        📦 Delivery Tracking
      </Text>

      {/* ================= IMAGE ================= */}

      {delivery.package_image ? (

        <Image
          source={{
            uri:
              delivery.package_image,
          }}
          style={{
            width: "100%",
            height: 250,
            borderRadius: 14,
            marginBottom: 20,
          }}
        />

      ) : null}

      {/* ================= ITEM ================= */}

      <View
        style={{
          backgroundColor:
            "#fff",
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      >

        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          {delivery.item_name}
        </Text>

        <Text
          style={{
            marginTop: 10,
          }}
        >
          📍 Pickup:
          {" "}
          {
            delivery.pickup_address
          }
        </Text>

        <Text
          style={{
            marginTop: 8,
          }}
        >
          🏁 Dropoff:
          {" "}
          {
            delivery.dropoff_address
          }
        </Text>

        <Text
          style={{
            marginTop: 8,
          }}
        >
          📞 Receiver:
          {" "}
          {
            delivery.receiver_phone
          }
        </Text>

        <Text
          style={{
            marginTop: 8,
          }}
        >
          💰 Amount:
          {" "}
          GH₵
          {" "}
          {Number(
            delivery.amount || 0
          ).toLocaleString()}
        </Text>

        {delivery.item_note ? (

          <Text
            style={{
              marginTop: 8,
            }}
          >
            📝 Note:
            {" "}
            {
              delivery.item_note
            }
          </Text>

        ) : null}

      </View>

      {/* ================= STATUS ================= */}

      <View
        style={{
          marginTop: 20,
          backgroundColor:
            getStatusColor(
              delivery.status
            ),
          padding: 15,
          borderRadius: 14,
        }}
      >

        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          STATUS:
          {" "}
          {
            delivery.status
          }
        </Text>

      </View>

      {/* ================= OTP ================= */}

      <View
        style={{
          marginTop: 20,
          backgroundColor:
            "#eff6ff",
          borderWidth: 1,
          borderColor: "#2563eb",
          padding: 18,
          borderRadius: 14,
        }}
      >

        <Text
          style={{
            fontWeight: "bold",
            fontSize: 18,
            color: "#1d4ed8",
          }}
        >
          🔐 Delivery OTP
        </Text>

        <Text
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: "bold",
            textAlign: "center",
            letterSpacing: 8,
            color: "#1e40af",
          }}
        >
          {
            delivery.otp_code
          }
        </Text>

        <Text
          style={{
            marginTop: 10,
            textAlign: "center",
            color: "#1e3a8a",
          }}
        >
          Give this OTP to the rider
          only after receiving
          your package.
        </Text>

      </View>

      {/* ================= TIMELINE ================= */}

      <View
        style={{
          marginTop: 25,
        }}
      >

        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 15,
          }}
        >
          🚚 Delivery Progress
        </Text>

        <View
          style={{
            gap: 15,
          }}
        >

          <Text>
            {delivery.status ===
            "pending"
              ? "🟡 Waiting for rider"
              : "✅ Rider accepted"}
          </Text>

          <Text>
            {[
              "picked_up",
              "in_transit",
              "delivered",
            ].includes(
              delivery.status
            )
              ? "✅ Package picked up"
              : "⏳ Awaiting pickup"}
          </Text>

          <Text>
            {[
              "in_transit",
              "delivered",
            ].includes(
              delivery.status
            )
              ? "✅ Package in transit"
              : "⏳ Waiting transit"}
          </Text>

          <Text>
            {delivery.status ===
            "delivered"
              ? "✅ Delivered successfully"
              : "⏳ Not delivered yet"}
          </Text>

        </View>

      </View>

    </ScrollView>
  );
}