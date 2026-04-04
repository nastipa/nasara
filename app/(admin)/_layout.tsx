import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAdmin } from "../../hooks/useAdmin";

export default function AdminLayout() {
  const router = useRouter();
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/browse");
    }
  }, [loading, isAdmin]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#111827" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Admin Dashboard" }}
      />

      <Stack.Screen
        name="ads"
        options={{ title: "Approve Ads" }}
      />

      <Stack.Screen
        name="banner"
        options={{ title: "Approve Banner" }}
      />

      <Stack.Screen
        name="promotion"
        options={{ title: "Approve Promotion" }}
      />

      <Stack.Screen
        name="boost"
        options={{ title: "Approve Boost" }}
      />
      <Stack.Screen
        name="battle"
        options={{ title: "Approve Battle" }}
      />
      <Stack.Screen
        name="users"
        options={{ title: "Manage Users" }}
      />

      <Stack.Screen
        name="marketplace"
        options={{ title: "Marketplace Moderation" }}
      />

      <Stack.Screen
        name="live"
        options={{ title: "Live System Control" }}
      />

      <Stack.Screen
        name="finance"
        options={{ title: "Finance & Payouts" }}
      />

      <Stack.Screen
        name="analytics"
        options={{ title: "Platform Analytics" }}
      />
    </Stack>
  );
}