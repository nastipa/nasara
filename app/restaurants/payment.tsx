import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const CART_STORAGE_KEY = "nasara_restaurant_cart";

type Restaurant = {
  id: string;
  name: string;
  phone: string;
  address: string;
  logo_url: string | null;
  cover_image_url: string | null;
  is_open: boolean;
  status: string;
  accepts_momo: boolean;
  accepts_cash: boolean;
  accepts_card: boolean;
  momo_provider: string | null;
  momo_number: string | null;
  momo_account_name: string | null;
};

type CartItem = {
  menuItemId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type StoredCartItem = {
  menuItemId?: string;
  restaurantId?: string;
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  quantity?: number;

  // Supports the older cart format too.
  menuItem?: {
    id: string;
    restaurant_id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    preparation_time_minutes: number | null;
    is_available: boolean;
    is_featured: boolean;
  };
};

type StoredCart = {
  restaurantId?: string;
  restaurantName?: string;
  items?: StoredCartItem[];
};

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }

  const { Alert } = require("react-native");
  Alert.alert(title, message);
}

function formatMoney(amount: number) {
  return `GH₵ ${Number(amount || 0).toFixed(2)}`;
}

function createOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `NSR-FOOD-${year}${month}${day}-${random}`;
}

function createPaymentReference() {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `NSR-PAY-${Date.now()}-${random}`;
}

function normalizeCartItem(item: StoredCartItem): CartItem | null {
  if (item.menuItem) {
    return {
      menuItemId: item.menuItem.id,
      restaurantId: item.menuItem.restaurant_id,
      name: item.menuItem.name,
      description: item.menuItem.description,
      price: Number(item.menuItem.price || 0),
      imageUrl: item.menuItem.image_url,
      quantity: Math.max(1, Number(item.quantity || 1)),
    };
  }

  if (
    !item.menuItemId ||
    !item.restaurantId ||
    !item.name ||
    typeof item.price !== "number"
  ) {
    return null;
  }

  return {
    menuItemId: item.menuItemId,
    restaurantId: item.restaurantId,
    name: item.name,
    description: item.description ?? null,
    price: Number(item.price),
    imageUrl: item.imageUrl ?? null,
    quantity: Math.max(1, Number(item.quantity || 1)),
  };
}

export default function RestaurantPaymentScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    restaurantId?: string | string[];
  }>();

  const restaurantId = Array.isArray(params.restaurantId)
    ? params.restaurantId[0]
    : params.restaurantId;

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [momoProvider, setMomoProvider] = useState("");
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");

  const [paymentNote, setPaymentNote] = useState("");

  const loadRestaurant = useCallback(async () => {
    if (!restaurantId) {
      return;
    }

    const { data, error } = await (supabase as any)
      .from("restaurants")
      .select(
        `
        id,
        name,
        phone,
        address,
        logo_url,
        cover_image_url,
        is_open,
        status,
        accepts_momo,
        accepts_cash,
        accepts_card,
        momo_provider,
        momo_number,
        momo_account_name
        `
      )
      .eq("id", restaurantId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Restaurant payment load error:", error);
      throw error;
    }

    setRestaurant(data as Restaurant | null);
  }, [restaurantId]);

  const loadCart = useCallback(async () => {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);

    if (!raw) {
      setCart([]);
      return;
    }

    const stored: StoredCart = JSON.parse(raw);

    if (
      restaurantId &&
      stored.restaurantId &&
      stored.restaurantId !== restaurantId
    ) {
      setCart([]);
      return;
    }

    const items = (stored.items || [])
      .map(normalizeCartItem)
      .filter(Boolean) as CartItem[];

    setCart(items);
  }, [restaurantId]);

  const loadCustomer = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.log("Profile load error:", error);
      return;
    }

    if (data?.full_name) {
      setCustomerName(data.full_name);
    }

    if (data?.phone) {
      setCustomerPhone(data.phone);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadRestaurant(),
        loadCart(),
        loadCustomer(),
      ]);
    } catch (error) {
      console.error("Payment screen error:", error);

      showMessage(
        "Unable to load payment",
        "Please go back and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [loadCart, loadCustomer, loadRestaurant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const foodSubtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const serviceFee = 0;

  const totalAmount = foodSubtotal + serviceFee;

  const totalItems = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const validatePayment = () => {
    if (!restaurant) {
      showMessage(
        "Restaurant unavailable",
        "The restaurant could not be found."
      );
      return false;
    }

    if (!restaurant.is_open) {
      showMessage(
        "Restaurant is closed",
        "Please try again when the restaurant is open."
      );
      return false;
    }

    if (!restaurant.accepts_momo) {
      showMessage(
        "MoMo unavailable",
        "This restaurant is not accepting MoMo payments."
      );
      return false;
    }

    if (
      !restaurant.momo_provider ||
      !restaurant.momo_number
    ) {
      showMessage(
        "MoMo account unavailable",
        "The restaurant has not added its MoMo payment details yet."
      );
      return false;
    }

    if (cart.length === 0) {
      showMessage(
        "Cart is empty",
        "Please add food before making payment."
      );
      return false;
    }

    if (!customerName.trim()) {
      showMessage(
        "Customer name required",
        "Please enter your name."
      );
      return false;
    }

    if (!customerPhone.trim()) {
      showMessage(
        "Phone number required",
        "Please enter your phone number."
      );
      return false;
    }

    if (!momoProvider.trim()) {
      showMessage(
        "MoMo network required",
        "Please select or enter your MoMo network."
      );
      return false;
    }

    if (!momoName.trim()) {
      showMessage(
        "MoMo name required",
        "Enter the name registered on your MoMo account."
      );
      return false;
    }

    if (!momoNumber.trim()) {
      showMessage(
        "MoMo number required",
        "Enter the MoMo number you used to make the payment."
      );
      return false;
    }

    if (momoNumber.trim().length < 9) {
      showMessage(
        "Invalid MoMo number",
        "Please enter a valid MoMo number."
      );
      return false;
    }

    if (totalAmount <= 0) {
      showMessage(
        "Invalid amount",
        "The order amount must be greater than zero."
      );
      return false;
    }

    return true;
  };

  const submitPayment = async () => {
    if (paying) {
      return;
    }

    if (!validatePayment()) {
      return;
    }

    if (!restaurant) {
      return;
    }

    try {
      setPaying(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        showMessage(
          "Login required",
          "Please log in before placing your order."
        );
        return;
      }

      const orderNumber = createOrderNumber();
      const paymentReference = createPaymentReference();

      /*
       * STEP 1
       * Create the food order as PENDING.
       *
       * The customer has NOT been approved yet.
       */
      const { data: order, error: orderError } = await (supabase as any)
        .from("food_orders")
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          restaurant_id: restaurant.id,

          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),

          food_subtotal: foodSubtotal,
          service_fee: serviceFee,
          total_amount: totalAmount,

          payment_status: "pending",
          order_status: "pending_payment",

          customer_note: paymentNote.trim() || null,
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("Create food order error:", orderError);
        throw orderError;
      }

      if (!order) {
        throw new Error("Order was not created.");
      }

      /*
       * STEP 2
       * Save the food items belonging to the order.
       */
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,

        item_name: item.name,
        item_description: item.description,

        quantity: item.quantity,
        unit_price: Number(item.price),
        total_price:
          Number(item.price) * Number(item.quantity),
      }));

      const { error: itemsError } = await (supabase as any)
        .from("food_order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error(
          "Create food order items error:",
          itemsError
        );

        await supabase
          .from("food_orders")
          .delete()
          .eq("id", order.id);

        throw itemsError;
      }

      /*
       * STEP 3
       * Create the payment as PENDING.
       *
       * IMPORTANT:
       * This is NOT marked paid here.
       * The restaurant owner will check their MoMo
       * and approve it from the restaurant dashboard.
       */
      const paymentNoteParts = [
        `MoMo Name: ${momoName.trim()}`,
      ];

      if (paymentNote.trim()) {
        paymentNoteParts.push(
          `Customer Note: ${paymentNote.trim()}`
        );
      }

      const { error: paymentError } = await (supabase as any)
        .from("food_payments")
        .insert({
          order_id: order.id,
          customer_id: user.id,
          restaurant_id: restaurant.id,

          payment_reference: paymentReference,

          amount: totalAmount,

          payment_method: "momo",

          momo_provider: momoProvider.trim(),
          momo_number: momoNumber.trim(),

          status: "pending",

          payment_note: paymentNoteParts.join("\n"),
        });

      if (paymentError) {
        console.error(
          "Create food payment error:",
          paymentError
        );

        await supabase
          .from("food_orders")
          .delete()
          .eq("id", order.id);

        throw paymentError;
      }

      /*
       * STEP 4
       * Payment/order is now waiting for restaurant approval.
       *
       * Clear the cart because the order has been created.
       */
      await AsyncStorage.removeItem(CART_STORAGE_KEY);

      showMessage(
        "Payment Pending",
        "Your order has been sent to the restaurant. The restaurant will check its MoMo account and approve your payment."
      );

      /*
       * STEP 5
       * Open the customer's order tracking screen.
       *
       * That screen should listen for the restaurant
       * changing the order from:
       *
       * pending_payment
       *       ↓
       * paid
       *       ↓
       * preparing
       *       ↓
       * ready_for_pickup
       *       ↓
       * picked_up
       *       ↓
       * completed
       */
      router.replace({
        pathname: "/restaurants/order/[orderId]",
        params: {
          orderId: order.id,
        },
      });
    } catch (error: any) {
      console.error("Payment submission error:", error);

      showMessage(
        "Payment failed",
        error?.message ||
          "We could not create your order. Please try again."
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#E53935"
          />

          <Text style={styles.loadingText}>
            Loading payment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="restaurant-outline"
            size={55}
            color="#E53935"
          />

          <Text style={styles.emptyTitle}>
            Restaurant unavailable
          </Text>

          <Text style={styles.emptyText}>
            We could not find this restaurant.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111827"
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Pay Restaurant
          </Text>

          <Text style={styles.headerSubtitle}>
            {restaurant.name}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons
              name="information-circle"
              size={23}
              color="#E53935"
            />
          </View>

          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>
              Pay the restaurant directly
            </Text>

            <Text style={styles.warningText}>
              Send the exact amount below to the
              restaurant's MoMo account. Your payment
              will remain pending until the restaurant
              checks its account and approves it.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Restaurant MoMo Account
        </Text>

        <View style={styles.restaurantPaymentCard}>
          <View style={styles.momoLogo}>
            <Ionicons
              name="phone-portrait"
              size={28}
              color="#E53935"
            />
          </View>

          <Text style={styles.restaurantPaymentName}>
            {restaurant.name}
          </Text>

          <Text style={styles.accountLabel}>
            MoMo Network
          </Text>

          <Text style={styles.accountValue}>
            {restaurant.momo_provider ||
              "Not provided"}
          </Text>

          <Text style={styles.accountLabel}>
            Account Name
          </Text>

          <Text style={styles.accountValue}>
            {restaurant.momo_account_name ||
              "Not provided"}
          </Text>

          <Text style={styles.accountLabel}>
            MoMo Number
          </Text>

          <Text style={styles.accountNumber}>
            {restaurant.momo_number ||
              "Not provided"}
          </Text>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              Amount to Pay
            </Text>

            <Text style={styles.amountValue}>
              {formatMoney(totalAmount)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Your MoMo Details
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>
            Your Name
          </Text>

          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>
            Your Phone Number
          </Text>

          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="e.g. 0241234567"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>
            Your MoMo Network
          </Text>

          <View style={styles.networkRow}>
            {["MTN", "Telecel", "AirtelTigo"].map(
              (network) => {
                const selected =
                  momoProvider === network;

                return (
                  <Pressable
                    key={network}
                    style={[
                      styles.networkButton,
                      selected &&
                        styles.networkButtonSelected,
                    ]}
                    onPress={() =>
                      setMomoProvider(network)
                    }
                  >
                    <Text
                      style={[
                        styles.networkButtonText,
                        selected &&
                          styles.networkButtonTextSelected,
                      ]}
                    >
                      {network}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <Text style={styles.inputLabel}>
            Your MoMo Name
          </Text>

          <TextInput
            value={momoName}
            onChangeText={setMomoName}
            placeholder="Name on your MoMo account"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>
            Your MoMo Number
          </Text>

          <TextInput
            value={momoNumber}
            onChangeText={setMomoNumber}
            placeholder="Number you paid from"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>
            Note (Optional)
          </Text>

          <TextInput
            value={paymentNote}
            onChangeText={setPaymentNote}
            placeholder="Optional payment note"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.noteInput,
            ]}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Order Summary
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Food
            </Text>

            <Text style={styles.summaryValue}>
              {totalItems}{" "}
              {totalItems === 1 ? "item" : "items"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Food subtotal
            </Text>

            <Text style={styles.summaryValue}>
              {formatMoney(foodSubtotal)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Service fee
            </Text>

            <Text style={styles.summaryValue}>
              GH₵ 0.00
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              {formatMoney(totalAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.pendingCard}>
          <Ionicons
            name="time-outline"
            size={24}
            color="#D97706"
          />

          <View style={styles.pendingContent}>
            <Text style={styles.pendingTitle}>
              What happens after payment?
            </Text>

            <Text style={styles.pendingText}>
              1. You send the money to the restaurant.
              {"\n"}
              2. Your order becomes Pending.
              {"\n"}
              3. The restaurant checks its MoMo.
              {"\n"}
              4. The restaurant approves your payment.
              {"\n"}
              5. Your order moves to food preparation
              and delivery.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomAmount}>
          <Text style={styles.bottomLabel}>
            Total
          </Text>

          <Text style={styles.bottomValue}>
            {formatMoney(totalAmount)}
          </Text>
        </View>

        <Pressable
          style={[
            styles.payButton,
            paying && styles.payButtonDisabled,
          ]}
          onPress={submitPayment}
          disabled={paying}
        >
          {paying ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.payButtonText}>
                Sending...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.payButtonText}>
                I Have Paid
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },

  header: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    padding: 16,
  },

  warningCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 20,
  },

  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  warningContent: {
    flex: 1,
    marginLeft: 11,
  },

  warningTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9A3412",
  },

  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7C2D12",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
    marginTop: 3,
  },

  restaurantPaymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    alignItems: "center",
  },

  momoLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  restaurantPaymentName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 15,
  },

  accountLabel: {
    width: "100%",
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },

  accountValue: {
    width: "100%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },

  accountNumber: {
    width: "100%",
    textAlign: "center",
    fontSize: 23,
    fontWeight: "900",
    color: "#E53935",
    marginTop: 3,
    letterSpacing: 1,
  },

  amountBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 14,
    alignItems: "center",
    marginTop: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  amountLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  amountValue: {
    fontSize: 27,
    fontWeight: "900",
    color: "#111827",
    marginTop: 3,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 7,
    marginTop: 5,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    marginBottom: 13,
  },

  noteInput: {
    height: 90,
    paddingTop: 13,
    paddingBottom: 13,
  },

  networkRow: {
    flexDirection: "row",
    marginBottom: 13,
  },

  networkButton: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    backgroundColor: "#FFFFFF",
  },

  networkButtonSelected: {
    backgroundColor: "#FFF1F2",
    borderColor: "#E53935",
  },

  networkButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  networkButtonTextSelected: {
    color: "#E53935",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 9,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  totalValue: {
    fontSize: 21,
    fontWeight: "900",
    color: "#E53935",
  },

  pendingCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  pendingContent: {
    flex: 1,
    marginLeft: 10,
  },

  pendingTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#92400E",
  },

  pendingText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#78350F",
    marginTop: 5,
  },

  bottomSpace: {
    height: 120,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: Platform.OS === "ios" ? 25 : 13,
    flexDirection: "row",
    alignItems: "center",
  },

  bottomAmount: {
    flex: 1,
  },

  bottomLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  bottomValue: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },

  payButton: {
    minHeight: 52,
    paddingHorizontal: 17,
    borderRadius: 15,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  payButtonDisabled: {
    opacity: 0.6,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
    marginTop: 15,
  },

  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 7,
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#E53935",
    paddingHorizontal: 24,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});