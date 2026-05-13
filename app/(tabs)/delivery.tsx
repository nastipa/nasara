import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function DeliveryTab() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRider, setIsRider] = useState(false);

  async function loadUser() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      /* ADMIN */
      const admin = user.user_metadata?.role === "admin";
      setIsAdmin(admin);

      /* RIDER */
      const { data: riderRow, error } = await (supabase as any)
        .from("riders")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.log("rider check error:", error);
        setIsRider(false);
      } else {
        setIsRider(
          riderRow &&
            (
              riderRow.approved === true ||
              riderRow.approved === "true" ||
              riderRow.status === "approved"
            )
        );
      }
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  const menu = isAdmin
    ? [
        {
          title: "🛠️ Logistics",
          route: "/(admin)/logistics",
          color: "#2563eb",
        },
        {
          title: "💳 Delivery Payments",
          route: "/(admin)/delivery-payments",
          color: "#16a34a",
        },
        {
          title: "🚴 Rider Applications",
          route: "/(admin)/rider-applications",
          color: "#9333ea",
        },
        {
          title: "🚚 Request Delivery",
          route: "/request-delivery",
          color: "#f59e0b",
        },
      ]
    : isRider
    ? [
        {
          title: "🚚 Rider Dashboard",
          route: "/rider-dashboard",
          color: "#2563eb",
        },
        {
          title: "💰 Rider Wallet",
          route: "/rider-wallet",
          color: "#16a34a",
        },
        {
          title: "📋 My Deliveries",
          route: "/my-deliveries",
          color: "#9333ea",
        },
        {
          title: "📦 Delivery History",
          route: "/delivery-history",
          color: "#f59e0b",
        },
        {
          title: "🚚 Request Delivery",
          route: "/request-delivery",
          color: "#0f766e",
        },
      ]
    : [
        {
          title: "🚴 Apply as Rider",
          route: "/become-rider",
          color: "#16a34a",
        },
        {
          title: "📋 My Deliveries",
          route: "/my-deliveries",
          color: "#9333ea",
        },
        {
          title: "📦 Delivery History",
          route: "/delivery-history",
          color: "#f59e0b",
        },
        {
          title: "🚚 Request Delivery",
          route: "/request-delivery",
          color: "#2563eb",
        },
      ];

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        size="large"
      />
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        {isAdmin
          ? "🛠️ Admin Logistics"
          : isRider
          ? "🚴 Rider Center"
          : "📦 Delivery"}
      </Text>

      {menu.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() =>
            router.push(item.route as any)
          }
          style={{
            backgroundColor: item.color,
            padding: 18,
            borderRadius: 14,
            marginBottom: 15,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}