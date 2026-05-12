import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

export default function DeliveryDetails() {
const router = useRouter();
  const { id } =
    useLocalSearchParams();

  const [delivery, setDelivery] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);
    const [rider, setRider] =
  useState<any>(null);

  /* ================= LOAD ================= */

  async function loadDelivery() {

    if (!id) return;

    const {
      data,
      error,
    } =
      await (supabase as any)
        .from("deliveries")
        .select("*")
        .eq("id", id)
        .single();

    if (!error) {

      setDelivery(data);
    }
    if (data?.rider_id) {

  const {
    data: riderData,
  } =
    await (supabase as any)
      .from("riders")
      .select("*")
      .eq(
        "user_id",
        data.rider_id
      )
      .single();

  if (riderData) {

    setRider(
      riderData
    );
  }
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
        .removeChannel(
          channel
        );
    };

  }, [id]);

  /* ================= STATUS STEP ================= */

  function getStep() {

    if (
      delivery?.status ===
      "pending"
    )
      return 1;

    if (
      delivery?.status ===
      "accepted"
    )
      return 2;

    if (
      delivery?.status ===
      "picked_up"
    )
      return 3;

    if (
      delivery?.status ===
      "in_transit"
    )
      return 4;

    if (
      delivery?.status ===
      "delivered"
    )
      return 5;

    return 1;
  }

  const currentStep =
    getStep();

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

      {delivery?.package_image ? (

        <Image
          source={{
            uri:
              delivery.package_image,
          }}
          style={{
            width: "100%",
            height: 220,
            borderRadius: 15,
            marginBottom: 20,
          }}
        />

      ) : null}

      <View
        style={{
          backgroundColor: "#fff",
          padding: 15,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      >

        <Text
          style={{
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          📦 {delivery?.item_name}
        </Text>

        <Text
          style={{
            marginTop: 10,
          }}
        >
          📍 Pickup:
          {" "}
          {
            delivery?.pickup_address
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
            delivery?.dropoff_address
          }
        </Text>

        <Text
          style={{
            marginTop: 5,
          }}
        >
          📞 Receiver:
          {" "}
          {
            delivery?.receiver_phone
          }
        </Text>

        <Text
          style={{
            marginTop: 5,
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

        {[
          "Order Created",
          "Rider Accepted",
          "Package Picked Up",
          "In Transit",
          "Delivered",
        ].map((step, index) => {

          const active =
            currentStep >=
            index + 1;

          return (

            <View
              key={step}
              style={{
                flexDirection:
                  "row",
                marginBottom: 25,
              }}
            >

              <View
                style={{
                  width: 22,
                  alignItems:
                    "center",
                }}
              >

                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor:
                      active
                        ? "#16a34a"
                        : "#d1d5db",
                  }}
                />

                {index !== 4 && (

                  <View
                    style={{
                      width: 3,
                      height: 50,
                      backgroundColor:
                        active
                          ? "#16a34a"
                          : "#d1d5db",
                    }}
                  />

                )}

              </View>

              <View
                style={{
                  marginLeft: 15,
                  marginTop: -2,
                }}
              >

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
                  }}
                >
                  {step}
                </Text>

              </View>

            </View>
          );
        })}

      </View>
{rider && (

  <View
    style={{
      marginTop: 25,
      backgroundColor:
        "#fff",
      padding: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#ddd",
    }}
  >

    <Text
      style={{
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      🚴 Rider Live Location
    </Text>

    <Text
      style={{
        marginTop: 10,
      }}
    >
      Latitude:
      {" "}
      {rider.latitude}
    </Text>

    <Text
      style={{
        marginTop: 5,
      }}
    >
      Longitude:
      {" "}
      {rider.longitude}
    </Text>

    <Text
      style={{
        marginTop: 10,
        color: "#16a34a",
        fontWeight: "bold",
      }}
    >
      Rider is moving live
    </Text>

  </View>
)}
<TouchableOpacity
  onPress={() =>
    router.push(
      `/delivery-map?id=${delivery.id}`
    )
  }
  style={{
    backgroundColor:
      "#2563eb",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  }}
>

  <Text
    style={{
      color: "#fff",
      textAlign: "center",
      fontWeight: "bold",
    }}
  >
    🗺️ Open Live Map
  </Text>

</TouchableOpacity>
      {/* ================= OTP ================= */}

      {delivery?.status ===
        "in_transit" && (

        <View
          style={{
            backgroundColor:
              "#fef3c7",
            padding: 18,
            borderRadius: 12,
            marginTop: 10,
          }}
        >

          <Text
            style={{
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            🔐 Delivery OTP
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: "bold",
              letterSpacing: 5,
            }}
          >
            {delivery?.otp_code}
          </Text>

          <Text
            style={{
              marginTop: 10,
              color: "#555",
            }}
          >
            Give this OTP to the rider
            after receiving package.
          </Text>

        </View>
      )}

      {delivery?.status ===
        "delivered" && (

        <View
          style={{
            backgroundColor:
              "#dcfce7",
            padding: 18,
            borderRadius: 12,
            marginTop: 20,
          }}
        >

          <Text
            style={{
              fontWeight: "bold",
              fontSize: 18,
              color: "#166534",
            }}
          >
            ✅ Delivery Completed
          </Text>

        </View>
      )}

    </ScrollView>
  );
}