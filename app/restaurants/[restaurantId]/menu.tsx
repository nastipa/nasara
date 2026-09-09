import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

const CART_STORAGE_KEY = "nasara_restaurant_cart";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  logo_url: string | null;
  cover_image_url: string | null;
  opening_time: string | null;
  closing_time: string | null;
  is_open: boolean;
  status: string;
  momo_provider: string | null;
  momo_number: string | null;
  momo_account_name: string | null;
  accepts_momo: boolean;
  accepts_cash: boolean;
  accepts_card: boolean;
};

type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
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
  menuItemId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type StoredCart = {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
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

export default function RestaurantMenuScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    restaurantId?: string | string[];
  }>();

  const restaurantId = Array.isArray(params.restaurantId)
    ? params.restaurantId[0]
    : params.restaurantId;

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [menuItems, setMenuItems] =
    useState<RestaurantMenuItem[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<string>("all");

  const [search, setSearch] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const loadCart = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(
        CART_STORAGE_KEY
      );

      if (!raw) {
        setCart([]);
        return;
      }

      const stored: StoredCart = JSON.parse(raw);

      if (
        !stored ||
        stored.restaurantId !== restaurantId
      ) {
        setCart([]);
        return;
      }

      if (!Array.isArray(stored.items)) {
        setCart([]);
        return;
      }

      setCart(stored.items);
    } catch (error) {
      console.error("Load cart error:", error);
      setCart([]);
    }
  }, [restaurantId]);

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
        description,
        phone,
        address,
        logo_url,
        cover_image_url,
        opening_time,
        closing_time,
        is_open,
        status,
        momo_provider,
        momo_number,
        momo_account_name,
        accepts_momo,
        accepts_cash,
        accepts_card
        `
      )
      .eq("id", restaurantId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error(
        "Load restaurant error:",
        error
      );
      throw error;
    }

    setRestaurant(data as Restaurant | null);
  }, [restaurantId]);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) {
      setCategories([]);
      setMenuItems([]);
      return;
    }

    const [
      categoriesResult,
      menuResult,
    ] = await Promise.all([
      supabase
        .from("restaurant_categories")
        .select(
          `
          id,
          restaurant_id,
          name,
          description,
          image_url,
          is_active
          `
        )
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("restaurant_menu_items")
        .select(
          `
          id,
          restaurant_id,
          category_id,
          name,
          description,
          price,
          image_url,
          preparation_time_minutes,
          is_available,
          is_featured
          `
        )
        .eq("restaurant_id", restaurantId)
        .order("is_featured", {
          ascending: false,
        })
        .order("name", {
          ascending: true,
        }),
    ]);

    if (categoriesResult.error) {
      console.error(
        "Categories error:",
        categoriesResult.error
      );
      throw categoriesResult.error;
    }

    if (menuResult.error) {
      console.error(
        "Menu items error:",
        menuResult.error
      );
      throw menuResult.error;
    }

    setCategories(
      (categoriesResult.data || []) as Category[]
    );

    setMenuItems(
      (menuResult.data || []).map(
        (item: any) => ({
          ...item,
          price: Number(item.price || 0),
        })
      ) as RestaurantMenuItem[]
    );
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadRestaurant(),
        loadMenu(),
        loadCart(),
      ]);
    } catch (error) {
      console.error("Menu load error:", error);

      showMessage(
        "Unable to load menu",
        "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    loadCart,
    loadMenu,
    loadRestaurant,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart])
  );

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCartItems = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const filteredItems = useMemo(() => {
    let result = menuItems.filter(
      (item) => item.is_available
    );

    if (selectedCategory !== "all") {
      result = result.filter(
        (item) =>
          item.category_id ===
          selectedCategory
      );
    }

    const searchText =
      search.trim().toLowerCase();

    if (searchText) {
      result = result.filter((item) => {
        return (
          item.name
            .toLowerCase()
            .includes(searchText) ||
          item.description
            ?.toLowerCase()
            .includes(searchText)
        );
      });
    }

    return result;
  }, [
    menuItems,
    search,
    selectedCategory,
  ]);

  const saveCart = async (
    items: CartItem[]
  ) => {
    if (!restaurant) {
      return;
    }

    if (items.length === 0) {
      await AsyncStorage.removeItem(
        CART_STORAGE_KEY
      );

      setCart([]);
      return;
    }

    const storedCart: StoredCart = {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      items,
    };

    await AsyncStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(storedCart)
    );

    setCart(items);
  };

  const addToCart = async (
    menuItem: RestaurantMenuItem
  ) => {
    try {
      if (!restaurant) {
        showMessage(
          "Restaurant unavailable",
          "Restaurant information is not available."
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
          "You cannot place a new food order while this restaurant is closed."
        );
        return;
      }

      if (!menuItem.is_available) {
        showMessage(
          "Unavailable",
          "This food is currently unavailable."
        );
        return;
      }

      /*
       * ALWAYS read the latest cart from storage.
       * This prevents the cart from becoming empty
       * when navigating between screens.
       */
      const rawCart =
        await AsyncStorage.getItem(
          CART_STORAGE_KEY
        );

      let storedCart: StoredCart | null =
        null;

      if (rawCart) {
        try {
          storedCart = JSON.parse(rawCart);
        } catch {
          storedCart = null;
        }
      }

      /*
       * Only one restaurant can be in one food cart.
       */
      if (
        storedCart?.restaurantId &&
        storedCart.restaurantId !== restaurant.id
      ) {
        if (Platform.OS === "web") {
          const shouldClear =
            typeof window !== "undefined"
              ? window.confirm(
                  `Your cart contains food from ${
                    storedCart.restaurantName ||
                    "another restaurant"
                  }.\n\nClear the old cart and add food from ${restaurant.name}?`
                )
              : false;

          if (!shouldClear) {
            return;
          }
        } else {
          const { Alert } =
            require("react-native");

          Alert.alert(
            "Different restaurant",
            `Your cart contains food from ${
              storedCart.restaurantName ||
              "another restaurant"
            }. Clear it and add food from ${restaurant.name}?`,
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Clear & Add",
                onPress: async () => {
                  await AsyncStorage.removeItem(
                    CART_STORAGE_KEY
                  );

                  const newItem: CartItem = {
                    menuItemId:
                      menuItem.id,
                    restaurantId:
                      restaurant.id,
                    name: menuItem.name,
                    description:
                      menuItem.description,
                    price: Number(
                      menuItem.price
                    ),
                    imageUrl:
                      menuItem.image_url,
                    quantity: 1,
                  };

                  await saveCart([
                    newItem,
                  ]);

                  showMessage(
                    "Added to Cart",
                    `${menuItem.name} has been added.`
                  );
                },
              },
            ]
          );

          return;
        }

        await AsyncStorage.removeItem(
          CART_STORAGE_KEY
        );

        storedCart = null;
      }

      const existingItems: CartItem[] =
        Array.isArray(storedCart?.items)
          ? storedCart!.items
          : [];

      const existingIndex =
        existingItems.findIndex(
          (item) =>
            item.menuItemId ===
            menuItem.id
        );

      let updatedItems: CartItem[];

      if (existingIndex !== -1) {
        updatedItems =
          existingItems.map(
            (item, index) => {
              if (
                index !== existingIndex
              ) {
                return item;
              }

              return {
                ...item,
                quantity:
                  Number(
                    item.quantity || 0
                  ) + 1,
              };
            }
          );
      } else {
        const newItem: CartItem = {
          menuItemId: menuItem.id,
          restaurantId: restaurant.id,
          name: menuItem.name,
          description:
            menuItem.description,
          price: Number(
            menuItem.price || 0
          ),
          imageUrl:
            menuItem.image_url,
          quantity: 1,
        };

        updatedItems = [
          ...existingItems,
          newItem,
        ];
      }

      await saveCart(updatedItems);

      showMessage(
        "Added to Cart",
        `${menuItem.name} has been added to your cart.`
      );
    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );

      showMessage(
        "Unable to add",
        "Could not add this food to your cart."
      );
    }
  };

  const increaseQuantity = async (
    menuItemId: string
  ) => {
    const updatedItems = cart.map(
      (item) =>
        item.menuItemId === menuItemId
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
    );

    await saveCart(updatedItems);
  };

  const decreaseQuantity = async (
    menuItemId: string
  ) => {
    const updatedItems = cart
      .map((item) =>
        item.menuItemId === menuItemId
          ? {
              ...item,
              quantity:
                item.quantity - 1,
            }
          : item
      )
      .filter(
        (item) => item.quantity > 0
      );

    await saveCart(updatedItems);
  };

  const openCart = () => {
    if (!restaurant) {
      return;
    }

    router.push({
      pathname: "/restaurants/cart",
      params: {
        restaurantId: restaurant.id,
      },
    });
  };

  const goBack = () => {
    router.back();
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
            Loading menu...
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
            Restaurant not found
          </Text>

          <Text style={styles.emptyText}>
            This restaurant is no longer
            available.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goBack}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>

          <View
            style={
              styles.headerStatusRow
            }
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    restaurant.is_open
                      ? "#16A34A"
                      : "#9CA3AF",
                },
              ]}
            />

            <Text
              style={[
                styles.headerStatus,
                {
                  color:
                    restaurant.is_open
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

        <TouchableOpacity
          style={styles.cartButton}
          onPress={openCart}
        >
          <Ionicons
            name="cart-outline"
            size={23}
            color="#FFFFFF"
          />

          {totalCartItems > 0 && (
            <View style={styles.cartBadge}>
              <Text
                style={
                  styles.cartBadgeText
                }
              >
                {totalCartItems > 99
                  ? "99+"
                  : totalCartItems}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          totalCartItems > 0 &&
            styles.contentWithCart,
        ]}
      >
        {restaurant.cover_image_url ? (
          <Image
            source={{
              uri: restaurant.cover_image_url,
            }}
            style={styles.coverImage}
          />
        ) : (
          <View
            style={
              styles.coverPlaceholder
            }
          >
            <Ionicons
              name="restaurant-outline"
              size={48}
              color="#E53935"
            />
          </View>
        )}

        <View
          style={styles.restaurantInfoCard}
        >
          <View
            style={
              styles.restaurantInfoTop
            }
          >
            {restaurant.logo_url ? (
              <Image
                source={{
                  uri: restaurant.logo_url,
                }}
                style={
                  styles.restaurantLogo
                }
              />
            ) : (
              <View
                style={
                  styles.restaurantLogoPlaceholder
                }
              >
                <Ionicons
                  name="restaurant"
                  size={27}
                  color="#E53935"
                />
              </View>
            )}

            <View
              style={
                styles.restaurantText
              }
            >
              <Text
                style={
                  styles.restaurantName
                }
              >
                {restaurant.name}
              </Text>

              <Text
                style={
                  styles.restaurantAddress
                }
                numberOfLines={2}
              >
                {restaurant.address}
              </Text>
            </View>
          </View>

          {restaurant.description ? (
            <Text
              style={
                styles.restaurantDescription
              }
            >
              {restaurant.description}
            </Text>
          ) : null}

          <View
            style={styles.infoRow}
          >
            <Ionicons
              name="time-outline"
              size={17}
              color="#6B7280"
            />

            <Text
              style={styles.infoText}
            >
              {restaurant.opening_time &&
              restaurant.closing_time
                ? `${restaurant.opening_time.slice(
                    0,
                    5
                  )} - ${restaurant.closing_time.slice(
                    0,
                    5
                  )}`
                : "Opening hours not provided"}
            </Text>
          </View>

          <View
            style={styles.paymentInfo}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={17}
              color="#E53935"
            />

            <Text
              style={
                styles.paymentInfoText
              }
            >
              Pay directly to restaurant by
              MoMo
            </Text>
          </View>
        </View>

        <View
          style={styles.searchContainer}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search food..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setSearch("")
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.categoryContainer
          }
        >
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory ===
                "all" &&
                styles.categoryButtonActive,
            ]}
            onPress={() =>
              setSelectedCategory(
                "all"
              )
            }
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory ===
                  "all" &&
                  styles.categoryTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categories.map(
            (category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory ===
                    category.id &&
                    styles.categoryButtonActive,
                ]}
                onPress={() =>
                  setSelectedCategory(
                    category.id
                  )
                }
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory ===
                      category.id &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        <View
          style={styles.menuHeader}
        >
          <Text
            style={styles.menuTitle}
          >
            Menu
          </Text>

          <Text
            style={styles.menuCount}
          >
            {filteredItems.length}{" "}
            {filteredItems.length ===
            1
              ? "food"
              : "foods"}
          </Text>
        </View>

        {filteredItems.length ===
        0 ? (
          <View
            style={
              styles.noFoodContainer
            }
          >
            <Ionicons
              name="fast-food-outline"
              size={45}
              color="#9CA3AF"
            />

            <Text
              style={
                styles.noFoodTitle
              }
            >
              No food found
            </Text>

            <Text
              style={
                styles.noFoodText
              }
            >
              Try another search or
              category.
            </Text>
          </View>
        ) : (
          filteredItems.map(
            (item) => {
              const cartItem =
                cart.find(
                  (cartItem) =>
                    cartItem.menuItemId ===
                    item.id
                );

              const quantity =
                cartItem?.quantity || 0;

              return (
                <View
                  key={item.id}
                  style={styles.foodCard}
                >
                  {item.image_url ? (
                    <Image
                      source={{
                        uri: item.image_url,
                      }}
                      style={
                        styles.foodImage
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.foodImagePlaceholder
                      }
                    >
                      <Ionicons
                        name="fast-food-outline"
                        size={35}
                        color="#9CA3AF"
                      />
                    </View>
                  )}

                  <View
                    style={
                      styles.foodDetails
                    }
                  >
                    <View
                      style={
                        styles.foodTitleRow
                      }
                    >
                      <Text
                        style={
                          styles.foodName
                        }
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>

                      {item.is_featured && (
                        <View
                          style={
                            styles.featuredBadge
                          }
                        >
                          <Ionicons
                            name="star"
                            size={11}
                            color="#D97706"
                          />

                          <Text
                            style={
                              styles.featuredText
                            }
                          >
                            Featured
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.description ? (
                      <Text
                        style={
                          styles.foodDescription
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {
                          item.description
                        }
                      </Text>
                    ) : null}

                    <View
                      style={
                        styles.foodBottom
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.foodPrice
                          }
                        >
                          {formatPrice(
                            Number(
                              item.price
                            )
                          )}
                        </Text>

                        {item.preparation_time_minutes !=
                          null && (
                          <Text
                            style={
                              styles.preparationTime
                            }
                          >
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color="#6B7280"
                            />{" "}
                            {
                              item.preparation_time_minutes
                            }{" "}
                            min
                          </Text>
                        )}
                      </View>

                      {quantity ===
                      0 ? (
                        <TouchableOpacity
                          style={
                            styles.addButton
                          }
                          onPress={() =>
                            addToCart(
                              item
                            )
                          }
                        >
                          <Ionicons
                            name="add"
                            size={19}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.addButtonText
                            }
                          >
                            Add
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={
                            styles.quantityContainer
                          }
                        >
                          <TouchableOpacity
                            style={
                              styles.quantityButton
                            }
                            onPress={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                          >
                            <Ionicons
                              name="remove"
                              size={18}
                              color="#111827"
                            />
                          </TouchableOpacity>

                          <Text
                            style={
                              styles.quantityText
                            }
                          >
                            {
                              quantity
                            }
                          </Text>

                          <TouchableOpacity
                            style={
                              styles.quantityButton
                            }
                            onPress={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                          >
                            <Ionicons
                              name="add"
                              size={18}
                              color="#111827"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }
          )
        )}

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>

      {totalCartItems > 0 && (
        <View
          style={styles.cartBar}
        >
          <TouchableOpacity
            style={styles.cartBarInfo}
            onPress={openCart}
          >
            <View
              style={
                styles.cartBarIcon
              }
            >
              <Ionicons
                name="cart"
                size={21}
                color="#E53935"
              />

              <View
                style={
                  styles.cartBarBadge
                }
              >
                <Text
                  style={
                    styles.cartBarBadgeText
                  }
                >
                  {totalCartItems}
                </Text>
              </View>
            </View>

            <View>
              <Text
                style={
                  styles.cartBarLabel
                }
              >
                Your Cart
              </Text>

              <Text
                style={
                  styles.cartBarAmount
                }
              >
                {formatPrice(
                  cartTotal
                )}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.viewCartButton
            }
            onPress={openCart}
          >
            <Text
              style={
                styles.viewCartButtonText
              }
            >
              View Cart
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 14,
    color: "#6B7280",
  },

  header: {
    height: 64,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: 10,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  headerStatus: {
    fontSize: 11,
    fontWeight: "700",
  },

  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },

  content: {
    padding: 16,
  },

  contentWithCart: {
    paddingBottom: 120,
  },

  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },

  coverPlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  restaurantInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginTop: -25,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  restaurantInfoTop: {
    flexDirection: "row",
    alignItems: "center",
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

  restaurantText: {
    flex: 1,
    marginLeft: 12,
  },

  restaurantName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  restaurantAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  restaurantDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
    marginTop: 12,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  infoText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 7,
  },

  paymentInfo: {
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
  },

  paymentInfoText: {
    marginLeft: 7,
    fontSize: 12,
    color: "#E53935",
    fontWeight: "700",
  },

  searchContainer: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginTop: 18,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: "#111827",
  },

  categoryContainer: {
    paddingVertical: 14,
  },

  categoryButton: {
    paddingHorizontal: 17,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  categoryButtonActive: {
    backgroundColor: "#E53935",
    borderColor: "#E53935",
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  categoryTextActive: {
    color: "#FFFFFF",
  },

  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  menuCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
  },

  foodImage: {
    width: 105,
    height: 105,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },

  foodImagePlaceholder: {
    width: 105,
    height: 105,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  foodDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },

  foodTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  foodName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    color: "#111827",
  },

  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    marginLeft: 5,
  },

  featuredText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#92400E",
    marginLeft: 3,
  },

  foodDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
    marginTop: 5,
  },

  foodBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 8,
  },

  foodPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#E53935",
  },

  preparationTime: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 3,
  },

  addButton: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 4,
  },

  quantityContainer: {
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  quantityButton: {
    width: 35,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  quantityText: {
    minWidth: 25,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  noFoodContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  noFoodTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginTop: 10,
  },

  noFoodText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
  },

  cartBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "ios" ? 20 : 12,
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },

  cartBarInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
  },

  cartBarIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  cartBarBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  cartBarBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },

  cartBarLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 10,
  },

  cartBarAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginLeft: 10,
    marginTop: 2,
  },

  viewCartButton: {
    height: 47,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  viewCartButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginRight: 7,
  },

  bottomSpace: {
    height: 30,
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
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 7,
    marginBottom: 20,
  },

  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});