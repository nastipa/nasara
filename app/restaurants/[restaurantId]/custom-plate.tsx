import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

const CUSTOM_PLATE_STORAGE_KEY =
  "nasara_restaurant_custom_plate_cart";

type Restaurant = {
  id: string;
  name: string;
  status: "active" | "suspended" | "closed";
  is_open: boolean;
};

type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  menu_type: "fixed_plate" | "custom_plate";
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

function createPlateId() {
  return `plate_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export default function CustomPlateScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    restaurantId?: string;
  }>();

  const restaurantId = String(params.restaurantId || "");

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedItems, setSelectedItems] = useState<
    Record<
      string,
      {
        amount: string;
      }
    >
  >({});

  useEffect(() => {
    loadRestaurantAndMenu();
  }, [restaurantId]);

  async function loadRestaurantAndMenu() {
    try {
      setLoading(true);

      if (!restaurantId) {
        showMessage("Error", "Restaurant information is missing.");
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

      const { data: menuData, error: menuError } = await supabase
        .from("restaurant_menu_items")
        .select(
          `
            id,
            restaurant_id,
            name,
            description,
            image_url,
            is_available,
            is_featured,
            menu_type
          `
        )
        .eq("restaurant_id", restaurantId)
        .eq("menu_type", "custom_plate")
        .eq("is_available", true)
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true });

      if (menuError) {
        throw menuError;
      }

      setMenuItems((menuData || []) as MenuItem[]);
    } catch (error: any) {
      console.error("Error loading custom plate:", error);

      showMessage(
        "Unable to load food",
        error?.message ||
          "Something went wrong while loading the available food."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredMenuItems = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return menuItems;
    }

    return menuItems.filter((item) => {
      return (
        item.name.toLowerCase().includes(searchText) ||
        (item.description || "")
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [menuItems, search]);

  function isSelected(menuItemId: string) {
    return selectedItems[menuItemId] !== undefined;
  }

  function toggleItem(item: MenuItem) {
    setSelectedItems((current) => {
      const next = { ...current };

      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = {
          amount: "",
        };
      }

      return next;
    });
  }

  function updateAmount(menuItemId: string, value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const decimalParts = cleaned.split(".");

    let finalValue = cleaned;

    if (decimalParts.length > 2) {
      finalValue = `${decimalParts[0]}.${decimalParts
        .slice(1)
        .join("")}`;
    }

    setSelectedItems((current) => ({
      ...current,
      [menuItemId]: {
        amount: finalValue,
      },
    }));
  }

  const selectedMenuItems = useMemo(() => {
    return menuItems.filter((item) => selectedItems[item.id]);
  }, [menuItems, selectedItems]);

  const currentTotal = useMemo(() => {
    return selectedMenuItems.reduce((sum, item) => {
      const amount = Number(
        selectedItems[item.id]?.amount || 0
      );

      if (!Number.isFinite(amount) || amount < 0) {
        return sum;
      }

      return sum + amount;
    }, 0);
  }, [selectedMenuItems, selectedItems]);

  async function addPlateToCart() {
    try {
      if (!restaurant) {
        showMessage(
          "Error",
          "Restaurant information is unavailable."
        );
        return;
      }

      if (restaurant.status !== "active") {
        showMessage(
          "Restaurant unavailable",
          "This restaurant is not currently accepting orders."
        );
        return;
      }

      if (!restaurant.is_open) {
        showMessage(
          "Restaurant closed",
          "This restaurant is currently closed."
        );
        return;
      }

      if (selectedMenuItems.length === 0) {
        showMessage(
          "Select food",
          "Please select at least one food item for your custom plate."
        );
        return;
      }

      const items: CustomPlateItem[] = [];

      for (const item of selectedMenuItems) {
        const amountText =
          selectedItems[item.id]?.amount?.trim() || "";

        const amount = Number(amountText);

        if (
          !amountText ||
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          showMessage(
            "Enter an amount",
            `Please enter the amount you want for ${item.name}.`
          );
          return;
        }

        items.push({
          menuItemId: item.id,
          restaurantId: item.restaurant_id,
          name: item.name,
          description: item.description,
          imageUrl: item.image_url,
          amount,
        });
      }

      const plateTotal = items.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      if (plateTotal <= 0) {
        showMessage(
          "Invalid total",
          "Please enter a valid amount for the food you selected."
        );
        return;
      }

      setSaving(true);

      const existingRaw = await AsyncStorage.getItem(
        CUSTOM_PLATE_STORAGE_KEY
      );

      let existingCart: StoredCustomPlateCart | null = null;

      if (existingRaw) {
        try {
          existingCart = JSON.parse(existingRaw);
        } catch {
          existingCart = null;
        }
      }

      if (
        existingCart &&
        existingCart.restaurantId &&
        existingCart.restaurantId !== restaurant.id
      ) {
        showMessage(
          "Different restaurant",
          "You already have custom plates from another restaurant. Please finish or clear that cart before starting a custom plate here."
        );
        return;
      }

      const existingPlates = Array.isArray(
        existingCart?.customPlates
      )
        ? existingCart!.customPlates
        : [];

      const nextPlateNumber =
        existingPlates.reduce(
          (highest, plate) =>
            Math.max(
              highest,
              Number(plate.plateNumber || 0)
            ),
          0
        ) + 1;

      const newPlate: CustomPlate = {
        plateId: createPlateId(),
        plateNumber: nextPlateNumber,
        items,
        total: plateTotal,
      };

      const updatedCart: StoredCustomPlateCart = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        customPlates: [
          ...existingPlates,
          newPlate,
        ],
      };

      await AsyncStorage.setItem(
        CUSTOM_PLATE_STORAGE_KEY,
        JSON.stringify(updatedCart)
      );

      setSelectedItems({});

      showMessage(
        `Custom Plate ${nextPlateNumber} added`,
        `Your plate total is ${formatMoney(
          plateTotal
        )}. You can add another custom plate or review the combined cart.`
      );
    } catch (error: any) {
      console.error("Error adding custom plate:", error);

      showMessage(
        "Unable to add plate",
        error?.message ||
          "Something went wrong while adding this plate."
      );
    } finally {
      setSaving(false);
    }
  }

  async function goToCart() {
    try {
      const raw = await AsyncStorage.getItem(
        CUSTOM_PLATE_STORAGE_KEY
      );

      if (!raw) {
        showMessage(
          "Cart is empty",
          "Please add at least one custom plate first."
        );
        return;
      }

      const cart: StoredCustomPlateCart = JSON.parse(raw);

      if (
        !cart.customPlates ||
        cart.customPlates.length === 0
      ) {
        showMessage(
          "Cart is empty",
          "Please add at least one custom plate first."
        );
        return;
      }

      router.push({
        pathname:
          "/restaurants/[restaurantId]/custom-cart",
        params: {
          restaurantId,
        },
      });
    } catch (error) {
      console.error("Error opening custom cart:", error);

      showMessage(
        "Unable to open cart",
        "Please try again."
      );
    }
  }

  function goBack() {
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading available food...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Prepare My Own Plate
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
          onPress={goToCart}
        >
          <Ionicons
            name="cart-outline"
            size={25}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="restaurant-outline"
              size={25}
              color="#16a34a"
            />
          </View>

          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>
              Build your plate
            </Text>

            <Text style={styles.introText}>
              Choose the food you want and enter the amount
              you want for each item.
            </Text>

            <Text style={styles.introNote}>
              No service fee. You pay only the total amount
              you enter.
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#6b7280"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search available food..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Available food
        </Text>

        {filteredMenuItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="fast-food-outline"
              size={42}
              color="#9ca3af"
            />

            <Text style={styles.emptyTitle}>
              No food found
            </Text>

            <Text style={styles.emptyText}>
              This restaurant has not added any available
              custom plate food matching your search.
            </Text>
          </View>
        ) : (
          filteredMenuItems.map((item) => {
            const selected = isSelected(item.id);
            const amount =
              selectedItems[item.id]?.amount || "";

            return (
              <View
                key={item.id}
                style={[
                  styles.foodCard,
                  selected && styles.foodCardSelected,
                ]}
              >
                <View style={styles.foodTopRow}>
                  {item.image_url ? (
                    <Image
                      source={{
                        uri: item.image_url,
                      }}
                      style={styles.foodImage}
                    />
                  ) : (
                    <View style={styles.foodImagePlaceholder}>
                      <Ionicons
                        name="restaurant-outline"
                        size={27}
                        color="#9ca3af"
                      />
                    </View>
                  )}

                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>
                      {item.name}
                    </Text>

                    {!!item.description && (
                      <Text
                        style={styles.foodDescription}
                        numberOfLines={3}
                      >
                        {item.description}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      selected &&
                        styles.removeButton,
                    ]}
                    onPress={() =>
                      toggleItem(item)
                    }
                  >
                    <Ionicons
                      name={
                        selected
                          ? "checkmark"
                          : "add"
                      }
                      size={17}
                      color={
                        selected
                          ? "#ffffff"
                          : "#16a34a"
                      }
                    />

                    <Text
                      style={[
                        styles.selectButtonText,
                        selected &&
                          styles.removeButtonText,
                      ]}
                    >
                      {selected
                        ? "Selected"
                        : "Select"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {selected && (
                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>
                      Amount you want for this item
                    </Text>

                    <View style={styles.amountInputWrapper}>
                      <Text
                        style={styles.currencyText}
                      >
                        GH₵
                      </Text>

                      <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={(value) =>
                          updateAmount(
                            item.id,
                            value
                          )
                        }
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>
            Current plate
          </Text>

          <Text style={styles.totalAmount}>
            {formatMoney(currentTotal)}
          </Text>
        </View>

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[
              styles.addPlateButton,
              (saving ||
                selectedMenuItems.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={addPlateToCart}
            disabled={
              saving ||
              selectedMenuItems.length === 0
            }
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />
            ) : (
              <>
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color="#ffffff"
                />

                <Text
                  style={styles.addPlateButtonText}
                >
                  Add Plate
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reviewButton}
            onPress={goToCart}
          >
            <Ionicons
              name="cart-outline"
              size={20}
              color="#ffffff"
            />

            <Text style={styles.reviewButtonText}>
              Cart
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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

  introCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 16,
  },

  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  introTextContainer: {
    flex: 1,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 5,
  },

  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#365314",
  },

  introNote: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },

  searchContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  foodCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  foodCardSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#fafffb",
  },

  foodTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  foodImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },

  foodImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  foodInfo: {
    flex: 1,
    paddingHorizontal: 11,
  },

  foodName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  foodDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },

  selectButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  selectButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#15803d",
  },

  removeButton: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },

  removeButtonText: {
    color: "#ffffff",
  },

  amountSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  amountLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },

  amountInputWrapper: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#86efac",
    paddingHorizontal: 12,
  },

  currencyText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15803d",
  },

  amountInput: {
    flex: 1,
    marginLeft: 7,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 0,
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    color: "#374151",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },

  bottomSpace: {
    height: 100,
  },

  bottomBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },

  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  totalLabel: {
    fontSize: 13,
    color: "#6b7280",
  },

  totalAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  bottomButtons: {
    flexDirection: "row",
    gap: 9,
  },

  addPlateButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  addPlateButtonText: {
    marginLeft: 7,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  reviewButton: {
    minWidth: 105,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  reviewButtonText: {
    marginLeft: 7,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.5,
  },
});