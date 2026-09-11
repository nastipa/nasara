import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../../../lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_open: boolean;
  status: string;
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

export default function RestaurantOrderModeScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    restaurantId?: string | string[];
  }>();

  const restaurantId = Array.isArray(params.restaurantId)
    ? params.restaurantId[0]
    : params.restaurantId;

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!restaurantId) {
        showMessage(
          "Restaurant Error",
          "Restaurant ID is missing."
        );

        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select(
            `
            id,
            name,
            description,
            logo_url,
            is_open,
            status
            `
          )
          .eq("id", restaurantId)
          .eq("status", "active")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          showMessage(
            "Restaurant Unavailable",
            "This restaurant is no longer available."
          );

          setRestaurant(null);
          return;
        }

        setRestaurant(data as Restaurant);
      } catch (error: any) {
        console.log(
          "Order mode restaurant error:",
          error
        );

        showMessage(
          "Error",
          error?.message ||
            "Unable to load the restaurant."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [restaurantId]);

  const openFixedPlate = () => {
    if (!restaurant) {
      return;
    }

    router.push({
      pathname:
        "/restaurants/[restaurantId]/menu",
      params: {
        restaurantId: restaurant.id,
      },
    });
  };

  const openCustomPlate = () => {
    if (!restaurant) {
      return;
    }

    router.push({
      pathname:
        "/restaurants/[restaurantId]/custom-plate",
      params: {
        restaurantId: restaurant.id,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#DC2626"
          />

          <Text style={styles.loadingText}>
            Loading restaurant...
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
            color="#DC2626"
          />

          <Text style={styles.emptyTitle}>
            Restaurant Unavailable
          </Text>

          <Text style={styles.emptyText}>
            This restaurant is currently unavailable.
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>
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
          style={styles.headerButton}
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
            Order Food
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons
              name="restaurant"
              size={30}
              color="#DC2626"
            />
          </View>

          <Text style={styles.title}>
            Choose how you want to order
          </Text>

          <Text style={styles.subtitle}>
            You can order a restaurant's fixed-price
            plate or build your own plate and choose
            what you want to offer for each component.
          </Text>
        </View>

        <Pressable
          style={styles.optionCard}
          onPress={openFixedPlate}
        >
          <View style={styles.optionIcon}>
            <Ionicons
              name="fast-food"
              size={32}
              color="#DC2626"
            />
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Fixed Plate
            </Text>

            <Text style={styles.optionDescription}>
              Choose from the restaurant's menu with
              the prices already set by the restaurant.
            </Text>

            <View style={styles.optionFooter}>
              <Text style={styles.optionAction}>
                Browse Menu
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#DC2626"
              />
            </View>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.optionCard,
            styles.customOptionCard,
          ]}
          onPress={openCustomPlate}
        >
          <View
            style={[
              styles.optionIcon,
              styles.customOptionIcon,
            ]}
          >
            <Ionicons
              name="create-outline"
              size={32}
              color="#7C3AED"
            />
          </View>

          <View style={styles.optionContent}>
            <View style={styles.customTitleRow}>
              <Text style={styles.optionTitle}>
                Prepare My Own Plate
              </Text>

              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  CUSTOM
                </Text>
              </View>
            </View>

            <Text style={styles.optionDescription}>
              Select the food components you want and
              decide how much you want to offer for each
              one.
            </Text>

            <Text style={styles.exampleText}>
              Example: Rice GH₵20 + Chicken GH₵40 +
              Egg GH₵10 = GH₵70
            </Text>

            <View style={styles.optionFooter}>
              <Text
                style={[
                  styles.optionAction,
                  styles.customAction,
                ]}
              >
                Build My Plate
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#7C3AED"
              />
            </View>
          </View>
        </Pressable>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={22}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            For custom plates, the restaurant will see
            every component you selected and the amount
            you offered. The restaurant can then approve
            or reject the order.
          </Text>
        </View>
      </ScrollView>
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

  headerButton: {
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
    paddingBottom: 40,
  },

  intro: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 10,
  },

  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 500,
  },

  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 14,
  },

  customOptionCard: {
    borderColor: "#DDD6FE",
    backgroundColor: "#FCFAFF",
  },

  optionIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  customOptionIcon: {
    backgroundColor: "#EDE9FE",
  },

  optionContent: {
    flex: 1,
    marginLeft: 13,
  },

  optionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  customTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  newBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    marginLeft: 7,
  },

  newBadgeText: {
    color: "#7C3AED",
    fontSize: 9,
    fontWeight: "900",
  },

  optionDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },

  exampleText: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 18,
    color: "#6D28D9",
    fontWeight: "700",
  },

  optionFooter: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  optionAction: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "900",
    marginRight: 6,
  },

  customAction: {
    color: "#7C3AED",
  },

  infoCard: {
    marginTop: 18,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    color: "#1E40AF",
    fontSize: 12,
    lineHeight: 19,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },

  backButton: {
    marginTop: 20,
    backgroundColor: "#DC2626",
    borderRadius: 13,
    paddingHorizontal: 25,
    paddingVertical: 13,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});