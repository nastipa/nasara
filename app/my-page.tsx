import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useMemo, useRef, useState } from "react";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";

import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { recordItemView } from "../lib/itemViewTracking";
import { supabase } from "../lib/supabase";

const API_BASE = "https://nasara-upload-server.onrender.com";
const dailyRate = 30;
const PAGE_SIZE = 1000;

const COLORS = {
  navy: "#101C35",
  gold: "#D6A52C",
  background: "#F4F6FA",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#718096",
  border: "#E5E7EB",
  green: "#16A34A",
  red: "#DC2626",
  blue: "#2563EB",
};

/* =====================================================
   FETCH ALL ROWS IN PAGES
===================================================== */

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{
    data: T[] | null;
    error: any;
  }>
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error(error.message || "Unable to fetch records.");
    }

    const page = data || [];
    allRows.push(...page);

    if (page.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allRows;
}

/* =====================================================
   ALERT
===================================================== */

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* =====================================================
   FORMAT NUMBER
===================================================== */

const formatNumber = (value: number) =>
  Number(value || 0).toLocaleString();

const formatMoney = (value: number) =>
  "GH₵ " +
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* =====================================================
   SEPARATE PAYMENT AND ORDER FULFILMENT STATUSES
===================================================== */

const getPaymentStatus = (order: any) =>
  String(order.payment_status || "pending").toLowerCase();

const getFulfilmentStatus = (order: any) =>
  String(order.order_status || "pending").toLowerCase();

/* =====================================================
   VIDEO PREVIEW
===================================================== */

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });

  if (Platform.OS === "web") {
    return (
      <video
        src={uri}
        autoPlay
        muted
        loop
        playsInline
        controls
        style={{
          width: 180,
          height: 180,
          alignSelf: "center",
          borderRadius: 12,
          backgroundColor: "black",
          marginTop: 12,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <VideoView
      player={player}
      style={{
        width: 180,
        height: 180,
        alignSelf: "center",
        borderRadius: 12,
        backgroundColor: "black",
        marginTop: 12,
      }}
      contentFit="cover"
      nativeControls
    />
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "46%",
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: color + "18",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 19 }}>{icon}</Text>
      </View>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 12,
          marginTop: 12,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 25,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {formatNumber(value)}
      </Text>
    </View>
  );
}

/* =====================================================
   PRODUCT CARD
===================================================== */

function MyItemCard({
  item,
  onDelete,
  onPromote,
  onDiscount,
}: {
  item: any;
  onDelete: (item: any) => void;
  onPromote: (id: number) => void;
  onDiscount: (item: any) => void;
}) {
  const router = useRouter();
  const postId = Number(item.original_id || item.id);

  const promoted =
    item.is_promoted === true ||
    item.is_boosted === true ||
    item.is_featured === true;

    const originalPrice = Number(item.price || 0);
const discountPrice = Number(item.discount_price || 0);

const hasValidDiscount =
  item.discount_enabled === true &&
  discountPrice > 0 &&
  discountPrice < originalPrice;

const savings = hasValidDiscount
  ? Math.round(
      ((originalPrice - discountPrice) / originalPrice) * 100
    )
  : 0;
  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 15,
        overflow: "hidden",
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/itemdetail/" + postId)}
      >
        {item.video_url ? (
          <VideoPreview uri={item.video_url} />
        ) : item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{
              width: 200,
              height: 200,
              alignSelf: "center",
              borderRadius: 15,
              backgroundColor: "#EEEEEE",
              marginTop: 15,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 200,
              height: 200,
              alignSelf: "center",
              borderRadius: 15,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#EEEEEE",
              marginTop: 15,
            }}
          >
            <Text style={{ color: COLORS.muted }}>No Media</Text>
          </View>
        )}

        {item.image_index !== null &&
          item.image_index !== undefined && (
            <Text
              style={{
                position: "absolute",
                top: 23,
                right: 15,
                backgroundColor: "#000000CC",
                color: "white",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 7,
                fontSize: 11,
                fontWeight: "bold",
              }}
            >
              Image {item.image_index + 1}
            </Text>
          )}

        {promoted && (
          <Text
            style={{
              position: "absolute",
              top: 23,
              left: 15,
              backgroundColor: COLORS.gold,
              color: "#172033",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 7,
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            ⭐ PROMOTED
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ padding: 15 }}>
        <Text
          numberOfLines={1}
          style={{
            fontWeight: "800",
            fontSize: 16,
            color: COLORS.text,
          }}
        >
          {item.title}
        </Text>
{hasValidDiscount ? (
  <View style={{ marginTop: 7 }}>
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <Text
        style={{
          color: COLORS.green,
          fontSize: 19,
          fontWeight: "900",
        }}
      >
        {formatMoney(discountPrice)}
      </Text>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 13,
          textDecorationLine: "line-through",
        }}
      >
        {formatMoney(originalPrice)}
      </Text>
    </View>

    <Text
      style={{
        color: COLORS.green,
        fontSize: 11,
        fontWeight: "900",
        marginTop: 4,
      }}
    >
      SAVE {savings}% ON THIS PRODUCT
    </Text>
  </View>
) : (
  <Text
    style={{
      fontWeight: "900",
      marginTop: 5,
      fontSize: 17,
      color: COLORS.navy,
    }}
  >
    {formatMoney(originalPrice)}
  </Text>
)}

        {item.location ? (
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 12,
              marginTop: 5,
            }}
          >
            📍 {item.location}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: COLORS.muted }}>
            👁️ {formatNumber(Number(item.views_count || 0))}
          </Text>

          <Text style={{ fontSize: 12, color: COLORS.muted }}>
            💬 {formatNumber(Number(item.chats_count || 0))}
          </Text>

          <Text style={{ fontSize: 12, color: COLORS.muted }}>
            ❤️ {formatNumber(Number(item.favorites_count || 0))}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 15,
          }}
        >
          <View style={{ flex: 1, minWidth: 75 }}>
            <Button
              title="Edit"
              onPress={() =>
                router.push({
                  pathname: "/itemedit/[id]",
                  params: {
                    id: String(postId),
                    image: String(item.image_index ?? 0),
                  },
                })
              }
            />
          </View>
          <View style={{ flex: 1, minWidth: 100 }}>
  <Button
    title={
      hasValidDiscount ? "Edit Discount" : "Add Discount"
    }
    color={COLORS.green}
    onPress={() => onDiscount(item)}
  />
</View>

          <View style={{ flex: 1, minWidth: 75 }}>
            <Button
              title="Delete"
              color="red"
              onPress={() => onDelete(item)}
            />
          </View>

          {!promoted && (
            <View style={{ flex: 1, minWidth: 75 }}>
              <Button
                title="Promote"
                color="#D69E2E"
                onPress={() => onPromote(postId)}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* =====================================================
   MAIN BUSINESS DASHBOARD
===================================================== */

export default function My() {
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [days, setDays] = useState("3");
  const [payVisible, setPayVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] =
    useState<number | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [buyerOrders, setBuyerOrders] = useState<any[]>([]);
  const [buyerOrdersLoading, setBuyerOrdersLoading] = useState(false);
  const [buyerPaymentReference, setBuyerPaymentReference] = useState("");
  
  // MY PURCHASES AND MY ORDERS POP-UP WINDOWS
const [purchasesModalVisible, setPurchasesModalVisible] = useState(false);
const [sellerOrdersModalVisible, setSellerOrdersModalVisible] = useState(false);

// PRODUCT DISCOUNT MANAGEMENT
const [discountModalVisible, setDiscountModalVisible] = useState(false);
const [discountItem, setDiscountItem] = useState<any>(null);
const [discountPriceInput, setDiscountPriceInput] = useState("");
const [discountSaving, setDiscountSaving] = useState(false);
  /* ===================================================
     MARKETPLACE ORDER STATE
  =================================================== */

  const [marketplaceOrders, setMarketplaceOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] =
    useState<string | null>(null);

  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderModalType, setOrderModalType] = useState<
    "reject" | "commission" | "buyer-payment" | null
  >(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const dashboardScrollRef = useRef<ScrollView | null>(null);

  /* ===================================================
     SELLER QR CODE
  =================================================== */

  const [sellerId, setSellerId] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [qrSharing, setQrSharing] = useState(false);
  const qrRef = useRef<View>(null);

  /* ===================================================
     NASARA MOMO ACCOUNT
  =================================================== */

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  /* ===================================================
     FETCH SELLER PRODUCTS AND METRICS
  =================================================== */

  const fetchMyItems = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setItems([]);
        setListingCount(0);
        setSellerId("");
        setShopUrl("");

        showAlert(
          "Login Required",
          "Please log in to view your dashboard."
        );

        return;
      }

      setSellerId(user.id);

      const uniqueShopUrl =
        "https://nasara1.vercel.app/sellers/" + user.id;

      setShopUrl(uniqueShopUrl);

      const {
        count: exactListingCount,
        error: countError,
      } = await supabase
        .from("items_live")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (countError) {
        throw new Error(
          "Unable to count listings: " + countError.message
        );
      }

      const sellerItems = await fetchAllPages<any>(
        async (from, to) =>
          await supabase
            .from("items_live")
            .select("*")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to)
      );

      setListingCount(exactListingCount || 0);

      if (sellerItems.length === 0) {
        setItems([]);
        return;
      }

      const enrichedItems = await Promise.all(
        sellerItems.map(async (item) => {
          const itemId = Number(item.id);
          let actualViews = 0;

          try {
            const viewCount = await recordItemView(itemId);

            if (
              viewCount !== null &&
              Number.isFinite(Number(viewCount))
            ) {
              actualViews = Number(viewCount);
            } else {
              console.warn(
                "VIEW COUNT COULD NOT BE FETCHED:",
                itemId
              );
            }
          } catch (viewError) {
            console.error(
              "ITEM VIEW COUNT ERROR:",
              itemId,
              viewError
            );
          }

          let actualFavourites = 0;

          const {
            data: favouriteCount,
            error: favouriteError,
          } = await (supabase as any).rpc(
            "get_item_favorite_count",
            {
              p_item_id: Number(item.id),
            }
          );

          if (favouriteError) {
            console.error(
              "FAVOURITE COUNT ERROR:",
              item.id,
              favouriteError.message
            );
          } else {
            actualFavourites = Number(favouriteCount || 0);
          }

          return {
            ...item,
            views_count: actualViews,
            favorites_count: actualFavourites,
            chats_count: Number(item.chats_count || 0),
          };
        })
      );

      setItems(enrichedItems);
    } catch (error: any) {
      console.error("BUSINESS DASHBOARD ERROR:", error);

      showAlert(
        "Loading Error",
        error?.message || "Unable to load your business dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ===================================================
     FETCH SELLER MARKETPLACE ORDERS
     Also fetch buyer profile details only after the
     seller has confirmed the buyer's payment.
  =================================================== */

  const fetchMarketplaceOrders = useCallback(async () => {
    setOrdersLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMarketplaceOrders([]);
        return;
      }

      const { data: orders, error: ordersError } =
        await (supabase as any)
          .from("nasara_marketplace_orders")
          .select("*")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      if (!orders || orders.length === 0) {
        setMarketplaceOrders([]);
        return;
      }

      const orderIds = orders.map((order: any) => order.id);

      const [
        { data: orderItems, error: itemsError },
        { data: commissions, error: commissionsError },
      ] = await Promise.all([
        (supabase as any)
          .from("nasara_marketplace_order_items")
          .select("*")
          .in("order_id", orderIds),

        (supabase as any)
          .from("nasara_marketplace_commissions")
          .select("*")
          .in("order_id", orderIds),
      ]);

      if (itemsError) throw new Error(itemsError.message);
      if (commissionsError) throw new Error(commissionsError.message);

      const confirmedBuyerIds = Array.from(
        new Set(
          orders
            .filter(
              (order: any) =>
                getPaymentStatus(order) === "seller_confirmed"
            )
            .map((order: any) => order.buyer_id)
            .filter(Boolean)
        )
      );

      let buyerProfiles: any[] = [];

      if (confirmedBuyerIds.length > 0) {
        const { data: profiles, error: profilesError } =
          await (supabase as any)
            .from("profiles")
            .select("id,full_name,username")
            .in("id", confirmedBuyerIds);

        if (profilesError) {
          console.warn(
            "BUYER PROFILE LOOKUP:",
            profilesError.message
          );
        } else {
          buyerProfiles = profiles || [];
        }
      }

      const combinedOrders = orders.map((order: any) => {
        const paymentConfirmed =
          getPaymentStatus(order) === "seller_confirmed";

        return {
          ...order,
          items: (orderItems || []).filter(
            (item: any) => item.order_id === order.id
          ),
          commission:
            (commissions || []).find(
              (commission: any) =>
                commission.order_id === order.id
            ) || null,
          buyer_profile: paymentConfirmed
            ? buyerProfiles.find(
                (profile: any) => profile.id === order.buyer_id
              ) || null
            : null,
        };
      });

      setMarketplaceOrders(combinedOrders);
    } catch (error: any) {
      console.error("MARKETPLACE ORDERS ERROR:", error);

      showAlert(
        "Marketplace Orders",
        error?.message || "Unable to load marketplace orders."
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  /* ===================================================
     FETCH BUYER MARKETPLACE ORDERS
  =================================================== */

  const fetchBuyerOrders = useCallback(async () => {
    setBuyerOrdersLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setBuyerOrders([]);
        return;
      }

      const { data: orders, error: ordersError } =
        await (supabase as any)
          .from("nasara_marketplace_orders")
          .select("*")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      if (!orders || orders.length === 0) {
        setBuyerOrders([]);
        return;
      }

      const orderIds = orders.map((order: any) => order.id);

      const { data: orderItems, error: itemsError } =
        await (supabase as any)
          .from("nasara_marketplace_order_items")
          .select("*")
          .in("order_id", orderIds);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      const combinedOrders = orders.map((order: any) => ({
        ...order,
        items: (orderItems || []).filter(
          (item: any) => item.order_id === order.id
        ),
      }));

      setBuyerOrders(combinedOrders);
    } catch (error: any) {
      console.error("BUYER MARKETPLACE ORDERS ERROR:", error);

      showAlert(
        "My Purchases",
        error?.message || "Unable to load your purchases."
      );
    } finally {
      setBuyerOrdersLoading(false);
    }
  }, []);

  /* ===================================================
     REFRESH DASHBOARD WHEN SCREEN OPENS
  =================================================== */

  useFocusEffect(
    useCallback(() => {
      fetchMyItems();
      fetchMarketplaceOrders();
      fetchBuyerOrders();
    }, [
      fetchMyItems,
      fetchMarketplaceOrders,
      fetchBuyerOrders,
    ])
  );

  /* ===================================================
     MARKETPLACE API REQUEST HELPER
  =================================================== */

  const marketplaceRequest = async (
    path: string,
    body: Record<string, any>
  ) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const response = await fetch(API_BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message ||
          result.error ||
          "The marketplace request could not be completed."
      );
    }

    return result;
  };

  /* ===================================================
     BUYER OPENS PAYMENT DECLARATION MODAL
  =================================================== */

  const openBuyerPaymentModal = (order: any) => {
    setSelectedOrder(order);
    setBuyerPaymentReference("");
    setOrderModalType("buyer-payment");
    setOrderModalVisible(true);
  };

  /* ===================================================
     BUYER DECLARES PAYMENT
  =================================================== */

  const declareBuyerPayment = async () => {
    if (!selectedOrder || orderActionLoading) return;

    const reference = buyerPaymentReference.trim();

    if (reference.length < 4) {
      showAlert(
        "Transaction Reference Required",
        "Enter the MoMo transaction reference before submitting."
      );
      return;
    }

    const orderId = String(selectedOrder.id);
    setOrderActionLoading(orderId);

    try {
      await marketplaceRequest(
        `/marketplace/orders/${encodeURIComponent(orderId)}/payment-declared`,
        {
          transaction_reference: reference,
        }
      );

      setOrderModalVisible(false);
      setSelectedOrder(null);
      setBuyerPaymentReference("");

      showAlert(
        "Payment Declaration Submitted",
        "The seller and Nasara Admin have been notified. The seller must verify receipt of your payment."
      );

      await fetchBuyerOrders();
      await fetchMarketplaceOrders();
    } catch (error: any) {
      showAlert(
        "Payment Declaration Failed",
        error?.message ||
          "Unable to submit your payment declaration."
      );
    } finally {
      setOrderActionLoading(null);
    }
  };

  /* ===================================================
     SELLER CONFIRMS BUYER PAYMENT
  =================================================== */

  const confirmBuyerPayment = async (order: any) => {
    const orderId = String(order.id);

    if (orderActionLoading) return;

    const confirmMessage =
      "Only confirm after checking your Mobile Money account and verifying that the buyer's payment has actually arrived.\n\nHave you received the payment?";

    if (Platform.OS === "web") {
      if (!window.confirm(confirmMessage)) return;
    } else {
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Confirm Buyer Payment",
          confirmMessage,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Yes, Payment Received",
              onPress: () => resolve(true),
            },
          ]
        );
      });

      if (!shouldContinue) return;
    }

    setOrderActionLoading(orderId);

    try {
      await marketplaceRequest(
        `/marketplace/orders/${encodeURIComponent(orderId)}/payment-decision`,
        {
          decision: "confirmed",
        }
      );

      showAlert(
        "Payment Confirmed",
        "You have confirmed the buyer's payment. The buyer's details and your 5% Nasara commission are now available."
      );

      await fetchMarketplaceOrders();
      await fetchBuyerOrders();
    } catch (error: any) {
      showAlert(
        "Confirmation Failed",
        error?.message || "Unable to confirm this payment."
      );
    } finally {
      setOrderActionLoading(null);
    }
  };

  /* ===================================================
     OPEN REJECTION MODAL
  =================================================== */

  const openRejectModal = (order: any) => {
    setSelectedOrder(order);
    setRejectionReason("");
    setOrderModalType("reject");
    setOrderModalVisible(true);
  };

  /* ===================================================
     SELLER REJECTS BUYER PAYMENT
  =================================================== */

  const rejectBuyerPayment = async () => {
    if (!selectedOrder || orderActionLoading) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      showAlert(
        "Reason Required",
        "Please explain why you are rejecting this payment declaration."
      );
      return;
    }

    const orderId = String(selectedOrder.id);
    setOrderActionLoading(orderId);

    try {
      await marketplaceRequest(
        `/marketplace/orders/${encodeURIComponent(orderId)}/payment-decision`,
        {
          decision: "rejected",
          rejection_reason: reason,
        }
      );

      setOrderModalVisible(false);
      setSelectedOrder(null);
      setRejectionReason("");

      showAlert(
        "Payment Rejected",
        "The buyer's payment declaration has been rejected. The buyer will be notified."
      );

      await fetchMarketplaceOrders();
      await fetchBuyerOrders();
    } catch (error: any) {
      showAlert(
        "Rejection Failed",
        error?.message || "Unable to reject this payment."
      );
    } finally {
      setOrderActionLoading(null);
    }
  };

  /* ===================================================
     OPEN COMMISSION PAYMENT MODAL
  =================================================== */

  const openCommissionModal = (order: any) => {
    setSelectedOrder(order);
    setTransactionReference("");
    setOrderModalType("commission");
    setOrderModalVisible(true);
  };

  /* ===================================================
     SELLER SUBMITS COMMISSION PAYMENT REFERENCE
  =================================================== */

  const submitCommissionPayment = async () => {
    if (!selectedOrder || orderActionLoading) return;

    const commission = selectedOrder.commission;

    if (!commission?.id) {
      showAlert(
        "Commission Not Found",
        "The commission record for this order could not be found."
      );
      return;
    }

    const reference = transactionReference.trim();

    if (reference.length < 4) {
      showAlert(
        "Transaction Reference Required",
        "Enter the MoMo transaction reference for your commission payment."
      );
      return;
    }

    const commissionId = String(commission.id);
    setOrderActionLoading(commissionId);

    try {
      await marketplaceRequest(
        `/marketplace/commissions/${encodeURIComponent(commissionId)}/payment-submit`,
        {
          transaction_reference: reference,
        }
      );

      setOrderModalVisible(false);
      setSelectedOrder(null);
      setTransactionReference("");

      showAlert(
        "Commission Submitted",
        "Your commission payment reference has been submitted to Nasara Admin for verification."
      );

      await fetchMarketplaceOrders();
    } catch (error: any) {
      showAlert(
        "Submission Failed",
        error?.message || "Unable to submit your commission payment."
      );
    } finally {
      setOrderActionLoading(null);
    }
  };

  /* ===================================================
     SELLER UPDATES ORDER FULFILMENT STATUS
  =================================================== */

  const updateSellerOrderStatus = async (
    order: any,
    nextStatus: "ready_for_dispatch" | "dispatched"
  ) => {
    const orderId = String(order.id);

    if (orderActionLoading) return;

    const message =
      nextStatus === "ready_for_dispatch"
        ? "Confirm that you have prepared this order and it is ready to be dispatched."
        : "Confirm that this order has actually been handed to the delivery rider or dispatched to the buyer.";

    if (Platform.OS === "web") {
      if (!window.confirm(message)) return;
    } else {
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Alert.alert("Update Order", message, [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Continue",
            onPress: () => resolve(true),
          },
        ]);
      });

      if (!shouldContinue) return;
    }

    setOrderActionLoading(orderId);

    try {
      await marketplaceRequest(
        `/marketplace/orders/${encodeURIComponent(orderId)}/status`,
        {
          status: nextStatus,
        }
      );

      showAlert(
        "Order Updated",
        nextStatus === "ready_for_dispatch"
          ? "The order is now marked as ready for dispatch."
          : "The order has been marked as dispatched. The buyer can now confirm receipt."
      );

      await fetchMarketplaceOrders();
      await fetchBuyerOrders();
    } catch (error: any) {
      showAlert(
        "Order Update Failed",
        error?.message || "Unable to update this order."
      );
    } finally {
      setOrderActionLoading(null);
    }
  };

  /* ===================================================
     BUYER CONFIRMS RECEIPT
  =================================================== */

  const confirmOrderReceived = async (order: any) => {
    const orderId = String(order.id);

    if (orderActionLoading) return;

    const message =
      "Confirm that you have received the products and that the order has been delivered to you.";

    if (Platform.OS === "web") {
      if (!window.confirm(message)) return;
    } else {
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Alert.alert("Confirm Receipt", message, [
          {
            text: "Not Yet",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Yes, I Received It",
            onPress: () => resolve(true),
          },
        ]);
      });

      if (!shouldContinue) return;
    }

    setOrderActionLoading(orderId);

    try {
      await marketplaceRequest(
        `/marketplace/orders/${encodeURIComponent(orderId)}/confirm-received`,
        {}
      );

      showAlert(
        "Receipt Confirmed",
        "Thank you. Your order has been marked as completed."
      );

      await fetchBuyerOrders();
      await fetchMarketplaceOrders();
    } catch (error: any) {
      showAlert(
        "Confirmation Failed",
        error?.message || "Unable to confirm receipt."
      );
    } finally {
      setOrderActionLoading(null);
    }
  };

  /* ===================================================
     SHARE / SAVE QR CODE
  =================================================== */

  const shareShopQr = async () => {
    if (!shopUrl || qrSharing) return;

    setQrSharing(true);

    try {
      if (Platform.OS === "web") {
        await Share.share({
          title: "My Nasara Shop",
          message: shopUrl,
          url: shopUrl,
        });
        return;
      }

      if (!qrRef.current) {
        throw new Error("QR code is not ready yet.");
      }

      const imageUri = await captureRef(qrRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        await Share.share({
          message: shopUrl,
          title: "My Nasara Shop",
        });
        return;
      }

      await Sharing.shareAsync(imageUri, {
        mimeType: "image/png",
        dialogTitle: "Share my Nasara Shop QR Code",
        UTI: "public.png",
      });
    } catch (error: any) {
      showAlert(
        "QR Code Error",
        error?.message || "Unable to share your QR code."
      );
    } finally {
      setQrSharing(false);
    }
  };

  /* ===================================================
     DASHBOARD STATISTICS
  =================================================== */

  const stats = useMemo(() => {
    const totalViews = items.reduce(
      (sum, item) => sum + Number(item.views_count || 0),
      0
    );

    const totalEnquiries = items.reduce(
      (sum, item) => sum + Number(item.chats_count || 0),
      0
    );

    const totalFavourites = items.reduce(
      (sum, item) => sum + Number(item.favorites_count || 0),
      0
    );

    return {
      views: totalViews,
      enquiries: totalEnquiries,
      listings: listingCount,
      favourites: totalFavourites,
    };
  }, [items, listingCount]);

  /* ===================================================
     SEPARATE PRODUCT IMAGES FOR DISPLAY
  =================================================== */

  const displayItems = useMemo(() => {
    return items.flatMap((item: any) => {
      const images =
        Array.isArray(item.image_urls) && item.image_urls.length > 0
          ? item.image_urls
          : item.image_url
          ? [item.image_url]
          : [];

      if (item.video_url) {
        return [
          {
            ...item,
            original_id: item.id,
            image_index: null,
            card_id: String(item.id) + "-video",
          },
        ];
      }

      if (images.length === 0) {
        return [
          {
            ...item,
            original_id: item.id,
            image_url: null,
            image_index: null,
            card_id: String(item.id) + "-empty",
          },
        ];
      }

      return images.map((img: string, index: number) => ({
        ...item,
        original_id: item.id,
        image_url: img,
        image_index: index,
        card_id: String(item.id) + "-" + index,
      }));
    });
  }, [items]);

  /* ===================================================
     DELETE IMAGE OR COMPLETE LISTING
  =================================================== */

  const runDelete = async (item: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Login Required", "Please login first.");
        return;
      }

      const postId = Number(item.original_id || item.id);

      const { data: post, error } = await (supabase as any)
        .from("items_live")
        .select("id,user_id,image_urls,image_url,video_url")
        .eq("id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !post) {
        showAlert(
          "Error",
          "Product not found or you do not have permission to edit it."
        );
        return;
      }

      const images = Array.isArray(post.image_urls)
        ? [...post.image_urls]
        : post.image_url
        ? [post.image_url]
        : [];

      if (post.video_url || images.length === 0) {
        const { error: deleteError } = await supabase
          .from("items_live")
          .delete()
          .eq("id", postId)
          .eq("user_id", user.id);

        if (deleteError) {
          showAlert("Delete Error", deleteError.message);
          return;
        }

        await fetchMyItems();
        return;
      }

      const updated = images.filter(
        (img: string, index: number) => {
          if (
            item.image_index !== null &&
            item.image_index !== undefined
          ) {
            return index !== Number(item.image_index);
          }

          return img !== item.image_url;
        }
      );

      if (updated.length === 0) {
        const { error: deleteError } = await supabase
          .from("items_live")
          .delete()
          .eq("id", postId)
          .eq("user_id", user.id);

        if (deleteError) {
          showAlert("Delete Error", deleteError.message);
          return;
        }
      } else {
        const { error: updateError } = await (supabase as any)
          .from("items_live")
          .update({
            image_urls: updated,
            image_url: updated[0],
          })
          .eq("id", postId)
          .eq("user_id", user.id);

        if (updateError) {
          showAlert("Update Error", updateError.message);
          return;
        }
      }

      await fetchMyItems();
    } catch (error: any) {
      showAlert("Error", error?.message || "Delete failed.");
    }
  };

  const deleteItem = (item: any) => {
    const isLastImage =
      !item.video_url &&
      item.image_index === 0 &&
      (!Array.isArray(item.image_urls) ||
        item.image_urls.length <= 1);

    const message = isLastImage
      ? "This is the last image. Deleting it will remove the complete listing. Continue?"
      : item.video_url
      ? "Are you sure you want to delete this complete listing?"
      : "Are you sure you want to remove this image?";

    if (Platform.OS === "web") {
      if (window.confirm(message)) runDelete(item);
      return;
    }

    Alert.alert("Confirm Delete", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => runDelete(item),
      },
    ]);
  };

  /* ===================================================
     PROMOTION
  =================================================== */

  const promoteItem = (id: number) => {
    setSelectedItemId(id);
    setDays("3");
    setPayVisible(true);
  };

  /* =====================================================
   OPEN PRODUCT DISCOUNT MODAL
===================================================== */

const openDiscountModal = (item: any) => {
  setDiscountItem(item);
  setDiscountPriceInput(
    item.discount_enabled && item.discount_price
      ? String(item.discount_price)
      : ""
  );
  setDiscountModalVisible(true);
};

/* =====================================================
   SAVE OR UPDATE PRODUCT DISCOUNT
===================================================== */

const saveProductDiscount = async () => {
  if (!discountItem || discountSaving) return;

  const discountPrice = Number(discountPriceInput);
  const originalPrice = Number(discountItem.price || 0);

  if (
    !Number.isFinite(discountPrice) ||
    discountPrice <= 0
  ) {
    showAlert("Invalid Discount", "Enter a valid discount price.");
    return;
  }

  if (discountPrice >= originalPrice) {
    showAlert(
      "Invalid Discount",
      "The discount price must be lower than the original product price."
    );
    return;
  }

  setDiscountSaving(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please log in again.");
    }

    const { error } = await (supabase as any)
      .from("items_live")
      .update({
        discount_enabled: true,
        discount_price: discountPrice,
        discount_expires_at: null,
      })
      .eq("id", Number(discountItem.original_id || discountItem.id))
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    setDiscountModalVisible(false);
    setDiscountItem(null);
    setDiscountPriceInput("");

    showAlert(
      "Discount Saved",
      "Your product discount has been saved successfully. The original price remains unchanged."
    );

    await fetchMyItems();
  } catch (error: any) {
    showAlert(
      "Discount Error",
      error?.message || "Unable to save this discount."
    );
  } finally {
    setDiscountSaving(false);
  }
};

/* =====================================================
   REMOVE PRODUCT DISCOUNT
===================================================== */

const removeProductDiscount = async () => {
  if (!discountItem || discountSaving) return;

  setDiscountSaving(true);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please log in again.");
    }

    const { error } = await (supabase as any)
      .from("items_live")
      .update({
        discount_enabled: false,
        discount_price: null,
        discount_expires_at: null,
      })
      .eq("id", Number(discountItem.original_id || discountItem.id))
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    setDiscountModalVisible(false);
    setDiscountItem(null);
    setDiscountPriceInput("");

    showAlert(
      "Discount Removed",
      "The product is now back to its original price."
    );

    await fetchMyItems();
  } catch (error: any) {
    showAlert(
      "Discount Error",
      error?.message || "Unable to remove this discount."
    );
  } finally {
    setDiscountSaving(false);
  }
};

  /* ===================================================
     SEND PROMOTION PAYMENT REQUEST
  =================================================== */

  const sendPayment = async () => {
    if (!selectedItemId || paymentLoading) return;

    setPaymentLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showAlert("Login Required", "Please login first.");
        return;
      }

      const { data: product, error: productError } =
        await supabase
          .from("items_live")
          .select("id")
          .eq("id", selectedItemId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (productError || !product) {
        showAlert(
          "Error",
          "This product does not belong to your account."
        );
        return;
      }

      const selectedDays = Number(days);

      if (![3, 7, 14].includes(selectedDays)) {
        showAlert(
          "Invalid Selection",
          "Please select 3, 7 or 14 days."
        );
        return;
      }

      const totalAmount = selectedDays * dailyRate;

      const expiryDate = new Date(
        Date.now() + selectedDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const code = "PROMO-" + Date.now();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please log in again and retry.");
      }

      const { data: payment, error: payError } =
        await (supabase as any)
          .from("payments")
          .insert({
            user_id: user.id,
            product_type: "promote",
            amount: totalAmount,
            momo_name: momoName,
            momo_number: momoNumber,
            network: momoNetwork,
            code,
            status: "pending",
          })
          .select("id")
          .single();

      if (payError) throw new Error(payError.message);

      if (!payment?.id) {
        throw new Error("Payment was saved but its ID is missing.");
      }

      const { data: promotion, error: promoError } =
        await (supabase as any)
          .from("promoted")
          .insert({
            seller_id: user.id,
            item_id: selectedItemId,
            amount: totalAmount,
            status: "pending",
            promoted_until: expiryDate,
            payment_code: code,
          })
          .select("id")
          .single();

      if (promoError) {
        await (supabase as any)
          .from("payments")
          .delete()
          .eq("id", payment.id)
          .eq("user_id", user.id);

        throw new Error(promoError.message);
      }

      let notificationSent = false;

      try {
        const response = await fetch(
          API_BASE + "/notifications/admin-submit",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              type: "promotion_payment_request",
              ref_id: payment.id,
              related_id: promotion.id,
            }),
          }
        );

        const result = await response.json();

        notificationSent =
          response.ok && result.success === true;

        if (!notificationSent) {
          console.log(
            "PROMOTION ADMIN NOTIFICATION FAILED:",
            result
          );
        }
      } catch (notificationError) {
        console.log(
          "PROMOTION ADMIN NOTIFICATION ERROR:",
          notificationError
        );
      }

      if (notificationSent) {
        showAlert(
          "Payment Submitted",
          `Your promotion payment has been submitted for admin verification.\n\nAmount: GH₵${totalAmount}\nPayment Code: ${code}\n\nPlease allow the admin team to verify receipt in their MoMo account.`
        );
      } else {
        showAlert(
          "Payment Saved",
          `Your promotion payment record has been saved.\n\nAmount: GH₵${totalAmount}\nPayment Code: ${code}\n\nHowever, the admin notification could not be confirmed. Please contact support.`
        );
      }

      setPayVisible(false);
      setSelectedItemId(null);

      await fetchMyItems();
    } catch (error: any) {
      showAlert(
        "Payment Error",
        error?.message || "Unable to submit promotion request."
      );
    } finally {
      setPaymentLoading(false);
    }
  };
/* =====================================================
     BUYER PURCHASE CARD
  ===================================================== */

  const renderBuyerOrder = (order: any) => {
    const orderId = String(order.id);
    const paymentStatus = getPaymentStatus(order);
    const fulfilmentStatus = getFulfilmentStatus(order);

   const hasPaymentReference = Boolean(
  String(
    order.transaction_reference ||
    order.payment_reference ||
    order.momo_transaction_reference ||
    ""
  ).trim()
);

const buyerDeclared =
  !["seller_confirmed", "rejected"].includes(paymentStatus) &&
  (
    ["buyer_declared", "payment_declared"].includes(paymentStatus) ||
    hasPaymentReference
  );
    const sellerConfirmed =
      paymentStatus === "seller_confirmed";

    const paymentRejected = paymentStatus === "rejected";

    const dispatched = fulfilmentStatus === "dispatched";

    const completed = fulfilmentStatus === "completed";

    const busy = orderActionLoading === orderId;

    const items = Array.isArray(order.items) ? order.items : [];

    const sellerName =
      order.seller_business_name ||
      order.seller_name ||
      "Nasara Seller";

    const sellerMomoName =
      order.seller_momo_name ||
      order.momo_name ||
      "Seller Mobile Money Account";

    const sellerMomoNumber =
      order.seller_momo_number ||
      order.momo_number ||
      "";

    const sellerNetwork =
      order.seller_network ||
      order.network ||
      "Mobile Money";

    return (
      <View
        key={orderId}
        style={{
          backgroundColor: COLORS.white,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 15,
          padding: 15,
          marginBottom: 13,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Text
            style={{
              color: COLORS.navy,
              fontSize: 15,
              fontWeight: "900",
            }}
          >
            Purchase #{orderId.slice(0, 8)}
          </Text>

          <Text
            style={{
              color: completed
                ? COLORS.green
                : dispatched
                ? COLORS.blue
                : paymentRejected
                ? COLORS.red
                : COLORS.gold,
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {completed
              ? "COMPLETED"
              : dispatched
              ? "DISPATCHED"
              : paymentRejected
              ? "PAYMENT REJECTED"
              : sellerConfirmed
              ? "PAYMENT CONFIRMED"
              : buyerDeclared
              ? "PAYMENT UNDER REVIEW"
              : "AWAITING PAYMENT"}
          </Text>
        </View>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          Seller: {sellerName}
        </Text>

        {items.map((item: any, index: number) => (
          <View
            key={String(item.id || index)}
            style={{
              paddingVertical: 9,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {item.product_title ||
                item.item_title ||
                item.title ||
                "Product"}
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Quantity: {Number(item.quantity || 1)}{" "}
              ·{" "}
              {formatMoney(
                Number(
                  item.subtotal ??
                    Number(item.price || 0) *
                      Number(item.quantity || 1)
                )
              )}
            </Text>
          </View>
        ))}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Order Total
          </Text>

          <Text
            style={{
              color: COLORS.navy,
              fontSize: 16,
              fontWeight: "900",
            }}
          >
            {formatMoney(
              Number(
                order.subtotal ??
                  order.subtotal_amount ??
                  order.total_amount ??
                  order.amount ??
                  0
              )
            )}
          </Text>
        </View>

        {!sellerConfirmed &&
          !buyerDeclared &&
          !paymentRejected && (
            <View
              style={{
                backgroundColor: "#FFF8E7",
                borderRadius: 10,
                padding: 12,
                marginTop: 13,
              }}
            >
              <Text
                style={{
                  color: COLORS.navy,
                  fontWeight: "900",
                  fontSize: 13,
                }}
              >
                Pay the seller directly
              </Text>

              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 12,
                  marginTop: 7,
                }}
              >
                Account name: {sellerMomoName}
              </Text>

              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Network: {sellerNetwork}
              </Text>

              <Text
                style={{
                  color: COLORS.navy,
                  fontSize: 17,
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                {sellerMomoNumber || "Seller payment number unavailable"}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 11,
                  marginTop: 7,
                  lineHeight: 17,
                }}
              >
                Send the exact order amount to the seller. After
                completing the transfer, submit your transaction
                reference so the seller can verify your payment.
              </Text>

              <TouchableOpacity
                disabled={!sellerMomoNumber}
                onPress={() => openBuyerPaymentModal(order)}
                style={{
                  backgroundColor: COLORS.navy,
                  padding: 13,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 12,
                  opacity: sellerMomoNumber ? 1 : 0.5,
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                    fontSize: 13,
                  }}
                >
                  I HAVE PAID
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {buyerDeclared && (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              padding: 12,
              borderRadius: 10,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.blue,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              Payment submitted for verification
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              Your payment declaration has been submitted.
              The seller must verify that the money has arrived
              in their Mobile Money account.
            </Text>
          </View>
        )}

        {paymentRejected && (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              padding: 12,
              borderRadius: 10,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.red,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              Payment declaration rejected
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              {order.payment_rejection_reason ||
                order.rejection_reason ||
                "The seller could not verify this payment. Please contact the seller or check your transaction details."}
            </Text>

            <TouchableOpacity
              onPress={() => openBuyerPaymentModal(order)}
              style={{
                backgroundColor: COLORS.navy,
                padding: 12,
                borderRadius: 9,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: "900",
                }}
              >
                SUBMIT PAYMENT AGAIN
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {sellerConfirmed && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              padding: 12,
              borderRadius: 10,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              Seller has confirmed your payment
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              Your payment has been verified. You will be able
              to confirm receipt after the seller dispatches
              your order.
            </Text>
          </View>
        )}

        {dispatched && (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              padding: 12,
              borderRadius: 10,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.blue,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              Your order has been dispatched
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              Once you have received the products, confirm
              receipt below to complete the order.
            </Text>

            <TouchableOpacity
              disabled={busy}
              onPress={() => confirmOrderReceived(order)}
              style={{
                backgroundColor: COLORS.green,
                padding: 13,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 11,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                  }}
                >
                  CONFIRM I RECEIVED MY ORDER
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {completed && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              padding: 12,
              borderRadius: 10,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
              }}
            >
              Order completed
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
              }}
            >
              You confirmed receipt of this order. Thank you
              for using Nasara.
            </Text>
          </View>
        )}
      </View>
    );
  };

  /* =====================================================
     SELLER MARKETPLACE ORDER CARD
  ===================================================== */

  const renderMarketplaceOrder = (order: any) => {
    const paymentStatus = getPaymentStatus(order);
    const fulfilmentStatus = getFulfilmentStatus(order);
    const commission = order.commission;

    const subtotal = Number(
      order.subtotal ??
        order.subtotal_amount ??
        order.total_amount ??
        order.amount ??
        0
    );

    const commissionAmount = Number(
      commission?.commission_amount ??
        commission?.amount ??
        order.commission_amount ??
        subtotal * 0.05
    );

    const orderId = String(order.id);

    const busy =
      orderActionLoading === orderId ||
      orderActionLoading === String(commission?.id);

    const buyerDeclared = [
      "buyer_declared",
      "payment_declared",
    ].includes(paymentStatus);

    const sellerConfirmed =
      paymentStatus === "seller_confirmed";

    const commissionStatus = String(
      commission?.payment_status || ""
    ).toLowerCase();

    const commissionApproved =
      commissionStatus === "admin_approved";

    const commissionSubmitted =
      commissionStatus === "seller_submitted";

    const commissionRejected =
      commissionStatus === "rejected";

    const canSubmitCommission =
      sellerConfirmed &&
      !!commission &&
      ["pending", "rejected"].includes(commissionStatus);

    const canPrepareDispatch =
      sellerConfirmed &&
      commissionApproved &&
      fulfilmentStatus === "processing";

    const canDispatch =
      sellerConfirmed &&
      commissionApproved &&
      fulfilmentStatus === "ready_for_dispatch";

    const buyerName =
      order.buyer_profile?.full_name ||
      order.buyer_profile?.username ||
      "Nasara Buyer";

    const buyerPhone =
      order.buyer_phone ||
      order.delivery_phone ||
      order.phone ||
      "";

    const buyerAddress =
      order.delivery_address ||
      order.delivery_location ||
      order.address ||
      "";

    const items = Array.isArray(order.items) ? order.items : [];

    return (
      <View
        key={orderId}
        style={{
          backgroundColor: COLORS.white,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 15,
          padding: 15,
          marginBottom: 13,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Text
            style={{
              color: COLORS.navy,
              fontSize: 15,
              fontWeight: "900",
            }}
          >
            Order #{orderId.slice(0, 8)}
          </Text>

          <Text
            style={{
              color:
                fulfilmentStatus === "completed"
                  ? COLORS.green
                  : fulfilmentStatus === "dispatched"
                  ? COLORS.blue
                  : paymentStatus === "rejected"
                  ? COLORS.red
                  : sellerConfirmed
                  ? COLORS.green
                  : COLORS.gold,
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {fulfilmentStatus.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 11,
            marginTop: 5,
          }}
        >
          Payment: {paymentStatus.replace(/_/g, " ")}
        </Text>

        {items.map((item: any, index: number) => (
          <View
            key={String(item.id || index)}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              {item.product_title ||
                item.item_title ||
                item.title ||
                "Product"}
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Quantity: {Number(item.quantity || 1)}
              {"  "}·{"  "}
              {formatMoney(
                Number(
                  item.subtotal ??
                    Number(item.price || 0) *
                      Number(item.quantity || 1)
                )
              )}
            </Text>
          </View>
        ))}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: COLORS.muted,
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            Order Subtotal
          </Text>

          <Text
            style={{
              color: COLORS.navy,
              fontSize: 16,
              fontWeight: "900",
            }}
          >
            {formatMoney(subtotal)}
          </Text>
        </View>

        {buyerDeclared && (
          <View
            style={{
              backgroundColor: "#FFF8E7",
              padding: 12,
              borderRadius: 10,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              Buyer has declared payment
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              Check your Mobile Money account and verify
              that the buyer's payment has actually arrived.
              Only confirm after receiving the money.
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                disabled={busy}
                onPress={() => confirmBuyerPayment(order)}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.green,
                  padding: 12,
                  borderRadius: 9,
                  alignItems: "center",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                    fontSize: 11,
                  }}
                >
                  CONFIRM PAYMENT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={busy}
                onPress={() => openRejectModal(order)}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.red,
                  padding: 12,
                  borderRadius: 9,
                  alignItems: "center",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                    fontSize: 11,
                  }}
                >
                  REJECT
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {sellerConfirmed && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              borderRadius: 10,
              padding: 12,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
                fontSize: 14,
              }}
            >
              Buyer payment confirmed
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 12,
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              The buyer's payment has been confirmed.
              Buyer and delivery details are now available below.
            </Text>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#BBF7D0",
                marginTop: 12,
                paddingTop: 12,
              }}
            >
              <Text
                style={{
                  color: COLORS.navy,
                  fontWeight: "900",
                  fontSize: 13,
                }}
              >
                Buyer Details
              </Text>

              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                Name: {buyerName}
              </Text>

              {buyerPhone ? (
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  Phone: {buyerPhone}
                </Text>
              ) : null}

              {buyerAddress ? (
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    marginTop: 5,
                    lineHeight: 18,
                  }}
                >
                  Delivery address: {buyerAddress}
                </Text>
              ) : null}

              {order.delivery_instructions ? (
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    marginTop: 5,
                    lineHeight: 18,
                  }}
                >
                  Instructions: {order.delivery_instructions}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {sellerConfirmed && (
          <View
            style={{
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 10,
              padding: 12,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 14,
              }}
            >
              Nasara 5% Commission
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 11,
                marginTop: 5,
              }}
            >
              Commission payable on this order
            </Text>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 21,
                marginTop: 4,
              }}
            >
              {formatMoney(commissionAmount)}
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 11,
                marginTop: 7,
              }}
            >
              Commission status:{" "}
              {commissionStatus
                ? commissionStatus.replace(/_/g, " ").toUpperCase()
                : "PENDING"}
            </Text>

            {commissionRejected && (
              <Text
                style={{
                  color: COLORS.red,
                  fontSize: 12,
                  marginTop: 7,
                }}
              >
                Your previous commission payment was rejected.
                Please verify your transaction and submit again.
              </Text>
            )}

            {commissionSubmitted && (
              <View
                style={{
                  backgroundColor: "#EFF6FF",
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: COLORS.blue,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Submitted to Nasara Admin
                </Text>

                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  Your commission payment is waiting for admin
                  verification. You cannot dispatch this order
                  until it is approved.
                </Text>
              </View>
            )}

            {commissionApproved && (
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: COLORS.green,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Nasara Admin approved your commission
                </Text>

                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  You can now prepare and dispatch this order.
                </Text>
              </View>
            )}

            {canSubmitCommission && (
              <View
                style={{
                  backgroundColor: "#FFF8E7",
                  borderRadius: 9,
                  padding: 11,
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    color: COLORS.navy,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Pay Nasara Market
                </Text>

                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    marginTop: 7,
                  }}
                >
                  Account name: {momoName}
                </Text>

                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Network: {momoNetwork}
                </Text>

                <Text
                  style={{
                    color: COLORS.navy,
                    fontWeight: "900",
                    fontSize: 18,
                    marginTop: 4,
                  }}
                >
                  {momoNumber}
                </Text>

                <Text
                  style={{
                    color: COLORS.muted,
                    fontSize: 11,
                    marginTop: 6,
                    lineHeight: 17,
                  }}
                >
                  Pay the commission to Nasara using the
                  account details above. Submit your transaction
                  reference for admin verification.
                </Text>

                <TouchableOpacity
                  disabled={busy}
                  onPress={() => openCommissionModal(order)}
                  style={{
                    backgroundColor: COLORS.navy,
                    padding: 12,
                    borderRadius: 9,
                    alignItems: "center",
                    marginTop: 11,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "900",
                    }}
                  >
                    SUBMIT COMMISSION PAYMENT
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {canPrepareDispatch && (
          <TouchableOpacity
            disabled={busy}
            onPress={() =>
              updateSellerOrderStatus(
                order,
                "ready_for_dispatch"
              )
            }
            style={{
              backgroundColor: COLORS.blue,
              padding: 13,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 13,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: "900",
                }}
              >
                MARK ORDER READY FOR DISPATCH
              </Text>
            )}
          </TouchableOpacity>
        )}

        {canDispatch && (
          <TouchableOpacity
            disabled={busy}
            onPress={() =>
              updateSellerOrderStatus(order, "dispatched")
            }
            style={{
              backgroundColor: COLORS.green,
              padding: 13,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 13,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: "900",
                }}
              >
                CONFIRM ORDER DISPATCHED
              </Text>
            )}
          </TouchableOpacity>
        )}

        {fulfilmentStatus === "ready_for_dispatch" &&
          !commissionApproved && (
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 11,
                marginTop: 12,
                lineHeight: 17,
              }}
            >
              Dispatch is locked until Nasara Admin approves
              the 5% commission payment.
            </Text>
          )}

        {fulfilmentStatus === "dispatched" && (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              padding: 11,
              borderRadius: 9,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.blue,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              Order dispatched
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              Waiting for the buyer to confirm receipt.
            </Text>
          </View>
        )}

        {fulfilmentStatus === "completed" && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              padding: 11,
              borderRadius: 9,
              marginTop: 13,
            }}
          >
            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              Order completed
            </Text>

            <Text
              style={{
                color: COLORS.text,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              The buyer has confirmed receipt of the order.
            </Text>
          </View>
        )}
      </View>
    );
  };

  /* =====================================================
     MAIN DASHBOARD UI
  ===================================================== */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
      }}
    >
     <ScrollView
  ref={dashboardScrollRef}
  contentContainerStyle={{
    padding: 15,
    paddingBottom: 45,
  }}
        refreshControl={
          <RefreshControl
            refreshing={loading || ordersLoading || buyerOrdersLoading}
            onRefresh={() => {
              fetchMyItems();
              fetchMarketplaceOrders();
              fetchBuyerOrders();
            }}
          />
        }
      >
        {/* DASHBOARD HEADER */}

        <View
          style={{
            backgroundColor: COLORS.navy,
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: COLORS.gold,
              fontSize: 12,
              fontWeight: "900",
              letterSpacing: 1,
            }}
          >
            NASARA MARKETPLACE
          </Text>

          <Text
            style={{
              color: COLORS.white,
              fontSize: 23,
              fontWeight: "900",
              marginTop: 6,
            }}
          >
            My Business Dashboard
          </Text>

          <Text
            style={{
              color: "#DCE3EF",
              fontSize: 12,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            Manage your products, sales, purchases and
            marketplace activities.
          </Text>
        </View>

        {/* STATISTICS */}

        <Text
          style={{
            color: COLORS.navy,
            fontSize: 17,
            fontWeight: "900",
            marginBottom: 11,
          }}
        >
          Business Overview
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 9,
          }}
        >
          <StatCard
            title="My Listings"
            value={stats.listings}
            icon="📦"
            color={COLORS.blue}
          />

          <StatCard
            title="Product Views"
            value={stats.views}
            icon="👁️"
            color={COLORS.green}
          />

          <StatCard
            title="Enquiries"
            value={stats.enquiries}
            icon="💬"
            color={COLORS.gold}
          />

          <StatCard
            title="Favourites"
            value={stats.favourites}
            icon="❤️"
            color={COLORS.red}
          />
        </View>

        {/* SHOP QR CODE */}

        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 16,
            marginTop: 10,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: COLORS.navy,
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            My Nasara Shop QR Code
          </Text>

          <Text
            style={{
              color: COLORS.muted,
              fontSize: 11,
              textAlign: "center",
              marginTop: 5,
            }}
          >
            Share your shop link or QR code with customers.
          </Text>

          {shopUrl ? (
            <>
              <View
                ref={qrRef}
                collapsable={false}
                style={{
                  backgroundColor: COLORS.white,
                  padding: 14,
                  marginTop: 13,
                  alignItems: "center",
                  borderRadius: 10,
                }}
              >
                <QRCode
                  value={shopUrl}
                  size={175}
                  backgroundColor="white"
                  color={COLORS.navy}
                />

                <Text
                  style={{
                    color: COLORS.navy,
                    fontWeight: "900",
                    marginTop: 9,
                    fontSize: 13,
                  }}
                >
                  NASARA MARKET
                </Text>
              </View>

              <Text
                selectable
                style={{
                  color: COLORS.blue,
                  fontSize: 11,
                  textAlign: "center",
                  marginTop: 9,
                }}
              >
                {shopUrl}
              </Text>

              <TouchableOpacity
                disabled={qrSharing}
                onPress={shareShopQr}
                style={{
                  backgroundColor: COLORS.navy,
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 10,
                  marginTop: 13,
                  opacity: qrSharing ? 0.6 : 1,
                }}
              >
                {qrSharing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "900",
                    }}
                  >
                    SHARE MY SHOP QR
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              Your shop QR code will appear after your account loads.
            </Text>
          )}
        </View>

       {/* =================================================
    NASARA BUSINESS MANAGEMENT SHORTCUTS
================================================= */}

<Text
  style={{
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 5,
    marginBottom: 12,
  }}
>
  Manage My Business
</Text>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  }}
>
  {/* MY LISTINGS */}

  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => dashboardScrollRef.current?.scrollToEnd({ animated: true })}
    style={{
      width: "48.5%",
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: 15,
      marginBottom: 11,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 4,
      borderBottomColor: COLORS.blue,
    }}
  >
    <View style={{
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: "#EFF6FF",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 22 }}>📦</Text>
    </View>

    <Text style={{
      color: COLORS.navy,
      fontWeight: "900",
      fontSize: 15,
      marginTop: 11,
    }}>
      My Listings
    </Text>

    <Text style={{
      color: COLORS.muted,
      fontSize: 11,
      marginTop: 4,
    }}>
      Manage your products
    </Text>

    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    }}>
      <Text style={{
        color: COLORS.blue,
        fontWeight: "900",
        fontSize: 17,
      }}>
        {formatNumber(stats.listings)}
      </Text>
      <Text style={{ color: COLORS.navy, fontSize: 18 }}>→</Text>
    </View>
  </TouchableOpacity>

  {/* MY ADS */}

  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => router.push("ads/my-ads")}
    style={{
      width: "48.5%",
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: 15,
      marginBottom: 11,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 4,
      borderBottomColor: COLORS.gold,
    }}
  >
    <View style={{
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: "#FFF8E7",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 22 }}>📢</Text>
    </View>

    <Text style={{
      color: COLORS.navy,
      fontWeight: "900",
      fontSize: 15,
      marginTop: 11,
    }}>
      My Ads
    </Text>

    <Text style={{
      color: COLORS.muted,
      fontSize: 11,
      marginTop: 4,
    }}>
      Manage advertisements
    </Text>

    <View style={{
      alignItems: "flex-end",
      marginTop: 12,
    }}>
      <Text style={{ color: COLORS.navy, fontSize: 18 }}>→</Text>
    </View>
  </TouchableOpacity>

  {/* MY BANNERS */}

  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => router.push("banner/my-banner" as any)}
    style={{
      width: "48.5%",
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: 15,
      marginBottom: 11,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 4,
      borderBottomColor: COLORS.green,
    }}
  >
    <View style={{
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: "#F0FDF4",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 22 }}>🖼️</Text>
    </View>

    <Text style={{
      color: COLORS.navy,
      fontWeight: "900",
      fontSize: 15,
      marginTop: 11,
    }}>
      My Banners
    </Text>

    <Text style={{
      color: COLORS.muted,
      fontSize: 11,
      marginTop: 4,
    }}>
      Manage banner promotions
    </Text>

    <View style={{
      alignItems: "flex-end",
      marginTop: 12,
    }}>
      <Text style={{ color: COLORS.navy, fontSize: 18 }}>→</Text>
    </View>
  </TouchableOpacity>

  {/* MY PURCHASES */}

  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => setPurchasesModalVisible(true)}
    style={{
      width: "48.5%",
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: 15,
      marginBottom: 11,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 4,
      borderBottomColor: "#A855F7",
    }}
  >
    <View style={{
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: "#FAF5FF",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 22 }}>🛍️</Text>
    </View>

    <Text style={{
      color: COLORS.navy,
      fontWeight: "900",
      fontSize: 15,
      marginTop: 11,
    }}>
      My Purchases
    </Text>

    <Text style={{
      color: COLORS.muted,
      fontSize: 11,
      marginTop: 4,
    }}>
      Products you have ordered
    </Text>

    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    }}>
      <Text style={{
        color: "#A855F7",
        fontWeight: "900",
        fontSize: 17,
      }}>
        {formatNumber(buyerOrders.length)}
      </Text>
      <Text style={{ color: COLORS.navy, fontSize: 18 }}>→</Text>
    </View>
  </TouchableOpacity>

  {/* MY ORDERS */}

  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => setSellerOrdersModalVisible(true)}
    style={{
      width: "100%",
      backgroundColor: COLORS.navy,
      borderRadius: 16,
      padding: 16,
      marginBottom: 11,
      borderBottomWidth: 4,
      borderBottomColor: COLORS.gold,
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    <View style={{
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#FFFFFF18",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 24 }}>🛒</Text>
    </View>

    <View style={{ flex: 1, marginLeft: 13 }}>
      <Text style={{
        color: COLORS.white,
        fontWeight: "900",
        fontSize: 16,
      }}>
        My Orders
      </Text>

      <Text style={{
        color: "#DCE3EF",
        fontSize: 11,
        marginTop: 4,
      }}>
        Manage customer payments and deliveries
      </Text>
    </View>

    <View style={{
      backgroundColor: COLORS.gold,
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 8,
    }}>
      <Text style={{
        color: COLORS.navy,
        fontWeight: "900",
      }}>
        {formatNumber(marketplaceOrders.length)}
      </Text>
    </View>

    <Text style={{
      color: COLORS.white,
      fontSize: 21,
      marginLeft: 10,
    }}>
      →
    </Text>
  </TouchableOpacity>
</View>
        {/* MY PRODUCT LISTINGS */}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 11,
          }}
        >
          <Text
            style={{
              color: COLORS.navy,
              fontSize: 17,
              fontWeight: "900",
            }}
          >
            My Product Listings
          </Text>

          <TouchableOpacity onPress={fetchMyItems}>
            <Text
              style={{
                color: COLORS.blue,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {loading && items.length === 0 ? (
          <ActivityIndicator
            color={COLORS.navy}
            style={{ marginVertical: 25 }}
          />
        ) : displayItems.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              padding: 18,
              alignItems: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              You have not listed any products yet.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/sell")}
              style={{
                backgroundColor: COLORS.navy,
                borderRadius: 9,
                paddingHorizontal: 20,
                paddingVertical: 11,
                marginTop: 13,
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: "900",
                }}
              >
                LIST A PRODUCT
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {displayItems.map((item: any) => (
              <MyItemCard
  key={item.card_id}
  item={item}
  onDelete={deleteItem}
  onPromote={promoteItem}
  onDiscount={openDiscountModal}
/>
            ))}
          </View>
        )}
      </ScrollView>

      {/* =================================================
   MY PURCHASES POP-UP
================================================= */}

<Modal
  visible={purchasesModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setPurchasesModalVisible(false)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "#00000088",
      justifyContent: "flex-end",
    }}
  >
    <View
      style={{
        height: "88%",
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 23,
        borderTopRightRadius: 23,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.navy,
          padding: 19,
          paddingTop: 23,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                color: COLORS.gold,
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1,
              }}
            >
              NASARA MARKETPLACE
            </Text>

            <Text
              style={{
                color: COLORS.white,
                fontSize: 21,
                fontWeight: "900",
                marginTop: 5,
              }}
            >
              My Purchases
            </Text>

            <Text
              style={{
                color: "#DCE3EF",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Track your payments and deliveries
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setPurchasesModalVisible(false)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 20,
              backgroundColor: "#FFFFFF20",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: COLORS.white, fontSize: 22 }}>×</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 17,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 12 }}>
            {buyerOrders.length} purchase(s)
          </Text>

          <TouchableOpacity
            onPress={fetchBuyerOrders}
            style={{
              backgroundColor: COLORS.gold,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: COLORS.navy,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              ↻ REFRESH
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 15, paddingBottom: 35 }}
      >
        {buyerOrdersLoading && buyerOrders.length === 0 ? (
          <ActivityIndicator
            color={COLORS.navy}
            size="large"
            style={{ marginTop: 35 }}
          />
        ) : buyerOrders.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              padding: 25,
              alignItems: "center",
              marginTop: 15,
            }}
          >
            <Text style={{ fontSize: 35 }}>🛍️</Text>
            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 16,
                marginTop: 10,
              }}
            >
              No purchases yet
            </Text>
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 18,
              }}
            >
              Products you order from Nasara sellers will appear here.
            </Text>
          </View>
        ) : (
          buyerOrders.map(renderBuyerOrder)
        )}
      </ScrollView>
    </View>
  </View>
</Modal>

{/* =================================================
   MY ORDERS POP-UP
================================================= */}

<Modal
  visible={sellerOrdersModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setSellerOrdersModalVisible(false)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "#00000088",
      justifyContent: "flex-end",
    }}
  >
    <View
      style={{
        height: "88%",
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 23,
        borderTopRightRadius: 23,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.navy,
          padding: 19,
          paddingTop: 23,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                color: COLORS.gold,
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1,
              }}
            >
              NASARA SELLER CENTRE
            </Text>

            <Text
              style={{
                color: COLORS.white,
                fontSize: 21,
                fontWeight: "900",
                marginTop: 5,
              }}
            >
              My Orders
            </Text>

            <Text
              style={{
                color: "#DCE3EF",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Manage customer payments and deliveries
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setSellerOrdersModalVisible(false)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 20,
              backgroundColor: "#FFFFFF20",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: COLORS.white, fontSize: 22 }}>×</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 17,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 12 }}>
            {marketplaceOrders.length} customer order(s)
          </Text>

          <TouchableOpacity
            onPress={fetchMarketplaceOrders}
            style={{
              backgroundColor: COLORS.gold,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: COLORS.navy,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              ↻ REFRESH
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 15, paddingBottom: 35 }}
      >
        {ordersLoading && marketplaceOrders.length === 0 ? (
          <ActivityIndicator
            color={COLORS.navy}
            size="large"
            style={{ marginTop: 35 }}
          />
        ) : marketplaceOrders.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              padding: 25,
              alignItems: "center",
              marginTop: 15,
            }}
          >
            <Text style={{ fontSize: 35 }}>📦</Text>
            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 16,
                marginTop: 10,
              }}
            >
              No customer orders yet
            </Text>
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 18,
              }}
            >
              Orders placed for your products will appear here.
            </Text>
          </View>
        ) : (
          marketplaceOrders.map(renderMarketplaceOrder)
        )}
      </ScrollView>
    </View>
  </View>
</Modal>

{/* =================================================
   PRODUCT DISCOUNT MODAL
================================================= */}

<Modal
  visible={discountModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => {
    if (!discountSaving) {
      setDiscountModalVisible(false);
      setDiscountItem(null);
    }
  }}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "#00000099",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
      }}
    >
      <Text
        style={{
          color: COLORS.gold,
          fontSize: 11,
          fontWeight: "900",
          letterSpacing: 1,
        }}
      >
        NASARA SELLER TOOLS
      </Text>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 21,
          fontWeight: "900",
          marginTop: 5,
        }}
      >
        Product Discount
      </Text>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 12,
          marginTop: 7,
          lineHeight: 18,
        }}
      >
        Set a special selling price for this product. Your original
        price will remain saved.
      </Text>

      <View
        style={{
          backgroundColor: COLORS.background,
          padding: 13,
          borderRadius: 11,
          marginTop: 15,
        }}
      >
        <Text
          style={{
            color: COLORS.muted,
            fontSize: 11,
            fontWeight: "700",
          }}
        >
          PRODUCT
        </Text>

        <Text
          style={{
            color: COLORS.navy,
            fontSize: 14,
            fontWeight: "900",
            marginTop: 4,
          }}
        >
          {discountItem?.title || "Selected product"}
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
            marginTop: 8,
          }}
        >
          Original price:{" "}
          {formatMoney(Number(discountItem?.price || 0))}
        </Text>
      </View>

      <Text
        style={{
          color: COLORS.text,
          fontWeight: "800",
          fontSize: 12,
          marginTop: 17,
          marginBottom: 7,
        }}
      >
        New Discount Price (GH₵)
      </Text>

      <TextInput
        value={discountPriceInput}
        onChangeText={setDiscountPriceInput}
        placeholder="Enter your new selling price"
        keyboardType="decimal-pad"
        style={{
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 11,
          padding: 14,
          color: COLORS.navy,
          fontSize: 17,
          fontWeight: "800",
        }}
      />

      {Number(discountPriceInput) > 0 &&
        Number(discountPriceInput) < Number(discountItem?.price || 0) && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              borderRadius: 10,
              padding: 11,
              marginTop: 11,
            }}
          >
            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              Customer saves{" "}
              {formatMoney(
                Number(discountItem?.price || 0) -
                  Number(discountPriceInput)
              )}
            </Text>
          </View>
        )}

      <TouchableOpacity
        disabled={discountSaving}
        onPress={saveProductDiscount}
        style={{
          backgroundColor: COLORS.navy,
          padding: 14,
          borderRadius: 11,
          alignItems: "center",
          marginTop: 17,
          opacity: discountSaving ? 0.6 : 1,
        }}
      >
        {discountSaving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text
            style={{
              color: COLORS.white,
              fontWeight: "900",
            }}
          >
            SAVE DISCOUNT PRICE
          </Text>
        )}
      </TouchableOpacity>

      {discountItem?.discount_enabled === true && (
        <TouchableOpacity
          disabled={discountSaving}
          onPress={removeProductDiscount}
          style={{
            borderWidth: 1,
            borderColor: COLORS.red,
            padding: 12,
            borderRadius: 11,
            alignItems: "center",
            marginTop: 9,
            opacity: discountSaving ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: COLORS.red,
              fontWeight: "900",
            }}
          >
            REMOVE DISCOUNT
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        disabled={discountSaving}
        onPress={() => {
          setDiscountModalVisible(false);
          setDiscountItem(null);
          setDiscountPriceInput("");
        }}
        style={{
          padding: 12,
          alignItems: "center",
          marginTop: 5,
        }}
      >
        <Text
          style={{
            color: COLORS.muted,
            fontWeight: "800",
          }}
        >
          CANCEL
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      {/* =================================================
         PROMOTION PAYMENT MODAL
      ================================================= */}

      <Modal
        visible={payVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!paymentLoading) {
            setPayVisible(false);
            setSelectedItemId(null);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000088",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              padding: 19,
            }}
          >
            <Text
              style={{
                color: COLORS.navy,
                fontSize: 19,
                fontWeight: "900",
              }}
            >
              Promote Your Product
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 7,
                lineHeight: 18,
              }}
            >
              Choose how long you want your product to be promoted.
              The rate is GH₵30 per day.
            </Text>

            {["3", "7", "14"].map((option) => {
              const selected = days === option;

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setDays(option)}
                  style={{
                    borderWidth: 1,
                    borderColor: selected
                      ? COLORS.gold
                      : COLORS.border,
                    backgroundColor: selected
                      ? "#FFF8E7"
                      : COLORS.white,
                    padding: 13,
                    borderRadius: 10,
                    marginTop: 10,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontWeight: "800",
                    }}
                  >
                    {option} days —{" "}
                    {formatMoney(Number(option) * dailyRate)}
                    {selected ? "  ✓" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View
              style={{
                backgroundColor: "#FFF8E7",
                padding: 12,
                borderRadius: 10,
                marginTop: 13,
              }}
            >
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 12,
                }}
              >
                Pay to: {momoName}
              </Text>

              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Network: {momoNetwork}
              </Text>

              <Text
                style={{
                  color: COLORS.navy,
                  fontWeight: "900",
                  fontSize: 17,
                  marginTop: 4,
                }}
              >
                {momoNumber}
              </Text>

              <Text
                style={{
                  color: COLORS.navy,
                  fontWeight: "900",
                  fontSize: 16,
                  marginTop: 9,
                }}
              >
                Total: {formatMoney(Number(days) * dailyRate)}
              </Text>
            </View>

            <TouchableOpacity
              disabled={paymentLoading}
              onPress={sendPayment}
              style={{
                backgroundColor: COLORS.navy,
                padding: 14,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 15,
                opacity: paymentLoading ? 0.6 : 1,
              }}
            >
              {paymentLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                  }}
                >
                  SUBMIT PROMOTION REQUEST
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={paymentLoading}
              onPress={() => {
                setPayVisible(false);
                setSelectedItemId(null);
              }}
              style={{
                padding: 12,
                alignItems: "center",
                marginTop: 5,
              }}
            >
              <Text
                style={{
                  color: COLORS.muted,
                  fontWeight: "800",
                }}
              >
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =================================================
         MARKETPLACE ORDER MODALS
      ================================================= */}

      <Modal
        visible={orderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!orderActionLoading) {
            setOrderModalVisible(false);
            setSelectedOrder(null);
            setOrderModalType(null);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000088",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.white,
                borderRadius: 16,
                padding: 19,
              }}
            >
              {/* BUYER PAYMENT DECLARATION */}

              {orderModalType === "buyer-payment" ? (
                <>
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontSize: 19,
                      fontWeight: "900",
                    }}
                  >
                    Declare Buyer Payment
                  </Text>

                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      lineHeight: 19,
                      marginTop: 8,
                    }}
                  >
                    Enter the transaction reference from the
                    Mobile Money payment you made to the seller.
                    The seller and Nasara Admin will be notified.
                  </Text>

                  <View
                    style={{
                      backgroundColor: "#FFF8E7",
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 13,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.navy,
                        fontWeight: "900",
                        fontSize: 13,
                      }}
                    >
                      Seller Payment Details
                    </Text>

                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 12,
                        marginTop: 7,
                      }}
                    >
                      {selectedOrder?.seller_momo_name ||
                        selectedOrder?.momo_name ||
                        "Seller"}
                    </Text>

                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {selectedOrder?.seller_network ||
                        selectedOrder?.network ||
                        "Mobile Money"}
                    </Text>

                    <Text
                      style={{
                        color: COLORS.navy,
                        fontWeight: "900",
                        fontSize: 17,
                        marginTop: 4,
                      }}
                    >
                      {selectedOrder?.seller_momo_number ||
                        selectedOrder?.momo_number ||
                        "Seller number unavailable"}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 12,
                      fontWeight: "800",
                      marginTop: 15,
                      marginBottom: 7,
                    }}
                  >
                    Mobile Money Transaction Reference
                  </Text>

                  <TextInput
                    value={buyerPaymentReference}
                    onChangeText={setBuyerPaymentReference}
                    placeholder="Enter transaction reference"
                    autoCapitalize="characters"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      padding: 13,
                      color: COLORS.text,
                      fontSize: 14,
                    }}
                  />

                  <TouchableOpacity
                    disabled={!!orderActionLoading}
                    onPress={declareBuyerPayment}
                    style={{
                      backgroundColor: COLORS.navy,
                      padding: 14,
                      borderRadius: 10,
                      alignItems: "center",
                      marginTop: 15,
                      opacity: orderActionLoading ? 0.6 : 1,
                    }}
                  >
                    {orderActionLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text
                        style={{
                          color: COLORS.white,
                          fontWeight: "900",
                        }}
                      >
                        SUBMIT PAYMENT DECLARATION
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : orderModalType === "reject" ? (
                <>
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontSize: 19,
                      fontWeight: "900",
                    }}
                  >
                    Reject Buyer Payment
                  </Text>

                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 8,
                    }}
                  >
                    Explain why you cannot verify the buyer's
                    payment. The buyer will be notified.
                  </Text>

                  <TextInput
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    placeholder="Enter reason for rejection"
                    multiline
                    textAlignVertical="top"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      padding: 12,
                      minHeight: 100,
                      marginTop: 14,
                      color: COLORS.text,
                    }}
                  />

                  <TouchableOpacity
                    disabled={!!orderActionLoading}
                    onPress={rejectBuyerPayment}
                    style={{
                      backgroundColor: COLORS.red,
                      padding: 14,
                      borderRadius: 10,
                      alignItems: "center",
                      marginTop: 14,
                      opacity: orderActionLoading ? 0.6 : 1,
                    }}
                  >
                    {orderActionLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text
                        style={{
                          color: COLORS.white,
                          fontWeight: "900",
                        }}
                      >
                        CONFIRM REJECTION
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : orderModalType === "commission" ? (
                <>
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontSize: 19,
                      fontWeight: "900",
                    }}
                  >
                    Submit Nasara Commission
                  </Text>

                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 8,
                    }}
                  >
                    After paying the 5% commission to Nasara,
                    enter your Mobile Money transaction reference.
                    Admin will verify the payment.
                  </Text>

                  <View
                    style={{
                      backgroundColor: "#FFF8E7",
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 13,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 12,
                      }}
                    >
                      Account name: {momoName}
                    </Text>

                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      Network: {momoNetwork}
                    </Text>

                    <Text
                      style={{
                        color: COLORS.navy,
                        fontWeight: "900",
                        fontSize: 18,
                        marginTop: 4,
                      }}
                    >
                      {momoNumber}
                    </Text>

                    <Text
                      style={{
                        color: COLORS.navy,
                        fontSize: 15,
                        fontWeight: "900",
                        marginTop: 10,
                      }}
                    >
                      Amount:{" "}
                      {formatMoney(
                        Number(
                          selectedOrder?.commission
                            ?.commission_amount ??
                            selectedOrder?.commission?.amount ??
                            selectedOrder?.commission_amount ??
                            Number(
                              selectedOrder?.subtotal ??
                                selectedOrder?.subtotal_amount ??
                                selectedOrder?.total_amount ??
                                selectedOrder?.amount ??
                                0
                            ) * 0.05
                        )
                      )}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 12,
                      fontWeight: "800",
                      marginTop: 15,
                      marginBottom: 7,
                    }}
                  >
                    Commission Transaction Reference
                  </Text>

                  <TextInput
                    value={transactionReference}
                    onChangeText={setTransactionReference}
                    placeholder="Enter MoMo transaction reference"
                    autoCapitalize="characters"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      padding: 13,
                      color: COLORS.text,
                      fontSize: 14,
                    }}
                  />

                  <TouchableOpacity
                    disabled={!!orderActionLoading}
                    onPress={submitCommissionPayment}
                    style={{
                      backgroundColor: COLORS.navy,
                      padding: 14,
                      borderRadius: 10,
                      alignItems: "center",
                      marginTop: 15,
                      opacity: orderActionLoading ? 0.6 : 1,
                    }}
                  >
                    {orderActionLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text
                        style={{
                          color: COLORS.white,
                          fontWeight: "900",
                        }}
                      >
                        SUBMIT TO NASARA ADMIN
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity
                disabled={!!orderActionLoading}
                onPress={() => {
                  setOrderModalVisible(false);
                  setSelectedOrder(null);
                  setOrderModalType(null);
                  setBuyerPaymentReference("");
                  setRejectionReason("");
                  setTransactionReference("");
                }}
                style={{
                  padding: 12,
                  alignItems: "center",
                  marginTop: 5,
                }}
              >
                <Text
                  style={{
                    color: COLORS.muted,
                    fontWeight: "800",
                  }}
                >
                  CANCEL
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}