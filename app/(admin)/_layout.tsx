import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  View,
} from "react-native";

import { useAdmin } from "../../hooks/useAdmin";

export default function AdminLayout() {
  const router = useRouter();

  const {
    isAdmin,
    loading,
  } = useAdmin();

  useEffect(() => {
    if (
      !loading &&
      !isAdmin
    ) {
      router.replace(
        "/browse"
      );
    }
  }, [loading, isAdmin]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  if (!isAdmin)
    return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor:
            "#111827",
        },

        headerTintColor:
          "#fff",

        headerTitleStyle: {
          fontWeight:
            "bold",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title:
            "Admin Dashboard",
        }}
      />

      <Stack.Screen
        name="ads"
        options={{
          title:
            "Approve Ads",
        }}
      />

      <Stack.Screen
        name="banner"
        options={{
          title:
            "Approve Banner",
        }}
      />

      <Stack.Screen
        name="promoted"
        options={{
          title:
            "Approve Promotion",
        }}
      />

      <Stack.Screen
        name="boost"
        options={{
          title:
            "Approve Boost",
        }}
      />

      <Stack.Screen
        name="battle"
        options={{
          title:
            "Approve Battle",
        }}
      />

      <Stack.Screen
        name="delivery-analytics"
        options={{
          title:
            "Delivery Analytics",
        }}
      />

      <Stack.Screen
        name="delivery-payments"
        options={{
          title:
            "Delivery Payments",
        }}
      />

      <Stack.Screen
        name="logistics"
        options={{
          title:
            "Logistics",
        }}
      />
      <Stack.Screen
        name="farm"
        options={{
          title:
            "Farm",
        }}
      />
      <Stack.Screen
        name="add/remove admin"
        options={{
          title:
            "Add/Remove Admin",
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title:
            "Manage Users",
        }}
      />

      <Stack.Screen
        name="report"
        options={{
          title:
            "Reports",
        }}
      />

      <Stack.Screen
        name="verifications"
        options={{
          title:
            "Verify Badges",
        }}
      />

      <Stack.Screen
        name="delete-listings"
        options={{
          title:
            "Delete Listings",
        }}
      />

      <Stack.Screen
        name="remove-fake-items"
        options={{
          title:
            "Remove Fake Items",
        }}
      />

      <Stack.Screen
        name="stop-live-stream"
        options={{
          title:
            "Stop Live Stream",
        }}
      />

      <Stack.Screen
        name="end-auction"
        options={{
          title:
            "End Auction",
        }}
      />

      <Stack.Screen
        name="momo-payouts"
        options={{
          title:
            "MoMo Payouts",
        }}
      />

      <Stack.Screen
        name="revenue"
        options={{
          title:
            "Revenue",
        }}
      />

      <Stack.Screen
        name="analytics"
        options={{
          title:
            "Platform Analytics",
        }}
      />
    </Stack>
  );
}