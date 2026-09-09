import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const UPLOAD_SERVER =
  "https://nasara-upload-server.onrender.com";

type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
};

type MenuItem = {
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

const showMessage = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    console.log(title, message);
  }
};

export default function RestaurantOwnerMenu() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingFood, setSavingFood] = useState(false);
  const [uploadingFoodImage, setUploadingFoodImage] = useState(false);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [foodName, setFoodName] = useState("");
  const [foodDescription, setFoodDescription] = useState("");
  const [foodPrice, setFoodPrice] = useState("");
  const [foodPreparationTime, setFoodPreparationTime] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string | null>(null);
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [foodFeatured, setFoodFeatured] = useState(false);

  const [foodImageUri, setFoodImageUri] = useState<string | null>(null);
  const [foodImageUrl, setFoodImageUrl] = useState<string | null>(null);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        showMessage(
          "Login Required",
          "Please log in to access your restaurant menu."
        );

        router.replace("/login");
        return;
      }

      const { data: owner, error: ownerError } = await (supabase as any)
        .from("restaurant_owners")
        .select("id, restaurant_id, status")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (ownerError) {
        throw ownerError;
      }

      let resolvedRestaurantId = owner?.restaurant_id || null;

      if (!resolvedRestaurantId) {
        const { data: restaurant, error: restaurantError } =
          await (supabase as any)
            .from("restaurants")
            .select("id")
            .eq("owner_id", session.user.id)
            .maybeSingle();

        if (restaurantError) {
          throw restaurantError;
        }

        if (restaurant?.id) {
          resolvedRestaurantId = restaurant.id;

          await (supabase as any)
            .from("restaurant_owners")
            .update({
              restaurant_id: restaurant.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", owner.id)
            .eq("user_id", session.user.id);
        }
      }

      if (!resolvedRestaurantId) {
        showMessage(
          "Restaurant Not Set Up",
          "Please complete your restaurant setup first."
        );

        router.replace("/(restaurant-owner)/dashboard");
        return;
      }

      setRestaurantId(resolvedRestaurantId);

      await Promise.all([
        loadCategories(resolvedRestaurantId),
        loadMenuItems(resolvedRestaurantId),
      ]);
    } catch (error: any) {
      console.error("Load menu error:", error);

      showMessage(
        "Error",
        error?.message || "Unable to load your restaurant menu."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCategories = async (id: string) => {
    const { data, error } = await supabase
      .from("restaurant_categories")
      .select("*")
      .eq("restaurant_id", id)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    setCategories((data || []) as Category[]);
  };

  const loadMenuItems = async (id: string) => {
    const { data, error } = await supabase
      .from("restaurant_menu_items")
      .select("*")
      .eq("restaurant_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setMenuItems((data || []) as MenuItem[]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMenu();
  };

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
  };

  const resetFoodForm = () => {
    setFoodName("");
    setFoodDescription("");
    setFoodPrice("");
    setFoodPreparationTime("");
    setSelectedCategoryId(null);
    setFoodAvailable(true);
    setFoodFeatured(false);
    setFoodImageUri(null);
    setFoodImageUrl(null);
  };

  const pickFoodImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission Required",
          "Please allow access to your photos so you can add a food image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selectedImage = result.assets[0];

      setFoodImageUri(selectedImage.uri);
      setFoodImageUrl(null);
    } catch (error: any) {
      console.error("Pick food image error:", error);

      showMessage(
        "Image Error",
        error?.message || "Unable to select the food image."
      );
    }
  };

  const uploadFoodImage = async (): Promise<string | null> => {
    if (!foodImageUri) {
      return null;
    }

    try {
      setUploadingFoodImage(true);

      const response = await fetch(foodImageUri);
      const blob = await response.blob();

      const formData = new FormData();

      const extension =
        foodImageUri.toLowerCase().includes(".png")
          ? "png"
          : "jpg";

      const fileName = `restaurant-food-${Date.now()}.${extension}`;

      if (Platform.OS === "web") {
        formData.append(
          "file",
          new File([blob], fileName, {
            type: blob.type || "image/jpeg",
          })
        );
      } else {
        formData.append(
          "file",
          {
            uri: foodImageUri,
            name: fileName,
            type: blob.type || "image/jpeg",
          } as any
        );
      }

      const uploadResponse = await fetch(
        `${UPLOAD_SERVER}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();

        throw new Error(
          errorText || "Food image upload failed."
        );
      }

      const result = await uploadResponse.json();

      const uploadedUrl =
        result?.url ||
        result?.secure_url ||
        result?.image_url ||
        result?.data?.url ||
        result?.data?.secure_url;

      if (!uploadedUrl) {
        console.error("Upload response:", result);

        throw new Error(
          "The upload server did not return an image URL."
        );
      }

      setFoodImageUrl(uploadedUrl);

      return uploadedUrl;
    } catch (error: any) {
      console.error("Upload food image error:", error);

      showMessage(
        "Image Upload Failed",
        error?.message ||
          "Unable to upload the food image. Please try again."
      );

      return null;
    } finally {
      setUploadingFoodImage(false);
    }
  };

  const createCategory = async () => {
    if (!restaurantId) {
      return;
    }

    if (!categoryName.trim()) {
      showMessage(
        "Category Name",
        "Please enter a category name."
      );
      return;
    }

    try {
      setSavingCategory(true);

      const { data, error } = await (supabase as any)
        .from("restaurant_categories")
        .insert({
          restaurant_id: restaurantId,
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setCategories((current) =>
        [...current, data as Category].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      resetCategoryForm();
      setShowCategoryModal(false);

      showMessage(
        "Category Created",
        "Food category has been added successfully."
      );
    } catch (error: any) {
      console.error("Create category error:", error);

      showMessage(
        "Error",
        error?.message || "Unable to create category."
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const createMenuItem = async () => {
    if (!restaurantId) {
      return;
    }

    if (!foodName.trim()) {
      showMessage(
        "Food Name",
        "Please enter the food name."
      );
      return;
    }

    const numericPrice = Number(foodPrice);

    if (
      !foodPrice.trim() ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      showMessage(
        "Food Price",
        "Please enter a valid food price."
      );
      return;
    }

    let preparationTime: number | null = null;

    if (foodPreparationTime.trim()) {
      const parsedTime = Number(foodPreparationTime);

      if (
        !Number.isFinite(parsedTime) ||
        parsedTime < 0
      ) {
        showMessage(
          "Preparation Time",
          "Please enter a valid preparation time."
        );
        return;
      }

      preparationTime = Math.round(parsedTime);
    }

    try {
      setSavingFood(true);

      let uploadedImageUrl = foodImageUrl;

      if (foodImageUri && !uploadedImageUrl) {
        uploadedImageUrl = await uploadFoodImage();

        if (!uploadedImageUrl) {
          setSavingFood(false);
          return;
        }
      }

      const { data, error } = await (supabase as any)
        .from("restaurant_menu_items")
        .insert({
          restaurant_id: restaurantId,
          category_id: selectedCategoryId,
          name: foodName.trim(),
          description: foodDescription.trim() || null,
          price: numericPrice,
          image_url: uploadedImageUrl || null,
          preparation_time_minutes: preparationTime,
          is_available: foodAvailable,
          is_featured: foodFeatured,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setMenuItems((current) => [
        data as MenuItem,
        ...current,
      ]);

      resetFoodForm();
      setShowFoodModal(false);

      showMessage(
        "Food Added",
        "The food item and its image have been added to your menu."
      );
    } catch (error: any) {
      console.error("Create food error:", error);

      showMessage(
        "Error",
        error?.message || "Unable to add food item."
      );
    } finally {
      setSavingFood(false);
      setUploadingFoodImage(false);
    }
  };

  const toggleCategory = async (
    category: Category
  ) => {
    if (!restaurantId) {
      return;
    }

    try {
      const newValue = !category.is_active;

      const { error } = await (supabase as any)
        .from("restaurant_categories")
        .update({
          is_active: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", category.id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw error;
      }

      setCategories((current) =>
        current.map((item) =>
          item.id === category.id
            ? { ...item, is_active: newValue }
            : item
        )
      );
    } catch (error: any) {
      console.error("Category update error:", error);

      showMessage(
        "Error",
        error?.message || "Unable to update category."
      );
    }
  };

  const toggleFoodAvailability = async (
    food: MenuItem
  ) => {
    if (!restaurantId) {
      return;
    }

    try {
      const newValue = !food.is_available;

      const { error } = await (supabase as any)
        .from("restaurant_menu_items")
        .update({
          is_available: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", food.id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw error;
      }

      setMenuItems((current) =>
        current.map((item) =>
          item.id === food.id
            ? { ...item, is_available: newValue }
            : item
        )
      );
    } catch (error: any) {
      console.error("Food availability error:", error);

      showMessage(
        "Error",
        error?.message ||
          "Unable to update food availability."
      );
    }
  };

  const toggleFeatured = async (
    food: MenuItem
  ) => {
    if (!restaurantId) {
      return;
    }

    try {
      const newValue = !food.is_featured;

      const { error } = await (supabase as any)
        .from("restaurant_menu_items")
        .update({
          is_featured: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", food.id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw error;
      }

      setMenuItems((current) =>
        current.map((item) =>
          item.id === food.id
            ? { ...item, is_featured: newValue }
            : item
        )
      );
    } catch (error: any) {
      console.error("Featured update error:", error);

      showMessage(
        "Error",
        error?.message ||
          "Unable to update featured status."
      );
    }
  };

  const getCategoryName = (
    categoryId: string | null
  ) => {
    if (!categoryId) {
      return "Uncategorized";
    }

    return (
      categories.find(
        (category) => category.id === categoryId
      )?.name || "Uncategorized"
    );
  };

  const openFoodModal = () => {
    resetFoodForm();

    const activeCategories = categories.filter(
      (category) => category.is_active
    );

    if (activeCategories.length === 1) {
      setSelectedCategoryId(activeCategories[0].id);
    }

    setShowFoodModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="restaurant-outline"
            size={30}
            color="#dc2626"
          />
        </View>

        <ActivityIndicator
          size="large"
          color="#dc2626"
        />

        <Text style={styles.loadingText}>
          Loading your menu...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#dc2626"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color="#111"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              RESTAURANT MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Food & Menu
            </Text>

            <Text style={styles.subtitle}>
              Manage your categories, food, prices and availability.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons
              name="refresh"
              size={20}
              color="#dc2626"
            />
          </Pressable>
        </View>

        {/* MENU SUMMARY */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="restaurant"
              size={24}
              color="#fff"
            />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              Your Restaurant Menu
            </Text>

            <Text style={styles.summaryDescription}>
              {categories.length}{" "}
              {categories.length === 1
                ? "category"
                : "categories"}{" "}
              · {menuItems.length}{" "}
              {menuItems.length === 1
                ? "food item"
                : "food items"}
            </Text>
          </View>

          <View style={styles.summaryStats}>
            <Text style={styles.summaryNumber}>
              {
                menuItems.filter(
                  (food) => food.is_available
                ).length
              }
            </Text>

            <Text style={styles.summaryLabel}>
              Available
            </Text>
          </View>
        </View>

        {/* CATEGORY SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color="#dc2626"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  Food Categories
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Organize your menu into categories.
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => {
                resetCategoryForm();
                setShowCategoryModal(true);
              }}
            >
              <Ionicons
                name="add"
                size={18}
                color="#fff"
              />

              <Text style={styles.addButtonText}>
                Category
              </Text>
            </Pressable>
          </View>

          {categories.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="grid-outline"
                  size={28}
                  color="#dc2626"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No categories yet
              </Text>

              <Text style={styles.emptyText}>
                Create your first food category to organize your menu.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={() => {
                  resetCategoryForm();
                  setShowCategoryModal(true);
                }}
              >
                <Text style={styles.emptyButtonText}>
                  Create Category
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.categoryList}>
              {categories.map((category) => (
                <View
                  key={category.id}
                  style={styles.categoryCard}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color="#dc2626"
                    />
                  </View>

                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>
                      {category.name}
                    </Text>

                    {category.description ? (
                      <Text
                        style={styles.categoryDescription}
                        numberOfLines={2}
                      >
                        {category.description}
                      </Text>
                    ) : null}

                    <View style={styles.categoryStatusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              category.is_active
                                ? "#16a34a"
                                : "#9ca3af",
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.categoryStatus,
                          !category.is_active &&
                            styles.inactiveText,
                        ]}
                      >
                        {category.is_active
                          ? "Active"
                          : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={category.is_active}
                    onValueChange={() =>
                      toggleCategory(category)
                    }
                    trackColor={{
                      false: "#d1d5db",
                      true: "#fecaca",
                    }}
                    thumbColor={
                      category.is_active
                        ? "#dc2626"
                        : "#f4f4f5"
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* FOOD SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="fast-food-outline"
                  size={20}
                  color="#dc2626"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  Menu Items
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Add food with pictures, prices and availability.
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={openFoodModal}
            >
              <Ionicons
                name="add"
                size={18}
                color="#fff"
              />

              <Text style={styles.addButtonText}>
                Food
              </Text>
            </Pressable>
          </View>

          {menuItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="fast-food-outline"
                  size={30}
                  color="#dc2626"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No food items yet
              </Text>

              <Text style={styles.emptyText}>
                Add your first food item with a beautiful food photo.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={openFoodModal}
              >
                <Text style={styles.emptyButtonText}>
                  Add Food
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.foodList}>
              {menuItems.map((food) => (
                <View
                  key={food.id}
                  style={styles.foodCard}
                >
                  {/* FOOD IMAGE */}
                  <View style={styles.foodImageWrapper}>
                    {food.image_url ? (
                      <Image
                        source={{
                          uri: food.image_url,
                        }}
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noFoodImage}>
                        <Ionicons
                          name="fast-food-outline"
                          size={34}
                          color="#d1d5db"
                        />

                        <Text style={styles.noImageText}>
                          No image
                        </Text>
                      </View>
                    )}

                    {food.is_featured && (
                      <View style={styles.featuredOverlay}>
                        <Ionicons
                          name="star"
                          size={12}
                          color="#fff"
                        />

                        <Text style={styles.featuredOverlayText}>
                          Featured
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.foodContent}>
                    <View style={styles.foodTitleRow}>
                      <Text
                        style={styles.foodName}
                        numberOfLines={2}
                      >
                        {food.name}
                      </Text>
                    </View>

                    <Text style={styles.foodCategory}>
                      {getCategoryName(
                        food.category_id
                      )}
                    </Text>

                    {food.description ? (
                      <Text
                        style={styles.foodDescription}
                        numberOfLines={2}
                      >
                        {food.description}
                      </Text>
                    ) : null}

                    <View style={styles.foodBottomRow}>
                      <Text style={styles.foodPrice}>
                        GH₵ {Number(food.price).toFixed(2)}
                      </Text>

                      {food.preparation_time_minutes !==
                        null && (
                        <View style={styles.timeBadge}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color="#666"
                          />

                          <Text style={styles.timeText}>
                            {
                              food.preparation_time_minutes
                            }{" "}
                            min
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.foodStatusRow}>
                      <View
                        style={[
                          styles.availabilityBadge,
                          food.is_available
                            ? styles.availableBadge
                            : styles.unavailableBadge,
                        ]}
                      >
                        <View
                          style={[
                            styles.smallDot,
                            {
                              backgroundColor:
                                food.is_available
                                  ? "#16a34a"
                                  : "#9ca3af",
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.availabilityText,
                            !food.is_available &&
                              styles.inactiveText,
                          ]}
                        >
                          {food.is_available
                            ? "Available"
                            : "Unavailable"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.foodActions}>
                    <View style={styles.actionBlock}>
                      <Text style={styles.actionLabel}>
                        Available
                      </Text>

                      <Switch
                        value={food.is_available}
                        onValueChange={() =>
                          toggleFoodAvailability(food)
                        }
                        trackColor={{
                          false: "#d1d5db",
                          true: "#fecaca",
                        }}
                        thumbColor={
                          food.is_available
                            ? "#dc2626"
                            : "#f4f4f5"
                        }
                      />
                    </View>

                    <View style={styles.actionDivider} />

                    <View style={styles.actionBlock}>
                      <Text style={styles.actionLabel}>
                        Featured
                      </Text>

                      <Switch
                        value={food.is_featured}
                        onValueChange={() =>
                          toggleFeatured(food)
                        }
                        trackColor={{
                          false: "#d1d5db",
                          true: "#fde68a",
                        }}
                        thumbColor={
                          food.is_featured
                            ? "#f59e0b"
                            : "#f4f4f5"
                        }
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* DASHBOARD */}
        <Pressable
          style={styles.dashboardButton}
          onPress={() =>
            router.push("/(restaurant-owner)/dashboard")
          }
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="#fff"
          />

          <Text style={styles.dashboardButtonText}>
            Back to Restaurant Dashboard
          </Text>
        </Pressable>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* CATEGORY MODAL */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowCategoryModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Add Food Category
                </Text>

                <Text style={styles.modalSubtitle}>
                  Create a category for your menu.
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() =>
                  setShowCategoryModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#555"
                />
              </Pressable>
            </View>

            <Text style={styles.label}>
              Category Name *
            </Text>

            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g. Breakfast"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
              ]}
              value={categoryDescription}
              onChangeText={setCategoryDescription}
              placeholder="Optional category description"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() =>
                  setShowCategoryModal(false)
                }
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  savingCategory &&
                    styles.disabledButton,
                ]}
                onPress={createCategory}
                disabled={savingCategory}
              >
                {savingCategory ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Create Category
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* FOOD MODAL */}
      <Modal
        visible={showFoodModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowFoodModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Add Food Item
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Add the food customers will see and order.
                  </Text>
                </View>

                <Pressable
                  style={styles.modalClose}
                  onPress={() =>
                    setShowFoodModal(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#555"
                  />
                </Pressable>
              </View>

              {/* FOOD IMAGE PICKER */}
              <Text style={styles.label}>
                Food Image
              </Text>

              <Pressable
                style={styles.imagePicker}
                onPress={pickFoodImage}
              >
                {foodImageUri ? (
                  <Image
                    source={{
                      uri: foodImageUri,
                    }}
                    style={styles.selectedFoodImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <View style={styles.imagePickerIcon}>
                      <Ionicons
                        name="camera-outline"
                        size={30}
                        color="#dc2626"
                      />
                    </View>

                    <Text style={styles.imagePickerTitle}>
                      Add Food Photo
                    </Text>

                    <Text style={styles.imagePickerText}>
                      Tap to select a clear photo of this food.
                    </Text>
                  </View>
                )}

                {foodImageUri && (
                  <View style={styles.changeImageBadge}>
                    <Ionicons
                      name="camera"
                      size={14}
                      color="#fff"
                    />

                    <Text style={styles.changeImageText}>
                      Change Photo
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.imageTip}>
                A good food photo helps customers decide what to order.
              </Text>

              <Text style={styles.label}>
                Food Name *
              </Text>

              <TextInput
                style={styles.input}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="e.g. Jollof Rice with Chicken"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>
                Description
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                value={foodDescription}
                onChangeText={setFoodDescription}
                placeholder="Describe the food..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>
                Price (GH₵) *
              </Text>

              <TextInput
                style={styles.input}
                value={foodPrice}
                onChangeText={setFoodPrice}
                placeholder="25.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>
                Preparation Time (minutes)
              </Text>

              <TextInput
                style={styles.input}
                value={foodPreparationTime}
                onChangeText={setFoodPreparationTime}
                placeholder="20"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>
                Category
              </Text>

              {categories.filter(
                (category) => category.is_active
              ).length === 0 ? (
                <View style={styles.noCategoryBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={19}
                    color="#777"
                  />

                  <Text style={styles.noCategoryText}>
                    No active category has been created yet.
                    You can add this food without a category.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categorySelector}
                  contentContainerStyle={{
                    paddingRight: 10,
                  }}
                >
                  {categories
                    .filter(
                      (category) =>
                        category.is_active
                    )
                    .map((category) => {
                      const selected =
                        selectedCategoryId ===
                        category.id;

                      return (
                        <Pressable
                          key={category.id}
                          style={[
                            styles.categoryChip,
                            selected &&
                              styles.selectedCategoryChip,
                          ]}
                          onPress={() =>
                            setSelectedCategoryId(
                              category.id
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              selected &&
                                styles.selectedCategoryChipText,
                            ]}
                          >
                            {category.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              )}

              <View style={styles.switchRow}>
                <View style={styles.switchIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#16a34a"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>
                    Available
                  </Text>

                  <Text style={styles.switchSubtitle}>
                    Customers can order this food.
                  </Text>
                </View>

                <Switch
                  value={foodAvailable}
                  onValueChange={setFoodAvailable}
                  trackColor={{
                    false: "#d1d5db",
                    true: "#bbf7d0",
                  }}
                  thumbColor={
                    foodAvailable
                      ? "#16a34a"
                      : "#f4f4f5"
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchIcon}>
                  <Ionicons
                    name="star-outline"
                    size={21}
                    color="#f59e0b"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>
                    Featured Food
                  </Text>

                  <Text style={styles.switchSubtitle}>
                    Highlight this food to customers.
                  </Text>
                </View>

                <Switch
                  value={foodFeatured}
                  onValueChange={setFoodFeatured}
                  trackColor={{
                    false: "#d1d5db",
                    true: "#fde68a",
                  }}
                  thumbColor={
                    foodFeatured
                      ? "#f59e0b"
                      : "#f4f4f5"
                  }
                />
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() =>
                    setShowFoodModal(false)
                  }
                  disabled={
                    savingFood ||
                    uploadingFoodImage
                  }
                >
                  <Text style={styles.cancelButtonText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.confirmButton,
                    (savingFood ||
                      uploadingFoodImage) &&
                      styles.disabledButton,
                  ]}
                  onPress={createMenuItem}
                  disabled={
                    savingFood ||
                    uploadingFoodImage
                  }
                >
                  {savingFood ||
                  uploadingFoodImage ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />

                      <Text
                        style={
                          styles.confirmButtonText
                        }
                      >
                        {uploadingFoodImage
                          ? "Uploading..."
                          : "Adding..."}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.savingRow}>
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#fff"
                      />

                      <Text
                        style={
                          styles.confirmButtonText
                        }
                      >
                        Add Food
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f8",
  },

  content: {
    padding: 16,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f7f8",
  },

  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#dc2626",
    marginBottom: 3,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    color: "#666",
    fontSize: 13,
    lineHeight: 19,
  },

  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    marginLeft: 10,
  },

  summaryCard: {
    backgroundColor: "#dc2626",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryText: {
    flex: 1,
  },

  summaryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  summaryDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 4,
  },

  summaryStats: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  summaryNumber: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "900",
  },

  summaryLabel: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    fontWeight: "700",
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ededed",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionHeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
    lineHeight: 17,
  },

  addButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  addButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 3,
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#fafafa",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#222",
  },

  emptyText: {
    marginTop: 5,
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 450,
  },

  emptyButton: {
    marginTop: 15,
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },

  emptyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  categoryList: {
    gap: 10,
  },

  categoryCard: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: "#ededed",
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff1f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  categoryInfo: {
    flex: 1,
    paddingRight: 10,
  },

  categoryName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#222",
  },

  categoryDescription: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
    lineHeight: 17,
  },

  categoryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  categoryStatus: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16a34a",
  },

  inactiveText: {
    color: "#999",
  },

  foodList: {
    gap: 12,
  },

  foodCard: {
    borderWidth: 1,
    borderColor: "#ededed",
    borderRadius: 18,
    padding: 11,
    flexDirection: "row",
    backgroundColor: "#fff",
    overflow: "hidden",
  },

  foodImageWrapper: {
    width: 145,
    height: 145,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    position: "relative",
  },

  foodImage: {
    width: "100%",
    height: "100%",
  },

  noFoodImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f8f8",
  },

  noImageText: {
    marginTop: 5,
    color: "#aaa",
    fontSize: 11,
    fontWeight: "700",
  },

  featuredOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(245,158,11,0.95)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  featuredOverlayText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 3,
  },

  foodContent: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 4,
    minWidth: 0,
  },

  foodTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  foodName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    color: "#191919",
    flex: 1,
  },

  foodCategory: {
    marginTop: 4,
    fontSize: 11,
    color: "#dc2626",
    fontWeight: "800",
  },

  foodDescription: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
  },

  foodBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10,
  },

  foodPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: "#dc2626",
  },

  timeBadge: {
    marginLeft: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#f5f5f5",
    flexDirection: "row",
    alignItems: "center",
  },

  timeText: {
    marginLeft: 3,
    color: "#666",
    fontSize: 10,
    fontWeight: "700",
  },

  foodStatusRow: {
    marginTop: 9,
  },

  availabilityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  availableBadge: {
    backgroundColor: "#f0fdf4",
  },

  unavailableBadge: {
    backgroundColor: "#f5f5f5",
  },

  smallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },

  availabilityText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },

  foodActions: {
    width: 86,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#f0f0f0",
    paddingLeft: 7,
  },

  actionBlock: {
    alignItems: "center",
  },

  actionLabel: {
    fontSize: 9,
    color: "#777",
    fontWeight: "800",
    marginBottom: 2,
    textAlign: "center",
  },

  actionDivider: {
    width: 45,
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 6,
  },

  dashboardButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 2,
  },

  dashboardButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    maxHeight: "94%",
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#d4d4d4",
    alignSelf: "center",
    marginBottom: 12,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#111",
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 11,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
  },

  textArea: {
    minHeight: 85,
    paddingTop: 12,
  },

  imagePicker: {
    width: "100%",
    height: 190,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
    position: "relative",
  },

  imagePickerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  imagePickerIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  imagePickerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#222",
  },

  imagePickerText: {
    marginTop: 4,
    color: "#888",
    fontSize: 11,
    textAlign: "center",
  },

  selectedFoodImage: {
    width: "100%",
    height: "100%",
  },

  changeImageBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  changeImageText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  imageTip: {
    color: "#888",
    fontSize: 10,
    marginTop: 6,
    lineHeight: 15,
  },

  categorySelector: {
    marginTop: 3,
  },

  categoryChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: "#fff",
  },

  selectedCategoryChip: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },

  categoryChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#444",
  },

  selectedCategoryChipText: {
    color: "#fff",
  },

  noCategoryBox: {
    backgroundColor: "#f7f7f7",
    borderRadius: 11,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  noCategoryText: {
    flex: 1,
    color: "#777",
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 8,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 3,
  },

  switchIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  switchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
  },

  switchSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#777",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#444",
    fontSize: 13,
    fontWeight: "800",
  },

  confirmButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 5,
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },
});