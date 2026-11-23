import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
// NASARA CHECKOUT
// Buyer pays each seller directly through Mobile Money.
// Nasara Admin and seller are notified when buyer declares paid.
// Commission is never displayed to the buyer.
// ============================================================

const CART_STORAGE_KEY = "NASARA_MARKETPLACE_CART";
const API_BASE_URL = "https://nasara-upload-server.onrender.com";

type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  seller_id: string;
  seller_phone?: string | null;
  category?: string | null;
  location?: string | null;
};

type SellerProfile = {
  id: string;
  momo_name: string | null;
  momo_number: string | null;
  business_name: string | null;
  full_name: string | null;
  username: string | null;
};

type SellerGroup = {
  sellerId: string;
  seller: SellerProfile | null;
  items: CartItem[];
  subtotal: number;
};

type MarketplaceOrder = {
  id: string;
  order_number?: number;
  seller_id: string;
  subtotal: number;
  total_amount: number;
  seller_momo_name: string;
  seller_momo_number: string;
  payment_status: string;
  order_status: string;
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

const money = (amount: number) =>
  `GH₵ ${Number(amount || 0).toFixed(2)}`;

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
};

const getSellerName = (seller: SellerProfile | null) => {
  if (!seller) return "Nasara Seller";

  return (
    seller.business_name ||
    seller.full_name ||
    seller.username ||
    "Nasara Seller"
  );
};

export default function CheckoutScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copyingSeller, setCopyingSeller] = useState<string | null>(null);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [transactionReferences, setTransactionReferences] = useState<
    Record<string, string>
  >({});
  const [declaringOrder, setDeclaringOrder] = useState<string | null>(null);

  const [ordersCreated, setOrdersCreated] = useState(false);

  // ============================================================
  // API HELPER
  // ============================================================

  const getAccessToken = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Please sign in again before checking out.");
    }

    return session.access_token;
  };

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

  console.log("NASARA API RESPONSE:", {
    path,
    status: response.status,
    result,
  });

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error ||
      result.message ||
      result.details ||
      `Server request failed with status ${response.status}.`
    );
  }

  return result;
};
  // ============================================================
  // LOAD CART AND SELLER PAYMENT DETAILS
  // ============================================================

  const loadCheckout = useCallback(async () => {
    try {
      setLoading(true);

      const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);

      if (!savedCart) {
        setCartItems([]);
        setSellerProfiles([]);
        return;
      }

      const parsed = JSON.parse(savedCart);

      if (!Array.isArray(parsed)) {
        setCartItems([]);
        setSellerProfiles([]);
        return;
      }

      const validItems: CartItem[] = parsed.filter(
  (item: any) =>
    item &&
    typeof item.id === "string" &&
    Number(item.price) > 0 &&
    Number(item.quantity) > 0
);

if (validItems.length === 0) {
  setCartItems([]);
  setSellerProfiles([]);
  return;
}

// ============================================================
// GET REAL PRODUCT OWNERS AND THEIR SELLER MOMO ACCOUNTS
// The buyer's profile must NEVER be used as the seller account.
// ============================================================

const {
  data: { user: buyer },
  error: buyerError,
} = await supabase.auth.getUser();

if (buyerError || !buyer) {
  throw new Error("Please sign in again.");
}

// 1. Retrieve the actual product owners.
const { data: productOwners, error: ownersError } = await (supabase as any)
  .from("items_live")
  .select("id,user_id")
  .in("id", validItems.map((item) => item.id));

if (ownersError) {
  throw new Error(
    `Could not retrieve product sellers: ${ownersError.message}`
  );
}

if (!productOwners || productOwners.length !== validItems.length) {
  throw new Error(
    "Some products could not be matched to their seller accounts."
  );
}

// 2. Build product ID -> actual seller ID mapping.
const ownerMap = new Map<string, string>();

productOwners.forEach((product: any) => {
  if (product.id && product.user_id) {
    ownerMap.set(String(product.id), String(product.user_id));
  }
});

// 3. Correct every cart item's seller ID.
const correctedItems: CartItem[] = validItems.map((item) => {
  const actualSellerId = ownerMap.get(String(item.id));

  if (!actualSellerId) {
    throw new Error(
      `Seller account not found for product: ${item.title}`
    );
  }

  if (actualSellerId === buyer.id) {
    console.log(
      "NASARA WARNING: Product owner is the signed-in buyer:",
      item.id
    );
  }

  return {
    ...item,
    seller_id: actualSellerId,
  };
});

// 4. Get unique seller IDs from product ownership.
const sellerIds = [
  ...new Set(correctedItems.map((item) => item.seller_id)),
];

if (sellerIds.length === 0) {
  throw new Error("No seller accounts were found.");
}

// 5. Fetch ONLY those sellers' MoMo details.
// Do not fetch the buyer profile as a fallback.
const { data: sellerData, error: sellerError } = await (supabase as any)
  .from("profiles")
  .select(
    "id,momo_name,momo_number,business_name,full_name,username"
  )
  .in("id", sellerIds);

if (sellerError) {
  throw new Error(
    `Could not retrieve seller payment details: ${sellerError.message}`
  );
}

// 6. Verify every product seller has a matching profile.
const sellerProfileMap = new Map<string, SellerProfile>();

(sellerData || []).forEach((seller: any) => {
  sellerProfileMap.set(String(seller.id), seller);
});

for (const sellerId of sellerIds) {
  const seller = sellerProfileMap.get(sellerId);

  if (!seller) {
    throw new Error(
      `Seller profile not found for seller account ${sellerId}.`
    );
  }

  if (!seller.momo_name || !seller.momo_number) {
    throw new Error(
      `${seller.business_name || seller.full_name || seller.username || "A seller"} has not added complete MoMo details.`
    );
  }
}

// 7. Save corrected cart ownership.
await AsyncStorage.setItem(
  CART_STORAGE_KEY,
  JSON.stringify(correctedItems)
);

setCartItems(correctedItems);
setSellerProfiles(sellerData || []);

// 8. Diagnostic: IDs only, never expose MoMo numbers.
console.log("NASARA VERIFIED SELLER PAYMENT ACCOUNTS:", {
  buyer_id: buyer.id,
  sellers: (sellerData || []).map((seller: any) => ({
    profile_id: seller.id,
    is_buyer: seller.id === buyer.id,
    has_momo_name: !!seller.momo_name,
    has_momo_number: !!seller.momo_number,
  })),
});
    } catch (error: any) {
      console.log("Checkout loading error:", error?.message || error);

      showMessage(
        "Checkout Error",
        error?.message || "We could not load your checkout details."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  // ============================================================
  // GROUP PRODUCTS BY SELLER
  // ============================================================

  const sellerGroups = useMemo<SellerGroup[]>(() => {
    const groups: Record<string, CartItem[]> = {};

    cartItems.forEach((item) => {
      if (!groups[item.seller_id]) {
        groups[item.seller_id] = [];
      }

      groups[item.seller_id].push(item);
    });

    return Object.entries(groups).map(([sellerId, items]) => {
      const seller =
        sellerProfiles.find((profile) => profile.id === sellerId) || null;

      return {
        sellerId,
        seller,
        items,
        subtotal: items.reduce(
          (total, item) =>
            total + Number(item.price) * item.quantity,
          0
        ),
      };
    });
  }, [cartItems, sellerProfiles]);

  // ============================================================
  // TOTALS
  // ============================================================

  const totalQuantity = useMemo(
    () =>
      cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const grandTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + Number(item.price) * item.quantity,
        0
      ),
    [cartItems]
  );

  const allSellersHaveMomo = useMemo(
    () =>
      sellerGroups.length > 0 &&
      sellerGroups.every(
        (group) =>
          !!group.seller?.momo_name &&
          !!group.seller?.momo_number
      ),
    [sellerGroups]
  );

  // ============================================================
  // COPY MOMO NUMBER
  // ============================================================

  const copyMomoNumber = async (
    sellerId: string,
    momoNumber: string
  ) => {
    try {
      setCopyingSeller(sellerId);

      await Clipboard.setStringAsync(String(momoNumber));

      showMessage(
        "MoMo Number Copied",
        "The seller's Mobile Money number has been copied."
      );
    } catch (error) {
      console.log("Copy MoMo error:", error);

      showMessage(
        "Copy Failed",
        "Please copy the MoMo number manually."
      );
    } finally {
      setCopyingSeller(null);
    }
  };

  // ============================================================
  // CREATE MARKETPLACE ORDERS
  // One order is created for each seller by the backend.
  // ============================================================

  const handlePlaceOrder = async () => {
    if (submitting) return;

    if (cartItems.length === 0) {
      showMessage("Empty Cart", "Add products before checking out.");
      return;
    }

    if (!deliveryAddress.trim()) {
      showMessage("Delivery Address", "Enter your delivery address.");
      return;
    }

    if (!deliveryLocation.trim()) {
      showMessage("Delivery Location", "Enter your town or community.");
      return;
    }

    if (!buyerPhone.trim()) {
      showMessage("Phone Number", "Enter your contact phone number.");
      return;
    }

    if (!allSellersHaveMomo) {
      showMessage(
        "Payment Details Missing",
        "Every seller must provide a MoMo name and number before an order can be placed."
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await apiRequest(
        "/marketplace/orders/create",
        "POST",
        {
          items: cartItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
          delivery_address: deliveryAddress.trim(),
          delivery_location: deliveryLocation.trim(),
          buyer_phone: buyerPhone.trim(),
        }
      );

      const createdOrders = Array.isArray(result.orders)
        ? result.orders
        : [];

      if (createdOrders.length === 0) {
        throw new Error("The server did not return any created orders.");
      }

      setOrders(createdOrders);
      setOrdersCreated(true);

      // Clear cart only after successful order creation.
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
      setCartItems([]);

      showMessage(
        "Orders Created",
        `Your ${createdOrders.length} seller order(s) have been created. Pay each seller separately and then declare your payment below.`
      );
    } catch (error: any) {
      console.log("Place order error:", error?.message || error);

      showMessage(
        "Order Failed",
        error?.message || "We could not create your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // BUYER DECLARES PAYMENT
  // Backend notifies BOTH seller and Nasara Admin.
  // ============================================================

  const handlePaymentDeclared = async (order: MarketplaceOrder) => {
    if (declaringOrder) return;

    const reference = transactionReferences[order.id]?.trim() || "";

    if (reference.length < 4) {
      showMessage(
        "Transaction Reference",
        "Enter the Mobile Money transaction reference before declaring payment."
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

      showMessage(
        "Payment Submitted",
        "Nasara and the seller have been notified. The seller must confirm receipt of your payment."
      );
    } catch (error: any) {
      console.log("Payment declaration error:", error?.message || error);

      showMessage(
        "Payment Declaration Failed",
        error?.message || "We could not submit your payment declaration."
      );
    } finally {
      setDeclaringOrder(null);
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={NAVY} barStyle="light-content" />

        <ActivityIndicator size="large" color={GOLD} />

        <Text style={styles.loadingText}>
          Preparing your checkout...
        </Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // ORDERS CREATED - PAYMENT INSTRUCTIONS
  // ============================================================

  if (ordersCreated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={NAVY} barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Pay Your Sellers</Text>
            <Text style={styles.headerSubtitle}>
              Each seller has a separate order
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>
              Your Orders Are Ready
            </Text>

            <Text style={styles.introDescription}>
              Pay each seller the exact amount shown. Enter the transaction
              reference and tap I have paid after sending the money.
            </Text>
          </View>

          {orders.map((order, index) => {
            const alreadyDeclared =
              order.payment_status === "buyer_declared" ||
              order.payment_status === "seller_confirmed";

            return (
              <View key={order.id} style={styles.sellerCard}>
                <Text style={styles.sellerLabel}>
                  ORDER {order.order_number || index + 1}
                </Text>

                <Text style={styles.sellerName}>
                  {order.seller_momo_name || "Seller"}
                </Text>

                <View style={styles.sellerTotalRow}>
                  <Text style={styles.sellerTotalLabel}>
                    Amount to pay
                  </Text>

                  <Text style={styles.sellerTotalValue}>
                    {money(order.total_amount || order.subtotal)}
                  </Text>
                </View>

                <View style={styles.paymentCard}>
                  <Text style={styles.paymentTitle}>
                    Seller Mobile Money
                  </Text>

                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentLabel}>Account name</Text>
                    <Text style={styles.paymentValue}>
                      {order.seller_momo_name}
                    </Text>
                  </View>

                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentLabel}>MoMo number</Text>
                    <Text style={styles.paymentNumber}>
                      {order.seller_momo_number}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() =>
                      copyMomoNumber(
                        order.seller_id,
                        order.seller_momo_number
                      )
                    }
                    disabled={copyingSeller === order.seller_id}
                  >
                    <Text style={styles.copyButtonText}>
                      {copyingSeller === order.seller_id
                        ? "Copying..."
                        : "Copy MoMo Number"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {alreadyDeclared ? (
                  <View style={styles.successStatus}>
                    <Text style={styles.successStatusText}>
                      {order.payment_status === "seller_confirmed"
                        ? "Payment confirmed by seller"
                        : "Payment declaration submitted - waiting for seller"}
                    </Text>
                  </View>
                ) : (
                  <>
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
                        declaringOrder === order.id && styles.disabledButton,
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
                )}
              </View>
            );
          })}

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>
              What happens next?
            </Text>

            <Text style={styles.instructionText}>
              1. The seller receives your payment declaration.
            </Text>

            <Text style={styles.instructionText}>
              2. Nasara Admin also receives a notification.
            </Text>

            <Text style={styles.instructionText}>
              3. The seller confirms receipt of your payment.
            </Text>

            <Text style={styles.instructionText}>
              4. The seller prepares and dispatches your package.
            </Text>

            <Text style={styles.instructionText}>
              5. You receive a notification when the package is dispatched.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.secondaryButtonText}>
              Continue to Nasara
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================
  // EMPTY CART
  // ============================================================

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={NAVY} barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Checkout</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>

          <Text style={styles.emptyTitle}>
            Your cart is empty
          </Text>

          <Text style={styles.emptyDescription}>
            Add products to your cart before checking out.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>
              Return to Cart
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // MAIN CHECKOUT
  // ============================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={NAVY} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>
            Review your products and delivery details
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            Complete Your Purchase
          </Text>

          <Text style={styles.introDescription}>
            Each seller receives a separate order. You will pay each seller
            directly through Mobile Money.
          </Text>
        </View>

        {/* SELLER GROUPS */}

        {sellerGroups.map((group, index) => (
          <View key={group.sellerId} style={styles.sellerCard}>
            <View style={styles.sellerHeader}>
              <View style={styles.sellerIcon}>
                <Text style={styles.sellerIconText}>🏪</Text>
              </View>

              <View style={styles.sellerInfo}>
                <Text style={styles.sellerLabel}>
                  SELLER {index + 1}
                </Text>

                <Text style={styles.sellerName}>
                  {getSellerName(group.seller)}
                </Text>
              </View>

              <Text style={styles.itemCountText}>
                {group.items.length} item(s)
              </Text>
            </View>

            {group.items.map((item) => (
              <View key={item.id} style={styles.productRow}>
                <View style={styles.productDetails}>
                  <Text style={styles.productTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.productQuantity}>
                    Quantity: {item.quantity}
                  </Text>
                </View>

                <Text style={styles.productTotal}>
                  {money(Number(item.price) * item.quantity)}
                </Text>
              </View>
            ))}

            <View style={styles.sellerTotalRow}>
              <Text style={styles.sellerTotalLabel}>
                Amount to pay this seller
              </Text>

              <Text style={styles.sellerTotalValue}>
                {money(group.subtotal)}
              </Text>
            </View>

            <View style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>
                Seller Mobile Money
              </Text>

              {group.seller?.momo_name && group.seller?.momo_number ? (
                <>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentLabel}>Account name</Text>
                    <Text style={styles.paymentValue}>
                      {group.seller.momo_name}
                    </Text>
                  </View>

                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentLabel}>MoMo number</Text>
                    <Text style={styles.paymentNumber}>
                      {group.seller.momo_number}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() =>
                      copyMomoNumber(
                        group.sellerId,
                        group.seller!.momo_number!
                      )
                    }
                  >
                    <Text style={styles.copyButtonText}>
                      Copy MoMo Number
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.missingMomoText}>
                  This seller has not added complete MoMo details.
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* DELIVERY DETAILS */}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Delivery Details
          </Text>

          <Text style={styles.inputLabel}>
            Delivery address
          </Text>

          <TextInput
            style={styles.input}
            placeholder="House number, street or landmark"
            placeholderTextColor={MUTED}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
          />

          <Text style={styles.inputLabel}>
            Town or community
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Tamale"
            placeholderTextColor={MUTED}
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
          />

          <Text style={styles.inputLabel}>
            Contact phone number
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Your phone number"
            placeholderTextColor={MUTED}
            value={buyerPhone}
            onChangeText={setBuyerPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* ORDER SUMMARY */}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Your Order Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total products</Text>
            <Text style={styles.summaryValue}>{totalQuantity}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Number of sellers</Text>
            <Text style={styles.summaryValue}>
              {sellerGroups.length}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total payable</Text>
            <Text style={styles.grandTotalValue}>
              {money(grandTotal)}
            </Text>
          </View>

          <Text style={styles.summaryNote}>
            This is the combined product value. Each seller will have a
            separate order and payment.
          </Text>
        </View>

        {/* PLACE ORDER */}

        <TouchableOpacity
          style={[
            styles.payButton,
            (!allSellersHaveMomo || submitting) && styles.disabledButton,
          ]}
          disabled={!allSellersHaveMomo || submitting}
          onPress={handlePlaceOrder}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <Text style={styles.payButtonText}>
              Place Order
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Nasara marketplace checkout
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    color: MUTED,
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
  backButtonText: {
    color: WHITE,
    fontSize: 31,
    lineHeight: 34,
    marginTop: -4,
  },
  headerTitleContainer: {
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
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  introTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "900",
  },
  introDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
  sellerCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sellerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sellerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F2F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  sellerIconText: {
    fontSize: 20,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  sellerLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },
  sellerName: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  itemCountText: {
    color: NAVY,
    fontSize: 10,
    fontWeight: "800",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  productDetails: {
    flex: 1,
    paddingRight: 10,
  },
  productTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  productQuantity: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },
  productTotal: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  sellerTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 13,
    marginTop: 5,
  },
  sellerTotalLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  sellerTotalValue: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "900",
  },
  paymentCard: {
    backgroundColor: "#F6F8FC",
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5EAF2",
  },
  paymentTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 12,
  },
  paymentDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },
  paymentLabel: {
    color: MUTED,
    fontSize: 11,
  },
  paymentValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
    maxWidth: "65%",
    textAlign: "right",
  },
  paymentNumber: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "900",
  },
  copyButton: {
    backgroundColor: NAVY,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 3,
  },
  copyButtonText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },
  missingMomoText: {
    color: RED,
    fontSize: 11,
    lineHeight: 17,
  },
  summaryCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 2,
  },
  summaryTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 12,
  },
  summaryValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 5,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
  },
  grandTotalLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  grandTotalValue: {
    color: GREEN,
    fontSize: 21,
    fontWeight: "900",
  },
  summaryNote: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
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
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
  },
  disabledButton: {
    opacity: 0.45,
  },
  payButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
  },
  successStatus: {
    backgroundColor: "#EAF7EF",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  successStatusText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  instructionCard: {
    backgroundColor: "#FFF9ED",
    borderWidth: 1,
    borderColor: "#F1E2C2",
    borderRadius: 13,
    padding: 15,
    marginTop: 15,
  },
  instructionTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  instructionText: {
    color: TEXT,
    fontSize: 11,
    lineHeight: 19,
    marginBottom: 5,
  },
  secondaryButton: {
    backgroundColor: "#E9EDF4",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  secondaryButtonText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "900",
  },
  footerNote: {
    textAlign: "center",
    color: MUTED,
    fontSize: 10,
    marginTop: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
  },
  emptyDescription: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 11,
    marginTop: 22,
  },
  primaryButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
  },
});