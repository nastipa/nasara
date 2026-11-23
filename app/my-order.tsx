import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

// ============================================================
// NASARA BUYER MY ORDERS
//
// Buyers can:
// - View their marketplace orders
// - View seller payment details
// - View order products
// - Declare payment
// - Track seller payment confirmation
//
// Uses existing backend payment declaration endpoint.
// Does not display seller commission to buyers.
// ============================================================

const API_BASE_URL = "https://nasara-upload-server.onrender.com";

type MarketplaceOrder = {
  id: string;
  order_number?: number | string | null;
  buyer_id: string;
  seller_id: string;
  subtotal?: number | null;
  total_amount?: number | null;
  seller_momo_name?: string | null;
  seller_momo_number?: string | null;
  payment_status?: string | null;
  order_status?: string | null;
  delivery_address?: string | null;
  delivery_location?: string | null;
  buyer_phone?: string | null;
  created_at?: string | null;
  items?: any[];
};

const NAVY = "#101D38";
const GOLD = "#D9AD55";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F4F6FA";
const TEXT = "#172033";
const MUTED = "#758096";
const BORDER = "#E5E9F0";
const GREEN = "#16834A";
const RED = "#DC2626";
const ORANGE = "#C77716";

const money = (amount: number) =>
  `GH₵ ${Number(amount || 0).toFixed(2)}`;

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
};

const readableStatus = (value?: string | null) => {
  if (!value) return "Pending";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isPaymentDeclared = (status?: string | null) => {
  const value = String(status || "").toLowerCase();

  return [
    "buyer_declared",
    "seller_confirmed",
    "confirmed",
    "paid",
  ].includes(value);
};

const isPaymentConfirmed = (status?: string | null) => {
  const value = String(status || "").toLowerCase();

  return [
    "seller_confirmed",
    "confirmed",
    "paid",
  ].includes(value);
};

const getItemName = (item: any) => {
  return (
    item?.product_title ||
    item?.item_title ||
    item?.title ||
    item?.name ||
    item?.product_name ||
    "Marketplace product"
  );
};

const getItemQuantity = (item: any) => {
  return Number(
    item?.quantity ??
    item?.qty ??
    1
  );
};

const getItemPrice = (item: any) => {
  return Number(
    item?.unit_price ??
    item?.price ??
    item?.product_price ??
    0
  );
};

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [transactionReferences, setTransactionReferences] =
    useState<Record<string, string>>({});

  const [declaringOrder, setDeclaringOrder] = useState<string | null>(
    null
  );

  const [copyingOrder, setCopyingOrder] = useState<string | null>(
    null
  );

  // ============================================================
  // ACCESS TOKEN
  // ============================================================

  const getAccessToken = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Please sign in again.");
    }

    return session.access_token;
  };

  // ============================================================
  // BACKEND API REQUEST
  // ============================================================

  const apiRequest = async (
    path: string,
    method: string,
    body?: any
  ) => {
    const token = await getAccessToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const responseText = await response.text();

    let result: any = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { message: responseText };
    }

    console.log("NASARA MY ORDERS API:", {
      path,
      status: response.status,
      result,
    });

    if (!response.ok || result.success === false) {
      throw new Error(
        result.error ||
        result.message ||
        result.details ||
        `Server request failed (${response.status}).`
      );
    }

    return result;
  };

  // ============================================================
  // LOAD BUYER ORDERS
  // ============================================================

  const loadOrders = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in to view your orders.");
      }

      // Only orders where the signed-in user is the buyer.
      const { data, error } = await (supabase as any)
        .from("nasara_marketplace_orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const buyerOrders: MarketplaceOrder[] = data || [];

      // Attach order items separately.
      // If the item query fails, the orders themselves remain visible.
      if (buyerOrders.length > 0) {
        try {
          const orderIds = buyerOrders.map((order) => order.id);

          const { data: orderItems, error: itemsError } =
            await (supabase as any)
              .from("nasara_marketplace_order_items")
              .select("*")
              .in("order_id", orderIds);

          if (itemsError) {
            console.log(
              "NASARA ORDER ITEMS ERROR:",
              itemsError.message
            );
          } else {
            const itemsByOrder: Record<string, any[]> = {};

            (orderItems || []).forEach((item: any) => {
              const orderId = String(item.order_id);

              if (!itemsByOrder[orderId]) {
                itemsByOrder[orderId] = [];
              }

              itemsByOrder[orderId].push(item);
            });

            buyerOrders.forEach((order) => {
              order.items = itemsByOrder[order.id] || [];
            });
          }
        } catch (itemError: any) {
          console.log(
            "NASARA ORDER ITEMS LOAD ERROR:",
            itemError?.message || itemError
          );
        }
      }

      setOrders(buyerOrders);
    } catch (error: any) {
      console.log(
        "NASARA MY ORDERS ERROR:",
        error?.message || error
      );

      showMessage(
        "My Orders",
        error?.message || "Could not load your orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ============================================================
  // REFRESH
  // ============================================================

  const onRefresh = () => {
    if (refreshing) return;

    setRefreshing(true);
    loadOrders();
  };

  // ============================================================
  // COPY SELLER MOMO NUMBER
  // ============================================================

  const copyMomoNumber = async (
    orderId: string,
    momoNumber: string
  ) => {
    try {
      setCopyingOrder(orderId);

      await Clipboard.setStringAsync(String(momoNumber));

      showMessage(
        "MoMo Number Copied",
        "The seller's Mobile Money number has been copied."
      );
    } catch (error) {
      console.log("NASARA COPY MOMO ERROR:", error);

      showMessage(
        "Copy Failed",
        "Please copy the seller's MoMo number manually."
      );
    } finally {
      setCopyingOrder(null);
    }
  };

  // ============================================================
  // BUYER DECLARES PAYMENT
  //
  // Reuses Checkout endpoint:
  // POST /marketplace/orders/:id/payment-declared
  //
  // Backend handles seller and admin notifications.
  // ============================================================

  const handlePaymentDeclared = async (
    order: MarketplaceOrder
  ) => {
    if (declaringOrder) return;

    if (isPaymentDeclared(order.payment_status)) {
      showMessage(
        "Payment Already Submitted",
        "Your payment declaration has already been submitted."
      );
      return;
    }

    const reference =
      transactionReferences[order.id]?.trim() || "";

    if (reference.length < 4) {
      showMessage(
        "Transaction Reference",
        "Enter your Mobile Money transaction reference before declaring payment."
      );
      return;
    }

    try {
      setDeclaringOrder(order.id);

      await apiRequest(
        `/marketplace/orders/${order.id}/payment-declared`,
        "POST",
        {
          transaction_reference: reference,
        }
      );

      // Update the local screen immediately.
      setOrders((previous) =>
        previous.map((item) =>
          item.id === order.id
            ? {
                ...item,
                payment_status: "buyer_declared",
              }
            : item
        )
      );

      setTransactionReferences((previous) => ({
        ...previous,
        [order.id]: "",
      }));

      showMessage(
        "Payment Submitted",
        "Nasara Admin and the seller have been notified. The seller must confirm receipt of your payment."
      );

      // Load the latest status from the database.
      await loadOrders();
    } catch (error: any) {
      console.log(
        "NASARA PAYMENT DECLARATION ERROR:",
        error?.message || error
      );

      showMessage(
        "Payment Declaration Failed",
        error?.message ||
          "We could not submit your payment declaration."
      );
    } finally {
      setDeclaringOrder(null);
    }
  };

  // ============================================================
  // PAYMENT STATUS DISPLAY
  // ============================================================

  const renderPaymentStatus = (order: MarketplaceOrder) => {
    if (isPaymentConfirmed(order.payment_status)) {
      return (
        <View style={styles.confirmedStatus}>
          <Text style={styles.confirmedStatusText}>
            Payment confirmed by seller
          </Text>
        </View>
      );
    }

    if (isPaymentDeclared(order.payment_status)) {
      return (
        <View style={styles.pendingStatus}>
          <Text style={styles.pendingStatusText}>
            Payment submitted - waiting for seller confirmation
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.unpaidStatus}>
        <Text style={styles.unpaidStatusText}>
          Payment not yet declared
        </Text>
      </View>
    );
  };

  // ============================================================
  // ORDER CARD
  // ============================================================

  const renderOrder = (
    order: MarketplaceOrder,
    index: number
  ) => {
    const alreadyDeclared = isPaymentDeclared(
      order.payment_status
    );

    const items = order.items || [];

    return (
      <View key={order.id} style={styles.orderCard}>
        {/* ORDER HEADER */}

        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderLabel}>
              ORDER {order.order_number || index + 1}
            </Text>

            <Text style={styles.orderDate}>
              {formatDate(order.created_at)}
            </Text>
          </View>

          <Text style={styles.orderAmount}>
            {money(
              Number(order.total_amount ?? order.subtotal ?? 0)
            )}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* ORDER STATUS */}

        <Text style={styles.sectionTitle}>
          Order Information
        </Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Order status
          </Text>

          <Text style={styles.detailValue}>
            {readableStatus(order.order_status)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Payment status
          </Text>

          <Text style={styles.detailValue}>
            {readableStatus(order.payment_status)}
          </Text>
        </View>

        {renderPaymentStatus(order)}

        {/* ORDER PRODUCTS */}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>
          Products in this Order
        </Text>

        {items.length > 0 ? (
          items.map((item: any, itemIndex: number) => {
            const quantity = getItemQuantity(item);
            const price = getItemPrice(item);

            return (
              <View
                key={item.id || `${order.id}-${itemIndex}`}
                style={styles.productRow}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {getItemName(item)}
                  </Text>

                  <Text style={styles.productQuantity}>
                    Quantity: {quantity}
                  </Text>
                </View>

                {price > 0 ? (
                  <Text style={styles.productPrice}>
                    {money(price * quantity)}
                  </Text>
                ) : null}
              </View>
            );
          })
        ) : (
          <Text style={styles.mutedText}>
            Product details are not available for this order.
          </Text>
        )}

        {/* SELLER MOMO */}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>
          Seller Payment Details
        </Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Account name
          </Text>

          <Text style={styles.detailValue}>
            {order.seller_momo_name || "Not available"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            MoMo number
          </Text>

          <Text style={styles.momoNumber}>
            {order.seller_momo_number || "Not available"}
          </Text>
        </View>

        {order.seller_momo_number ? (
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() =>
              copyMomoNumber(
                order.id,
                order.seller_momo_number!
              )
            }
            disabled={copyingOrder === order.id}
          >
            <Text style={styles.copyButtonText}>
              {copyingOrder === order.id
                ? "Copying..."
                : "Copy Seller MoMo Number"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* DECLARE PAYMENT */}

        {!alreadyDeclared ? (
          <>
            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>
              Declare Your Payment
            </Text>

            <Text style={styles.paymentInstructions}>
              After sending the money to the seller's MoMo account,
              enter the transaction reference you received.
            </Text>

            <Text style={styles.inputLabel}>
              MoMo transaction reference
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter transaction reference"
              placeholderTextColor={MUTED}
              value={transactionReferences[order.id] || ""}
              onChangeText={(value) =>
                setTransactionReferences((previous) => ({
                  ...previous,
                  [order.id]: value,
                }))
              }
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[
                styles.payButton,
                declaringOrder === order.id &&
                  styles.disabledButton,
              ]}
              disabled={!!declaringOrder}
              onPress={() => handlePaymentDeclared(order)}
            >
              {declaringOrder === order.id ? (
                <ActivityIndicator color={GOLD} />
              ) : (
                <Text style={styles.payButtonText}>
                  I Have Paid
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}

        {/* DELIVERY INFORMATION */}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>
          Delivery Information
        </Text>

        <Text style={styles.deliveryText}>
          Address: {order.delivery_address || "Not available"}
        </Text>

        <Text style={styles.deliveryText}>
          Town / Community: {order.delivery_location || "Not available"}
        </Text>

        {order.buyer_phone ? (
          <Text style={styles.deliveryText}>
            Contact: {order.buyer_phone}
          </Text>
        ) : null}

        <Text style={styles.orderId}>
          Order ID: {order.id}
        </Text>
      </View>
    );
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          backgroundColor={NAVY}
          barStyle="light-content"
        />

        <ActivityIndicator size="large" color={GOLD} />

        <Text style={styles.loadingText}>
          Loading your orders...
        </Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // MAIN SCREEN
  // ============================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={NAVY}
        barStyle="light-content"
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            My Orders
          </Text>

          <Text style={styles.headerSubtitle}>
            Track your Nasara marketplace purchases
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={NAVY}
          />
        }
      >
        {/* INTRO */}

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            Your Purchases
          </Text>

          <Text style={styles.introDescription}>
            All marketplace orders placed using your Nasara
            account appear here. Each seller has a separate order
            and payment.
          </Text>

          <Text style={styles.orderCount}>
            {orders.length} order(s)
          </Text>
        </View>

        {/* ORDERS */}

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🛍️
            </Text>

            <Text style={styles.emptyTitle}>
              No orders yet
            </Text>

            <Text style={styles.emptyDescription}>
              When you place an order on Nasara, it will appear
              here.
            </Text>

            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.shopButtonText}>
                Continue Shopping
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order, index) =>
            renderOrder(order, index)
          )
        )}

        {/* REFRESH */}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? "Refreshing..." : "Refresh Orders"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Nasara Marketplace
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: MUTED,
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
  },

  header: {
    minHeight: 76,
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: WHITE,
    fontSize: 31,
    lineHeight: 34,
    marginTop: -4,
  },

  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: GOLD,
    fontSize: 10,
    marginTop: 4,
  },

  content: {
    padding: 14,
    paddingBottom: 40,
  },

  introCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },

  introTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
  },

  introDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  orderCount: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12,
  },

  orderCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },

  orderLabel: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "900",
  },

  orderDate: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
  },

  orderAmount: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 13,
  },

  sectionTitle: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },

  detailLabel: {
    color: MUTED,
    fontSize: 11,
  },

  detailValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "800",
    maxWidth: "60%",
    textAlign: "right",
  },

  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  productInfo: {
    flex: 1,
    paddingRight: 10,
  },

  productName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },

  productQuantity: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  productPrice: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "800",
  },

  mutedText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
  },

  momoNumber: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "900",
  },

  copyButton: {
    backgroundColor: NAVY,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 5,
  },

  copyButtonText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
  },

  paymentInstructions: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    marginBottom: 5,
  },

  inputLabel: {
    color: NAVY,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 13,
    marginBottom: 7,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: TEXT,
    backgroundColor: WHITE,
    fontSize: 13,
  },

  payButton: {
    backgroundColor: NAVY,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },

  disabledButton: {
    opacity: 0.45,
  },

  payButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
  },

  confirmedStatus: {
    backgroundColor: "#EAF7EF",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  confirmedStatusText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },

  pendingStatus: {
    backgroundColor: "#FFF6E8",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  pendingStatusText: {
    color: ORANGE,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  unpaidStatus: {
    backgroundColor: "#F1F3F7",
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },

  unpaidStatusText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  deliveryText: {
    color: TEXT,
    fontSize: 11,
    lineHeight: 19,
  },

  orderId: {
    color: MUTED,
    fontSize: 9,
    marginTop: 14,
  },

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: "900",
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },

  shopButton: {
    backgroundColor: NAVY,
    borderRadius: 11,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 20,
  },

  shopButtonText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },

  refreshButton: {
    backgroundColor: NAVY,
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 5,
  },

  refreshButtonText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },

  footerNote: {
    textAlign: "center",
    color: MUTED,
    fontSize: 10,
    marginTop: 16,
  },
});