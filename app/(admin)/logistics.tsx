import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function LogisticsAdmin() {

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
          "admin-logistics"
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

  /* ================= VERIFY PAYMENT ================= */

 async function verifyPayment(
  deliveryId: string
) {

  try {

    setProcessingId(
      deliveryId
    );

    const {
      data,
      error,
    } =
      await (supabase as any)
        .from("deliveries")
        .update({

          payment_status:
            "paid",

          status:
            "pending",
        })
        .eq(
          "id",
          deliveryId
        )
        .select();

    if (error) {

      Alert.alert(
        "Payment Error",
        error.message
      );

      setProcessingId("");

      return;
    }

    if (!data || !data.length) {

      Alert.alert(
        "Update Failed",
        "Delivery was not updated"
      );

      setProcessingId("");

      return;
    }

    /* ================= FORCE REFRESH ================= */

    await loadDeliveries();

    Alert.alert(
      "Success",
      "Payment verified successfully"
    );

  } catch (err: any) {

    console.log(err);

    Alert.alert(
      "Error",
      err?.message
    );
  }

  setProcessingId("");
}

  /* ================= STATS ================= */

  const totalDeliveries =
    deliveries.length;

  const deliveredCount =
    useMemo(() => {

      return deliveries.filter(
        (d) =>
          d.status ===
          "delivered"
      ).length;

    }, [deliveries]);

  const activeCount =
    useMemo(() => {

      return deliveries.filter(
        (d) =>
          d.status !==
          "delivered"
      ).length;

    }, [deliveries]);

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
        🚚 Logistics Analytics
      </Text>

      {/* ================= STATS ================= */}

      <View
        style={{
          backgroundColor:
            "#111827",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
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
            fontSize: 34,
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

      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "space-between",
          marginBottom: 20,
        }}
      >

        <View
          style={{
            flex: 1,
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 14,
            padding: 16,
            marginRight: 8,
          }}
        >

          <Text>Total</Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 10,
            }}
          >
            {
              totalDeliveries
            }
          </Text>

        </View>

        <View
          style={{
            flex: 1,
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 14,
            padding: 16,
            marginHorizontal: 4,
          }}
        >

          <Text>Delivered</Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 10,
            }}
          >
            {
              deliveredCount
            }
          </Text>

        </View>

        <View
          style={{
            flex: 1,
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 14,
            padding: 16,
            marginLeft: 8,
          }}
        >

          <Text>Active</Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 10,
            }}
          >
            {
              activeCount
            }
          </Text>

        </View>

      </View>

      {/* ================= LIST ================= */}

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
              backgroundColor:
                "#fff",
              borderWidth: 1,
              borderColor:
                "#ddd",
              borderRadius: 14,
              padding: 15,
              marginBottom: 12,
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
                marginTop: 6,
              }}
            >
              📍 {
                item.pickup_address
              }
            </Text>

            <Text
              style={{
                marginTop: 4,
              }}
            >
              🏁 {
                item.dropoff_address
              }
            </Text>

            <Text
              style={{
                marginTop: 4,
              }}
            >
              📞 {
                item.receiver_phone
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
                    : item.status ===
                      "awaiting_payment"
                    ? "#dc2626"
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

            {/* ================= VERIFY PAYMENT ================= */}

            {item.status ===
              "awaiting_payment" && (

              <TouchableOpacity
                disabled={
                  processingId ===
                  item.id
                }
                onPress={() =>
                  verifyPayment(
                    item.id
                  )
                }
                style={{
                  backgroundColor:
                    "#16a34a",
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
                  {processingId ===
                  item.id
                    ? "Processing..."
                    : "Verify Payment"}
                </Text>

              </TouchableOpacity>
            )}

          </View>
        )}
      />

    </View>
  );
}