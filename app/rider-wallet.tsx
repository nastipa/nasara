import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function RiderWallet() {

  const [earnings, setEarnings] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [total, setTotal] =
    useState(0);
    const [withdrawAmount, setWithdrawAmount] =
  useState("");

const [momoNumber, setMomoNumber] =
  useState("");

const [momoName, setMomoName] =
  useState("");

const [processing, setProcessing] =
  useState(false);
  /* ================= REQUEST WITHDRAWAL ================= */

async function requestWithdrawal() {

  try {

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

    /* ================= GET RIDER ================= */

    const {
      data: riderData,
      error: riderError,
    } =
      await (supabase as any)
        .from("riders")
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (
      riderError ||
      !riderData
    ) {

      Alert.alert(
        "Rider Error",
        "Rider profile not found"
      );

      return;
    }

    /* ================= GET PENDING EARNINGS ================= */

    const {
      data: earnings,
      error: earningsError,
    } =
      await (supabase as any)
        .from("rider_earnings")
        .select("*")
        .eq(
          "rider_id",
          user.id
        )
        .eq(
          "status",
          "pending"
        );

    if (earningsError) {

      Alert.alert(
        "Earnings Error",
        earningsError.message
      );

      return;
    }

    /* ================= CALCULATE BALANCE ================= */

    const pendingBalance =
      (earnings || []).reduce(
        (
          sum: number,
          item: any
        ) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );

    if (
      pendingBalance <= 0
    ) {

      Alert.alert(
        "No Balance",
        "No pending earnings available"
      );

      return;
    }

    /* ================= CHECK EXISTING REQUEST ================= */

    const {
      data: existingRequest,
    } =
      await (supabase as any)
        .from(
          "withdrawal_requests"
        )
        .select("id")
        .eq(
          "rider_id",
          user.id
        )
        .eq(
          "status",
          "pending"
        )
        .maybeSingle();

    if (
      existingRequest
    ) {

      Alert.alert(
        "Pending Request",
        "You already have a pending withdrawal request"
      );

      return;
    }
/* ================= CREATE REQUEST ================= */

const {
  error,
} =
  await (supabase as any)
    .from(
      "withdrawal_requests"
    )
    .insert({

      rider_id:
        user.id,

      amount:
        pendingBalance,

      momo_name:
        riderData.momo_name,

      momo_number:
        riderData.momo_number,

      network:
        riderData.network,

      status:
        "pending",
    });

if (error) {

  console.log(error);

  Alert.alert(
    "Withdrawal Error",
    error.message
  );

  return;
}

/* ================= MARK EARNINGS AS REQUESTED ================= */

await (supabase as any)
  .from("rider_earnings")
  .update({

    status:
      "withdrawal_requested",
  })
  .eq(
    "rider_id",
    user.id
  )
  .eq(
    "status",
    "pending"
  );

Alert.alert(
  "Success",
  `Withdrawal request submitted for GH₵${pendingBalance.toLocaleString()}`
);

    Alert.alert(
      "Success",
     ` Withdrawal request submitted for GH₵${pendingBalance.toLocaleString()}`
    );

  } catch (err: any) {

    console.log(err);

    Alert.alert(
      "Error",
      err?.message
    );
  }
}

  /* ================= LOAD ================= */

  async function loadWallet() {

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    const user =
      authData?.user;

    if (!user) return;

    const {
      data,
    } =
      await (supabase as any)
        .from(
          "rider_earnings"
        )
        .select("*")
        .eq(
          "rider_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );
if (data) {

  setEarnings(data);

  /* ================= AVAILABLE BALANCE ================= */

  const availableBalance =
    data
      .filter(
        (item: any) =>
          item.status === "pending"
      )
      .reduce(
        (
          acc: number,
          item: any
        ) =>
          acc +
          Number(
            item.amount || 0
          ),
        0
      );

  setTotal(
    availableBalance
  );
}
    setLoading(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadWallet();

  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    const channel =
      (supabase as any)
        .channel(
          "wallet-live"
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

            loadWallet();
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
      }}
    >

      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        💰 Rider Wallet
      </Text>

      <View
        style={{
          backgroundColor:
            "#16a34a",
          padding: 20,
          borderRadius: 16,
          marginBottom: 25,
        }}
      >

        <Text
          style={{
            color: "#fff",
            fontSize: 18,
          }}
        >
          Total Earnings
        </Text>

        <Text
          style={{
            color: "#fff",
            fontSize: 30,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          GH₵
          {" "}
          {total.toLocaleString()}
        </Text>

      </View>
      <View
  style={{
    backgroundColor:
      "#fff",

    borderRadius: 14,

    padding: 15,

    marginBottom: 20,

    borderWidth: 1,

    borderColor: "#ddd",
  }}
>

  <Text
    style={{
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 15,
    }}
  >
    💸 Withdraw Earnings
  </Text>

  <TextInput
    placeholder="Amount"
    value={withdrawAmount}
    onChangeText={
      setWithdrawAmount
    }
    keyboardType="numeric"
    style={{
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    }}
  />

  <TextInput
    placeholder="MoMo Number"
    value={momoNumber}
    onChangeText={
      setMomoNumber
    }
    keyboardType="phone-pad"
    style={{
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    }}
  />

  <TextInput
    placeholder="MoMo Name"
    value={momoName}
    onChangeText={
      setMomoName
    }
    style={{
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 10,
      padding: 12,
      marginBottom: 15,
    }}
  />

  <TouchableOpacity
    disabled={processing}
    onPress={
      requestWithdrawal
    }
    style={{
      backgroundColor:
        "#16a34a",

      padding: 14,

      borderRadius: 10,
    }}
  >

    <Text
      style={{
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
      }}
    >
      {processing
        ? "Processing..."
        : "Request Withdrawal"}
    </Text>

  </TouchableOpacity>

</View>

      <FlatList
        data={earnings}
        keyExtractor={(i) => i.id}
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
              borderRadius: 12,
              padding: 15,
              marginBottom: 12,
            }}
          >

            <Text>
              Delivery:
              {" "}
              {
                item.delivery_id
              }
            </Text>

            <Text
              style={{
                fontWeight:
                  "bold",
                marginTop: 6,
              }}
            >
              GH₵
              {" "}
              {Number(
                item.amount
              ).toLocaleString()}
            </Text>

            <Text
              style={{
                marginTop: 4,
                color:
                  item.status ===
                  "paid"
                    ? "green"
                    : "orange",
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