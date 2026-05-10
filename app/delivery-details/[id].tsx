import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function DeliveryDetails() {

  const { id } =
    useLocalSearchParams();

  const [delivery, setDelivery] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [otp, setOtp] =
    useState("");

  const [processing, setProcessing] =
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

  /* ================= OTP VERIFY ================= */

  async function verifyOtp() {

    if (processing)
      return;

    if (!otp) {

      Alert.alert(
        "OTP Required"
      );

      return;
    }

    try {

      setProcessing(true);

      if (
        otp !==
        delivery?.otp_code
      ) {

        Alert.alert(
          "Invalid OTP"
        );

        setProcessing(false);

        return;
      }

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .update({

            status:
              "completed",

            completed_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            id
          );

      if (error) {

        Alert.alert(
          "Verification Error",
          error.message
        );

        setProcessing(false);

        return;
      }

      Alert.alert(
        "Delivery Completed",
        "Package successfully delivered"
      );

      loadDelivery();

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message
      );
    }

    setProcessing(false);
  }

  /* ================= TIMELINE ================= */

  const timeline = [

    {
      label:
        "Pending",
      done: true,
    },

    {
      label:
        "Accepted",
      done: [
        "accepted",
        "picked_up",
        "in_transit",
        "delivered",
        "completed",
      ].includes(
        delivery?.status
      ),
    },

    {
      label:
        "Picked Up",
      done: [
        "picked_up",
        "in_transit",
        "delivered",
        "completed",
      ].includes(
        delivery?.status
      ),
    },

    {
      label:
        "In Transit",
      done: [
        "in_transit",
        "delivered",
        "completed",
      ].includes(
        delivery?.status
      ),
    },

    {
      label:
        "Delivered",
      done: [
        "delivered",
        "completed",
      ].includes(
        delivery?.status
      ),
    },

    {
      label:
        "Completed",
      done:
        delivery?.status ===
        "completed",
    },
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

  /* ================= UI ================= */

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
        }}
      >
        🚚 Delivery Details
      </Text>

      {/* ================= ITEM ================= */}

      <View
        style={{
          backgroundColor:
            "#fff",
          borderRadius: 12,
          padding: 15,
          marginTop: 20,
          borderWidth: 1,
          borderColor:
            "#ddd",
        }}
      >

        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          📦 {delivery.item_name}
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
            fontWeight:
              "bold",
          }}
        >
          💰 GH₵
          {" "}
          {Number(
            delivery.amount || 0
          ).toLocaleString()}
        </Text>

      </View>

      {/* ================= STATUS ================= */}

      <View
        style={{
          marginTop: 25,
        }}
      >

        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 15,
          }}
        >
          📍 Delivery Timeline
        </Text>

        {timeline.map(
          (
            step,
            index
          ) => (

            <View
              key={index}
              style={{
                flexDirection:
                  "row",
                alignItems:
                  "center",
                marginBottom: 15,
              }}
            >

              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor:
                    step.done
                      ? "#16a34a"
                      : "#d1d5db",
                  marginRight: 12,
                }}
              />

              <Text
                style={{
                  fontWeight:
                    step.done
                      ? "bold"
                      : "normal",
                }}
              >
                {step.label}
              </Text>

            </View>
          )
        )}

      </View>

      {/* ================= OTP ================= */}

      {delivery.status ===
        "delivered" && (

        <View
          style={{
            marginTop: 30,
            backgroundColor:
              "#f9fafb",
            borderRadius: 12,
            padding: 15,
          }}
        >

          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            🔐 Verify Delivery OTP
          </Text>

          <TextInput
            placeholder="Enter receiver OTP"
            value={otp}
            onChangeText={
              setOtp
            }
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor:
                "#ddd",
              borderRadius: 10,
              padding: 12,
              marginTop: 15,
            }}
          />

          <TouchableOpacity
            disabled={
              processing
            }
            onPress={
              verifyOtp
            }
            style={{
              backgroundColor:
                processing
                  ? "gray"
                  : "#16a34a",

              padding: 14,

              borderRadius: 10,

              marginTop: 15,
            }}
          >

            <Text
              style={{
                color: "#fff",
                textAlign:
                  "center",
                fontWeight:
                  "bold",
              }}
            >
              {processing
                ? "Verifying..."
                : "Verify OTP"}
            </Text>

          </TouchableOpacity>

        </View>
      )}

      {/* ================= STATUS BADGE ================= */}

      <View
        style={{
          marginTop: 30,
          alignSelf:
            "flex-start",
          backgroundColor:
            "#2563eb",
          paddingHorizontal: 15,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >

        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          STATUS:
          {" "}
          {
            delivery.status
          }
        </Text>

      </View>

    </ScrollView>
  );
}