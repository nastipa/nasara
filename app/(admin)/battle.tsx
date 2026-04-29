import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function BattlePayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(5);

  /* ================= LOAD PRICE ================= */
  async function loadPrice() {
    const { data } = await (supabase as any)
      .from("settings")
      .select("vote_price")
      .single();

    if (data?.vote_price) {
      setPrice(data.vote_price);
    }
  }

  /* ================= LOAD PAYMENTS ================= */
  async function load() {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("battle_payments")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error) {
      setPayments(data || []);
    } else {
      console.log("Load error:", error);
    }

    setLoading(false);
  }

  /* ================= REALTIME ================= */
  useEffect(() => {
  load();
  loadPrice();
  loadBoosts();

  const channel = (supabase as any)
    .channel("admin-payments")

    // battle payments realtime
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battle_payments",
      },
      () => {
        load();
      }
    )

    // boost requests realtime 🔥 FIX
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battle_boost",
      },
      () => {
        loadBoosts();
      }
    )

    .subscribe();

  return () => {
    (supabase as any).removeChannel(channel);
  };
}, []);

  /* ================= APPROVE ================= */
  async function approve(payment: any) {
    try {
      setLoading(true);

      // ✅ ONLY APPROVE + GIVE USER VOTES
      const { error } = await (supabase as any)
        .from("battle_payments")
        .update({
          status: "approved",
          remaining_votes: payment.votes, // ✅ user gets votes to spend
        })
        .eq("id", payment.id);

      if (error) {
        console.log("Approve error:", error);
        setLoading(false);
        return;
      }

      // ❌ DO NOT ADD VOTES TO CANDIDATE HERE

      // 🔥 REMOVE FROM UI
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  /* ================= REJECT ================= */
  async function reject(payment: any) {
    try {
      setLoading(true);

      await (supabase as any)
        .from("battle_payments")
        .update({ status: "rejected" })
        .eq("id", payment.id);

      setPayments((prev) => prev.filter((p) => p.id !== payment.id));

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  /* ================= LOAD BOOST ================= */
  const [boosts, setBoosts] = useState<any[]>([]);

  async function loadBoosts() {
    const { data } = await (supabase as any)
      .from("battle_boost")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setBoosts(data || []);
  }

  /* ================= APPROVE BOOST ================= */
  // ✅ APPROVE BOOST (FIXED)
async function approveBoost(b: any) {
  console.log("🚀 CLICKED APPROVE", b);

  setLoading(true);

  try {
    // 🔥 STEP 1: APPROVE BOOST
    const res1 = await (supabase as any)
      .from("battle_boost")
      .update({ status: "approved" })
      .eq("id", b.id);

    console.log("STEP 1 DONE", res1);

    if (res1.error) {
      console.log("❌ STEP 1 ERROR:", res1.error);
      return;
    }

    // 🔥 STEP 2: UPDATE BATTLE
    const res2 = await (supabase as any)
      .from("battles")
      .update({ is_boosted: true })
      .eq("id", b.battle_id);

    console.log("STEP 2 DONE", res2);

    if (res2.error) {
      console.log("❌ STEP 2 ERROR:", res2.error);
      return;
    }

    // 🔥 STEP 3: UI UPDATE
    setBoosts((prev) => prev.filter((x) => x.id !== b.id));

    console.log("✅ BOOST APPROVED SUCCESSFULLY");

  } catch (err) {
    console.log("❌ CRASH:", err);
  }

  setLoading(false);
}
  /* ================= REJECT BOOST ================= */
  async function rejectBoost(b: any) {
    await (supabase as any)
      .from("battle_boost")
      .update({ status: "rejected" })
      .eq("id", b.id);

    setBoosts((prev) => prev.filter((x) => x.id !== b.id));
  }

  /* ================= UI ================= */
  if (loading) return <ActivityIndicator />;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        💳 Battle Payments
      </Text>

      <Text style={{ marginBottom: 10, color: "gray" }}>
        Current Price: GH₵ {price} per vote
      </Text>

      {payments.length === 0 && (
        <Text style={{ marginTop: 20 }}>No pending payments</Text>
      )}

      {payments.map((p) => (
        <View
          key={p.id}
          style={{
            marginTop: 15,
            padding: 15,
            borderWidth: 1,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>
            Code: {p.code}
          </Text>

          <Text>User: {p.user_id}</Text>

          <Text>Votes Bought: {p.votes}</Text>

          <Text>Remaining Votes: {p.remaining_votes}</Text>

          <Text>Amount Paid: GH₵ {p.amount}</Text>

          <Text style={{ marginBottom: 10 }}>
            Candidate: {p.candidate_id}
          </Text>

          {/* ✅ APPROVE */}
          <TouchableOpacity
            onPress={() => approve(p)}
            style={{
              backgroundColor: "green",
              padding: 12,
              borderRadius: 8,
              marginBottom: 5,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              ✅ Approve
            </Text>
          </TouchableOpacity>

          {/* ❌ REJECT */}
          <TouchableOpacity
            onPress={() => reject(p)}
            style={{
              backgroundColor: "red",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              ❌ Reject
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* ================= BOOST UI ================= */}
      <Text style={{ fontSize: 20, marginTop: 30 }}>
        🚀 Boost Requests
      </Text>

      {boosts.map((b) => (
        <View key={b.id} style={{ borderWidth: 1, padding: 10, marginTop: 10 }}>
          <Text>Code: {b.code}</Text>
          <Text>Amount: GH₵ {b.amount}</Text>

          <TouchableOpacity
            onPress={() => approveBoost(b)}
            style={{ backgroundColor: "green", padding: 10, marginTop: 5 }}
          >
            <Text style={{ color: "#fff" }}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => rejectBoost(b)}
            style={{ backgroundColor: "red", padding: 10, marginTop: 5 }}
          >
            <Text style={{ color: "#fff" }}>Reject</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}