import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Text,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { supabase } from "../../lib/supabase";

export default function DeliveryTracking() {
  const router =
  useRouter();

  const { id } =
    useLocalSearchParams();

  const deliveryId =
    typeof id === "string"
      ? id
      : "";

  const [delivery, setDelivery] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  /* ================= LOAD ================= */

  async function loadDelivery() {

    if (!deliveryId) return;

    try {

      const {
        data,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .eq(
            "id",
            deliveryId
          )
          .single();

      if (data) {

        setDelivery(data);
      }

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadDelivery();

  }, [deliveryId]);

  /* ================= REALTIME ================= */

  useEffect(() => {

    if (!deliveryId) return;

    const channel =
      (supabase as any)
        .channel(
          "delivery-track-" +
            deliveryId
        )

        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "deliveries",

            filter:
              `id=eq.${deliveryId}`,
          },
          (payload: any) => {

            setDelivery(
              payload.new
            );
          }
        )

        .subscribe();

    return () => {

      (supabase as any)
        .removeChannel(
          channel
        );
    };

  }, [deliveryId]);

  /* ================= STATUS UI ================= */

  function renderStatus() {

    if (!delivery)
      return null;

    const status =
      delivery.status;

    return (

      <View
        style={{
          marginTop: 20,
        }}
      >

        {/* PENDING */}

        <View
          style={{
            marginBottom: 20,
          }}
        >

          <Text
            style={{
              fontSize: 18,

              color:
                status ===
                  "pending" ||
                status ===
                  "accepted" ||
                status ===
                  "picked_up" ||
                status ===
                  "in_transit" ||
                status ===
                  "delivered"
                  ? "#16a34a"
                  : "#999",
            }}
          >
            ✅ Order Created
          </Text>

        </View>

        {/* ACCEPTED */}

        <View
          style={{
            marginBottom: 20,
          }}
        >

          <Text
            style={{
              fontSize: 18,

              color:
                status ===
                  "accepted" ||
                status ===
                  "picked_up" ||
                status ===
                  "in_transit" ||
                status ===
                  "delivered"
                  ? "#16a34a"
                  : "#999",
            }}
          >
            🚚 Rider Accepted
          </Text>

        </View>

        {/* PICKED UP */}

        <View
          style={{
            marginBottom: 20,
          }}
        >

          <Text
            style={{
              fontSize: 18,

              color:
                status ===
                  "picked_up" ||
                status ===
                  "in_transit" ||
                status ===
                  "delivered"
                  ? "#16a34a"
                  : "#999",
            }}
          >
            📦 Package Picked Up
          </Text>

        </View>

        {/* TRANSIT */}

        <View
          style={{
            marginBottom: 20,
          }}
        >

          <Text
            style={{
              fontSize: 18,

              color:
                status ===
                  "in_transit" ||
                status ===
                  "delivered"
                  ? "#16a34a"
                  : "#999",
            }}
          >
            🛵 In Transit
          </Text>

        </View>

        {/* DELIVERED */}

        <View
          style={{
            marginBottom: 20,
          }}
        >

          <Text
            style={{
              fontSize: 18,

              color:
                status ===
                "delivered"
                  ? "#16a34a"
                  : "#999",
            }}
          >
            🎉 Delivered
          </Text>

        </View>

      </View>
    );
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
        padding: 20,
        backgroundColor:
          "#fff",
      }}
    >

      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        📍 Delivery Tracking
      </Text>

      <Text
        style={{
          marginTop: 20,
          fontSize: 17,
        }}
      >
        📦
        {" "}
        {delivery?.item_name}
      </Text>

      <Text
        style={{
          marginTop: 10,
        }}
      >
        Pickup:
        {" "}
        {
          delivery?.pickup_address
        }
      </Text>

      <Text
        style={{
          marginTop: 6,
        }}
      >
        Dropoff:
        {" "}
        {
          delivery?.dropoff_address
        }
      </Text>

      {renderStatus()}

    </View>
  );
}