import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function BattleRoom() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [battle, setBattle] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [payVisible, setPayVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [voteInput, setVoteInput] = useState("1");
  const [balance, setBalance] = useState(0);

  const [timeLeft, setTimeLeft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";
  const PRICE_PER_VOTE = 5;

  /* ================= LOAD ================= */
  async function load() {
    if (!id) return;
    setLoading(true);

    const { data: battleData } = await (supabase as any)
      .from("battles")
      .select("*")
      .eq("id", id)
      .single();

    const isExpired =
      battleData?.end_time && new Date() > new Date(battleData.end_time);

    if (isExpired) battleData.status = "ended";

    setBattle(battleData);

    const { data: candidateData } = await (supabase as any)
      .from("candidates")
      .select("*")
      .eq("battle_id", id);

    setCandidates(candidateData || []);

    await loadBalance();
    setLoading(false);
  }

  /* ================= LOAD BALANCE ================= */
  async function loadBalance() {
    const { data: authData } = await (supabase as any).auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data } = await (supabase as any)
      .from("battle_payments")
      .select("remaining_votes")
      .eq("user_id", user.id)
      .eq("battle_id", id)
      .eq("status", "approved");

    const total =
      data?.reduce((sum: number, p: any) => sum + p.remaining_votes, 0) || 0;

    setBalance(total);
  }

  /* ================= REALTIME ================= */
  useEffect(() => {
    load();

    const channel = (supabase as any)
      .channel("battle-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_payments" },
        () => loadBalance()
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [id]);

  /* ================= LIVE TIMER ================= */
  useEffect(() => {
    if (!battle?.end_time) return;

    const interval = setInterval(() => {
      const diff = new Date(battle.end_time).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft("⛔ Ended");
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s left`);
    }, 1000);

    return () => clearInterval(interval);
  }, [battle]);

  const totalVotes = candidates.reduce(
    (sum: number, c: any) => sum + (c.votes || 0),
    0
  );

  const percent = (votes: number) =>
    totalVotes ? Math.round((votes / totalVotes) * 100) : 0;

  function updateLocalVotes(candidateId: string, amount: number) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, votes: (c.votes || 0) + amount } : c
      )
    );
  }

  const isEnded = () => {
    if (!battle?.end_time) return false;
    return new Date() > new Date(battle.end_time);
  };

  /* ================= VOTE ================= */
  async function vote(candidateId: string) {
    try {
      const vote = async (candidateId: string) => {

  // ✅ ADD THIS BLOCK HERE
  if (!userId) {
    Alert.alert("Login Required", "Sign up to vote", [
      {
        text: "Login",
        onPress: () =>
          router.push(`/login?redirect=battle-room&id=${id}`),
      },
      { text: "Cancel" },
    ]);
    return;
  }

  // existing vote logic continues...
  await (supabase as any).rpc("increment_vote", {
    candidate_id_input: candidateId,
    amount: 1,
  });
};
      const { data: authData } = await (supabase as any).auth.getUser();
      const user = authData?.user;
      if (!user) {
        Alert.alert("Login required");
        return;
      }

      if (isEnded()) {
        Alert.alert("Battle ended");
        return;
      }

      // ✅ PAID VOTES FIRST
      if (balance > 0) {
        updateLocalVotes(candidateId, 1);
        await (supabase as any).rpc("increment_vote", {
          candidate_id_input: candidateId,
          amount: 1,
        });
        await (supabase as any).rpc("increment_battle_votes", {
          battle_id_input: battle.id,
        });

        const { data } = await (supabase as any)
          .from("battle_payments")
          .select("*")
          .eq("user_id", user.id)
          .eq("battle_id", id)
          .eq("status", "approved")
          .gt("remaining_votes", 0)
          .limit(1)
          .single();

        if (data) {
          await (supabase as any)
            .from("battle_payments")
            .update({ remaining_votes: data.remaining_votes - 1 })
            .eq("id", data.id);
        }

        loadBalance();
        return;
      }

      // 🔒 FREE VOTE
      const { data: freeVote } = await (supabase as any)
        .from("votes")
        .select("*")
        .eq("battle_id", id)
        .eq("user_id", user.id)
        .eq("is_paid", false)
        .maybeSingle();

      if (freeVote) {
        const selected = candidates.find((c) => c.id === candidateId);
        setSelectedCandidate(selected);
        setPayVisible(true);
        return;
      }

      updateLocalVotes(candidateId, 1);

      await (supabase as any).from("votes").insert({
        battle_id: id,
        candidate_id: candidateId,
        user_id: user.id,
        vote_count: 1,
        is_paid: false,
        status: "approved",
      });

      await (supabase as any).rpc("increment_vote", {
        candidate_id_input: candidateId,
        amount: 1,
      });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  /* ================= SEND PAYMENT ================= */
  async function sendPayment() {
    const { data: authData } = await (supabase as any).auth.getUser();
    const user = authData?.user;
    if (!user || !selectedCandidate) return;

    const votes = parseInt(voteInput) || 1;
    const total = votes * PRICE_PER_VOTE;
    const code = "BATTLE-" + Date.now();

    const { error } = await (supabase as any)
      .from("battle_payments")
      .insert({
        user_id: user.id,
        battle_id: id,
        candidate_id: selectedCandidate.id,
        votes,
        remaining_votes: votes,
        amount: total,
        momo_name: momoName,
        momo_number: momoNumber,
        network: momoNetwork,
        code,
        status: "pending",
      });

    if (error) {
      Alert.alert("Payment failed ❌", error.message);
      return;
    }

    Alert.alert(
      "Payment Request Sent ✅",
      `Ad Request Submitted!\n\nPay GH₵${total} to:\n${momoName}\n${momoNumber} (${momoNetwork})\n\nCode: ${code}`
    );

    setPayVisible(false);
  }

  /* ================= UI ================= */
  if (loading) return <ActivityIndicator />;
  if (!battle) return <Text>Loading battle...</Text>;
  if (!candidates.length) return <Text>No candidates found</Text>;

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        {battle.title}
      </Text>

      <Text style={{ marginBottom: 10, fontWeight: "bold" }}>
        ⏱ {timeLeft}
      </Text>

      <Text style={{ marginBottom: 20 }}>{battle.compare_text}</Text>
      <Text style={{ marginBottom: 10 }}>
        You have {balance} extra votes
      </Text>

      {/* ✅ FlatList for all participants */}
      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item: c }) => (
          <View
            style={{
              marginBottom: 20,
              padding: 15,
              borderWidth: 1,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 16 }}>
              {c.name} ({percent(c.votes || 0)}%)
            </Text>

            <View
              style={{
                height: 10,
                backgroundColor: "#eee",
                marginVertical: 5,
              }}
            >
              <View
                style={{
                  width: `${percent(c.votes || 0)}%`,
                  height: 10,
                  backgroundColor: "#4ade80",
                }}
              />
            </View>

            <Text>{c.votes || 0} votes</Text>

            <TouchableOpacity
              disabled={isEnded()}
              onPress={() => vote(c.id)}
              style={{
                backgroundColor: isEnded() ? "gray" : "#000",
                padding: 10,
                marginTop: 5,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff" }}>
                {isEnded() ? "Ended" : "Vote"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal transparent visible={payVisible}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: "white", padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Vote Payment
            </Text>

            <Text style={{ marginTop: 10 }}>Pay To:</Text>

            <Text style={{ fontWeight: "bold" }}>
              {momoName} - {momoNumber} ({momoNetwork})
            </Text>

            <TextInput
              value={voteInput}
              onChangeText={setVoteInput}
              keyboardType="numeric"
              style={{ borderWidth: 1, padding: 10, marginTop: 10 }}
            />

            <Text style={{ marginTop: 12 }}>
              Total: GH₵ {(parseInt(voteInput) || 1) * PRICE_PER_VOTE}
            </Text>

            <TouchableOpacity
              onPress={sendPayment}
              style={{
                backgroundColor: "#2563eb",
                padding: 14,
                marginTop: 15,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Generate Payment Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPayVisible(false)}>
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  color: "red",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}