import {
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function WithdrawalsAdmin() {

  const [withdrawals, setWithdrawals] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  /* ================= LOAD ================= */

  async function loadWithdrawals() {

    try {

      const {
        data,
        error,
      } =
        await (supabase as any)
          .from(
            "withdrawal_requests"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {

        Alert.alert(
          "Load Error",
          error.message
        );

        return;
      }

      setWithdrawals(
        data || []
      );

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= APPROVE ================= */

  async function approveWithdrawal(
    item: any
  ) {

    try {

      const {
        error,
      } =
        await (supabase as any)
          .from(
            "withdrawal_requests"
          )
          .update({

            status:
              "paid",
          })
          .eq(
            "id",
            item.id
          );

      if (error) {

        Alert.alert(
          "Approval Error",
          error.message
        );

        return;
      }


/* ================= MARK EARNINGS AS PAID ================= */

await (supabase as any)
  .from("rider_earnings")
  .update({

    status:
      "paid",
  })
  .eq(
    "rider_id",
    item.rider_id
  )
  .in(
    "status",
    [
      "pending",
      "withdrawal_requested",
    ]
  );
      Alert.alert(
        "Success",
        "Withdrawal approved"
      );

      loadWithdrawals();

    } catch (err: any) {

      console.log(err);
    }
  }

  /* ================= REJECT ================= */

  async function rejectWithdrawal(
    item: any
  ) {

    try {

      const {
        error,
      } =
        await (supabase as any)
          .from(
            "withdrawal_requests"
          )
          .update({

            status:
              "rejected",
          })
          .eq(
            "id",
            item.id
          );

      if (error) {

        Alert.alert(
          "Reject Error",
          error.message
        );

        return;
      }

      Alert.alert(
        "Rejected"
      );

      loadWithdrawals();

    } catch (err: any) {

      console.log(err);
    }
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
          "withdrawals-admin"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "withdrawal_requests",
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

  return (

    <View
      style={{
        flex: 1,
        backgroundColor:
          "#0f172a",
        padding: 15,
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
        💸 Withdrawal Requests
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
                "#1e293b",
              padding: 16,
              borderRadius: 14,
              marginBottom: 15,
            }}
          >

            <Text
              style={{
                color: "#fff",
                fontWeight:
                  "bold",
                fontSize: 18,
              }}
            >
              GH₵
              {" "}
              {Number(
                item.amount || 0
              ).toLocaleString()}
            </Text>

            <Text
              style={{
                color: "#cbd5e1",
                marginTop: 8,
              }}
            >
              👤 {item.momo_name}
            </Text>

            <Text
              style={{
                color: "#cbd5e1",
                marginTop: 5,
              }}
            >
              💳 {item.momo_number}
            </Text>

            <Text
              style={{
                color: "#cbd5e1",
                marginTop: 5,
              }}
            >
              📡 {item.network}
            </Text>

            <Text
              style={{
                color:
                  item.status ===
                  "paid"
                    ? "#22c55e"
                    : item.status ===
                      "rejected"
                    ? "#ef4444"
                    : "#facc15",

                marginTop: 10,
                fontWeight:
                  "bold",
              }}
            >
              {item.status}
            </Text>

            {item.status ===
              "pending" && (

              <View
                style={{
                  flexDirection:
                    "row",
                  marginTop: 15,
                }}
              >

                <TouchableOpacity
                  onPress={() =>
                    approveWithdrawal(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      "#16a34a",
                    padding: 12,
                    borderRadius: 10,
                    marginRight: 10,
                  }}
                >

                  <Text
                    style={{
                      color:
                        "#fff",
                      fontWeight:
                        "bold",
                    }}
                  >
                    Approve
                  </Text>

                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    rejectWithdrawal(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      "#dc2626",
                    padding: 12,
                    borderRadius: 10,
                  }}
                >

                  <Text
                    style={{
                      color:
                        "#fff",
                      fontWeight:
                        "bold",
                    }}
                  >
                    Reject
                  </Text>

                </TouchableOpacity>

              </View>
            )}

          </View>
        )}
      />

    </View>
  );
}