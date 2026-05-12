
import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function RiderEarnings() {

  const [deliveries, setDeliveries] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ================= LOAD ================= */

  async function loadEarnings() {

    try {

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

      const {
        data,
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .eq(
            "rider_id",
            user.id
          )
          .eq(
            "status",
            "delivered"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (!error) {

        setDeliveries(
          data || []
        );
      }

    } catch (err) {

      console.log(err);
    }

    setLoading(false);

    setRefreshing(false);
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
          "rider-earnings"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "deliveries",
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

  /* ================= TOTAL ================= */

  const totalEarnings =
  useMemo(() => {

    return deliveries
      .filter(
        (d) =>
          d.status ===
          "delivered"
      )
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.rider_earning || 0
          ),
        0
      );

  }, [deliveries]);
  /* ================= LOADING ================= */

  if (loading) {

    return (
      <ActivityIndicator
        size="large"
        style={{
          flex: 1,
        }}
      />
    );
  }

  /* ================= UI ================= */

  return (

    <View
      style={{
        flex: 1,
        padding: 15,
      }}
    >

      <Text
        style={{
          fontSize: 26,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        💰 Rider Earnings
      </Text>

      {/* ================= TOTAL ================= */}

      <View
        style={{
          backgroundColor:
            "#111827",
          borderRadius: 18,
          padding: 22,
          marginBottom: 20,
        }}
      >

        <Text
          style={{
            color: "#fff",
            fontSize: 16,
          }}
        >
          Total Earnings
        </Text>

        <Text
          style={{
            color: "#fff",
            fontSize: 38,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          GH₵
          {" "}
          {Number(
            totalEarnings
          ).toLocaleString()}
        </Text>

      </View>

      {/* ================= DELIVERIES ================= */}

      <FlatList
        data={deliveries}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {

              setRefreshing(
                true
              );

              loadEarnings();
            }}
          />
        }
        renderItem={({
          item,
        }) => (

          <View
            style={{
              backgroundColor:
                "#fff",
              borderWidth: 1,
              borderColor:
                "#ddd",
              borderRadius: 14,
              padding: 15,
              marginBottom: 12,
            }}
          >

            <Text
              style={{
                fontWeight:
                  "bold",
                fontSize: 17,
              }}
            >
              📦 {item.item_name}
            </Text>

            <Text
              style={{
                marginTop: 6,
              }}
            >
              📍 {
                item.pickup_address
              }
            </Text>

            <Text
              style={{
                marginTop: 4,
              }}
            >
              🏁 {
                item.dropoff_address
              }
            </Text>

            <Text
              style={{
                marginTop: 10,
                fontWeight:
                  "bold",
                color: "#16a34a",
                fontSize: 18,
              }}
            >
             💰 GH₵{" "}
{Number(
  item.rider_earning || 0
).toLocaleString()}
            </Text>

          </View>
        )}
      />

    </View>
  );
}