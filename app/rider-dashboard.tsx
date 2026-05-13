import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

export default function RiderDashboard() {
const router = useRouter();
  const [deliveries, setDeliveries] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState("");

  const [otpModalVisible, setOtpModalVisible] =
    useState(false);

  const [selectedDelivery, setSelectedDelivery] =
    useState<any>(null);

  const [deliveryOtp, setDeliveryOtp] =
    useState("");
    const [isOnline, setIsOnline] =
  useState(false);

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
/* ================= LOAD RIDER STATUS ================= */

useEffect(() => {

  const loadRider = async () => {

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const user =
      authData?.user;

    if (!user) return;

    const {
      data,
    } =
      await (supabase as any)
        .from("riders")
        .select("is_online")
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (data) {
      setIsOnline(
        data.is_online || false
      );
    }
  };

  loadRider();

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
        .removeChannel(
          channel
        );
    };

  }, []);

  useEffect(() => {

  updateLiveLocation();

  const interval =
    setInterval(() => {

      updateLiveLocation();

    }, 10000);

  return () =>
    clearInterval(
      interval
    );

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

       

      /* ================= ONLINE CHECK ================= */
const {
  data: riderData,
  error: riderError,
} =
  await (supabase as any)
    .from("riders")
    .select("*")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

if (
  riderError ||
  !riderData
) {

  Alert.alert(
    "Rider Error",
    "Rider profile not found"
  );

  setProcessingId("");

  return;
}

/* ================= ONLINE CHECK ================= */

if (
  riderData.is_online !== true
) {

  Alert.alert(
    "Offline",
    "Go online first"
  );

  setProcessingId("");

  return;
}

/* ================= ACCEPT DELIVERY ================= */

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

      accepted_at:
        new Date().toISOString(),

      auto_assigned:
        true,
    })
    .eq(
      "id",
      deliveryId
    )
    .eq(
      "status",
      "pending"
    )
    .is(
      "rider_id",
      null
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

  /* ================= CANCEL DELIVERY ================= */

  async function cancelDelivery(
    deliveryId: string
  ) {

    try {

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .update({

            status:
              "pending",

            rider_id:
              null,

            cancelled_at:
              new Date().toISOString(),

            cancelled_reason:
              "Cancelled by rider",
          })
          .eq(
            "id",
            deliveryId
          );

      if (error) {

        Alert.alert(
          "Cancel Error",
          error.message
        );

        return;
      }

      Alert.alert(
        "Cancelled",
        "Delivery returned to queue"
      );

      loadDeliveries();

    } catch (err: any) {

      console.log(err);
    }
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

      const updateData: any = {

        status,
      };

      if (
        status ===
        "picked_up"
      ) {

        updateData.picked_up_at =
          new Date().toISOString();
      }

      if (
        status ===
        "in_transit"
      ) {

        updateData.in_transit_at =
          new Date().toISOString();
      }

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .update(
            updateData
          )
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
  

/* ================= OTP VERIFY ================= */

async function verifyDeliveryOtp() {

  if (!selectedDelivery)
    return;

  if (
    deliveryOtp !==
    selectedDelivery.otp_code
  ) {

    Alert.alert(
      "Invalid OTP",
      "Receiver OTP is incorrect"
    );

    return;
  }

  try {

    setProcessingId(
      selectedDelivery.id
    );

    /* ================= CALCULATE ================= */

    const riderEarning =
      Number(
        selectedDelivery.amount || 0
      ) * 0.8;

    const platformFee =
      Number(
        selectedDelivery.amount || 0
      ) * 0.2;

    /* ================= COMPLETE DELIVERY ================= */

    const {
      error: deliveryError,
    } =
      await (supabase as any)
        .from("deliveries")
        .update({

          status:
            "delivered",

          delivered_at:
            new Date().toISOString(),

          rider_earning:
            riderEarning,

          platform_fee:
            platformFee,
        })
        .eq(
          "id",
          selectedDelivery.id
        );

    if (deliveryError) {

      Alert.alert(
        "Delivery Error",
        deliveryError.message
      );

      return;
    }

    /* ================= CHECK EXISTING EARNING ================= */

    const {
      data: existingEarning,
    } =
      await (supabase as any)
        .from("rider_earnings")
        .select("id")
        .eq(
          "delivery_id",
          selectedDelivery.id
        )
        .maybeSingle();

    /* ================= SAVE EARNING ================= */

    if (!existingEarning) {

      const {
        error: earningError,
      } =
        await (supabase as any)
          .from("rider_earnings")
          .insert({

            rider_id:
              selectedDelivery.rider_id,

            delivery_id:
              selectedDelivery.id,

            amount:
              riderEarning,

            status:
              "pending",
          });

      if (earningError) {

        console.log(
          earningError
        );

        Alert.alert(
          "Earning Error",
          earningError.message
        );

        return;
      }
    }

    /* ================= LOAD RIDER ================= */

    const {
      data: riderData,
      error: riderError,
    } =
      await (supabase as any)
        .from("riders")
        .select(
          "total_deliveries,total_earnings"
        )
        .eq(
          "user_id",
          selectedDelivery.rider_id
        )
        .single();

    if (riderError) {

      console.log(
        riderError
      );

      Alert.alert(
        "Rider Error",
        riderError.message
      );

      return;
    }

    /* ================= UPDATE WALLET ================= */

    const {
      error: walletError,
    } =
      await (supabase as any)
        .from("riders")
        .update({

          total_deliveries:
            Number(
              riderData?.total_deliveries || 0
            ) + 1,

          total_earnings:
            Number(
              riderData?.total_earnings || 0
            ) + riderEarning,
        })
        .eq(
          "user_id",
          selectedDelivery.rider_id
        );

    if (walletError) {

      console.log(
        walletError
      );

      Alert.alert(
        "Wallet Error",
        walletError.message
      );

      return;
    }

    /* ================= SUCCESS ================= */

    Alert.alert(
      "Success",
      `Delivery completed.\n\nRider earned GH₵${riderEarning.toFixed(2)}`
    );

    setOtpModalVisible(
      false
    );

    setSelectedDelivery(
      null
    );

    setDeliveryOtp("");

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
  /* ================= LIVE LOCATION ================= */
  async function updateLiveLocation() {

  try {

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const user =
      authData?.user;

    if (!user)
      return;

    const {
      status,
    } =
      await Location.requestForegroundPermissionsAsync();

    if (
      status !== "granted"
    ) {
      return;
    }

    const location =
      await Location.getCurrentPositionAsync({
        accuracy:
          Location.Accuracy.High,
      });

    await (supabase as any)
      .from("riders")
      .upsert({

        user_id:
          user.id,

        latitude:
          location.coords.latitude,

        longitude:
          location.coords.longitude,

        last_location_update:
          new Date().toISOString(),
      });

  } catch (err) {

    console.log(err);
  }
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
/* ================= TOGGLE ONLINE ================= */

async function toggleOnline() {

  try {

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const user =
      authData?.user;

    if (!user) return;

    const newStatus =
      !isOnline;

    /* ================= UPDATE EXISTING RIDER ================= */

    const {
      error,
    } =
      await (supabase as any)
        .from("riders")
        .update({

          is_online:
            newStatus,
        })
        .eq(
          "user_id",
          user.id
        );

    if (error) {

      console.log(error);

      Alert.alert(
        "Status Error",
        error.message
      );

      return;
    }

    setIsOnline(
      newStatus
    );

    Alert.alert(
      "Success",
      newStatus
        ? "You are now online"
        : "You are now offline"
    );

  } catch (err) {

    console.log(err);
  }
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
      <TouchableOpacity
  onPress={toggleOnline}
  style={{
    backgroundColor:
      isOnline
        ? "#16a34a"
        : "#dc2626",

    padding: 14,

    borderRadius: 12,

    marginBottom: 20,
  }}
>
  <Text
    style={{
      color: "#fff",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 16,
    }}
  >
    {isOnline
      ? "🟢 ONLINE"
      : "🔴 OFFLINE"}
  </Text>
</TouchableOpacity>
<TouchableOpacity
  onPress={() =>
    router.push(
      "/rider-wallet"
    )
  }
  style={{
    backgroundColor:
      "#2563eb",

    padding: 14,

    borderRadius: 12,

    marginBottom: 15,
  }}
>
  <Text
    style={{
      color: "#fff",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 16,
    }}
  >
    💰 Open Wallet
  </Text>
</TouchableOpacity>

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
              💰 Rider Earns: GH₵{" "}
{(
  Number(item.amount || 0) * 0.8
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

            {/* ================= ACCEPTED ================= */}

            {item.status ===
              "accepted" && (

              <>
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

                <TouchableOpacity
                  onPress={() =>
                    cancelDelivery(
                      item.id
                    )
                  }
                  style={{
                    backgroundColor:
                      "#dc2626",
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 10,
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
                    Cancel Delivery
                  </Text>

                </TouchableOpacity>
              </>
            )}

            {/* ================= PICKED UP ================= */}

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

            {/* ================= TRANSIT ================= */}

            {item.status ===
              "in_transit" && (

              <TouchableOpacity
                onPress={() => {

                  setSelectedDelivery(
                    item
                  );

                  setOtpModalVisible(
                    true
                  );
                }}
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
                  Complete Delivery
                </Text>

              </TouchableOpacity>
            )}

          </View>
        )}
      />

      {/* ================= OTP MODAL ================= */}

      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
      >

        <View
          style={{
            flex: 1,
            backgroundColor:
              "#0007",
            justifyContent:
              "center",
            padding: 20,
          }}
        >

          <View
            style={{
              backgroundColor:
                "#fff",
              borderRadius: 16,
              padding: 20,
            }}
          >

            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 20,
              }}
            >
              Verify Delivery OTP
            </Text>

            <TextInput
              placeholder="Enter OTP"
              value={deliveryOtp}
              onChangeText={
                setDeliveryOtp
              }
              keyboardType="number-pad"
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 10,
                padding: 14,
              }}
            />

            <TouchableOpacity
              onPress={
                verifyDeliveryOtp
              }
              style={{
                backgroundColor:
                  "#16a34a",
                padding: 14,
                borderRadius: 10,
                marginTop: 20,
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
                Verify OTP
              </Text>

            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {

                setOtpModalVisible(
                  false
                );

                setDeliveryOtp("");
              }}
              style={{
                marginTop: 15,
              }}
            >

              <Text
                style={{
                  textAlign:
                    "center",
                  color: "#dc2626",
                  fontWeight:
                    "bold",
                }}
              >
                Cancel
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </View>
  );
}