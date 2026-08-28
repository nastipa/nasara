import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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

    const showMessage = (
  title: string,
  message?: string
) => {
  if (Platform.OS === "web") {
    window.alert(
      message
        ? `${title}\n\n${message}`
        : title
    );
  } else {
    Alert.alert(title, message);
  }
};
  /* ================= LOAD ================= */
  /* ================= LOAD APPROVED DELIVERIES ================= */

async function loadDeliveries() {
  try {
    const {
      data,
      error,
    } = await (supabase as any)
      .from("deliveries")
      .select("*")
      .eq("payment_status", "paid")
      .in("status", [
        "approved",
        "pending",
        "accepted",
        "picked_up",
        "in_transit",
        "delivered",
      ])
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log(
        "Rider delivery load error:",
        error
      );

      showMessage(
        "Delivery Error",
        error.message
      );

      return;
    }

    console.log(
      "Rider deliveries:",
      data
    );

    setDeliveries(
      data || []
    );
  } catch (err: any) {
    console.log(
      "Rider load error:",
      err
    );

    showMessage(
      "Error",
      err?.message ||
        "Unable to load deliveries."
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
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
  /* ================= RIDER LIVE LOCATION ================= */
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
  /* ================= NAVIGATE TO PICKUP ================= */
  async function navigateToPickup(
    delivery: any
  ) {
    const latitude =
  delivery?.pickup_lat;

const longitude =
  delivery?.pickup_lng;
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      Alert.alert(
        "Pickup Location Missing",
        "This delivery does not have GPS coordinates for the pickup point."
      );
      return;
    }
    try {
      const url =
        `https://www.google.com/maps/dir/?api=1` +
      `&destination=${latitude},${longitude}`+
        `&travelmode=driving`;
      const supported =
        await Linking.canOpenURL(
          url
        );
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Map Error",
          "Unable to open the map."
        );
      }
    } catch (error) {
      console.log(
        "Navigation Error:",
        error
      );
      showMessage(
        "Map Error",
        "Unable to open navigation."
      );
    }
  }
  /* ================= NAVIGATE TO DROPOFF ================= */
  async function navigateToDropoff(
    delivery: any
  ) {
    const latitude =
      delivery?.dropoff_lat;
    const longitude =
      delivery?.dropoff_lng;
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      showMessage(
        "Dropoff Location Missing",
        "This delivery does not have GPS coordinates for the dropoff point."
      );
      return;
    }
    try {
      const url =
        `https://www.google.com/maps/dir/?api=1` +
        `&destination=${latitude},${longitude}` +
        `&travelmode=driving`;
      const supported =
        await Linking.canOpenURL(
          url
        );
      if (supported) {
        await Linking.openURL(url);
      } else {
        showMessage(
          "Map Error",
          "Unable to open the map."
        );
      }
    } catch (error) {
      console.log(
        "Navigation Error:",
        error
      );
      showMessage(
        "Map Error",
        "Unable to open navigation."
      );
    }
  }
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
        showMessage(
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
        showMessage(
          "Rider Error",
          "Rider profile not found"
        );
        setProcessingId("");
        return;
      }
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
         .in(
  "status",
  [
    "approved",
    "pending",
  ]
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
        "Delivery accepted successfully."
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
      showMessage(
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
        showMessage(
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
    const enteredOtp =
      deliveryOtp.trim();
    const correctOtp =
      String(
        selectedDelivery.otp_code || ""
      ).trim();
    if (!enteredOtp) {
      showMessage(
        "OTP Required",
        "Enter the receiver OTP."
      );
      return;
    }
    if (
      enteredOtp !==
      correctOtp
    ) {
      showMessage(
        "Invalid OTP",
        "Receiver OTP is incorrect."
      );
      return;
    }
    try {
      setProcessingId(
        selectedDelivery.id
      );
      /* ================= CALCULATE EARNINGS ================= */
      const riderEarning =
        Number(
          selectedDelivery.amount || 0
        ) * 0.8;
      const platformFee =
        Number(
          selectedDelivery.amount || 0
        ) * 0.2;
      /* ================= MARK DELIVERED ================= */
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
          )
          .eq(
            "status",
            "in_transit"
          );
      if (deliveryError) {
        showMessage(
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
          showMessage(
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
        showMessage(
          "Rider Error",
          riderError.message
        );
        return;
      }
      /* ================= UPDATE RIDER WALLET ================= */
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
        showMessage(
          "Wallet Error",
          walletError.message
        );
        return;
      }
      /* ================= SUCCESS ================= */
      showMessage(
        "Delivery Completed",
        `OTP verified successfully.\n\nDelivery marked as DELIVERED.\n\nRider earned GH₵${riderEarning.toFixed(
          2
        )}.`
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
  /* ================= CALL REQUESTER ================= */

async function callRequester(delivery: any) {
  const phone =
    String(delivery?.pickup_phone || "").trim();

  if (!phone) {
    showMessage(
      "Phone Number Missing",
      "The requester did not provide a pickup/requester phone number."
    );
    return;
  }

  try {
    const phoneUrl = `tel:${phone}`;

    const supported =
      await Linking.canOpenURL(phoneUrl);

    if (supported) {
      await Linking.openURL(phoneUrl);
    } else {
      showMessage(
        "Call Error",
        "Unable to open the phone application."
      );
    }
  } catch (error) {
    console.log(
      "Call requester error:",
      error
    );

    showMessage(
      "Call Error",
      "Unable to call the requester."
    );
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
      {/* ONLINE */}
      <TouchableOpacity
        onPress={
          toggleOnline
        }
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
            textAlign:
              "center",
            fontWeight:
              "bold",
            fontSize: 16,
          }}
        >
          {isOnline
            ? "🟢 ONLINE"
            : "🔴 OFFLINE"}
        </Text>
      </TouchableOpacity>
      {/* WALLET */}
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
            textAlign:
              "center",
            fontWeight:
              "bold",
            fontSize: 16,
          }}
        >
          💰 Open Wallet
        </Text>
      </TouchableOpacity>
      <FlatList
        data={deliveries}
        keyExtractor={(i) =>
          i.id
        }
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
            {/* ITEM */}
            <Text
              style={{
                fontWeight:
                  "bold",
                fontSize: 17,
              }}
            >
              📦{" "}
              {item.item_name}
            </Text>
            {/* PICKUP ADDRESS */}
            <Text
              style={{
                marginTop: 8,
              }}
            >
              📍 Pickup:{" "}
              {
                item.pickup_address
              }
            </Text>
            {/* ================= REQUESTER PHONE ================= */}

<View
  style={{
    marginTop: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  }}
>
  <Text
    style={{
      fontWeight: "900",
      color: "#1e3a8a",
    }}
  >
    📞 Requester / Pickup Phone
  </Text>

  <Text
    style={{
      marginTop: 5,
      fontSize: 16,
      fontWeight: "800",
      color: "#111827",
    }}
  >
    {item.pickup_phone || "Not provided"}
  </Text>

  {item.pickup_phone && (
    <TouchableOpacity
      onPress={() =>
        callRequester(item)
      }
      style={{
        backgroundColor: "#16a34a",
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "900",
        }}
      >
        📞 Call Requester
      </Text>
    </TouchableOpacity>
  )}
</View>
            {/* PICKUP COORDINATES */}
            {item.pickup_lat !==
  null &&
  item.pickup_lat !==
    undefined &&
  item.pickup_lng !==
    null &&
  item.pickup_lng !==
    undefined && (
    <Text
      style={{
        marginTop: 4,
        color: "#16a34a",
        fontSize: 12,
      }}
    >
      ✓ GPS pickup location available
    </Text>
  )}
                <Text
                  style={{
                    marginTop: 4,
                    color:
                      "#16a34a",
                    fontSize: 12,
                  }}
                >
                  ✓ GPS pickup location available
                </Text>
            
            {/* DROPOFF */}
            <Text
              style={{
                marginTop: 5,
              }}
            >
              🏁 Dropoff:{" "}
              {
                item.dropoff_address
              }
            </Text>
            {/* RECEIVER */}
            <Text
              style={{
                marginTop: 5,
              }}
            >
              📞 Receiver:{" "}
              {
                item.receiver_phone
              }
            </Text>
            {/* EARNINGS */}
            <Text
              style={{
                marginTop: 5,
                fontWeight:
                  "bold",
              }}
            >
              💰 Rider Earns: GH₵{" "}
              {(
                Number(
                  item.amount || 0
                ) * 0.8
              ).toLocaleString()}
            </Text>
            {/* STATUS */}
            <View
              style={{
                marginTop: 10,
                backgroundColor:
                  getStatusColor(
                    item.status
                  ),
                alignSelf:
                  "flex-start",
                paddingHorizontal:
                  12,
                paddingVertical:
                  6,
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
                {item.status ===
                "delivered"
                  ? "DELIVERED ✓"
                  : item.status}
              </Text>
            </View>
            {/* ================= ACCEPT ================= */}
            {(
  item.status === "approved" ||
  item.status === "pending"
) && (
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
                {/* NAVIGATE TO PICKUP */}
                <TouchableOpacity
                  onPress={() =>
                    navigateToPickup(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      "#2563eb",
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
                    📍 Navigate to Pickup
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={
                    processingId ===
                    item.id
                  }
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
              <>
                <TouchableOpacity
                  onPress={() =>
                    navigateToDropoff(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      "#2563eb",
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
                    🏁 Navigate to Dropoff
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={
                    processingId ===
                    item.id
                  }
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
                    Start Transit
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {/* ================= TRANSIT ================= */}
            {item.status ===
              "in_transit" && (
              <>
                <TouchableOpacity
                  onPress={() =>
                    navigateToDropoff(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      "#2563eb",
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
                    🏁 Navigate to Dropoff
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={
                    processingId ===
                    item.id
                  }
                  onPress={() => {
                    setSelectedDelivery(
                      item
                    );
                    setDeliveryOtp(
                      ""
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
                    🔐 Enter Receiver OTP
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {/* ================= DELIVERED ================= */}
            {item.status ===
              "delivered" && (
              <View
                style={{
                  marginTop: 15,
                  backgroundColor:
                    "#f0fdf4",
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    "#bbf7d0",
                }}
              >
                <Text
                  style={{
                    color:
                      "#166534",
                    fontWeight:
                      "800",
                    textAlign:
                      "center",
                  }}
                >
                  ✓ DELIVERY COMPLETED
                </Text>
                <Text
                  style={{
                    color:
                      "#166534",
                    textAlign:
                      "center",
                    marginTop: 4,
                  }}
                >
                  Rider earning: GH₵{" "}
                  {Number(
                    item.rider_earning ||
                      Number(
                        item.amount ||
                          0
                      ) *
                        0.8
                  ).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}
      />
      {/* ================= OTP MODAL ================= */}
      <Modal
        visible={
          otpModalVisible
        }
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
                fontWeight:
                  "bold",
                marginBottom: 10,
              }}
            >
              Verify Delivery OTP
            </Text>
            <Text
              style={{
                color:
                  "#6b7280",
                marginBottom: 20,
              }}
            >
              Ask the receiver for
              the 4-digit OTP. Once
              verified, the delivery
              will be marked as
              DELIVERED and the
              rider's earning will be
              recorded.
            </Text>
            <TextInput
              placeholder="Enter OTP"
              value={
                deliveryOtp
              }
              onChangeText={
                setDeliveryOtp
              }
              keyboardType="number-pad"
              maxLength={4}
              style={{
                borderWidth: 1,
                borderColor:
                  "#ddd",
                borderRadius: 10,
                padding: 14,
                fontSize: 20,
                textAlign:
                  "center",
                letterSpacing: 8,
              }}
            />
            <TouchableOpacity
              disabled={
                processingId ===
                selectedDelivery?.id
              }
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
                {processingId ===
                selectedDelivery?.id
                  ? "Completing..."
                  : "Verify OTP & Complete"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={
                processingId ===
                selectedDelivery?.id
              }
              onPress={() => {
                setOtpModalVisible(
                  false
                );
                setDeliveryOtp(
                  ""
                );
              }}
              style={{
                marginTop: 15,
              }}
            >
              <Text
                style={{
                  textAlign:
                    "center",
                  color:
                    "#dc2626",
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