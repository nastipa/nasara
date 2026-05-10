import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function RiderDashboard() {

  const [deliveries, setDeliveries] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState("");

  /* ================= LOAD ================= */

  async function loadDeliveries() {

    try {

      const {
        data,
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .in("status", [
            "pending",
            "accepted",
            "picked_up",
            "in_transit",
          ])
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
    loadDeliveries();
  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    const channel =
      (supabase as any)
        .channel(
          "delivery-realtime"
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

  /* ================= ACCEPT ================= */

  async function acceptDelivery(
    deliveryId: string
  ) {

    if (processingId)
      return;

    try {

      setProcessingId(
        deliveryId
      );

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        Alert.alert(
          "Login Required"
        );

        setProcessingId("");

        return;
      }

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .update({

            rider_id:
              user.id,

            status:
              "accepted",
          })
          .eq(
            "id",
            deliveryId
          )
          .eq(
            "status",
            "pending"
          );

      if (error) {

        Alert.alert(
          "Accept Error",
          error.message
        );

        setProcessingId("");

        return;
      }

      Alert.alert(
        "Accepted",
        "Delivery accepted successfully"
      );

      loadDeliveries();

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message
      );
    }

    setProcessingId("");
  }

  /* ================= UPDATE STATUS ================= */

  async function updateStatus(
    deliveryId: string,
    status: string
  ) {

    try {

      setProcessingId(
        deliveryId
      );

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .update({

            status,

            delivered_at:
              status ===
              "delivered"
                ? new Date().toISOString()
                : null,
          })
          .eq(
            "id",
            deliveryId
          );

      if (error) {

        Alert.alert(
          "Status Error",
          error.message
        );

        setProcessingId("");

        return;
      }

      loadDeliveries();

    } catch (err: any) {

      console.log(err);
    }

    setProcessingId("");
  }

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
        🚚 Rider Dashboard
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
        renderItem={({
          item,
        }) => (

          <View
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
                fontWeight:
                  "bold",
                fontSize: 17,
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
              }}
            >
              📞 Receiver:
              {" "}
              {
                item.receiver_phone
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
                marginTop: 10,
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

            {/* ================= ACCEPT ================= */}

            {item.status ===
              "pending" && (

              <TouchableOpacity
                disabled={
                  processingId ===
                  item.id
                }
                onPress={() =>
                  acceptDelivery(
                    item.id
                  )
                }
                style={{
                  backgroundColor:
                    "#16a34a",
                  padding: 12,
                  borderRadius: 8,
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
                  {processingId ===
                  item.id
                    ? "Processing..."
                    : "Accept Delivery"}
                </Text>

              </TouchableOpacity>
            )}

            {/* ================= UPDATE STATUS ================= */}

            {item.status ===
              "accepted" && (

              <TouchableOpacity
                onPress={() =>
                  updateStatus(
                    item.id,
                    "picked_up"
                  )
                }
                style={{
                  backgroundColor:
                    "#9333ea",
                  padding: 12,
                  borderRadius: 8,
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
                  Mark Picked Up
                </Text>

              </TouchableOpacity>
            )}

            {item.status ===
              "picked_up" && (

              <TouchableOpacity
                onPress={() =>
                  updateStatus(
                    item.id,
                    "in_transit"
                  )
                }
                style={{
                  backgroundColor:
                    "#0f766e",
                  padding: 12,
                  borderRadius: 8,
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
                  Start Transit
                </Text>

              </TouchableOpacity>
            )}

            {item.status ===
              "in_transit" && (

              <TouchableOpacity
                onPress={() =>
                  updateStatus(
                    item.id,
                    "delivered"
                  )
                }
                style={{
                  backgroundColor:
                    "#16a34a",
                  padding: 12,
                  borderRadius: 8,
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
                  Mark Delivered
                </Text>

              </TouchableOpacity>
            )}

          </View>
        )}
      />

    </View>
  );
}