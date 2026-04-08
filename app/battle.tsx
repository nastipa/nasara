import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function BattleScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [battles, setBattles] = useState<any[]>([]);
  const [tab, setTab] = useState<"all" | "my" | "history">("all");
  const [loading, setLoading] = useState(true);

  // ✅ NEW: BOOST STATE
  const [boostedIds, setBoostedIds] = useState<string[]>([]);

  /* ================= GET USER ================= */
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  /* ================= LOAD BOOSTS ================= */
  const loadBoosts = async () => {
    const { data, error } = await supabase
      .from("battle_boost")
      .select("battle_id")
      .eq("status", "approved");

    if (!error && data) {
      setBoostedIds(data.map((b: any) => b.battle_id));
    }
  };

  /* ================= LOAD ================= */
  const loadBattles = async () => {
    if (!userId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("battles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const now = Date.now();

      // ✅ ATTACH BOOST
      const updated = data.map((b: any) => ({
        ...b,
        is_boosted: boostedIds.includes(b.id),
      }));

let filtered: any[] = [];

if (tab === "all") {
  filtered = updated.filter((b: any) => {
    const end = new Date(b.end_time).getTime() || 0;
    return end > now;
  });
}

if (tab === "my") {
  filtered = updated.filter((b: any) => {
    return b.creator_id === userId; // ✅ show ALL your battles
  });
}

if (tab === "history") {
  filtered = updated.filter((b: any) => {
    const end = new Date(b.end_time).getTime() || 0;
    return end <= now;
  });
}
      // ✅ SORT (BOOST FIRST)
      filtered.sort((a: any, b: any) => {
        if (a.is_boosted === b.is_boosted) {
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        }
        return a.is_boosted ? -1 : 1;
      });

      setBattles(filtered);
    }

    setLoading(false);
  };

  /* ================= LOAD ON TAB ================= */
  useEffect(() => {
    if (!userId) return;
    loadBattles();
  }, [tab, userId, boostedIds]); // ✅ important

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    loadBoosts();
  }, []);

  /* ================= REALTIME BOOST ================= */
  useEffect(() => {
    const channel = supabase
      .channel("boost-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_boost" },
        () => {
          loadBoosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= AUTO REFRESH ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      loadBattles();
    }, 900000);

    return () => clearInterval(interval);
  }, [tab, userId, boostedIds]);

  /* ================= TIMER ================= */
  const renderCountdown = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now();

    if (diff <= 0) return "⛔ Ended";

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    return `${m}m ${s}s`;
  };

  /* ================= DELETE ================= */
  const deleteBattle = async (id: string) => {
    Alert.alert("Delete?", "This cannot be undone", [
      {
        text: "Yes",
        onPress: async () => {
          await supabase.from("battles").delete().eq("id", id);
          loadBattles();
        },
      },
      { text: "Cancel" },
    ]);
  };

  /* ================= UI ================= */
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, padding: 15 }}>
      {/* ===== TABS ===== */}
      <View style={{ flexDirection: "row", marginBottom: 15 }}>
        {["all", "my", "history"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t as any)}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: tab === t ? "#16a34a" : "#000",
              marginRight: t !== "history" ? 5 : 0,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              {t === "all"
                ? "⚔️ All"
                : t === "my"
                ? "🏠 My Battles"
                : "📜 History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== LIST ===== */}
      <FlatList
        data={battles}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No battles found
          </Text>
        }
        renderItem={({ item }) => {
          const isActive =
            new Date(item.end_time).getTime() > Date.now();

          return (
            <View
              style={{
                backgroundColor: "#fff",
                padding: 15,
                borderRadius: 12,
                marginBottom: 12,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {item.title}
              </Text>

              <Text>{item.compare_text}</Text>

              {/* ✅ BOOST SHOWS HERE */}
              {item.is_boosted && (
                <Text style={{ color: "green", marginTop: 5 }}>
                  🚀 Boosted
                </Text>
              )}

              {/* ⏱ TIMER */}
              <Text style={{ marginTop: 5, color: "orange" }}>
                ⏱ {renderCountdown(item.end_time)}
              </Text>

              {/* ENTER */}
              <TouchableOpacity
                onPress={() =>
                  router.push(`/battle-room?id=${item.id}`)
                }
                style={{
                  backgroundColor: "#000",
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>
                  Enter Battle ⚔️
                </Text>
              </TouchableOpacity>

              {/* LEADERBOARD */}
              <TouchableOpacity
                onPress={() =>
                  router.push(`/battle-leaderboard?id=${item.id}`)
                }
                style={{
                  backgroundColor: "#2563eb",
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>
                  View Leaderboard 🏆
                </Text>
              </TouchableOpacity>

              {/* 🚀 BOOST */}
              {tab === "my" && isActive && (
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/my-battle?boost=${item.id}`)
                  }
                  style={{
                    backgroundColor: "#2563eb",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                >
                  <Text style={{ color: "#fff", textAlign: "center" }}>
                    🚀 Boost Battle
                  </Text>
                </TouchableOpacity>
              )}

              {/* 🗑 DELETE */}
              {tab === "my" && (
                <TouchableOpacity
                  onPress={() => deleteBattle(item.id)}
                  style={{
                    backgroundColor: "red",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: "#fff", textAlign: "center" }}>
                    🗑 Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}