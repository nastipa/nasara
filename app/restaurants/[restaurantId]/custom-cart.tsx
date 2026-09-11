import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

const CUSTOM_PLATE_STORAGE_KEY =
  "nasara_restaurant_custom_plate_cart";

const CART_STORAGE_KEY =
  "nasara_restaurant_cart";

type Restaurant = {
  id: string;
  name: string;
  status: "active" | "suspended" | "closed";
  is_open: boolean;
};

type CustomPlateItem = {
  menuItemId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
};

type CustomPlate = {
  plateId: string;
  plateNumber: number;
  items: CustomPlateItem[];
  total: number;
};

type StoredCustomPlateCart = {
  restaurantId: string;
  restaurantName: string;
  customPlates: CustomPlate[];
};

type FixedCartItem = {
  id?: string;
  menuItemId?: string;
  restaurantId?: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  image_url?: string | null;
};

type StoredFixedCart = {
  restaurantId: string;
  restaurantName?: string;
  items: FixedCartItem[];
};

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  } else {
    Alert.alert(title, message);
  }
}

function formatMoney(value: number) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

export default function CustomCartScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    restaurantId?: string;
  }>();

  const restaurantId = String(params.restaurantId || "");

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [customPlates, setCustomPlates] =
    useState<CustomPlate[]>([]);

  const [fixedItems, setFixedItems] =
    useState<FixedCartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadCart();
  }, [restaurantId]);

  async function loadCart() {
    try {
      setLoading(true);

      if (!restaurantId) {
        showMessage(
          "Error",
          "Restaurant information is missing."
        );
        return;
      }

      const { data: restaurantData, error: restaurantError } =
        await supabase
          .from("restaurants")
          .select("id, name, status, is_open")
          .eq("id", restaurantId)
          .maybeSingle();

      if (restaurantError) {
        throw restaurantError;
      }

      if (!restaurantData) {
        showMessage(
          "Restaurant unavailable",
          "This restaurant could not be found."
        );
        return;
      }

      setRestaurant(restaurantData);

      const [
        customCartRaw,
        fixedCartRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(
          CUSTOM_PLATE_STORAGE_KEY
        ),
        AsyncStorage.getItem(CART_STORAGE_KEY),
      ]);

      let loadedCustomPlates: CustomPlate[] = [];
      let loadedFixedItems: FixedCartItem[] = [];

      if (customCartRaw) {
        try {
          const customCart: StoredCustomPlateCart =
            JSON.parse(customCartRaw);

          if (
            customCart.restaurantId === restaurantId &&
            Array.isArray(customCart.customPlates)
          ) {
            loadedCustomPlates =
              customCart.customPlates;
          }
        } catch (error) {
          console.error(
            "Error parsing custom cart:",
            error
          );
        }
      }

      if (fixedCartRaw) {
        try {
          const fixedCart: StoredFixedCart =
            JSON.parse(fixedCartRaw);

          if (
            fixedCart.restaurantId === restaurantId &&
            Array.isArray(fixedCart.items)
          ) {
            loadedFixedItems = fixedCart.items;
          }
        } catch (error) {
          console.error(
            "Error parsing fixed cart:",
            error
          );
        }
      }

      setCustomPlates(loadedCustomPlates);
      setFixedItems(loadedFixedItems);
    } catch (error: any) {
      console.error(
        "Error loading combined restaurant cart:",
        error
      );

      showMessage(
        "Unable to load cart",
        error?.message ||
          "Something went wrong while loading your cart."
      );
    } finally {
      setLoading(false);
    }
  }

  const customPlatesTotal = useMemo(() => {
    return customPlates.reduce(
      (sum, plate) => sum + Number(plate.total || 0),
      0
    );
  }, [customPlates]);

  const fixedItemsTotal = useMemo(() => {
    return fixedItems.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);

      return sum + price * quantity;
    }, 0);
  }, [fixedItems]);

  const combinedTotal =
    customPlatesTotal + fixedItemsTotal;

  const totalCustomItems = useMemo(() => {
    return customPlates.reduce(
      (sum, plate) => sum + plate.items.length,
      0
    );
  }, [customPlates]);

  function removeCustomItem(
    plateId: string,
    menuItemId: string
  ) {
    setCustomPlates((current) => {
      return current
        .map((plate) => {
          if (plate.plateId !== plateId) {
            return plate;
          }

          const remainingItems =
            plate.items.filter(
              (item) =>
                item.menuItemId !== menuItemId
            );

          const newTotal = remainingItems.reduce(
            (sum, item) =>
              sum + Number(item.amount || 0),
            0
          );

          return {
            ...plate,
            items: remainingItems,
            total: newTotal,
          };
        })
        .filter(
          (plate) => plate.items.length > 0
        );
    });
  }

  function removeCustomPlate(plateId: string) {
    setCustomPlates((current) =>
      current.filter(
        (plate) => plate.plateId !== plateId
      )
    );
  }

  function removeFixedItem(index: number) {
    setFixedItems((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  async function saveCurrentCart() {
    try {
      if (customPlates.length > 0) {
        const customCart: StoredCustomPlateCart = {
          restaurantId,
          restaurantName:
            restaurant?.name || "",
          customPlates,
        };

        await AsyncStorage.setItem(
          CUSTOM_PLATE_STORAGE_KEY,
          JSON.stringify(customCart)
        );
      } else {
        await AsyncStorage.removeItem(
          CUSTOM_PLATE_STORAGE_KEY
        );
      }

      if (fixedItems.length > 0) {
        const fixedCart: StoredFixedCart = {
          restaurantId,
          restaurantName:
            restaurant?.name || "",
          items: fixedItems,
        };

        await AsyncStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(fixedCart)
        );
      } else {
        await AsyncStorage.removeItem(
          CART_STORAGE_KEY
        );
      }
    } catch (error) {
      console.error(
        "Error saving combined cart:",
        error
      );
    }
  }

  async function handleRemoveCustomItem(
    plateId: string,
    menuItemId: string
  ) {
    removeCustomItem(
      plateId,
      menuItemId
    );

    const updatedPlates =
      customPlates
        .map((plate) => {
          if (plate.plateId !== plateId) {
            return plate;
          }

          const remainingItems =
            plate.items.filter(
              (item) =>
                item.menuItemId !== menuItemId
            );

          return {
            ...plate,
            items: remainingItems,
            total: remainingItems.reduce(
              (sum, item) =>
                sum + Number(item.amount || 0),
              0
            ),
          };
        })
        .filter(
          (plate) => plate.items.length > 0
        );

    const customCart: StoredCustomPlateCart = {
      restaurantId,
      restaurantName:
        restaurant?.name || "",
      customPlates: updatedPlates,
    };

    if (updatedPlates.length > 0) {
      await AsyncStorage.setItem(
        CUSTOM_PLATE_STORAGE_KEY,
        JSON.stringify(customCart)
      );
    } else {
      await AsyncStorage.removeItem(
        CUSTOM_PLATE_STORAGE_KEY
      );
    }
  }

  async function handleRemoveCustomPlate(
    plateId: string
  ) {
    const updatedPlates =
      customPlates.filter(
        (plate) =>
          plate.plateId !== plateId
      );

    setCustomPlates(updatedPlates);

    if (updatedPlates.length > 0) {
      const customCart: StoredCustomPlateCart = {
        restaurantId,
        restaurantName:
          restaurant?.name || "",
        customPlates: updatedPlates,
      };

      await AsyncStorage.setItem(
        CUSTOM_PLATE_STORAGE_KEY,
        JSON.stringify(customCart)
      );
    } else {
      await AsyncStorage.removeItem(
        CUSTOM_PLATE_STORAGE_KEY
      );
    }
  }

  async function handleRemoveFixedItem(
    index: number
  ) {
    const updatedItems =
      fixedItems.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

    setFixedItems(updatedItems);

    if (updatedItems.length > 0) {
      const fixedCart: StoredFixedCart = {
        restaurantId,
        restaurantName:
          restaurant?.name || "",
        items: updatedItems,
      };

      await AsyncStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(fixedCart)
      );
    } else {
      await AsyncStorage.removeItem(
        CART_STORAGE_KEY
      );
    }
  }

  async function clearAllCart() {
    showMessage(
      "Clear cart",
      "Are you sure you want to remove all custom plates and fixed foods from this restaurant cart?"
    );

    setClearing(true);

    try {
      await AsyncStorage.multiRemove([
        CUSTOM_PLATE_STORAGE_KEY,
        CART_STORAGE_KEY,
      ]);

      setCustomPlates([]);
      setFixedItems([]);
    } catch (error: any) {
      console.error(
        "Error clearing cart:",
        error
      );

      showMessage(
        "Unable to clear cart",
        error?.message ||
          "Something went wrong while clearing the cart."
      );
    } finally {
      setClearing(false);
    }
  }

  function addAnotherCustomPlate() {
    router.push({
      pathname:
        "/restaurants/[restaurantId]/custom-plate",
      params: {
        restaurantId,
      },
    });
  }

  function continueToPayment() {
    if (customPlates.length === 0 && fixedItems.length === 0) {
      showMessage(
        "Cart is empty",
        "Please add food before continuing to payment."
      );
      return;
    }

    if (combinedTotal <= 0) {
      showMessage(
        "Invalid total",
        "Your order total must be greater than GH₵0."
      );
      return;
    }

    router.push({
      pathname: "/restaurants/payment",
      params: {
        restaurantId,
        orderMode: "combined",
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading your restaurant cart...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Restaurant Cart
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {restaurant?.name || "Restaurant"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={clearAllCart}
          disabled={clearing}
        >
          {clearing ? (
            <ActivityIndicator size="small" />
          ) : (
            <Ionicons
              name="trash-outline"
              size={22}
              color="#dc2626"
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="cart-outline"
              size={25}
              color="#16a34a"
            />
          </View>

          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>
              One combined order
            </Text>

            <Text style={styles.summaryText}>
              Your custom plates and fixed foods will be
              sent together and paid for with one MoMo
              payment.
            </Text>
          </View>
        </View>

        {customPlates.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Custom Plates
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {customPlates.length} plate
                  {customPlates.length === 1
                    ? ""
                    : "s"} •{" "}
                  {totalCustomItems} component
                  {totalCustomItems === 1
                    ? ""
                    : "s"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallAddButton}
                onPress={addAnotherCustomPlate}
              >
                <Ionicons
                  name="add"
                  size={17}
                  color="#16a34a"
                />

                <Text
                  style={styles.smallAddButtonText}
                >
                  Add Plate
                </Text>
              </TouchableOpacity>
            </View>

            {customPlates.map((plate) => (
              <View
                key={plate.plateId}
                style={styles.plateCard}
              >
                <View style={styles.plateHeader}>
                  <View>
                    <Text style={styles.plateTitle}>
                      Custom Plate{" "}
                      {plate.plateNumber}
                    </Text>

                    <Text
                      style={styles.plateSubtitle}
                    >
                      {plate.items.length} component
                      {plate.items.length === 1
                        ? ""
                        : "s"}
                    </Text>
                  </View>

                  <View style={styles.plateHeaderRight}>
                    <Text style={styles.plateTotal}>
                      {formatMoney(
                        plate.total
                      )}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        handleRemoveCustomPlate(
                          plate.plateId
                        )
                      }
                      style={styles.removeIcon}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color="#dc2626"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {plate.items.map(
                  (item) => (
                    <View
                      key={`${plate.plateId}-${item.menuItemId}`}
                      style={styles.itemRow}
                    >
                      {item.imageUrl ? (
                        <Image
                          source={{
                            uri: item.imageUrl,
                          }}
                          style={styles.itemImage}
                        />
                      ) : (
                        <View
                          style={
                            styles.itemImagePlaceholder
                          }
                        >
                          <Ionicons
                            name="restaurant-outline"
                            size={20}
                            color="#9ca3af"
                          />
                        </View>
                      )}

                      <View style={styles.itemInfo}>
                        <Text
                          style={styles.itemName}
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.customerAmount
                          }
                        >
                          Customer amount:{" "}
                          {formatMoney(
                            item.amount
                          )}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() =>
                          handleRemoveCustomItem(
                            plate.plateId,
                            item.menuItemId
                          )
                        }
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </View>
                  )
                )}

                <View style={styles.plateSubtotal}>
                  <Text
                    style={styles.subtotalLabel}
                  >
                    Plate subtotal
                  </Text>

                  <Text
                    style={styles.subtotalAmount}
                  >
                    {formatMoney(
                      plate.total
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {fixedItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Fixed Food
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Existing fixed-price restaurant
                  items
                </Text>
              </View>
            </View>

            <View style={styles.fixedCard}>
              {fixedItems.map(
                (item, index) => {
                  const itemTotal =
                    Number(item.price || 0) *
                    Number(
                      item.quantity || 0
                    );

                  return (
                    <View
                      key={`fixed-${index}`}
                      style={styles.fixedItemRow}
                    >
                      {item.imageUrl ||
                      item.image_url ? (
                        <Image
                          source={{
                            uri:
                              item.imageUrl ||
                              item.image_url ||
                              "",
                          }}
                          style={
                            styles.itemImage
                          }
                        />
                      ) : (
                        <View
                          style={
                            styles.itemImagePlaceholder
                          }
                        >
                          <Ionicons
                            name="fast-food-outline"
                            size={20}
                            color="#9ca3af"
                          />
                        </View>
                      )}

                      <View
                        style={
                          styles.itemInfo
                        }
                      >
                        <Text
                          style={
                            styles.itemName
                          }
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.fixedQuantity
                          }
                        >
                          Qty:{" "}
                          {item.quantity}
                        </Text>

                        <Text
                          style={
                            styles.fixedPrice
                          }
                        >
                          {formatMoney(
                            Number(
                              item.price || 0
                            )
                          )}{" "}
                          each
                        </Text>
                      </View>

                      <View
                        style={
                          styles.fixedRight
                        }
                      >
                        <Text
                          style={
                            styles.fixedTotal
                          }
                        >
                          {formatMoney(
                            itemTotal
                          )}
                        </Text>

                        <TouchableOpacity
                          style={
                            styles.removeItemButton
                          }
                          onPress={() =>
                            handleRemoveFixedItem(
                              index
                            )
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#dc2626"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
              )}

              <View style={styles.fixedSubtotal}>
                <Text
                  style={styles.subtotalLabel}
                >
                  Fixed food subtotal
                </Text>

                <Text
                  style={
                    styles.subtotalAmount
                  }
                >
                  {formatMoney(
                    fixedItemsTotal
                  )}
                </Text>
              </View>
            </View>
          </>
        )}

        {customPlates.length === 0 &&
          fixedItems.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons
                name="cart-outline"
                size={55}
                color="#9ca3af"
              />

              <Text
                style={styles.emptyTitle}
              >
                Your cart is empty
              </Text>

              <Text
                style={styles.emptyText}
              >
                Add a custom plate or fixed food from
                this restaurant.
              </Text>

              <TouchableOpacity
                style={styles.emptyButton}
                onPress={addAnotherCustomPlate}
              >
                <Text
                  style={styles.emptyButtonText}
                >
                  Prepare a Custom Plate
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {customPlates.length > 0 && (
          <TouchableOpacity
            style={styles.addAnotherButton}
            onPress={addAnotherCustomPlate}
          >
            <Ionicons
              name="add-circle-outline"
              size={21}
              color="#16a34a"
            />

            <Text
              style={
                styles.addAnotherButtonText
              }
            >
              Add Another Custom Plate
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Custom Plates
            </Text>

            <Text style={styles.totalValue}>
              {formatMoney(
                customPlatesTotal
              )}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Fixed Food
            </Text>

            <Text style={styles.totalValue}>
              {formatMoney(
                fixedItemsTotal
              )}
            </Text>
          </View>

          <View style={styles.serviceFeeRow}>
            <Text
              style={
                styles.serviceFeeLabel
              }
            >
              Service fee
            </Text>

            <Text
              style={
                styles.serviceFeeValue
              }
            >
              GH₵0.00
            </Text>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>
              Total
            </Text>

            <Text
              style={styles.grandTotalAmount}
            >
              {formatMoney(
                combinedTotal
              )}
            </Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#2563eb"
          />

          <Text style={styles.noteText}>
            The restaurant will receive each Custom
            Plate separately, including the food
            components and the customer-entered amount
            for each component. Fixed foods remain
            separate as fixed-price items.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalRow}>
          <Text style={styles.bottomTotalLabel}>
            Order total
          </Text>

          <Text style={styles.bottomTotalAmount}>
            {formatMoney(combinedTotal)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.paymentButton,
            combinedTotal <= 0 &&
              styles.disabledButton,
          ]}
          onPress={continueToPayment}
          disabled={combinedTotal <= 0}
        >
          <Ionicons
            name="card-outline"
            size={21}
            color="#ffffff"
          />

          <Text
            style={styles.paymentButtonText}
          >
            Continue to Payment
          </Text>

          <Ionicons
            name="arrow-forward"
            size={20}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },

  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 15,
  },

  header: {
    height: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },

  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },

  content: {
    padding: 16,
  },

  summaryCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 20,
  },

  summaryIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
    marginRight: 12,
  },

  summaryInfo: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#166534",
  },

  summaryText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#365314",
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

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },

  smallAddButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
  },

  smallAddButtonText: {
    marginLeft: 4,
    color: "#15803d",
    fontSize: 12,
    fontWeight: "800",
  },

  plateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  plateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  plateTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  plateSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },

  plateHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  plateTotal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#15803d",
  },

  removeIcon: {
    marginLeft: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },

  itemImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  itemInfo: {
    flex: 1,
    paddingHorizontal: 10,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  customerAmount: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },

  removeItemButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
  },

  plateSubtotal: {
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  subtotalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },

  subtotalAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  fixedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },

  fixedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    marginBottom: 8,
  },

  fixedQuantity: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },

  fixedPrice: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },

  fixedRight: {
    alignItems: "flex-end",
  },

  fixedTotal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 7,
  },

  fixedSubtotal: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 5,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 35,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  emptyTitle: {
    marginTop: 13,
    fontSize: 18,
    fontWeight: "800",
    color: "#374151",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#6b7280",
  },

  emptyButton: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: "#16a34a",
  },

  emptyButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },

  addAnotherButton: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  addAnotherButtonText: {
    marginLeft: 7,
    color: "#15803d",
    fontSize: 14,
    fontWeight: "800",
  },

  totalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  totalLabel: {
    fontSize: 14,
    color: "#6b7280",
  },

  totalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  serviceFeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  serviceFeeLabel: {
    fontSize: 14,
    color: "#6b7280",
  },

  serviceFeeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
  },

  totalDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 13,
  },

  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  grandTotalAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#16a34a",
  },

  noteCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  noteText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    lineHeight: 19,
    color: "#1e40af",
  },

  bottomSpace: {
    height: 115,
  },

  bottomBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === "ios" ? 24 : 12,
  },

  bottomTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  bottomTotalLabel: {
    fontSize: 13,
    color: "#6b7280",
  },

  bottomTotalAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  paymentButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  paymentButtonText: {
    flex: 1,
    marginHorizontal: 8,
    textAlign: "center",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.5,
  },
});