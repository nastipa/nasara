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
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const [payVisible, setPayVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [voteInput, setVoteInput] = useState("1");
  const [balance, setBalance] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");

  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  const PRICE_PER_VOTE = 5;

  /* ================= LOAD BATTLE ================= */
  async function loadBattle() {
    if (!id) return;

    const { data } = await supabase
      .from("battles")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setBattle(data);
    }
  }

  /* ================= LOAD CANDIDATES ================= */
  async function loadCandidates() {
    if (!id) return;

    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("battle_id", id)
      .order("votes", { ascending: false });

    setCandidates(data || []);
  }

  /* ================= LOAD BALANCE ================= */
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
      data?.reduce(
        (sum: number, item: any) =>
          sum + (item.remaining_votes || 0),
        0
      ) || 0;

    setBalance(total);
  }

  /* ================= INITIAL LOAD ================= */
  async function load() {
    setLoading(true);

    await Promise.all([
      loadBattle(),
      loadCandidates(),
      loadBalance(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ================= REALTIME (OPTIMIZED) ================= */
  useEffect(() => {
    const channel = supabase
      .channel(`battle-${id}`)

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidates",
        },
        (payload: any) => {
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? payload.new : c
            )
          );
        }
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
      const diff =
        new Date(battle.end_time).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("⛔ Ended");
        clearInterval(interval);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      setTimeLeft(`${mins}m ${secs}s left`);
    }, 1000);

    return () => clearInterval(interval);
  }, [battle]);

  /* ================= HELPERS ================= */
  const isEnded = () => {
    if (!battle?.end_time) return false;
    return new Date() > new Date(battle.end_time);
  };

  const totalVotes = candidates.reduce(
    (sum, c) => sum + (c.votes || 0),
    0
  );

  const percent = (votes: number) => {
    if (!totalVotes) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  function updateLocalVotes(candidateId: string) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, votes: (c.votes || 0) + 1 }
          : c
      )
    );
  }

  /* ================= VOTE ================= */
  async function vote(candidateId: string) {
    if (voting) return;

    try {
      setVoting(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        Alert.alert("Login required");
        setVoting(false);
        return;
      }

      if (isEnded()) {
        Alert.alert("Battle ended");
        setVoting(false);
        return;
      }

      /* PAID VOTE */
      if (balance > 0) {
        updateLocalVotes(candidateId);

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
              remaining_votes:
                data.remaining_votes - 1,
            })
            .eq("id", data.id);

          setBalance((prev) => prev - 1);
        }

        setVoting(false);
        return;
      }

      /* FREE VOTE CHECK */
      const { data: freeVote } = await supabase
        .from("votes")
        .select("id")
        .eq("battle_id", id)
        .eq("user_id", user.id)
        .eq("is_paid", false)
        .maybeSingle();

      if (freeVote) {
        const selected = candidates.find(
          (c) => c.id === candidateId
        );

        setSelectedCandidate(selected);
        setPayVisible(true);
        setVoting(false);
        return;
      }

      /* FREE VOTE */
      updateLocalVotes(candidateId);

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

    setVoting(false);
  }

  /* ================= PAYMENT ================= */
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
      Alert.alert("Payment failed", error.message);
      return;
    }

    setPaymentInfo({
      votes,
      total,
      code,
    });

    setPayVisible(false);
    setConfirmVisible(true);
  }

  /* ================= UI ================= */
  if (loading) return <ActivityIndicator />;

  if (!battle) return <Text>Battle not found</Text>;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {battle.title}
      </Text>

      <Text style={{ marginTop: 8 }}>
        {battle.compare_text}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontWeight: "bold",
        }}
      >
        ⏱️ {timeLeft}
      </Text>

      <Text style={{ marginVertical: 15 }}>
        Extra votes: {balance}
      </Text>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              marginBottom: 20,
              padding: 15,
              borderWidth: 1,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
              }}
            >
              {item.name}
            </Text>

            <Text>
              {item.votes || 0} votes ({percent(item.votes || 0)}%)
            </Text>

            <TouchableOpacity
              disabled={isEnded() || voting}
              onPress={() => vote(item.id)}
              style={{
                backgroundColor:
                  isEnded() || voting ? "gray" : "black",
                padding: 12,
                marginTop: 10,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                }}
              >
                {isEnded() ? "Ended" : "Vote"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* PAYMENT MODAL */}
      <Modal transparent visible={payVisible}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 20,
            backgroundColor: "#0007",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
            }}
          >
            <Text>Buy Votes</Text>

            <TextInput
              value={voteInput}
              onChangeText={setVoteInput}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                marginTop: 10,
                padding: 10,
              }}
            />

            <TouchableOpacity
              onPress={sendPayment}
              style={{
                backgroundColor: "#2563eb",
                padding: 12,
                marginTop: 15,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                }}
              >
                Pay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPayVisible(false)}
            >
              <Text
                style={{
                  marginTop: 15,
                  textAlign: "center",
                  color: "red",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONFIRM MODAL */}
      <Modal transparent visible={confirmVisible}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 20,
            backgroundColor: "#0008",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Complete Payment
            </Text>

            <Text style={{ marginTop: 10 }}>
              Buy {paymentInfo?.votes} votes
            </Text>

            <Text style={{ marginTop: 10 }}>
              Pay GH₵ {paymentInfo?.total}
            </Text>

            <Text style={{ marginTop: 10 }}>
              {momoName}
            </Text>

            <Text>
              {momoNumber} ({momoNetwork})
            </Text>

            <Text style={{ marginTop: 10 }}>
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
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}