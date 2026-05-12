import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Switch,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function RiderStatus() {

  const [online, setOnline] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [activeDeliveries, setActiveDeliveries] =
    useState(0);

  const [todayEarnings, setTodayEarnings] =
    useState(0);

  /* ================= LOAD STATUS ================= */

  async function loadStatus() {

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

      /* ================= RIDER PROFILE ================= */

      const {
        data: riderData,
      } =
        await (supabase as any)
          .from("riders")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .single();

      /* ================= CREATE IF MISSING ================= */

      if (!riderData) {

        await (supabase as any)
          .from("riders")
          .insert({

            user_id:
              user.id,

            is_online:
              false,

            total_earnings: 0,

            total_deliveries: 0,

            created_at:
              new Date().toISOString(),
          });

      } else {

        setOnline(
          riderData.is_online
        );
      }

      /* ================= ACTIVE DELIVERIES ================= */

      const {
        data: activeData,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("id")
          .eq(
            "rider_id",
            user.id
          )
          .in("status", [
            "accepted",
            "picked_up",
            "in_transit",
          ]);

      setActiveDeliveries(
        activeData?.length || 0
      );

      /* ================= TODAY EARNINGS ================= */

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const {
        data: earningsData,
      } =
        await (supabase as any)
          .from("deliveries")
          .select(
            "rider_earning"
          )
          .eq(
            "rider_id",
            user.id
          )
          .eq(
            "status",
            "delivered"
          )
          .gte(
            "delivered_at",
            today.toISOString()
          );

      let total = 0;

      earningsData?.forEach(
        (item: any) => {

          total += Number(
            item.rider_earning || 0
          );
        }
      );

      setTodayEarnings(total);

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= UPDATE ================= */

  async function updateStatus(
    value: boolean
  ) {

    try {

      setOnline(value);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        Alert.alert(
          "Login Required"
        );

        return;
      }

      const {
        error,
      } =
        await (supabase as any)
          .from("riders")
          .upsert({

            user_id:
              user.id,

            is_online:
              value,

            last_seen:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          });

      if (error) {

        Alert.alert(
          "Status Error",
          error.message
        );

        return;
      }

      Alert.alert(
        value
          ? "You are now online"
          : "You are now offline"
      );

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message
      );
    }
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadStatus();

  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    const channel =
      (supabase as any)
        .channel(
          "rider-status-live"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "deliveries",
          },
          () => {

            loadStatus();
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
        padding: 20,
        backgroundColor: "#f8fafc",
      }}
    >

      <Text
        style={{
          fontSize: 30,
          fontWeight: "bold",
          marginTop: 40,
        }}
      >
        🚚 Rider Status
      </Text>

      {/* ================= STATUS CARD ================= */}

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 22,
          marginTop: 30,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

        <View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
            }}
          >
            {online
              ? "🟢 Online"
              : "⚫ Offline"}
          </Text>

          <Text
            style={{
              marginTop: 6,
              color: "#666",
            }}
          >
            Rider availability
          </Text>

        </View>

        <Switch
          value={online}
          onValueChange={
            updateStatus
          }
        />

      </View>

      {/* ================= ACTIVE DELIVERY ================= */}

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 22,
          marginTop: 20,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >

        <Text
          style={{
            color: "#666",
          }}
        >
          Active Deliveries
        </Text>

        <Text
          style={{
            fontSize: 38,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          {activeDeliveries}
        </Text>

      </View>

      {/* ================= TODAY EARNINGS ================= */}

      <View
        style={{
          backgroundColor: "#16a34a",
          borderRadius: 20,
          padding: 22,
          marginTop: 20,
        }}
      >

        <Text
          style={{
            color: "#fff",
          }}
        >
          Today's Earnings
        </Text>

        <Text
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: "#fff",
            marginTop: 10,
          }}
        >
          GH₵{" "}
          {Number(
            todayEarnings
          ).toLocaleString()}
        </Text>

      </View>

    </View>
  );
}