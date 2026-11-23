import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
// ============================================================
// NASARA SHOPPING CART
// Local cart storage, seller grouping and quantity management
// ============================================================

// IMPORTANT:
// This key must be exactly the same in Browse and Cart.
const CART_STORAGE_KEY = "NASARA_MARKETPLACE_CART";
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

type SellerGroup = {
  sellerId: string;
  items: CartItem[];
  subtotal: number;
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

export default function CartScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

   // ============================================================
  // 🔔 CROSS-PLATFORM MESSAGE
  // ============================================================
  
  const showMessage = (
    title: string,
    message?: string
  ) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.alert(
          message ? `${title}\n\n${message}` : title
        );
      }
      return;
    }
  
    Alert.alert(title, message || "");
  };

  // ============================================================
  // LOAD CART
  // ============================================================

  const loadCart = useCallback(async () => {
  try {
    setLoading(true);

    const savedCart = await AsyncStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!savedCart) {
      setCartItems([]);
      return;
    }

    const parsed = JSON.parse(savedCart);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setCartItems([]);
      return;
    }

    // Validate cart products.
    const validItems: CartItem[] = parsed.filter(
      (item: any) =>
        item &&
        typeof item.id === "string" &&
        Number(item.price) > 0 &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setCartItems([]);
      return;
    }

    // Retrieve the real seller ID from the product record.
    const { data: products, error: productsError } =
      await (supabase as any)
        .from("items_live")
        .select("id,user_id")
        .in(
          "id",
          validItems.map((item) => item.id)
        );

    if (productsError) {
      throw new Error(
        `Could not verify product sellers: ${productsError.message}`
      );
    }

    const ownerMap = new Map<string, string>();

    (products || []).forEach((product: any) => {
      if (product.id && product.user_id) {
        ownerMap.set(
          String(product.id),
          String(product.user_id)
        );
      }
    });

    // Replace any incorrect seller_id stored in the cart.
    const correctedCart: CartItem[] = validItems.map(
      (item) => {
        const actualSellerId = ownerMap.get(
          String(item.id)
        );

        if (!actualSellerId) {
          throw new Error(
            `Could not identify the seller of ${item.title}.`
          );
        }

        return {
          ...item,
          seller_id: actualSellerId,
        };
      }
    );

    // Save verified seller IDs back into local cart storage.
    await AsyncStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(correctedCart)
    );

    setCartItems(correctedCart);

    console.log(
      "NASARA CART VERIFIED OWNERS:",
      JSON.stringify(
        correctedCart.map((item) => ({
          product_id: item.id,
          product_title: item.title,
          seller_id: item.seller_id,
        })),
        null,
        2
      )
    );
  } catch (error: any) {
    console.log(
      "Cart loading error:",
      error?.message || error
    );

    showMessage(
      "Cart Error",
      error?.message ||
        "We could not load your shopping cart."
    );
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // ============================================================
  // SAVE CART
  // ============================================================

  const saveCart = async (updatedCart: CartItem[]) => {
    try {
      setSaving(true);

      await AsyncStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(updatedCart)
      );

      setCartItems(updatedCart);
    } catch (error) {
      console.log("Cart saving error:", error);
 showMessage(
        "Unable to Save",
        "Your cart could not be updated. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // QUANTITY
  // ============================================================

  const changeQuantity = async (
    productId: string,
    change: number
  ) => {
    const updatedCart = cartItems.map((item) => {
      if (item.id !== productId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.max(1, item.quantity + change),
      };
    });

    await saveCart(updatedCart);
  };

 // ============================================================
// REMOVE PRODUCT
// ============================================================

const removeProduct = async (productId: string) => {
  const product = cartItems.find(
    (item) => item.id === productId
  );

  const updatedCart = cartItems.filter(
    (item) => item.id !== productId
  );

  await saveCart(updatedCart);

  showMessage(
    "Product Removed",
    `${product?.title || "This product"}" has been removed from your cart.`
  );
};

// ============================================================
// CLEAR CART
// ============================================================

const clearCart = async () => {
  if (cartItems.length === 0) {
    showMessage("Shopping Cart", "Your cart is already empty.");
    return;
  }

  await saveCart([]);

  showMessage(
    "Cart Cleared",
    "All products have been removed from your shopping cart."
  );
};

  // ============================================================
  // GROUP PRODUCTS BY SELLER
  // ============================================================

  const sellerGroups = useMemo<SellerGroup[]>(() => {
    const groups: Record<string, CartItem[]> = {};

    cartItems.forEach((item) => {
      const sellerId = item.seller_id;

      if (!groups[sellerId]) {
        groups[sellerId] = [];
      }

      groups[sellerId].push(item);
    });

    return Object.entries(groups).map(
      ([sellerId, items]) => ({
        sellerId,
        items,
        subtotal: items.reduce(
          (total, item) =>
            total + Number(item.price) * item.quantity,
          0
        ),
      })
    );
  }, [cartItems]);

  // ============================================================
  // CART TOTALS
  // ============================================================

  const totalQuantity = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.quantity,
        0
      ),
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

 // ============================================================
// CHECKOUT NAVIGATION
// ============================================================

const handleCheckout = () => {
  if (cartItems.length === 0) {
    showMessage(
      "Your Cart Is Empty",
      "Add products before proceeding to checkout."
    );
    return;
  }

  router.push("/checkout");
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

        <ActivityIndicator
          size="large"
          color={GOLD}
        />

        <Text style={styles.loadingText}>
          Loading your Nasara cart...
        </Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // MAIN CART SCREEN
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
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            My Shopping Cart
          </Text>

          <Text style={styles.headerSubtitle}>
            {totalQuantity} product{totalQuantity === 1 ? "" : "s"}
          </Text>
        </View>

        {cartItems.length > 0 && (
          <TouchableOpacity
            onPress={clearCart}
            style={styles.clearButton}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* EMPTY CART */}

        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              🛒
            </Text>

            <Text style={styles.emptyTitle}>
              Your cart is empty
            </Text>

            <Text style={styles.emptyDescription}>
              Explore Nasara and add products from your
              favourite sellers.
            </Text>

            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.shopButtonText}>
                Continue Shopping
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* CART INTRO */}

            <View style={styles.introCard}>
              <Text style={styles.introTitle}>
                Your Nasara Products
              </Text>

              <Text style={styles.introDescription}>
                Products are grouped by seller. Products
                from different sellers will have separate
                order records during checkout.
              </Text>
            </View>

            {/* SELLER GROUPS */}

            {sellerGroups.map((group) => (
              <View
                key={group.sellerId}
                style={styles.sellerCard}
              >
                {/* SELLER HEADER */}

                <View style={styles.sellerHeader}>
                  <View style={styles.sellerIcon}>
                    <Text style={styles.sellerIconText}>
                      🏪
                    </Text>
                  </View>

                  <View style={styles.sellerInfo}>
                    <Text style={styles.sellerTitle}>
                      Seller
                    </Text>

                    <Text
                      style={styles.sellerId}
                      numberOfLines={1}
                    >
                      {group.sellerId}
                    </Text>
                  </View>

                  <View style={styles.sellerItemCount}>
                    <Text style={styles.sellerItemCountText}>
                      {group.items.length} item
                      {group.items.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>

                {/* SELLER PRODUCTS */}

                {group.items.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 && (
                      <View style={styles.productDivider} />
                    )}

                    <View style={styles.productRow}>
                      {/* PRODUCT IMAGE */}

                      {item.image_url ? (
                        <Image
                          source={{
                            uri: item.image_url,
                          }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={styles.placeholderIcon}>
                            📦
                          </Text>
                        </View>
                      )}

                      {/* PRODUCT DETAILS */}

                      <View style={styles.productDetails}>
                        <Text
                          style={styles.productTitle}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>

                        {!!item.category && (
                          <Text style={styles.productCategory}>
                            {item.category}
                          </Text>
                        )}

                        <Text style={styles.productPrice}>
                          {money(item.price)}
                        </Text>

                        <Text style={styles.lineTotal}>
                          Subtotal:{" "}
                          {money(item.price * item.quantity)}
                        </Text>

                        {/* QUANTITY CONTROLS */}

                        <View style={styles.quantityRow}>
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              style={[
                                styles.quantityButton,
                                item.quantity <= 1 &&
                                  styles.disabledQuantityButton,
                              ]}
                              disabled={item.quantity <= 1 || saving}
                              onPress={() =>
                                changeQuantity(item.id, -1)
                              }
                            >
                              <Text style={styles.quantityButtonText}>
                                −
                              </Text>
                            </TouchableOpacity>

                            <Text style={styles.quantityValue}>
                              {item.quantity}
                            </Text>

                            <TouchableOpacity
                              style={styles.quantityButton}
                              disabled={saving}
                              onPress={() =>
                                changeQuantity(item.id, 1)
                              }
                            >
                              <Text style={styles.quantityButtonText}>
                                +
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            onPress={() =>
                              removeProduct(item.id)
                            }
                            disabled={saving}
                            style={styles.removeButton}
                          >
                            <Text style={styles.removeButtonText}>
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* SELLER SUBTOTAL */}

                <View style={styles.sellerSubtotalRow}>
                  <Text style={styles.sellerSubtotalLabel}>
                    Seller subtotal
                  </Text>

                  <Text style={styles.sellerSubtotalValue}>
                    {money(group.subtotal)}
                  </Text>
                </View>
              </View>
            ))}

            {/* ORDER SUMMARY */}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                Cart Summary
              </Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Total products
                </Text>

                <Text style={styles.summaryValue}>
                  {totalQuantity}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Number of sellers
                </Text>

                <Text style={styles.summaryValue}>
                  {sellerGroups.length}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Total
                </Text>

                <Text style={styles.totalValue}>
                  {money(grandTotal)}
                </Text>
              </View>

              <Text style={styles.deliveryNote}>
                Delivery charges, if applicable, will be
                calculated during checkout.
              </Text>
            </View>

            {/* CHECKOUT BUTTON */}

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutButtonText}>
                Proceed to Checkout →
              </Text>
            </TouchableOpacity>

            <Text style={styles.secureNote}>
              Nasara marketplace shopping
            </Text>
          </>
        )}
      </ScrollView>

      {/* SAVING INDICATOR */}

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator
            size="small"
            color={WHITE}
          />

          <Text style={styles.savingText}>
            Updating cart...
          </Text>
        </View>
      )}
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
    fontSize: 17,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: GOLD,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "600",
  },

  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  clearButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
  },

  scrollContent: {
    padding: 14,
    paddingBottom: 35,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 75,
  },

  emptyIcon: {
    fontSize: 65,
    marginBottom: 18,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "900",
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 280,
  },

  shopButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 25,
  },

  shopButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
  },

  introCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: BORDER,
  },

  introTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "900",
  },

  introDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },

  sellerCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  sellerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  sellerIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#F2F4F8",
    alignItems: "center",
    justifyContent: "center",
  },

  sellerIconText: {
    fontSize: 19,
  },

  sellerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  sellerTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },

  sellerId: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },

  sellerItemCount: {
    backgroundColor: "#F3F5F8",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  sellerItemCountText: {
    color: NAVY,
    fontSize: 10,
    fontWeight: "800",
  },

  productRow: {
    flexDirection: "row",
    paddingVertical: 14,
    gap: 12,
  },

  productImage: {
    width: 94,
    height: 104,
    borderRadius: 11,
    backgroundColor: "#F0F2F5",
  },

  imagePlaceholder: {
    width: 94,
    height: 104,
    borderRadius: 11,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderIcon: {
    fontSize: 30,
  },

  productDetails: {
    flex: 1,
    justifyContent: "center",
  },

  productTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },

  productCategory: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  productPrice: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },

  lineTotal: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F5F8",
    borderRadius: 9,
    padding: 3,
  },

  quantityButton: {
    width: 27,
    height: 27,
    borderRadius: 7,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledQuantityButton: {
    backgroundColor: "#AAB2C0",
  },

  quantityButtonText: {
    color: WHITE,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 22,
  },

  quantityValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    minWidth: 28,
    textAlign: "center",
  },

  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 5,
  },

  removeButtonText: {
    color: RED,
    fontSize: 10,
    fontWeight: "800",
  },

  productDivider: {
    height: 1,
    backgroundColor: BORDER,
  },

  sellerSubtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
    marginTop: 2,
  },

  sellerSubtotalLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },

  sellerSubtotalValue: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "900",
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
    marginBottom: 14,
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

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  totalLabel: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },

  totalValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },

  deliveryNote: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },

  checkoutButton: {
    backgroundColor: NAVY,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  checkoutButtonText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "900",
  },

  secureNote: {
    textAlign: "center",
    color: MUTED,
    fontSize: 10,
    marginTop: 13,
  },

  savingOverlay: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 9,
  },

  savingText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
  },
});