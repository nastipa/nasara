import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    Text,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function RiderEarnings() {

  const [earnings, setEarnings] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  /* ================= LOAD ================= */

  async function loadEarnings() {

    try {

      const {
        data,
        error,
      } =
        await (supabase as any)
          .from(
            "rider_earnings"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (!error) {

        setEarnings(
          data || []
        );
      }

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadEarnings();

  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    const channel =
      (supabase as any)
        .channel(
          "admin-rider-earnings"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "rider_earnings",
          },
          () => {

            loadEarnings();
          }
        )

        .subscribe();

    return () => {

      (supabase as any)
        .removeChannel(
          channel
        );
    };

  }, []);

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

  /* ================= UI ================= */

  return (

    <View
      style={{
        flex: 1,
        padding: 15,
        backgroundColor:
          "#0f172a",
      }}
    >

      <Text
        style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        💰 Rider Earnings
      </Text>

      <FlatList
        data={earnings}
        keyExtractor={(i) => i.id}
        renderItem={({
          item,
        }) => (

          <View
            style={{
              backgroundColor:
                "#1e293b",
              padding: 18,
              borderRadius: 14,
              marginBottom: 15,
            }}
          >

            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight:
                  "bold",
              }}
            >
              GH₵{" "}
              {Number(
                item.amount || 0
              ).toLocaleString()}
            </Text>

            <Text
              style={{
                color: "#cbd5e1",
                marginTop: 6,
              }}
            >
              🚚 Delivery:
              {" "}
              {item.delivery_id}
            </Text>

            <Text
              style={{
                marginTop: 10,
                color:
                  item.status ===
                  "paid"
                    ? "#22c55e"
                    : "#facc15",
                fontWeight:
                  "bold",
              }}
            >
              {item.status}
            </Text>

          </View>
        )}
      />

    </View>
  );
}