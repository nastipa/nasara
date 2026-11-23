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
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  "GH₵ " + Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getOrderStatus = (order: any) =>
  String(order.payment_status || order.status || "pending")
    .toLowerCase();

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
}: {
  item: any;
  onDelete: (item: any) => void;
  onPromote: (id: number) => void;
}) {
  const router = useRouter();
  const postId = Number(item.original_id || item.id);

  const promoted =
    item.is_promoted === true ||
    item.is_boosted === true ||
    item.is_featured === true;

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

        <Text
          style={{
            fontWeight: "900",
            marginTop: 5,
            fontSize: 17,
            color: COLORS.navy,
          }}
        >
          GH₵ {Number(item.price || 0).toLocaleString()}
        </Text>

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
     Uses existing Supabase tables and RLS.
     No new backend endpoint.
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

      const combinedOrders = orders.map((order: any) => ({
        ...order,
        items: (orderItems || []).filter(
          (item: any) => item.order_id === order.id
        ),
        commission:
          (commissions || []).find(
            (commission: any) =>
              commission.order_id === order.id
          ) || null,
      }));

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
   Orders where the current account is the buyer.
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
      throw new Error("Your session has expired. Please log in again.");
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
   Existing backend endpoint.
   Notifies seller and Nasara Admin.
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
      "Nasara and the seller have been notified. The seller must confirm receipt of your payment."
    );

    await fetchBuyerOrders();
    await fetchMarketplaceOrders();
  } catch (error: any) {
    showAlert(
      "Payment Declaration Failed",
      error?.message || "Unable to submit your payment declaration."
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
        "You have confirmed the buyer's payment. Your 5% Nasara commission is now available in this order."
      );

      await fetchMarketplaceOrders();
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

  /* ===================================================
     SEND PROMOTION PAYMENT REQUEST
     EXISTING FLOW PRESERVED
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
  /* ===================================================
   BUYER PURCHASE CARD
=================================================== */

const renderBuyerOrder = (order: any) => {
  const status = getOrderStatus(order);

  const orderId = String(order.id);

  const subtotal = Number(
    order.subtotal ??
      order.subtotal_amount ??
      order.total_amount ??
      order.amount ??
      0
  );

  const buyerDeclared = [
    "buyer_declared",
    "payment_declared",
  ].includes(status);

  const paymentConfirmed = [
    "seller_confirmed",
    "confirmed",
    "processing",
    "completed",
    "delivered",
  ].includes(status);

  const paymentRejected = [
    "rejected",
    "payment_rejected",
  ].includes(status);

  const alreadyPaid = buyerDeclared || paymentConfirmed;

  return (
    <View
      key={orderId}
      style={{
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        padding: 15,
        marginBottom: 12,
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
            fontWeight: "900",
            fontSize: 15,
          }}
        >
          Purchase #{orderId.slice(0, 8)}
        </Text>

        <Text
          style={{
            backgroundColor: paymentConfirmed
              ? "#DCFCE7"
              : buyerDeclared
              ? "#FEF3C7"
              : paymentRejected
              ? "#FEE2E2"
              : "#E5E7EB",
            color: paymentConfirmed
              ? "#166534"
              : buyerDeclared
              ? "#92400E"
              : paymentRejected
              ? COLORS.red
              : COLORS.text,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
            fontSize: 10,
            fontWeight: "900",
          }}
        >
          {status.replace(/_/g, " ").toUpperCase()}
        </Text>
      </View>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 11,
          marginTop: 6,
        }}
      >
        {order.created_at
          ? new Date(order.created_at).toLocaleString()
          : ""}
      </Text>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          marginTop: 12,
          paddingTop: 10,
        }}
      >
        <Text
          style={{
            color: COLORS.text,
            fontWeight: "800",
            fontSize: 12,
            marginBottom: 7,
          }}
        >
          Products Purchased
        </Text>

        {(order.items || []).map((item: any, index: number) => (
          <View
            key={String(item.id || index)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 6,
              gap: 10,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                flex: 1,
                fontSize: 12,
              }}
            >
              {item.product_name ||
                item.item_name ||
                item.title ||
                "Product"}{" "}
              × {Number(item.quantity || 1)}
            </Text>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {formatMoney(
                Number(
                  item.subtotal ??
                    item.total_price ??
                    Number(item.unit_price || item.price || 0) *
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
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            marginTop: 8,
            paddingTop: 10,
          }}
        >
          <Text style={{ color: COLORS.text, fontWeight: "800" }}>
            Order Total
          </Text>

          <Text
            style={{
              color: COLORS.navy,
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            {formatMoney(subtotal)}
          </Text>
        </View>
      </View>

      {/* SELLER PAYMENT DETAILS */}

      <View
        style={{
          backgroundColor: "#F4F6FA",
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
          Seller Mobile Money Details
        </Text>

        <Text
          style={{
            color: COLORS.text,
            fontWeight: "800",
            marginTop: 8,
          }}
        >
          {order.seller_momo_name || "Seller"}
        </Text>

        <Text
          selectable
          style={{
            color: COLORS.navy,
            fontSize: 20,
            fontWeight: "900",
            marginTop: 4,
          }}
        >
          {order.seller_momo_number || "Not available"}
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 11,
            marginTop: 4,
          }}
        >
          Pay the seller directly using the details above.
        </Text>
      </View>

      {buyerDeclared && (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            padding: 12,
            borderRadius: 9,
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: "#92400E",
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            Payment Declaration Submitted
          </Text>

          <Text
            style={{
              color: "#78350F",
              fontSize: 12,
              lineHeight: 19,
              marginTop: 5,
            }}
          >
            Your payment declaration has been submitted. The seller
            must verify receipt of the money before confirming your
            order.
          </Text>
        </View>
      )}

      {paymentConfirmed && (
        <View
          style={{
            backgroundColor: "#DCFCE7",
            padding: 12,
            borderRadius: 9,
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: "#166534",
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            ✓ Seller Confirmed Your Payment
          </Text>

          <Text
            style={{
              color: "#166534",
              fontSize: 12,
              marginTop: 5,
              lineHeight: 19,
            }}
          >
            Your payment has been confirmed by the seller.
          </Text>
        </View>
      )}

      {paymentRejected && (
        <View
          style={{
            backgroundColor: "#FEF2F2",
            padding: 12,
            borderRadius: 9,
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: COLORS.red,
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            Payment Declaration Rejected
          </Text>

          <Text
            style={{
              color: COLORS.text,
              fontSize: 12,
              marginTop: 5,
              lineHeight: 19,
            }}
          >
            Your payment declaration was rejected. Please check the
            payment details and contact the seller if necessary.
          </Text>
        </View>
      )}

      {!alreadyPaid && (
        <TouchableOpacity
          onPress={() => openBuyerPaymentModal(order)}
          style={{
            backgroundColor: COLORS.green,
            padding: 14,
            borderRadius: 9,
            marginTop: 13,
          }}
        >
          <Text
            style={{
              color: COLORS.white,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            I Have Paid
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
/* ===================================================
   MARKETPLACE ORDER CARD
=================================================== */

const renderMarketplaceOrder = (order: any) => {
  const status = getOrderStatus(order);
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

  const buyerDeclared =
    status === "buyer_declared" ||
    status === "payment_declared";

  const sellerConfirmed =
    status === "seller_confirmed" ||
    status === "processing" ||
    status === "completed" ||
    status === "delivered";

  const commissionStatus = String(
    commission?.status || ""
  ).toLowerCase();

  const commissionApproved =
    commissionStatus === "approved" ||
    commissionStatus === "verified";

  const commissionSubmitted =
    commissionStatus === "seller_submitted";

  const commissionRejected =
    commissionStatus === "rejected";

  const canSubmitCommission =
    sellerConfirmed &&
    !!commission &&
    ["pending", "rejected"].includes(commissionStatus);

  return (
    <View
      key={orderId}
      style={{
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        padding: 15,
        marginBottom: 12,
      }}
    >
      {/* ORDER HEADER */}

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
            fontWeight: "900",
            fontSize: 15,
          }}
        >
          Order #{orderId.slice(0, 8)}
        </Text>

        <Text
          style={{
            backgroundColor: buyerDeclared
              ? "#FEF3C7"
              : sellerConfirmed
              ? "#DCFCE7"
              : "#E5E7EB",
            color: buyerDeclared
              ? "#92400E"
              : sellerConfirmed
              ? "#166534"
              : COLORS.text,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
            fontSize: 10,
            fontWeight: "900",
          }}
        >
          {status.replace(/_/g, " ").toUpperCase()}
        </Text>
      </View>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 11,
          marginTop: 6,
        }}
      >
        {order.created_at
          ? new Date(order.created_at).toLocaleString()
          : ""}
      </Text>

      {/* ORDERED PRODUCTS */}

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          marginTop: 12,
          paddingTop: 10,
        }}
      >
        <Text
          style={{
            color: COLORS.text,
            fontWeight: "800",
            fontSize: 12,
            marginBottom: 7,
          }}
        >
          Ordered Products
        </Text>

        {(order.items || []).map((item: any, index: number) => (
          <View
            key={String(item.id || index)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 5,
              gap: 10,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                flex: 1,
                fontSize: 12,
              }}
            >
              {item.product_name ||
                item.item_name ||
                item.title ||
                "Product"}{" "}
              × {Number(item.quantity || 1)}
            </Text>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {formatMoney(
                Number(
                  item.subtotal ??
                    item.total_price ??
                    Number(item.unit_price || item.price || 0) *
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
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            marginTop: 8,
            paddingTop: 10,
          }}
        >
          <Text style={{ color: COLORS.text, fontWeight: "800" }}>
            Order Subtotal
          </Text>

          <Text
            style={{
              color: COLORS.navy,
              fontWeight: "900",
              fontSize: 15,
            }}
          >
            {formatMoney(subtotal)}
          </Text>
        </View>
      </View>

      {/* BUYER PAYMENT DECLARATION */}

      {buyerDeclared && (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderRadius: 10,
            padding: 12,
            marginTop: 13,
          }}
        >
          <Text
            style={{
              color: "#92400E",
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            Buyer says payment has been made
          </Text>

          <Text
            style={{
              color: "#78350F",
              fontSize: 12,
              lineHeight: 19,
              marginTop: 5,
            }}
          >
            Check your own MoMo account first. Confirm only after the
            money has arrived. Reject the declaration if payment was
            not received.
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
                borderRadius: 8,
                opacity: busy ? 0.5 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{
                    color: "white",
                    fontWeight: "900",
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  Confirm Payment
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy}
              onPress={() => openRejectModal(order)}
              style={{
                flex: 1,
                backgroundColor: COLORS.red,
                padding: 12,
                borderRadius: 8,
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "900",
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                Reject Payment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* NASARA COMMISSION */}

      {sellerConfirmed && (
        <View
          style={{
            backgroundColor: "#EFF6FF",
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
            Nasara Commission – 5%
          </Text>

          <Text
            style={{
              color: COLORS.blue,
              fontSize: 21,
              fontWeight: "900",
              marginTop: 5,
            }}
          >
            {formatMoney(commissionAmount)}
          </Text>

          <Text
            style={{
              color: COLORS.muted,
              fontSize: 11,
              marginTop: 5,
            }}
          >
            Commission calculated on the order subtotal.
          </Text>

          {commissionApproved ? (
            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
                marginTop: 10,
                fontSize: 12,
              }}
            >
              ✓ Commission payment verified by Nasara Admin
            </Text>
          ) : commissionSubmitted ? (
            <Text
              style={{
                color: "#92400E",
                fontWeight: "800",
                marginTop: 10,
                fontSize: 12,
              }}
            >
              Commission reference submitted. Waiting for admin
              verification.
            </Text>
          ) : commissionRejected ? (
            <>
              <Text
                style={{
                  color: COLORS.red,
                  fontWeight: "800",
                  fontSize: 12,
                  marginTop: 10,
                }}
              >
                Your commission submission was rejected. Check with
                Nasara Admin before submitting again.
              </Text>

              <TouchableOpacity
                disabled={busy}
                onPress={() => openCommissionModal(order)}
                style={{
                  backgroundColor: COLORS.navy,
                  padding: 13,
                  borderRadius: 8,
                  marginTop: 12,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "900",
                  }}
                >
                  Resubmit Commission Reference
                </Text>
              </TouchableOpacity>
            </>
          ) : canSubmitCommission ? (
            <>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 12,
                  lineHeight: 19,
                  marginTop: 9,
                }}
              >
                Pay the commission to Nasara Market using the MoMo
                details below, then submit your transaction reference.
              </Text>

              <View
                style={{
                  backgroundColor: COLORS.white,
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: COLORS.navy,
                    fontWeight: "900",
                  }}
                >
                  {momoName}
                </Text>

                <Text
                  style={{
                    color: COLORS.navy,
                    fontWeight: "900",
                    fontSize: 17,
                    marginTop: 3,
                  }}
                >
                  {momoNumber}
                </Text>

                <Text
                  style={{
                    color: COLORS.muted,
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  {momoNetwork} Mobile Money
                </Text>
              </View>

              <TouchableOpacity
                disabled={busy}
                onPress={() => openCommissionModal(order)}
                style={{
                  backgroundColor: COLORS.navy,
                  padding: 13,
                  borderRadius: 8,
                  marginTop: 12,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "900",
                  }}
                >
                  Submit Commission Payment Reference
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 10,
              }}
            >
              Commission information is not yet available for this order.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

  /* ===================================================
     DASHBOARD HEADER
  =================================================== */

  const DashboardHeader = () => (
    <View style={{ paddingHorizontal: 15, paddingTop: 15 }}>
      <View
        style={{
          backgroundColor: COLORS.navy,
          borderRadius: 18,
          padding: 20,
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            color: COLORS.gold,
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 1.5,
          }}
        >
          NASARA SELLER CENTRE
        </Text>

        <Text
          style={{
            color: COLORS.white,
            fontSize: 25,
            fontWeight: "900",
            marginTop: 8,
          }}
        >
          Business Dashboard
        </Text>

        <Text
          style={{
            color: "#D7DFED",
            fontSize: 13,
            marginTop: 7,
            lineHeight: 20,
          }}
        >
          Manage your products, monitor performance and promote your
          business on Nasara.
        </Text>

        <View
          style={{
            height: 3,
            width: 55,
            backgroundColor: COLORS.gold,
            marginTop: 15,
            borderRadius: 5,
          }}
        />
      </View>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 18,
          fontWeight: "900",
          marginBottom: 12,
        }}
      >
        Business Overview
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <StatCard
          title="Product Views"
          value={stats.views}
          icon="👁️"
          color="#2563EB"
        />
        <StatCard
          title="Enquiries"
          value={stats.enquiries}
          icon="💬"
          color="#16A34A"
        />
        <StatCard
          title="My Listings"
          value={stats.listings}
          icon="📦"
          color="#D69E2E"
        />
        <StatCard
          title="Favourites"
          value={stats.favourites}
          icon="❤️"
          color="#DB2777"
        />
      </View>

      <View
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 15,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "900",
            fontSize: 16,
            color: COLORS.navy,
          }}
        >
          Your Business Activity
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
            marginTop: 5,
            marginBottom: 13,
          }}
        >
          Performance totals across your listings.
        </Text>

        {[
          {
            label: "Total Product Views",
            value: stats.views,
            icon: "👁️",
          },
          {
            label: "Total Enquiries",
            value: stats.enquiries,
            icon: "💬",
          },
          {
            label: "Total Favourites",
            value: stats.favourites,
            icon: "❤️",
          },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 9,
              borderTopWidth: 1,
              borderTopColor: "#F1F3F5",
            }}
          >
            <Text style={{ fontSize: 17 }}>{stat.icon}</Text>

            <Text
              style={{
                flex: 1,
                marginLeft: 10,
                color: COLORS.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {stat.label}
            </Text>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              {formatNumber(stat.value)}
            </Text>
          </View>
        ))}
      </View>

      {/* MY NASARA SHOP QR CODE */}

      <View
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 18,
          marginBottom: 22,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: COLORS.navy,
            fontSize: 19,
            fontWeight: "900",
          }}
        >
          My Nasara Shop QR Code
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
            textAlign: "center",
            marginTop: 7,
            marginBottom: 15,
            lineHeight: 19,
          }}
        >
          Let customers scan this code to visit your shop and browse
          your products.
        </Text>

        {shopUrl ? (
          <>
            <View
              ref={qrRef}
              collapsable={false}
              style={{
                backgroundColor: COLORS.white,
                padding: 18,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <QRCode
                value={shopUrl}
                size={220}
                color={COLORS.navy}
                backgroundColor="#FFFFFF"
              />

              <Text
                style={{
                  color: COLORS.navy,
                  fontSize: 14,
                  fontWeight: "900",
                  marginTop: 12,
                }}
              >
                NASARA MARKETPLACE
              </Text>
            </View>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 11,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Your unique shop address
            </Text>

            <Text
              selectable
              style={{
                color: COLORS.blue,
                fontSize: 11,
                textAlign: "center",
                marginTop: 5,
              }}
            >
              {shopUrl}
            </Text>

            <TouchableOpacity
              onPress={shareShopQr}
              disabled={qrSharing}
              style={{
                backgroundColor: COLORS.navy,
                padding: 15,
                borderRadius: 10,
                width: "100%",
                marginTop: 18,
                opacity: qrSharing ? 0.6 : 1,
              }}
            >
              {qrSharing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "900",
                  }}
                >
                  Share / Save My QR Code
                </Text>
              )}
            </TouchableOpacity>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 11,
                marginTop: 10,
                textAlign: "center",
              }}
            >
              Share your QR code with customers or save it for printing.
            </Text>
          </>
        ) : (
          <ActivityIndicator color={COLORS.gold} />
        )}
      </View>

      {/* MY ADVERTISEMENTS AND BANNERS */}

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/ads/my-ads")}
          style={{
            flex: 1,
            backgroundColor: COLORS.navy,
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 23 }}>📢</Text>
          <Text
            style={{
              color: COLORS.white,
              fontWeight: "900",
              marginTop: 7,
            }}
          >
            My Ads
          </Text>
          <Text
            style={{
              color: "#D7DFED",
              fontSize: 11,
              marginTop: 4,
            }}
          >
            View my advertisements
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/banner/my-banner")}
          style={{
            flex: 1,
            backgroundColor: COLORS.gold,
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 23 }}>🖼️</Text>
          <Text
            style={{
              color: COLORS.navy,
              fontWeight: "900",
              marginTop: 7,
            }}
          >
            My Banners
          </Text>
          <Text
            style={{
              color: COLORS.navy,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            View my banners
          </Text>
        </TouchableOpacity>
      </View>
      {/* =================================================
    MY PURCHASES
================================================= */}

<View style={{ marginBottom: 22 }}>
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    }}
  >
    <View>
      <Text
        style={{
          color: COLORS.navy,
          fontSize: 19,
          fontWeight: "900",
        }}
      >
        My Purchases
      </Text>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 11,
          marginTop: 4,
        }}
      >
        Products you have ordered from Nasara sellers
      </Text>
    </View>

    <TouchableOpacity
      onPress={fetchBuyerOrders}
      disabled={buyerOrdersLoading}
      style={{
        backgroundColor: COLORS.navy,
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 8,
        opacity: buyerOrdersLoading ? 0.5 : 1,
      }}
    >
      {buyerOrdersLoading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text
          style={{
            color: "white",
            fontSize: 11,
            fontWeight: "900",
          }}
        >
          Refresh
        </Text>
      )}
    </TouchableOpacity>
  </View>

  {buyerOrdersLoading && buyerOrders.length === 0 ? (
    <ActivityIndicator
      color={COLORS.gold}
      style={{ marginVertical: 20 }}
    />
  ) : buyerOrders.length === 0 ? (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 30 }}>🛍️</Text>

      <Text
        style={{
          color: COLORS.navy,
          fontWeight: "900",
          marginTop: 8,
        }}
      >
        No Purchases Yet
      </Text>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 12,
          textAlign: "center",
          marginTop: 5,
          lineHeight: 18,
        }}
      >
        Products you order from other Nasara users will appear here.
      </Text>
    </View>
  ) : (
    buyerOrders.map(renderBuyerOrder)
  )}
</View>

      {/* MARKETPLACE ORDERS */}

      <View
        style={{
          marginBottom: 22,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                color: COLORS.navy,
                fontSize: 19,
                fontWeight: "900",
              }}
            >
              Marketplace Orders
            </Text>
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              Buyer payments and Nasara commission
            </Text>
          </View>

          <TouchableOpacity
            onPress={fetchMarketplaceOrders}
            disabled={ordersLoading}
            style={{
              backgroundColor: COLORS.navy,
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 8,
              opacity: ordersLoading ? 0.5 : 1,
            }}
          >
            {ordersLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                style={{
                  color: "white",
                  fontSize: 11,
                  fontWeight: "900",
                }}
              >
                Refresh
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {ordersLoading && marketplaceOrders.length === 0 ? (
          <ActivityIndicator
            color={COLORS.gold}
            style={{ marginVertical: 20 }}
          />
        ) : marketplaceOrders.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 20,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 30 }}>🛒</Text>
            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                marginTop: 8,
              }}
            >
              No Marketplace Orders Yet
            </Text>
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 5,
                lineHeight: 18,
              }}
            >
              Orders for products you sell will appear here. You can
              confirm buyer payments and manage your Nasara commission.
            </Text>
          </View>
        ) : (
          marketplaceOrders.map(renderMarketplaceOrder)
        )}
      </View>

      {/* MY PRODUCTS */}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: COLORS.navy,
            fontSize: 19,
            fontWeight: "900",
          }}
        >
          My Products
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
          }}
        >
          {formatNumber(listingCount)} listings
        </Text>
      </View>
    </View>
  );

  /* ===================================================
     EMPTY PRODUCTS
  =================================================== */

  const EmptyProducts = () => (
    <View
      style={{
        alignItems: "center",
        padding: 35,
        backgroundColor: COLORS.white,
        marginHorizontal: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Text style={{ fontSize: 42 }}>🛍️</Text>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 17,
          fontWeight: "900",
          marginTop: 12,
        }}
      >
        No Products Yet
      </Text>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 13,
          textAlign: "center",
          marginTop: 7,
          lineHeight: 20,
        }}
      >
        Products you post on Nasara will appear here. You can edit,
        manage and promote them from your Business Dashboard.
      </Text>
    </View>
  );

  /* ===================================================
     MAIN UI
  =================================================== */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
      }}
    >
      <FlatList
        data={displayItems}
        keyExtractor={(item) => String(item.card_id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 15 }}>
            <MyItemCard
              item={item}
              onDelete={deleteItem}
              onPromote={promoteItem}
            />
          </View>
        )}
        ListHeaderComponent={<DashboardHeader />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.gold}
              style={{ marginTop: 30 }}
            />
          ) : (
            <EmptyProducts />
          )
        }
        refreshControl={
          <RefreshControl
           refreshing={
  loading || ordersLoading || buyerOrdersLoading
}
onRefresh={() => {
  fetchMyItems();
  fetchMarketplaceOrders();
  fetchBuyerOrders();
}}
            tintColor={COLORS.gold}
          />
        }
        contentContainerStyle={{
          paddingBottom: 35,
          flexGrow: 1,
        }}
      />

      =================================================
          PROMOTION PAYMENT MODAL
      ================================================= */

      <Modal
        transparent
        visible={payVisible}
        animationType="fade"
        onRequestClose={() => setPayVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "white",
                padding: 20,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: "900",
                  color: COLORS.navy,
                }}
              >
                Promotion Payment
              </Text>

              <Text style={{ marginTop: 12 }}>Pay To:</Text>

              <Text
                style={{
                  fontWeight: "900",
                  fontSize: 16,
                  marginTop: 5,
                  color: COLORS.navy,
                }}
              >
                {momoName} - {momoNumber}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {momoNetwork} Mobile Money
              </Text>

              <Text
                style={{
                  marginTop: 18,
                  fontWeight: "700",
                }}
              >
                Select Days
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                }}
              >
                {["3", "7", "14"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDays(d)}
                    style={{
                      flex: 1,
                      padding: 12,
                      marginHorizontal: 4,
                      borderRadius: 8,
                      backgroundColor:
                        days === d ? COLORS.blue : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: days === d ? "white" : "black",
                        fontWeight: "700",
                      }}
                    >
                      {d} Days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={{
                  marginTop: 17,
                  fontWeight: "900",
                  fontSize: 16,
                  color: COLORS.navy,
                }}
              >
                Total Amount: GH₵ {Number(days) * dailyRate}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginTop: 5,
                }}
              >
                GH₵30 per day
              </Text>

              <TouchableOpacity
                disabled={paymentLoading}
                onPress={sendPayment}
                style={{
                  backgroundColor: COLORS.blue,
                  padding: 15,
                  marginTop: 20,
                  borderRadius: 9,
                  opacity: paymentLoading ? 0.6 : 1,
                }}
              >
                {paymentLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "900",
                    }}
                  >
                    I've Paid – Submit for Verification
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={paymentLoading}
                onPress={() => {
                  setPayVisible(false);
                  setSelectedItemId(null);
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 15,
                    color: "red",
                    fontWeight: "700",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* =================================================
          MARKETPLACE REJECTION / COMMISSION MODAL
      ================================================= */}

      <Modal
        transparent
        visible={orderModalVisible}
        animationType="fade"
        onRequestClose={() => {
          if (!orderActionLoading) {
            setOrderModalVisible(false);
            setSelectedOrder(null);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.white,
              padding: 20,
              borderRadius: 16,
            }}
          >
            {orderModalType === "reject" ? (
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
                    lineHeight: 19,
                    marginTop: 8,
                  }}
                >
                  Explain why you did not receive or cannot verify the
                  buyer's payment. The buyer will be notified.
                </Text>

                <TextInput
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Enter reason for rejecting payment"
                  multiline
                  textAlignVertical="top"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 9,
                    padding: 12,
                    minHeight: 100,
                    marginTop: 15,
                    color: COLORS.text,
                  }}
                />

                <TouchableOpacity
                  disabled={!!orderActionLoading}
                  onPress={rejectBuyerPayment}
                  style={{
                    backgroundColor: COLORS.red,
                    padding: 14,
                    borderRadius: 9,
                    marginTop: 15,
                    opacity: orderActionLoading ? 0.6 : 1,
                  }}
                >
                  {orderActionLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Submit Rejection
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
                  Submit Commission Payment
                </Text>

                <Text
                  style={{
                    color: COLORS.muted,
                    fontSize: 12,
                    marginTop: 8,
                    lineHeight: 19,
                  }}
                >
                  Pay Nasara Market first, then enter the transaction
                  reference from your MoMo confirmation message.
                </Text>

                <View
                  style={{
                    backgroundColor: "#F4F6FA",
                    padding: 13,
                    borderRadius: 9,
                    marginTop: 14,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontWeight: "900",
                    }}
                  >
                    {momoName}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontSize: 18,
                      fontWeight: "900",
                      marginTop: 4,
                    }}
                  >
                    {momoNumber}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.muted,
                      fontSize: 11,
                      marginTop: 3,
                    }}
                  >
                    {momoNetwork} Mobile Money
                  </Text>
                  <Text
                    style={{
                      color: COLORS.navy,
                      fontWeight: "900",
                      marginTop: 10,
                    }}
                  >
                    Commission:{" "}
                    {formatMoney(
                      Number(
                        selectedOrder?.commission?.commission_amount ??
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
                    fontWeight: "800",
                    fontSize: 12,
                    marginTop: 16,
                  }}
                >
                  MoMo Transaction Reference
                </Text>

                <TextInput
                  value={transactionReference}
                  onChangeText={setTransactionReference}
                  placeholder="Enter transaction reference"
                  autoCapitalize="characters"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 9,
                    padding: 13,
                    marginTop: 8,
                    color: COLORS.text,
                  }}
                />

                <TouchableOpacity
                  disabled={!!orderActionLoading}
                  onPress={submitCommissionPayment}
                  style={{
                    backgroundColor: COLORS.green,
                    padding: 14,
                    borderRadius: 9,
                    marginTop: 15,
                    opacity: orderActionLoading ? 0.6 : 1,
                  }}
                >
                  {orderActionLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Submit for Admin Verification
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
                setRejectionReason("");
                setTransactionReference("");
              }}
              style={{ marginTop: 15, padding: 8 }}
            >
              <Text
                style={{
                  color: COLORS.red,
                  textAlign: "center",
                  fontWeight: "800",
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