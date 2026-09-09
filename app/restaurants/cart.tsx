import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
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
  momo_provider?: string | null;
  momo_number?: string | null;
  momo_account_name?: string | null;
};

type RestaurantMenuItem = {
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

type CartItem = {
  menuItem: RestaurantMenuItem;
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

  // Legacy shape support
  menuItem?: RestaurantMenuItem;
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

function formatPrice(value: number) {
  return `GH₵ ${Number(value || 0).toFixed(2)}`;
}

function getImageSource(uri: string | null | undefined) {
  if (!uri) return null;

  return {
    uri,
  };
}

function normalizeCartItem(item: StoredCartItem): CartItem | null {
  if (item.menuItem) {
    return {
      menuItem: item.menuItem,
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
    menuItem: {
      id: item.menuItemId,
      restaurant_id: item.restaurantId,
      category_id: null,
      name: item.name,
      description: item.description ?? null,
      price: Number(item.price),
      image_url: item.imageUrl ?? null,
      preparation_time_minutes: null,
      is_available: true,
      is_featured: false,
    },
    quantity: Math.max(1, Number(item.quantity || 1)),
  };
}

async function saveCart(
  restaurantId: string,
  restaurantName: string,
  items: CartItem[]
) {
  if (items.length === 0) {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
    return;
  }

  const storedCart: StoredCart = {
    restaurantId,
    restaurantName,
    items: items.map((item) => ({
      menuItemId: item.menuItem.id,
      restaurantId: item.menuItem.restaurant_id,
      name: item.menuItem.name,
      description: item.menuItem.description,
      price: Number(item.menuItem.price),
      imageUrl: item.menuItem.image_url,
      quantity: item.quantity,
    })),
  };

  await AsyncStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(storedCart)
  );
}

export default function RestaurantCartScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    restaurantId?: string | string[];
  }>();

  const restaurantId = Array.isArray(params.restaurantId)
    ? params.restaurantId[0]
    : params.restaurantId;

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const loadRestaurant = useCallback(async () => {
    if (!restaurantId) {
      setRestaurant(null);
      return;
    }

    const { data, error } = await supabase
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
      console.error("Restaurant load error:", error);
      throw error;
    }

    setRestaurant(data as Restaurant | null);
  }, [restaurantId]);

  const loadCart = useCallback(async () => {
    try {
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

      const normalizedItems = (stored.items || [])
        .map(normalizeCartItem)
        .filter(Boolean) as CartItem[];

      setCart(normalizedItems);
    } catch (error) {
      console.error("Cart load error:", error);
      setCart([]);
    }
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadRestaurant(),
        loadCart(),
      ]);
    } catch (error) {
      console.error("Cart screen load error:", error);

      showMessage(
        "Unable to load cart",
        "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [loadCart, loadRestaurant]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalItems = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }, [cart]);

  const foodSubtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum +
        Number(item.menuItem.price || 0) *
          item.quantity,
      0
    );
  }, [cart]);

  const totalAmount = foodSubtotal;

  const updateCart = async (newCart: CartItem[]) => {
    setCart(newCart);

    if (restaurant) {
      try {
        await saveCart(
          restaurant.id,
          restaurant.name,
          newCart
        );
      } catch (error) {
        console.error("Save cart error:", error);
      }
    }
  };

  const increaseQuantity = async (menuItemId: string) => {
    const newCart = cart.map((item) => {
      if (item.menuItem.id !== menuItemId) {
        return item;
      }

      return {
        ...item,
        quantity: item.quantity + 1,
      };
    });

    await updateCart(newCart);
  };

  const decreaseQuantity = async (menuItemId: string) => {
    const newCart = cart
      .map((item) => {
        if (item.menuItem.id !== menuItemId) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity - 1,
        };
      })
      .filter((item) => item.quantity > 0);

    await updateCart(newCart);
  };

  const removeItem = async (menuItemId: string) => {
    const newCart = cart.filter(
      (item) => item.menuItem.id !== menuItemId
    );

    await updateCart(newCart);
  };

  const clearCart = async () => {
    setCart([]);

    try {
      await AsyncStorage.removeItem(
        CART_STORAGE_KEY
      );
    } catch (error) {
      console.error("Clear cart error:", error);
    }
  };

  const continueToPayment = () => {
    if (!restaurant) {
      showMessage(
        "Restaurant unavailable",
        "This restaurant could not be found."
      );
      return;
    }

    if (cart.length === 0) {
      showMessage(
        "Cart is empty",
        "Add food to your cart first."
      );
      return;
    }

    if (restaurant.status !== "active") {
      showMessage(
        "Restaurant unavailable",
        "This restaurant is currently unavailable."
      );
      return;
    }

    if (!restaurant.is_open) {
      showMessage(
        "Restaurant is closed",
        "Please try again when the restaurant is open."
      );
      return;
    }

    if (!restaurant.accepts_momo) {
      showMessage(
        "MoMo unavailable",
        "This restaurant is not currently accepting MoMo payments."
      );
      return;
    }

    if (
      !restaurant.momo_provider ||
      !restaurant.momo_number
    ) {
      showMessage(
        "MoMo account unavailable",
        "This restaurant has not added its MoMo payment details yet."
      );
      return;
    }

    router.push({
      pathname: "/restaurants/payment",
      params: {
        restaurantId: restaurant.id,
      },
    });
  };

  const goBackToRestaurant = () => {
    if (!restaurantId) {
      router.back();
      return;
    }

    router.push({
      pathname: "/restaurants/[restaurantId]",
      params: {
        restaurantId,
      },
    });
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
            Loading your cart...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="restaurant-outline"
              size={42}
              color="#E53935"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Restaurant not found
          </Text>

          <Text style={styles.emptyText}>
            This restaurant may no longer be available.
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

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={goBackToRestaurant}
            style={styles.headerButton}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#111827"
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Your Cart
          </Text>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cart-outline"
              size={50}
              color="#E53935"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Your cart is empty
          </Text>

          <Text style={styles.emptyText}>
            Add food from {restaurant.name} and it will
            appear here.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={goBackToRestaurant}
          >
            <Ionicons
              name="restaurant-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Browse Food
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
          onPress={goBackToRestaurant}
          style={styles.headerButton}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111827"
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Your Cart
          </Text>

          <Text style={styles.headerSubtitle}>
            {totalItems}{" "}
            {totalItems === 1 ? "item" : "items"}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            showMessage(
              "Clear cart?",
              "All food items will be removed from your cart."
            );

            if (Platform.OS === "web") {
              if (
                typeof window !== "undefined" &&
                window.confirm(
                  "Clear all food items from your cart?"
                )
              ) {
                clearCart();
              }
            } else {
              const { Alert } = require("react-native");

              Alert.alert(
                "Clear cart?",
                "All food items will be removed from your cart.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: clearCart,
                  },
                ]
              );
            }
          }}
          style={styles.headerButton}
        >
          <Ionicons
            name="trash-outline"
            size={21}
            color="#E53935"
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.restaurantCard}>
          {restaurant.logo_url ? (
            <Image
              source={getImageSource(
                restaurant.logo_url
              ) as any}
              style={styles.restaurantLogo}
            />
          ) : (
            <View style={styles.restaurantLogoPlaceholder}>
              <Ionicons
                name="restaurant"
                size={28}
                color="#E53935"
              />
            </View>
          )}

          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>
              {restaurant.name}
            </Text>

            <View style={styles.restaurantStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: restaurant.is_open
                      ? "#16A34A"
                      : "#9CA3AF",
                  },
                ]}
              />

              <Text
                style={[
                  styles.restaurantStatus,
                  {
                    color: restaurant.is_open
                      ? "#16A34A"
                      : "#6B7280",
                  },
                ]}
              >
                {restaurant.is_open
                  ? "Open"
                  : "Closed"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Food Ordered
          </Text>

          <Text style={styles.itemCount}>
            {totalItems}{" "}
            {totalItems === 1 ? "item" : "items"}
          </Text>
        </View>

        {cart.map((item) => {
          const imageSource = getImageSource(
            item.menuItem.image_url
          );

          const itemTotal =
            Number(item.menuItem.price || 0) *
            item.quantity;

          return (
            <View
              key={item.menuItem.id}
              style={styles.itemCard}
            >
              {imageSource ? (
                <Image
                  source={imageSource as any}
                  style={styles.itemImage}
                />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Ionicons
                    name="fast-food-outline"
                    size={30}
                    color="#9CA3AF"
                  />
                </View>
              )}

              <View style={styles.itemMain}>
                <Text
                  style={styles.itemName}
                  numberOfLines={2}
                >
                  {item.menuItem.name}
                </Text>

                {item.menuItem.description ? (
                  <Text
                    style={styles.itemDescription}
                    numberOfLines={2}
                  >
                    {item.menuItem.description}
                  </Text>
                ) : null}

                <Text style={styles.itemPrice}>
                  {formatPrice(
                    Number(item.menuItem.price)
                  )}
                </Text>

                <View style={styles.itemBottomRow}>
                  <View style={styles.quantityContainer}>
                    <Pressable
                      style={styles.quantityButton}
                      onPress={() =>
                        decreaseQuantity(
                          item.menuItem.id
                        )
                      }
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color="#111827"
                      />
                    </Pressable>

                    <Text style={styles.quantityText}>
                      {item.quantity}
                    </Text>

                    <Pressable
                      style={styles.quantityButton}
                      onPress={() =>
                        increaseQuantity(
                          item.menuItem.id
                        )
                      }
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color="#111827"
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.itemTotal}>
                    {formatPrice(itemTotal)}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.removeButton}
                onPress={() =>
                  removeItem(item.menuItem.id)
                }
              >
                <Ionicons
                  name="close-circle"
                  size={22}
                  color="#9CA3AF"
                />
              </Pressable>
            </View>
          );
        })}

        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentIcon}>
              <Ionicons
                name="phone-portrait-outline"
                size={22}
                color="#E53935"
              />
            </View>

            <View style={styles.paymentHeaderText}>
              <Text style={styles.paymentTitle}>
                Pay Restaurant Directly
              </Text>

              <Text style={styles.paymentSubtitle}>
                Send the payment to the restaurant's
                MoMo account.
              </Text>
            </View>
          </View>

          <View style={styles.paymentDivider} />

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              MoMo Network
            </Text>

            <Text style={styles.paymentValue}>
              {restaurant.momo_provider ||
                "Not provided"}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Account Name
            </Text>

            <Text style={styles.paymentValue}>
              {restaurant.momo_account_name ||
                "Not provided"}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              MoMo Number
            </Text>

            <Text style={styles.paymentValue}>
              {restaurant.momo_number ||
                "Not provided"}
            </Text>
          </View>

          <View style={styles.paymentNotice}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color="#E53935"
            />

            <Text style={styles.paymentNoticeText}>
              After you pay, your order stays pending
              until the restaurant checks its MoMo
              account and approves your payment.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Order Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Food subtotal
            </Text>

            <Text style={styles.summaryValue}>
              {formatPrice(foodSubtotal)}
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

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total to Pay
            </Text>

            <Text style={styles.totalValue}>
              {formatPrice(totalAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.flowCard}>
          <View style={styles.flowTitleRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={21}
              color="#16A34A"
            />

            <Text style={styles.flowTitle}>
              Simple Order Process
            </Text>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.flowNumber}>
              <Text style={styles.flowNumberText}>
                1
              </Text>
            </View>

            <Text style={styles.flowText}>
              Pay the restaurant's MoMo account.
            </Text>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.flowNumber}>
              <Text style={styles.flowNumberText}>
                2
              </Text>
            </View>

            <Text style={styles.flowText}>
              Payment shows as Pending.
            </Text>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.flowNumber}>
              <Text style={styles.flowNumberText}>
                3
              </Text>
            </View>

            <Text style={styles.flowText}>
              Restaurant checks MoMo and approves
              your payment.
            </Text>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.flowNumber}>
              <Text style={styles.flowNumberText}>
                4
              </Text>
            </View>

            <Text style={styles.flowText}>
              Restaurant prepares and delivers your
              food.
            </Text>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.flowNumber}>
              <Text style={styles.flowNumberText}>
                5
              </Text>
            </View>

            <Text style={styles.flowText}>
              Order is completed.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.checkoutBar}>
        <View style={styles.checkoutTotal}>
          <Text style={styles.checkoutLabel}>
            Total
          </Text>

          <Text style={styles.checkoutAmount}>
            {formatPrice(totalAmount)}
          </Text>
        </View>

        <Pressable
          style={[
            styles.checkoutButton,
            (!restaurant.is_open ||
              !restaurant.accepts_momo ||
              !restaurant.momo_provider ||
              !restaurant.momo_number) &&
              styles.checkoutButtonDisabled,
          ]}
          onPress={continueToPayment}
        >
          <Text style={styles.checkoutButtonText}>
            View Cart & Pay
          </Text>

          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
          />
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
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
  },

  header: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  content: {
    padding: 16,
  },

  restaurantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },

  restaurantLogo: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },

  restaurantLogoPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  restaurantInfo: {
    flex: 1,
    marginLeft: 13,
  },

  restaurantName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  restaurantStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  restaurantStatus: {
    fontSize: 13,
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  itemCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },

  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  itemImage: {
    width: 94,
    height: 94,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },

  itemImagePlaceholder: {
    width: 94,
    height: 94,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  itemMain: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 4,
  },

  itemName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  itemDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
    marginTop: 4,
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E53935",
    marginTop: 6,
  },

  itemBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },

  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    overflow: "hidden",
  },

  quantityButton: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
  },

  quantityText: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  itemTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  removeButton: {
    position: "absolute",
    top: 7,
    right: 7,
  },

  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  paymentTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  paymentSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
    marginTop: 3,
  },

  paymentDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 15,
  },

  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },

  paymentLabel: {
    fontSize: 13,
    color: "#6B7280",
  },

  paymentValue: {
    flex: 1,
    textAlign: "right",
    marginLeft: 20,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  paymentNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
  },

  paymentNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#7C2D12",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
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

  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#E53935",
  },

  flowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  flowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  flowTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  flowStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  flowNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  flowNumberText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#E53935",
  },

  flowText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
  },

  bottomSpace: {
    height: 120,
  },

  checkoutBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    flexDirection: "row",
    alignItems: "center",
  },

  checkoutTotal: {
    flex: 1,
  },

  checkoutLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  checkoutAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },

  checkoutButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  checkoutButtonDisabled: {
    opacity: 0.5,
  },

  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginRight: 8,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
  },

  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
});