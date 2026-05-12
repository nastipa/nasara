import { useCallback, useState } from "react";

import { useFocusEffect, useRouter } from "expo-router";

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function DeliveryTab() {

  const router =
    useRouter();

  const [loading, setLoading] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [isRider, setIsRider] =
    useState(false);

  /* ================= LOAD USER ================= */

  async function loadUser() {

    try {

      setLoading(true);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        setLoading(false);

        return;
      }

      /* ================= ADMIN ================= */

      const admin =
        user.user_metadata
          ?.role === "admin";

      setIsAdmin(admin);

      /* ================= RIDER CHECK ================= */

    const { data: riders, error } =
  await (supabase as any)
    .from("riders")
    .select("id, approved")
    .eq("user_id", user.id)
    .eq("approved", true);

if (error) {
  console.log("Rider check error:", error);
  setIsRider(false);
} else {
  setIsRider((riders?.length || 0) > 0);
}
    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= REFRESH ON OPEN ================= */

  useFocusEffect(
    useCallback(() => {

      loadUser();

    }, [])
  );

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
        size="large"
      />
    );
  }

  /* ================= ADMIN ================= */

  if (isAdmin) {

    return (

      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          padding: 20,
          backgroundColor:
            "#fff",
        }}
      >

        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          🛠️ Admin Logistics
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/(admin)/logistics"
            )
          }
          style={{
            backgroundColor:
              "#2563eb",
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
            📦 Logistics
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/(admin)/delivery-payments"
            )
          }
          style={{
            backgroundColor:
              "#16a34a",
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
            💳 Delivery Payments
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/(admin)/rider-applications"
            )
          }
          style={{
            backgroundColor:
              "#9333ea",
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
            🚴 Rider Applications
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/request-delivery"
            )
          }
          style={{
            backgroundColor:
              "#f59e0b",
            padding: 18,
            borderRadius: 14,
          }}
        >

          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            📦 Request Delivery
          </Text>

        </TouchableOpacity>

      </View>
    );
  }

  /* ================= RIDER ================= */

  if (isRider) {

    return (

      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          padding: 20,
          backgroundColor:
            "#fff",
        }}
      >

        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          🚴 Rider Center
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/rider-dashboard"
            )
          }
          style={{
            backgroundColor:
              "#2563eb",
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
            🚚 Rider Dashboard
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/rider-wallet"
            )
          }
          style={{
            backgroundColor:
              "#16a34a",
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
            💰 Rider Wallet
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/request-delivery"
            )
          }
          style={{
            backgroundColor:
              "#f59e0b",
            padding: 18,
            borderRadius: 14,
          }}
        >

          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            📦 Request Delivery
          </Text>

        </TouchableOpacity>

      </View>
    );
  }

  /* ================= NORMAL USER ================= */

  return (

    <View
      style={{
        flex: 1,
        justifyContent:
          "center",
        padding: 20,
        backgroundColor:
          "#fff",
      }}
    >

      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          marginBottom: 30,
          textAlign: "center",
        }}
      >
        📦 Delivery
      </Text>

      <TouchableOpacity
        onPress={() =>
          router.push(
            "/request-delivery"
          )
        }
        style={{
          backgroundColor:
            "#2563eb",
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
          🚚 Request Delivery
        </Text>

      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push(
            "/become-rider"
          )
        }
        style={{
          backgroundColor:
            "#16a34a",
          padding: 18,
          borderRadius: 14,
        }}
      >

        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          🚴 Become Rider
        </Text>

      </TouchableOpacity>

    </View>
  );
}