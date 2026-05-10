import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function DeliveryDetail() {

  const { id } =
    useLocalSearchParams();

  const [delivery, setDelivery] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

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
    }

    setLoading(false);
    setRefreshing(false);
  }

  /* ================= INITIAL ================= */

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
        .removeChannel(channel);
    };

  }, [id]);

  /* ================= STATUS STEP ================= */

  function getStep(status: string) {

    if (status === "pending")
      return 1;

    if (status === "accepted")
      return 2;

    if (status === "picked_up")
      return 3;

    if (status === "in_transit")
      return 4;

    if (status === "delivered")
      return 5;

    return 1;
  }

  const currentStep =
    getStep(
      delivery?.status || ""
    );

  const steps = [
    "Pending",
    "Accepted",
    "Picked Up",
    "In Transit",
    "Delivered",
  ];

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

    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {

            setRefreshing(true);

            loadDelivery();
          }}
        />
      }
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

      <View
        style={{
          backgroundColor: "#fff",
          padding: 18,
          borderRadius: 12,
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
          {delivery?.item_name}
        </Text>

        <Text
          style={{
            marginTop: 10,
          }}
        >
          📍 Pickup:
          {" "}
          {delivery?.pickup_address}
        </Text>

        <Text
          style={{
            marginTop: 8,
          }}
        >
          🏁 Dropoff:
          {" "}
          {delivery?.dropoff_address}
        </Text>

        <Text
          style={{
            marginTop: 8,
          }}
        >
          📞 Receiver:
          {" "}
          {delivery?.receiver_phone}
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
            delivery?.amount || 0
          ).toLocaleString()}
        </Text>

      </View>

      {/* ================= TRACKING ================= */}

      <View
        style={{
          marginTop: 30,
        }}
      >

        {steps.map(
          (
            step,
            index
          ) => {

            const active =
              index + 1 <=
              currentStep;

            return (

              <View
                key={step}
                style={{
                  flexDirection:
                    "row",
                  alignItems:
                    "center",
                  marginBottom: 20,
                }}
              >

                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor:
                      active
                        ? "#16a34a"
                        : "#d1d5db",
                    marginRight: 15,
                  }}
                />

                <Text
                  style={{
                    fontWeight:
                      active
                        ? "bold"
                        : "normal",

                    color:
                      active
                        ? "#111"
                        : "#777",

                    fontSize: 16,
                  }}
                >
                  {step}
                </Text>

              </View>
            );
          }
        )}

      </View>

      {/* ================= OTP ================= */}

      {delivery?.status ===
        "in_transit" && (

        <View
          style={{
            marginTop: 25,
            backgroundColor:
              "#eff6ff",
            padding: 18,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#2563eb",
          }}
        >

          <Text
            style={{
              fontWeight: "bold",
              fontSize: 18,
              textAlign: "center",
              color: "#1d4ed8",
            }}
          >
            Delivery OTP
          </Text>

          <Text
            style={{
              textAlign: "center",
              fontSize: 32,
              fontWeight: "bold",
              marginTop: 10,
              letterSpacing: 5,
              color: "#2563eb",
            }}
          >
            {delivery?.otp_code}
          </Text>

          <Text
            style={{
              textAlign: "center",
              marginTop: 10,
              color: "#555",
            }}
          >
            Give this OTP to rider
            after delivery.
          </Text>

        </View>
      )}

    </ScrollView>
  );
}