import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function BattleViewer() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [battle, setBattle] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    loadUser();
  }, []);

  /* ================= LOAD BATTLE ================= */
  useEffect(() => {
    const loadBattle = async () => {
      if (!id) return;

      const { data } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setBattle(data);
      setLoading(false);
    };

    loadBattle();
  }, [id]);

  /* ================= CHECK VOTE ================= */
  useEffect(() => {
    const checkVote = async () => {
      if (!user || !id) return;

      const { data } = await supabase
        .from("battle_votes")
        .select("id")
        .eq("battle_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) setVoted(true);
    };

    checkVote();
  }, [user, id]);

  /* ================= VOTE ================= */
  const vote = async (side: "A" | "B") => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    if (voted) {
      Alert.alert("Already voted");
      return;
    }

    await (supabase as any).from("battle_votes").insert({
      battle_id: id,
      user_id: user.id,
      side,
    });

    setVoted(true);
    Alert.alert("Vote counted ✅");
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!battle) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Battle not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#020617" }}>
      {/* TITLE */}
      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        ⚔️ {battle.title}
      </Text>

      <Text style={{ color: "#cbd5e1", marginBottom: 20 }}>
        {battle.compare_text}
      </Text>

      {/* 🔥 VIRAL HOOK */}
      {!voted && (
        <Text style={{ color: "#22c55e", marginBottom: 15 }}>
          🔥 Vote to unlock results
        </Text>
      )}

      {/* OPTION A */}
      <TouchableOpacity
        onPress={() => vote("A")}
        style={{
          backgroundColor: "#111827",
          padding: 20,
          borderRadius: 12,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          🅰️ {battle.option_a}
        </Text>
      </TouchableOpacity>

      {/* OPTION B */}
      <TouchableOpacity
        onPress={() => vote("B")}
        style={{
          backgroundColor: "#111827",
          padding: 20,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          🅱️ {battle.option_b}
        </Text>
      </TouchableOpacity>

      {/* RESULTS (LOCKED UNTIL VOTE) */}
      {voted && (
        <View style={{ marginTop: 25 }}>
          <Text style={{ color: "#22c55e", fontWeight: "bold" }}>
            🔓 Results unlocked
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push(`/battle-leaderboard?id=${battle.id}`)
            }
            style={{
              backgroundColor: "#2563eb",
              padding: 12,
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              View Results 📊
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LOGIN CTA */}
      {!user && (
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{
            marginTop: 20,
            backgroundColor: "#22c55e",
            padding: 14,
            borderRadius: 10,
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "bold" }}>
            Sign in to vote 🔥
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}