import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function BattlePayments() {
  const [payments, setPayments] =
    useState<any[]>([]);

  const [boosts, setBoosts] =
    useState<any[]>([]);

  const [creationPayments, setCreationPayments] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [price, setPrice] =
    useState(5);

  /* ===================================================== */
  /* ================= LOAD PRICE ======================== */
  /* ===================================================== */

  async function loadPrice() {
    const { data } =
      await (supabase as any)
        .from("settings")
        .select("vote_price")
        .single();

    if (data?.vote_price) {
      setPrice(data.vote_price);
    }
  }

  /* ===================================================== */
  /* ================= LOAD VOTE PAYMENTS ================ */
  /* ===================================================== */

  async function loadVotePayments() {
    const { data, error } =
      await (supabase as any)
        .from("battle_payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

    if (!error) {
      setPayments(data || []);
    }
  }

  /* ===================================================== */
  /* ================= LOAD BOOSTS ======================= */
  /* ===================================================== */

  async function loadBoosts() {
    const { data, error } =
      await (supabase as any)
        .from("battle_boost")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

    if (!error) {
      setBoosts(data || []);
    }
  }

  /* ===================================================== */
  /* ================= LOAD BATTLE CREATIONS ============= */
  /* ===================================================== */

  async function loadBattleCreations() {
    try {
      const { data, error } =
        await (supabase as any)
          .from(
            "battle_creation_payments"
          )

          .select(`
            *,
            battles (
              id,
              title,
              compare_text,
              category,
              battle_type,
              institution_name,
              institution_type,
              created_at
            )
          `)

          .neq(
            "status",
            "approved"
          )

          .neq(
            "status",
            "rejected"
          )

          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        console.log(
          "LOAD CREATION ERROR:",
          error
        );

        return;
      }

      console.log(
        "CREATION PAYMENTS:",
        data
      );

      setCreationPayments(
        data || []
      );

    } catch (e) {
      console.log(
        "LOAD BATTLE CREATIONS ERROR:",
        e
      );
    }
  }

  /* ===================================================== */
  /* ================= LOAD ALL ========================== */
  /* ===================================================== */

  async function loadAll() {
    setLoading(true);

    await Promise.all([
      loadPrice(),
      loadVotePayments(),
      loadBoosts(),
      loadBattleCreations(),
    ]);

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= INITIAL LOAD ====================== */
  /* ===================================================== */

  useEffect(() => {
    loadAll();

    const channel =
      (supabase as any)

        .channel(
          "battle-admin-live"
        )

        /* ================= VOTE PAYMENTS ================= */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "battle_payments",
          },
          () => {
            loadVotePayments();
          }
        )

        /* ================= BOOSTS ================= */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "battle_boost",
          },
          () => {
            loadBoosts();
          }
        )

        /* ================= CREATION PAYMENTS ================= */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "battle_creation_payments",
          },
          () => {
            loadBattleCreations();
          }
        )

        /* ================= BATTLES ================= */

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "battles",
          },
          () => {
            loadBattleCreations();
          }
        )

        .subscribe();

    return () => {
      (supabase as any)
        .removeChannel(channel);
    };
  }, []);

  /* ===================================================== */
  /* ================= APPROVE VOTE PAYMENT ============== */
  /* ===================================================== */

  async function approve(payment: any) {
    try {
      setLoading(true);

      const { error } =
        await (supabase as any)
          .from(
            "battle_payments"
          )
          .update({
            status: "approved",
            remaining_votes:
              payment.votes,
          })
          .eq(
            "id",
            payment.id
          );

      if (error) {
        console.log(error);

        Alert.alert(
          "Error approving payment"
        );

        setLoading(false);

        return;
      }

      setPayments((prev) =>
        prev.filter(
          (p) =>
            p.id !== payment.id
        )
      );

      await loadVotePayments();

      Alert.alert(
        "✅ Vote payment approved"
      );

    } catch (err) {
      console.log(err);

      Alert.alert(
        "Approval failed"
      );
    }

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= REJECT VOTE PAYMENT =============== */
  /* ===================================================== */

  async function reject(payment: any) {
    try {
      setLoading(true);

      const { error } =
        await (supabase as any)
          .from(
            "battle_payments"
          )
          .update({
            status: "rejected",
          })
          .eq(
            "id",
            payment.id
          );

      if (error) {
        Alert.alert(
          error.message
        );

        setLoading(false);

        return;
      }

      setPayments((prev) =>
        prev.filter(
          (p) =>
            p.id !== payment.id
        )
      );

      await loadVotePayments();

      Alert.alert(
        "❌ Vote payment rejected"
      );

    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= APPROVE BOOST ===================== */
  /* ===================================================== */

  async function approveBoost(
    boost: any
  ) {
    try {
      setLoading(true);

      const boostRes =
        await (supabase as any)
          .from("battle_boost")
          .update({
            status:
              "approved",
          })
          .eq(
            "id",
            boost.id
          );

      if (
        boostRes.error
      ) {
        console.log(
          boostRes.error
        );

        Alert.alert(
          "Boost approval failed"
        );

        setLoading(false);

        return;
      }

      const expires =
        new Date(
          Date.now() +
            boost.duration_minutes *
              60000
        );

      const battleRes =
        await (supabase as any)
          .from("battles")
          .update({
            is_boosted: true,
            boost_expires_at:
              expires.toISOString(),
          })
          .eq(
            "id",
            boost.battle_id
          );

      if (
        battleRes.error
      ) {
        console.log(
          battleRes.error
        );

        Alert.alert(
          "Battle update failed"
        );

        setLoading(false);

        return;
      }

      setBoosts((prev) =>
        prev.filter(
          (b) =>
            b.id !== boost.id
        )
      );

      await loadBoosts();

      Alert.alert(
        "🚀 Boost approved"
      );

    } catch (err) {
      console.log(err);

      Alert.alert(
        "Boost approval failed"
      );
    }

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= REJECT BOOST ====================== */
  /* ===================================================== */

  async function rejectBoost(
    boost: any
  ) {
    try {
      setLoading(true);

      const { error } =
        await (supabase as any)
          .from("battle_boost")
          .update({
            status: "rejected",
          })
          .eq(
            "id",
            boost.id
          );

      if (error) {
        Alert.alert(
          error.message
        );

        setLoading(false);

        return;
      }

      setBoosts((prev) =>
        prev.filter(
          (b) =>
            b.id !== boost.id
        )
      );

      await loadBoosts();

      Alert.alert(
        "❌ Boost rejected"
      );

    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= APPROVE BATTLE CREATION =========== */
  /* ===================================================== */

  async function approveBattleCreation(
    payment: any
  ) {
    try {
      setLoading(true);

      console.log(
        "APPROVING:",
        payment
      );

      /* ================= APPROVE PAYMENT ================= */

      const paymentUpdate =
        await (supabase as any)
          .from(
            "battle_creation_payments"
          )
          .update({
            status:
              "approved",
          })
          .eq(
            "id",
            payment.id
          );

      console.log(
        "PAYMENT UPDATE:",
        paymentUpdate
      );

      if (
        paymentUpdate.error
      ) {
        console.log(
          paymentUpdate.error
        );

        setLoading(false);

        return;
      }

      /* ================= ACTIVATE BATTLE ================= */

      const battleUpdate =
        await (supabase as any)
          .from("battles")
          .update({
            status:
              "active",

            payment_status:
              "approved",

            approval_status:
              "approved",
          })
          .eq(
            "id",
            payment.battle_id
          );

      console.log(
        "BATTLE UPDATE:",
        battleUpdate
      );

      if (
        battleUpdate.error
      ) {
        console.log(
          battleUpdate.error
        );

        setLoading(false);

        return;
      }

      setCreationPayments(
        (prev) =>
          prev.filter(
            (x) =>
              x.id !==
              payment.id
          )
      );

      await loadBattleCreations();

      Alert.alert(
        "✅ Battle approved successfully"
      );

    } catch (err) {
      console.log(
        "APPROVE ERROR:",
        err
      );

      Alert.alert(
        "Approval failed"
      );
    }

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= REJECT BATTLE ===================== */
  /* ===================================================== */

  async function rejectBattleCreation(
    battle: any
  ) {
    try {
      setLoading(true);

      const paymentRes =
        await (supabase as any)
          .from(
            "battle_creation_payments"
          )
          .update({
            status:
              "rejected",
          })
          .eq(
            "id",
            battle.id
          );

      if (
        paymentRes.error
      ) {
        Alert.alert(
          paymentRes.error
            .message
        );

        setLoading(false);

        return;
      }

      const battleRes =
        await (supabase as any)
          .from("battles")
          .update({
            status:
              "rejected",

            approval_status:
              "rejected",

            payment_status:
              "rejected",
          })
          .eq(
            "id",
            battle.battle_id
          );

      if (
        battleRes.error
      ) {
        Alert.alert(
          battleRes.error
            .message
        );

        setLoading(false);

        return;
      }

      setCreationPayments(
        (prev) =>
          prev.filter(
            (x) =>
              x.id !==
              battle.id
          )
      );

      await loadBattleCreations();

      Alert.alert(
        "❌ Battle rejected"
      );

    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  /* ===================================================== */
  /* ================= LOADING =========================== */
  /* ===================================================== */

  if (
    loading &&
    payments.length === 0 &&
    boosts.length === 0 &&
    creationPayments.length === 0
  ) {
    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
      />
    );
  }

  /* ===================================================== */
  /* ================= UI ================================ */
  /* ===================================================== */

  return (
    <ScrollView
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      {/* ================= TITLE ================= */}

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        ⚔️ Battle Admin Dashboard
      </Text>

      <Text
        style={{
          color: "gray",
          marginBottom: 20,
        }}
      >
        Vote Price: GH₵ {price}
      </Text>

      {/* ===================================================== */}
      {/* ================= BATTLE CREATIONS ================= */}
      {/* ===================================================== */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        🏗️ Battle Creation Requests
      </Text>

      {creationPayments.length ===
        0 && (
        <Text>
          No pending battle
          requests
        </Text>
      )}

      {creationPayments.map(
        (b) => (
          <View
            key={b.id}
            style={{
              borderWidth: 1,
              borderRadius: 12,
              padding: 15,
              marginBottom: 15,
            }}
          >
            {/* ================= BATTLE DETAILS ================= */}

            <Text
              style={{
                fontSize: 18,
                fontWeight:
                  "bold",
                marginBottom: 10,
              }}
            >
              ⚔️{" "}
              {b.battles
                ?.title ||
                "Untitled Battle"}
            </Text>

            <Text>
              Battle Type:{" "}
              {b.battles
                ?.battle_type ===
              "institution"
                ? "🏫 Institution"
                : "🌍 Public"}
            </Text>

            <Text>
              Category:{" "}
              {b.battles
                ?.category}
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontWeight:
                  "600",
              }}
            >
              Participants:
            </Text>

            <Text>
              {
                b.battles
                  ?.compare_text
              }
            </Text>

            {b.battles
              ?.institution_name && (
              <Text
                style={{
                  marginTop: 8,
                  color:
                    "#7c3aed",
                  fontWeight:
                    "bold",
                }}
              >
                🏫 Institution:{" "}
                {
                  b.battles
                    ?.institution_name
                }
              </Text>
            )}

            {/* ================= PAYMENT DETAILS ================= */}

            <View
              style={{
                marginTop: 15,
                borderTopWidth: 1,
                borderTopColor:
                  "#e5e7eb",
                paddingTop: 12,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",
                }}
              >
                Payment Code:{" "}
                {
                  b.payment_code
                }
              </Text>

              <Text>
                User ID:{" "}
                {b.user_id}
              </Text>

              <Text>
                Battle ID:{" "}
                {b.battle_id}
              </Text>

              <Text>
                Amount: GH₵{" "}
                {b.amount}
              </Text>

              <Text>
                MoMo:{" "}
                {
                  b.momo_name
                }{" "}
                -{" "}
                {
                  b.momo_number
                }
              </Text>

              <Text>
                Network:{" "}
                {b.network}
              </Text>
            </View>

            {/* ================= APPROVE ================= */}

            <TouchableOpacity
              onPress={() =>
                approveBattleCreation(
                  b
                )
              }
              style={{
                backgroundColor:
                  "green",
                padding: 12,
                borderRadius: 8,
                marginTop: 15,
              }}
            >
              <Text
                style={{
                  color:
                    "#fff",
                  textAlign:
                    "center",
                  fontWeight:
                    "bold",
                }}
              >
                ✅ Approve
                Battle
              </Text>
            </TouchableOpacity>

            {/* ================= REJECT ================= */}

            <TouchableOpacity
              onPress={() =>
                rejectBattleCreation(
                  b
                )
              }
              style={{
                backgroundColor:
                  "red",
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  color:
                    "#fff",
                  textAlign:
                    "center",
                  fontWeight:
                    "bold",
                }}
              >
                ❌ Reject
                Battle
              </Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ===================================================== */}
      {/* ================= VOTE PAYMENTS ==================== */}
      {/* ===================================================== */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginTop: 30,
          marginBottom: 10,
        }}
      >
        💳 Vote Payments
      </Text>

      {payments.length ===
        0 && (
        <Text>
          No pending vote
          payments
        </Text>
      )}

      {payments.map((p) => (
        <View
          key={p.id}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 15,
            marginBottom: 15,
          }}
        >
          <Text
            style={{
              fontWeight:
                "bold",
            }}
          >
            Code: {p.code}
          </Text>

          <Text>
            User: {p.user_id}
          </Text>

          <Text>
            Votes: {p.votes}
          </Text>

          <Text>
            Amount: GH₵{" "}
            {p.amount}
          </Text>

          <TouchableOpacity
            onPress={() =>
              approve(p)
            }
            style={{
              backgroundColor:
                "green",
              padding: 12,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <Text
              style={{
                color:
                  "#fff",
                textAlign:
                  "center",
              }}
            >
              ✅ Approve
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              reject(p)
            }
            style={{
              backgroundColor:
                "red",
              padding: 12,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color:
                  "#fff",
                textAlign:
                  "center",
              }}
            >
              ❌ Reject
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* ===================================================== */}
      {/* ================= BOOST REQUESTS =================== */}
      {/* ===================================================== */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginTop: 30,
          marginBottom: 10,
        }}
      >
        🚀 Boost Requests
      </Text>

      {boosts.length ===
        0 && (
        <Text>
          No pending boost
          requests
        </Text>
      )}

      {boosts.map((b) => (
        <View
          key={b.id}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 15,
            marginBottom: 15,
          }}
        >
          <Text
            style={{
              fontWeight:
                "bold",
            }}
          >
            Code: {b.code}
          </Text>

          <Text>
            User: {b.user_id}
          </Text>

          <Text>
            Battle ID:{" "}
            {b.battle_id}
          </Text>

          <Text>
            Duration:{" "}
            {
              b.duration_minutes
            }{" "}
            mins
          </Text>

          <Text>
            Amount: GH₵{" "}
            {b.amount}
          </Text>

          <TouchableOpacity
            onPress={() =>
              approveBoost(
                b
              )
            }
            style={{
              backgroundColor:
                "green",
              padding: 12,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <Text
              style={{
                color:
                  "#fff",
                textAlign:
                  "center",
              }}
            >
              ✅ Approve
              Boost
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              rejectBoost(
                b
              )
            }
            style={{
              backgroundColor:
                "red",
              padding: 12,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color:
                  "#fff",
                textAlign:
                  "center",
              }}
            >
              ❌ Reject
              Boost
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <View
        style={{
          height: 100,
        }}
      />
    </ScrollView>
  );
}