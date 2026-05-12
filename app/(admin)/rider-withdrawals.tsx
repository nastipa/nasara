import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function RiderWithdrawals() {

  const [withdrawals, setWithdrawals] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  /* ================= LOAD ================= */

  async function loadWithdrawals() {

    try {

      const {
        data,
      } =
        await (supabase as any)
          .from(
            "rider_withdrawals"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (data) {

        setWithdrawals(data);
      }

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadWithdrawals();

  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    const channel =
      (supabase as any)
        .channel(
          "withdrawals-live"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "rider_withdrawals",
          },
          () => {

            loadWithdrawals();
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

  /* ================= APPROVE ================= */

  async function approveWithdrawal(
    item: any
  ) {

    try {

      setProcessingId(
        item.id
      );

      await (supabase as any)
        .from(
          "rider_withdrawals"
        )
        .update({

          status:
            "paid",
        })
        .eq(
          "id",
          item.id
        );

      /* ================= REMOVE BALANCE ================= */

      const {
        data: rider,
      } =
        await (supabase as any)
          .from("riders")
          .select(
            "total_earnings"
          )
          .eq(
            "user_id",
            item.rider_id
          )
          .single();

      await (supabase as any)
        .from("riders")
        .update({

          total_earnings:
            Number(
              rider?.total_earnings || 0
            ) - Number(
              item.amount
            ),
        })
        .eq(
          "user_id",
          item.rider_id
        );

      Alert.alert(
        "Paid",
        "Withdrawal approved"
      );

      loadWithdrawals();

    } catch (err) {

      console.log(err);
    }

    setProcessingId("");
  }

  /* ================= REJECT ================= */

  async function rejectWithdrawal(
    id: string
  ) {

    try {

      setProcessingId(id);

      await (supabase as any)
        .from(
          "rider_withdrawals"
        )
        .update({

          status:
            "rejected",
        })
        .eq(
          "id",
          id
        );

      Alert.alert(
        "Rejected"
      );

      loadWithdrawals();

    } catch (err) {

      console.log(err);
    }

    setProcessingId("");
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
        💸 Rider Withdrawals
      </Text>

      <FlatList
        data={withdrawals}
        keyExtractor={(i) => i.id}
        renderItem={({
          item,
        }) => (

          <View
            style={{
              backgroundColor:
                "#fff",

              borderRadius: 14,

              padding: 15,

              marginBottom: 15,

              borderWidth: 1,

              borderColor:
                "#ddd",
            }}
          >

            <Text
              style={{
                fontWeight:
                  "bold",
                fontSize: 17,
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
                marginTop: 8,
              }}
            >
              📱
              {" "}
              {item.momo_number}
            </Text>

            <Text
              style={{
                marginTop: 5,
              }}
            >
              👤
              {" "}
              {item.momo_name}
            </Text>

            <Text
              style={{
                marginTop: 10,

                color:
                  item.status ===
                  "paid"
                    ? "green"
                    : item.status ===
                      "rejected"
                    ? "red"
                    : "orange",

                fontWeight:
                  "bold",
              }}
            >
              {item.status}
            </Text>

            {item.status ===
              "pending" && (

              <>
                <TouchableOpacity
                  disabled={
                    processingId ===
                    item.id
                  }
                  onPress={() =>
                    approveWithdrawal(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      "#16a34a",

                    padding: 14,

                    borderRadius: 10,

                    marginTop: 15,
                  }}
                >

                  <Text
                    style={{
                      color: "#fff",
                      textAlign:
                        "center",
                      fontWeight:
                        "bold",
                    }}
                  >
                    Approve Payment
                  </Text>

                </TouchableOpacity>

                <TouchableOpacity
                  disabled={
                    processingId ===
                    item.id
                  }
                  onPress={() =>
                    rejectWithdrawal(
                      item.id
                    )
                  }
                  style={{
                    backgroundColor:
                      "#dc2626",

                    padding: 14,

                    borderRadius: 10,

                    marginTop: 10,
                  }}
                >

                  <Text
                    style={{
                      color: "#fff",
                      textAlign:
                        "center",
                      fontWeight:
                        "bold",
                    }}
                  >
                    Reject
                  </Text>

                </TouchableOpacity>
              </>
            )}

          </View>
        )}
      />

    </View>
  );
}