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

export default function RiderWithdrawals() {

  const [balance, setBalance] =
    useState(0);

  const [amount, setAmount] =
    useState("");

  const [momoNumber, setMomoNumber] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [withdrawals, setWithdrawals] =
    useState<any[]>([]);

  /* ================= LOAD ================= */

  async function loadData() {

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

      /* ================= DELIVERIES ================= */

      const {
        data: deliveries,
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
          );

      const totalEarnings =
        (deliveries || []).reduce(
          (
            sum: number,
            item: any
          ) =>
            sum +
            Number(
              item.rider_earning || 0
            ),
          0
        );

      /* ================= WITHDRAWALS ================= */

      const {
        data: withdrawalData,
      } =
        await (supabase as any)
          .from(
            "rider_withdrawals"
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

      const totalWithdrawn =
        (withdrawalData || []).reduce(
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

      setBalance(
        totalEarnings -
          totalWithdrawn
      );

      setWithdrawals(
        withdrawalData || []
      );

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadData();

  }, []);

  /* ================= WITHDRAW ================= */

  async function requestWithdrawal() {

    if (processing)
      return;

    const withdrawAmount =
      Number(amount);

    if (
      !withdrawAmount ||
      withdrawAmount <= 0
    ) {

      Alert.alert(
        "Invalid Amount"
      );

      return;
    }

    if (
      withdrawAmount >
      balance
    ) {

      Alert.alert(
        "Insufficient Balance"
      );

      return;
    }

    if (!momoNumber) {

      Alert.alert(
        "Enter MOMO Number"
      );

      return;
    }

    try {

      setProcessing(true);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user)
        return;

      const {
        error,
      } =
        await (supabase as any)
          .from(
            "rider_withdrawals"
          )
          .insert({

            rider_id:
              user.id,

            amount:
              withdrawAmount,

            momo_number:
              momoNumber,

            status:
              "pending",
          });

      if (error) {

        Alert.alert(
          "Withdrawal Error",
          error.message
        );

        return;
      }

      Alert.alert(
        "Success",
        "Withdrawal request submitted"
      );

      setAmount("");

      loadData();

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message
      );
    }

    setProcessing(false);
  }

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
        backgroundColor: "#f8fafc",
      }}
    >

      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        💸 Withdrawals
      </Text>

      {/* BALANCE */}

      <View
        style={{
          backgroundColor: "#2563eb",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}
      >

        <Text
          style={{
            color: "#fff",
            fontSize: 18,
          }}
        >
          Available Balance
        </Text>

        <Text
          style={{
            color: "#fff",
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          GH₵{" "}
          {balance.toLocaleString()}
        </Text>

      </View>

      {/* FORM */}

      <TextInput
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{
          backgroundColor: "#fff",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      />

      <TextInput
        placeholder="MOMO Number"
        keyboardType="phone-pad"
        value={momoNumber}
        onChangeText={
          setMomoNumber
        }
        style={{
          backgroundColor: "#fff",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      />

      <TouchableOpacity
        disabled={processing}
        onPress={
          requestWithdrawal
        }
        style={{
          backgroundColor: "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginBottom: 25,
        }}
      >

        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          {processing
            ? "Processing..."
            : "Request Withdrawal"}
        </Text>

      </TouchableOpacity>

      {/* HISTORY */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        Withdrawal History
      </Text>

      <FlatList
        data={withdrawals}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={({ item }) => (

          <View
            style={{
              backgroundColor: "#fff",
              padding: 15,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >

            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              GH₵{" "}
              {Number(
                item.amount || 0
              ).toLocaleString()}
            </Text>

            <Text
              style={{
                marginTop: 6,
                color: "#6b7280",
              }}
            >
              📱 {item.momo_number}
            </Text>

            <Text
              style={{
                marginTop: 6,
                color:
                  item.status ===
                  "paid"
                    ? "#16a34a"
                    : "#f59e0b",
                fontWeight: "bold",
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