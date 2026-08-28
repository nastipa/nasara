import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
/* =====================================================
   SHOW MESSAGE
===================================================== */
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
/* =====================================================
   ADMIN LOGISTICS
===================================================== */
export default function LogisticsAdmin() {
  const [deliveries, setDeliveries] =
    useState<any[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [processingId, setProcessingId] =
    useState("");
  /* =====================================================
     LOAD DELIVERIES
  ===================================================== */
  async function loadDeliveries() {
    try {
      const {
        data,
        error,
      } = await (supabase as any)
        .from("deliveries")
        .select("*")
        .order("created_at", {
          ascending: false,
        });
      if (error) {
        console.log(
          "Load deliveries error:",
          error
        );
        showMessage(
          "Error",
          error.message
        );
        return;
      }
      setDeliveries(data || []);
    } catch (error: any) {
      console.log(error);
      showMessage(
        "Error",
        error?.message ||
          "Unable to load delivery requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  /* =====================================================
     INITIAL LOAD
  ===================================================== */
  useEffect(() => {
    loadDeliveries();
  }, []);
  /* =====================================================
     REALTIME
  ===================================================== */
  useEffect(() => {
    const channel =
      (supabase as any)
        .channel(
          "admin-logistics-deliveries"
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
      (supabase as any).removeChannel(
        channel
      );
    };
  }, []);
  /* =====================================================
     VERIFY PAYMENT
     
     This does NOT send the request to riders yet.
     Payment verified:
       payment_status = paid
       status = payment_verified
  ===================================================== */
  async function verifyPayment(
    deliveryId: string
  ) {
    try {
      setProcessingId(deliveryId);
      const {
        data,
        error,
      } = await (supabase as any)
        .from("deliveries")
        .update({
          payment_status: "paid",
          status: "payment_verified",
        })
        .eq("id", deliveryId)
        .select()
        .single();
      if (error) {
        console.log(
          "Payment verification error:",
          error
        );
        showMessage(
          "Payment Error",
          error.message
        );
        return;
      }
      if (!data) {
        showMessage(
          "Update Failed",
          "The delivery could not be updated."
        );
        return;
      }
      await loadDeliveries();
      showMessage(
        "Payment Verified",
        "Payment has been verified. The delivery is now waiting for admin approval."
      );
    } catch (error: any) {
      console.log(error);
      showMessage(
        "Error",
        error?.message ||
          "Unable to verify payment."
      );
    } finally {
      setProcessingId("");
    }
  }
  /* =====================================================
     APPROVE REQUEST FOR RIDER
     
     IMPORTANT:
     
     Only after payment has been verified does
     the admin get this button.
     status = approved
     The rider dashboard should only display
     deliveries where status = "approved".
  ===================================================== */
  async function approveForRider(
    deliveryId: string
  ) {
    try {
      setProcessingId(deliveryId);
      const {
        data,
        error,
      } = await (supabase as any)
        .from("deliveries")
        .update({
          status: "approved",
        })
        .eq("id", deliveryId)
        .eq(
          "payment_status",
          "paid"
        )
        .select()
        .single();
      if (error) {
        console.log(
          "Approval error:",
          error
        );
        showMessage(
          "Approval Error",
          error.message
        );
        return;
      }
      if (!data) {
        showMessage(
          "Approval Failed",
          "The request was not approved. Make sure payment has been verified."
        );
        return;
      }
      await loadDeliveries();
      showMessage(
        "Request Approved",
        "The request has been approved and is now available to riders."
      );
    } catch (error: any) {
      console.log(error);
      showMessage(
        "Error",
        error?.message ||
          "Unable to approve this request."
      );
    } finally {
      setProcessingId("");
    }
  }
  /* =====================================================
     REJECT REQUEST
     
     Optional admin control.
     
     A rejected request will NEVER appear on
     the rider dashboard because rider dashboard
     only reads approved requests.
  ===================================================== */
  async function rejectRequest(
    deliveryId: string
  ) {
    try {
      setProcessingId(deliveryId);
      const {
        error,
      } = await (supabase as any)
        .from("deliveries")
        .update({
          status: "rejected",
        })
        .eq("id", deliveryId);
      if (error) {
        showMessage(
          "Rejection Error",
          error.message
        );
        return;
      }
      await loadDeliveries();
      showMessage(
        "Request Rejected",
        "The delivery/rider request has been rejected."
      );
    } catch (error: any) {
      console.log(error);
      showMessage(
        "Error",
        error?.message ||
          "Unable to reject request."
      );
    } finally {
      setProcessingId("");
    }
  }
  /* =====================================================
     STATS
  ===================================================== */
  const totalDeliveries =
    deliveries.length;
  const deliveredCount =
    useMemo(() => {
      return deliveries.filter(
        (item) =>
          item.status ===
          "delivered"
      ).length;
    }, [deliveries]);
  const activeCount =
    useMemo(() => {
      return deliveries.filter(
        (item) =>
          item.status !==
          "delivered" &&
          item.status !==
          "rejected"
      ).length;
    }, [deliveries]);
  const waitingPaymentCount =
    useMemo(() => {
      return deliveries.filter(
        (item) =>
          item.payment_status !==
          "paid"
      ).length;
    }, [deliveries]);
  const waitingApprovalCount =
    useMemo(() => {
      return deliveries.filter(
        (item) =>
          item.payment_status ===
            "paid" &&
          item.status !==
            "approved" &&
          item.status !==
            "assigned" &&
          item.status !==
            "picked_up" &&
          item.status !==
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
  /* =====================================================
     STATUS DISPLAY
  ===================================================== */
  function getStatusLabel(
    item: any
  ) {
    if (
      item.status ===
      "pending" &&
      item.payment_status !==
        "paid"
    ) {
      return "AWAITING PAYMENT";
    }
    if (
      item.status ===
      "awaiting_payment"
    ) {
      return "AWAITING PAYMENT";
    }
    if (
      item.status ===
      "payment_verified"
    ) {
      return "PAYMENT VERIFIED";
    }
    if (
      item.status ===
      "approved"
    ) {
      return "APPROVED FOR RIDER";
    }
    if (
      item.status ===
      "assigned"
    ) {
      return "RIDER ASSIGNED";
    }
    if (
      item.status ===
      "picked_up"
    ) {
      return "PICKED UP";
    }
    if (
      item.status ===
      "delivered"
    ) {
      return "DELIVERED";
    }
    if (
      item.status ===
      "rejected"
    ) {
      return "REJECTED";
    }
    return String(
      item.status || ""
    ).toUpperCase();
  }
  function getStatusColor(
    item: any
  ) {
    if (
      item.status ===
      "delivered"
    ) {
      return "#16a34a";
    }
    if (
      item.status ===
      "approved"
    ) {
      return "#2563eb";
    }
    if (
      item.status ===
      "payment_verified"
    ) {
      return "#7c3aed";
    }
    if (
      item.status ===
      "rejected"
    ) {
      return "#dc2626";
    }
    if (
      item.payment_status !==
      "paid"
    ) {
      return "#f59e0b";
    }
    return "#6b7280";
  }
  /* =====================================================
     LOADING
  ===================================================== */
  if (loading) {
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
        <ActivityIndicator
          size="large"
        />
        <Text
          style={{
            marginTop: 10,
            color:
              "#6b7280",
          }}
        >
          Loading logistics...
        </Text>
      </View>
    );
  }
  /* =====================================================
     UI
  ===================================================== */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "#f5f7fb",
        padding: 15,
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "900",
          color:
            "#111827",
          marginBottom: 5,
        }}
      >
        🚚 Logistics Admin
      </Text>
      <Text
        style={{
          color:
            "#6b7280",
          marginBottom: 20,
        }}
      >
        Review payments and approve
        requests for riders.
      </Text>
      {/* =================================================
          REVENUE
      ================================================= */}
      <View
        style={{
          backgroundColor:
            "#111827",
          borderRadius: 18,
          padding: 20,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color:
              "#d1d5db",
            fontSize: 14,
          }}
        >
          Total Delivery Value
        </Text>
        <Text
          style={{
            color:
              "#fff",
            fontSize: 34,
            fontWeight:
              "900",
            marginTop: 6,
          }}
        >
          GH₵{" "}
          {totalRevenue.toLocaleString(
            undefined,
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}
        </Text>
      </View>
      {/* =================================================
          STATS
      ================================================= */}
      <View
        style={{
          flexDirection:
            "row",
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              "#fff",
            borderRadius: 14,
            padding: 14,
            marginRight: 5,
          }}
        >
          <Text>
            Total
          </Text>
          <Text
            style={{
              fontSize: 25,
              fontWeight:
                "900",
              marginTop: 5,
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
            borderRadius: 14,
            padding: 14,
            marginHorizontal: 5,
          }}
        >
          <Text>
            Payment
          </Text>
          <Text
            style={{
              fontSize: 25,
              fontWeight:
                "900",
              marginTop: 5,
            }}
          >
            {
              waitingPaymentCount
            }
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor:
              "#fff",
            borderRadius: 14,
            padding: 14,
            marginLeft: 5,
          }}
        >
          <Text>
            Approval
          </Text>
          <Text
            style={{
              fontSize: 25,
              fontWeight:
                "900",
              marginTop: 5,
            }}
          >
            {
              waitingApprovalCount
            }
          </Text>
        </View>
      </View>
      {/* =================================================
          DELIVERY LIST
      ================================================= */}
      <FlatList
        data={deliveries}
        keyExtractor={(
          item
        ) =>
          String(
            item.id
          )}
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
          <View
            style={{
              padding: 30,
              alignItems:
                "center",
            }}
          >
            <Text
              style={{
                fontSize:
                  18,
                fontWeight:
                  "800",
              }}
            >
              No requests yet
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => {
          const isProcessing =
            processingId ===
            item.id;
          const paymentPaid =
            item.payment_status ===
            "paid";
          const waitingForPayment =
            !paymentPaid;
          const paymentVerified =
            item.status ===
            "payment_verified";
          const alreadyApproved =
            item.status ===
            "approved";
          return (
            <View
              style={{
                backgroundColor:
                  "#fff",
                borderRadius:
                  18,
                padding: 17,
                marginBottom:
                  13,
                borderWidth:
                  1,
                borderColor:
                  "#e5e7eb",
              }}
            >
              {/* REQUEST TYPE */}
              <View
                style={{
                  flexDirection:
                    "row",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <Text
                  style={{
                    fontWeight:
                      "900",
                    fontSize:
                      18,
                  }}
                >
                  {item.request_type ===
                  "rider"
                    ? "🏍️ Rider Request"
                    : "🚚 Delivery Request"}
                </Text>
                <View
                  style={{
                    backgroundColor:
                      getStatusColor(
                        item
                      ),
                    paddingHorizontal:
                      10,
                    paddingVertical:
                      6,
                    borderRadius:
                      20,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#fff",
                      fontSize:
                        11,
                      fontWeight:
                        "900",
                    }}
                  >
                    {getStatusLabel(
                      item
                    )}
                  </Text>
                </View>
              </View>
              {/* ITEM */}
              {item.item_name && (
                <Text
                  style={{
                    marginTop:
                      12,
                    fontWeight:
                      "800",
                    fontSize:
                      16,
                  }}
                >
                  📦{" "}
                  {
                    item.item_name
                  }
                </Text>
              )}
              {/* PICKUP */}
              <Text
                style={{
                  marginTop:
                    10,
                }}
              >
                📍 Pickup:{" "}
                {
                  item.pickup_address ||
                  "GPS pickup location"
                }
              </Text>
              {/* PICKUP COORDINATES */}
              {item.pickup_lat !=
                null &&
                item.pickup_lng !=
                  null && (
                  <Text
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        12,
                      marginTop:
                        3,
                    }}
                  >
                    Pickup GPS:{" "}
                    {Number(
                      item.pickup_lat
                    ).toFixed(
                      6
                    )}
                    ,{" "}
                    {Number(
                      item.pickup_lng
                    ).toFixed(
                      6
                    )}
                  </Text>
                )}
              {/* DROP-OFF */}
              <Text
                style={{
                  marginTop:
                    7,
                }}
              >
                🏁 Drop-off:{" "}
                {item.dropoff_place_name ||
                  item.dropoff_address ||
                  "Destination"}
              </Text>
              {item.dropoff_address &&
                item.dropoff_place_name && (
                  <Text
                    style={{
                      color:
                        "#6b7280",
                      marginTop:
                        3,
                    }}
                  >
                    {
                      item.dropoff_address
                    }
                  </Text>
                )}
              {/* DROP-OFF GPS */}
              {item.dropoff_lat !=
                null &&
                item.dropoff_lng !=
                  null && (
                  <Text
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        12,
                      marginTop:
                        3,
                    }}
                  >
                    Destination GPS:{" "}
                    {Number(
                      item.dropoff_lat
                    ).toFixed(
                      6
                    )}
                    ,{" "}
                    {Number(
                      item.dropoff_lng
                    ).toFixed(
                      6
                    )}
                  </Text>
                )}
              {/* PHONE */}
              {item.receiver_phone && (
                <Text
                  style={{
                    marginTop:
                      8,
                  }}
                >
                  📞 Receiver:{" "}
                  {
                    item.receiver_phone
                  }
                </Text>
              )}
              {/* DISTANCE */}
              {item.distance_km !=
                null && (
                <Text
                  style={{
                    marginTop:
                      8,
                    fontWeight:
                      "800",
                  }}
                >
                  📏 Distance:{" "}
                  {Number(
                    item.distance_km
                  ).toFixed(
                    2
                  )}{" "}
                  km
                </Text>
              )}
              {/* PRICE */}
              <View
                style={{
                  marginTop:
                    12,
                  backgroundColor:
                    "#f0fdf4",
                  borderRadius:
                    12,
                  padding:
                    12,
                }}
              >
                <Text
                  style={{
                    color:
                      "#166534",
                    fontSize:
                      13,
                  }}
                >
                  DELIVERY / RIDER FEE
                </Text>
                <Text
                  style={{
                    color:
                      "#15803d",
                    fontSize:
                      24,
                    fontWeight:
                      "900",
                    marginTop:
                      3,
                  }}
                >
                  GH₵{" "}
                  {Number(
                    item.amount ||
                      0
                  ).toFixed(
                    2
                  )}
                </Text>
              </View>
              {/* PAYMENT STATUS */}
              <View
                style={{
                  marginTop:
                    12,
                  padding:
                    12,
                  borderRadius:
                    12,
                  backgroundColor:
                    paymentPaid
                      ? "#dcfce7"
                      : "#fff7ed",
                }}
              >
                <Text
                  style={{
                    fontWeight:
                      "900",
                    color:
                      paymentPaid
                        ? "#166534"
                        : "#9a3412",
                  }}
                >
                  {paymentPaid
                    ? "✓ PAYMENT RECEIVED"
                    : "⏳ PAYMENT NOT VERIFIED"}
                </Text>
              </View>
              {/* =================================================
                  VERIFY PAYMENT
              ================================================= */}
              {waitingForPayment &&
                item.status !==
                  "rejected" &&
                item.status !==
                  "delivered" && (
                  <TouchableOpacity
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      verifyPayment(
                        item.id
                      )
                    }
                    style={{
                      backgroundColor:
                        "#16a34a",
                      padding:
                        15,
                      borderRadius:
                        12,
                      marginTop:
                        14,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "#fff",
                        textAlign:
                          "center",
                        fontWeight:
                          "900",
                      }}
                    >
                      {isProcessing
                        ? "Processing..."
                        : "✓ Verify Payment"}
                    </Text>
                  </TouchableOpacity>
                )}
              {/* =================================================
                  APPROVE FOR RIDER
                  
                  ONLY appears after payment is paid.
              ================================================= */}
              {paymentVerified &&
                !alreadyApproved && (
                  <TouchableOpacity
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      approveForRider(
                        item.id
                      )
                    }
                    style={{
                      backgroundColor:
                        "#2563eb",
                      padding:
                        16,
                      borderRadius:
                        12,
                      marginTop:
                        12,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "#fff",
                        textAlign:
                          "center",
                        fontWeight:
                          "900",
                        fontSize:
                          16,
                      }}
                    >
                      {isProcessing
                        ? "Approving..."
                        : "🚀 Approve for Rider"}
                    </Text>
                  </TouchableOpacity>
                )}
              {/* =================================================
                  APPROVED
              ================================================= */}
              {alreadyApproved && (
                <View
                  style={{
                    backgroundColor:
                      "#dbeafe",
                    padding:
                      14,
                    borderRadius:
                      12,
                    marginTop:
                      12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#1d4ed8",
                      fontWeight:
                        "900",
                      textAlign:
                        "center",
                    }}
                  >
                    ✓ APPROVED
                  </Text>
                  <Text
                    style={{
                      color:
                        "#1e40af",
                      textAlign:
                        "center",
                      marginTop:
                        4,
                    }}
                  >
                    This request is now
                    available to riders.
                  </Text>
                </View>
              )}
              {/* =================================================
                  REJECT
              ================================================= */}
              {item.status !==
                "approved" &&
                item.status !==
                  "delivered" &&
                item.status !==
                  "rejected" && (
                  <TouchableOpacity
                    disabled={
                      isProcessing
                    }
                    onPress={() =>
                      rejectRequest(
                        item.id
                      )
                    }
                    style={{
                      backgroundColor:
                        "#fee2e2",
                      padding:
                        14,
                      borderRadius:
                        12,
                      marginTop:
                        10,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "#dc2626",
                        textAlign:
                          "center",
                        fontWeight:
                          "900",
                      }}
                    >
                      ✕ Reject Request
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          );
        }}
      />
    </View>
  );
}