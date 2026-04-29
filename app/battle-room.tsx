import { useLocalSearchParams } from "expo-router";
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

  const [battle, setBattle] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [payVisible, setPayVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [voteInput, setVoteInput] = useState("1");
  const [balance, setBalance] = useState(0);

  const [timeLeft, setTimeLeft] = useState("");

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

    const { data: candidateData } = await supabase
      .from("candidates")
      .select("*")
      .eq("battle_id", id);

    setCandidates(candidateData || []);

    await loadBalance();
    setLoading(false);
  }

  /* ================= BALANCE ================= */
  async function loadBalance() {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data } = await supabase
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

    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, [id]);

  /* ================= TIMER ================= */
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
        c.id === candidateId
          ? { ...c, votes: (c.votes || 0) + amount }
          : c
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
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        Alert.alert("Login required");
        return;
      }

      if (isEnded()) {
        Alert.alert("Battle ended");
        return;
      }

      /* ================= PAID VOTES ================= */
      if (balance > 0) {
        updateLocalVotes(candidateId, 1);

        await (supabase as any).rpc("increment_vote", {
          candidate_id_input: candidateId,
          amount: 1,
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
            .update({
              remaining_votes: data.remaining_votes - 1,
            })
            .eq("id", data.id);
        }

        loadBalance();
        return;
      }

      /* ================= FREE VOTE ================= */
      const { data: freeVote } = await supabase
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

  /* ================= PAYMENT ================= */
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
const [confirmVisible, setConfirmVisible] = useState(false);

async function sendPayment() {
  const { data: authData } = await supabase.auth.getUser();
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

  // 🔥 SHOW CONFIRMATION MODAL (NOT ALERT)
  setPaymentInfo({
    votes,
    total,
    code,
  });

  setConfirmVisible(true);
  setPayVisible(false);
}

  /* ================= UI ================= */
  if (loading) return <ActivityIndicator />;
  if (!battle) return <Text>Loading battle...</Text>;
  if (!candidates.length) return <Text>No candidates</Text>;

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        {battle.title}
      </Text>

      <Text style={{ marginBottom: 10, fontWeight: "bold" }}>
        ⏱️ {timeLeft}
      </Text>

      <Text style={{ marginBottom: 20 }}>
        {battle.compare_text}
      </Text>

      <Text>You have {balance} extra votes</Text>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 20 }}>
            <Text>
              {item.name} ({percent(item.votes || 0)}%)
            </Text>

            <Text>{item.votes || 0} votes</Text>

            <TouchableOpacity
              onPress={() => vote(item.id)}
              style={{
                backgroundColor: isEnded() ? "gray" : "black",
                padding: 10,
                marginTop: 5,
              }}
            >
              <Text style={{ color: "white" }}>
                {isEnded() ? "Ended" : "Vote"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* PAYMENT MODAL */}
      <Modal transparent visible={payVisible}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "white", padding: 20 }}>
            <Text>Buy Votes</Text>

            <TextInput
              value={voteInput}
              onChangeText={setVoteInput}
              keyboardType="numeric"
              style={{ borderWidth: 1, marginTop: 10 }}
            />

            <TouchableOpacity onPress={sendPayment}>
              <Text>Pay</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPayVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={confirmVisible}>
  <View
    style={{
      flex: 1,
      backgroundColor: "#0008",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <View
      style={{
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        Complete Payment 💰
      </Text>

      <Text style={{ marginTop: 10 }}>
        Buy {paymentInfo?.votes} votes
      </Text>

      <Text style={{ marginTop: 10, fontWeight: "bold" }}>
        Pay GH₵ {paymentInfo?.total}
      </Text>

      <Text style={{ marginTop: 15 }}>Send to:</Text>

      <Text style={{ fontWeight: "bold", marginTop: 5 }}>
        {momoName}
      </Text>

      <Text>{momoNumber} ({momoNetwork})</Text>

      <Text style={{ marginTop: 15 }}>
        Code: {paymentInfo?.code}
      </Text>

      <TouchableOpacity
        onPress={() => setConfirmVisible(false)}
        style={{
          backgroundColor: "#22c55e",
          padding: 12,
          marginTop: 20,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          OK
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
    
  );
}