import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function MyBattles() {
  const [battles, setBattles] = useState<any[]>([]);
  const [filteredBattles, setFilteredBattles] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [tab, setTab] = useState<"all" | "my" | "history">("all");

  const [boostVisible, setBoostVisible] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<any>(null);
  const [customTime, setCustomTime] = useState<string>("1"); // in minutes by default
  const [boostPrice, setBoostPrice] = useState<number>(0);

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  /* ================= TIMER ================= */
  const getRemainingTime = (end_time: string) => {
    const diff = new Date(end_time).getTime() - Date.now();

    if (diff <= 0) return "⛔ Ended";

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    return `${mins}m ${secs}s`;
  };

  /* ================= LOAD ================= */
  async function load() {
    await supabase.rpc("auto_end_battles");

    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    setUser(u);

    const { data } = await supabase
      .from("battles")
      .select("*")
      .order("created_at", { ascending: false });

    setBattles(data || []);
  }

  /* ================= AUTO REFRESH ================= */
  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 5000);
    return () => clearInterval(interval);
  }, []);

  /* ================= FILTER ================= */
  useEffect(() => {
    if (!user) return;

    if (tab === "all") {
      setFilteredBattles(battles.filter((b) => b.status === "active"));
    }

    if (tab === "my") {
      setFilteredBattles(battles.filter((b) => b.creator_id === user.id));
    }

    if (tab === "history") {
      setFilteredBattles(battles.filter((b) => b.status === "ended"));
    }
  }, [tab, battles, user]);

  /* ================= DELETE ================= */
  async function deleteBattle(id: string) {
    Alert.alert("Delete?", "This cannot be undone", [
      {
        text: "Yes",
        onPress: async () => {
          await supabase.from("battles").delete().eq("id", id);
          load();
        },
      },
      { text: "Cancel" },
    ]);
  }

  /* ================= BOOST ================= */
  function openBoost(battle: any) {
    setSelectedBattle(battle);
    setCustomTime("60"); // default 1 hour
    setBoostPrice(calculateBoostPrice(60));
    setBoostVisible(true);
  }

  function calculateBoostPrice(timeInMinutes: number) {
    // Pricing logic:
    // 30 min = 20 cedis
    // 60 min = 30 cedis
    // 1 day = 50 cedis
    // proportional for any minutes
    if (timeInMinutes <= 30) return 20;
    if (timeInMinutes <= 60) return 30;
    return (50 / 1440) * timeInMinutes; // 1 day = 1440 mins
  }

  async function sendBoost() {
    if (!user || !selectedBattle) return;

    const minutes = Number(customTime);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("Error", "Enter a valid number of minutes");
      return;
    }

    const amount = calculateBoostPrice(minutes);

    const code = "BOOST-" + Date.now();

    const { error } = await (supabase as any).from("battle_boost").insert({
      user_id: user.id,
      battle_id: selectedBattle.id,
      amount,
      momo_name: momoName,
      momo_number: momoNumber,
      network: momoNetwork,
      code,
      status: "pending",
      duration_minutes: minutes,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert(
      "Boost Request Sent ✅",
      `Pay GH₵${amount.toFixed(2)}\n${momoName}\n${momoNumber}\nCode: ${code}`
    );

    setBoostVisible(false);
  }

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>⚔️ Battles</Text>

      {/* ===== TABS ===== */}
      <View style={{ flexDirection: "row", marginVertical: 10 }}>
        {["all", "my", "history"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t as any)}
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: tab === t ? "#16a34a" : "#000",
              margin: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== LIST ===== */}
      <FlatList
        data={filteredBattles}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No battles found
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              padding: 15,
              borderRadius: 12,
              marginBottom: 12,
              elevation: 3,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
            <Text>{item.compare_text}</Text>

            <Text style={{ marginTop: 5, color: "#2563eb" }}>
              ⏳ {getRemainingTime(item.end_time)}
            </Text>

            {item.is_boosted && <Text style={{ color: "green" }}>🚀 Boosted</Text>}

            {/* 🚀 BOOST (ONLY ACTIVE) */}
            {item.status === "active" && (
              <TouchableOpacity
                onPress={() => openBoost(item)}
                style={{
                  backgroundColor: "#2563eb",
                  padding: 10,
                  marginTop: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff" }}>🚀 Boost Battle</Text>
              </TouchableOpacity>
            )}

            {/* 🗑 DELETE (ONLY OWNER) */}
            {item.creator_id === user?.id && (
              <TouchableOpacity
                onPress={() => deleteBattle(item.id)}
                style={{
                  backgroundColor: "red",
                  padding: 10,
                  marginTop: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff" }}>🗑 Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* 💳 BOOST MODAL */}
      <Modal transparent visible={boostVisible}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: "white", padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>Boost Battle</Text>

            <Text style={{ marginTop: 10 }}>
              Enter duration in minutes:
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                padding: 8,
                marginTop: 5,
                borderRadius: 5,
              }}
              keyboardType="numeric"
              value={customTime}
              onChangeText={(text) => {
                setCustomTime(text);
                const mins = Number(text);
                setBoostPrice(calculateBoostPrice(mins));
              }}
            />

            <Text style={{ marginTop: 10 }}>
              Calculated Amount: GH₵ {boostPrice.toFixed(2)}
            </Text>

            <Text style={{ marginTop: 10 }}>Pay To:</Text>
            <Text style={{ fontWeight: "bold" }}>
              {momoName} - {momoNumber} ({momoNetwork})
            </Text>

            <TouchableOpacity
              onPress={sendBoost}
              style={{
                backgroundColor: "#2563eb",
                padding: 14,
                marginTop: 15,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center" }}>
                Generate Payment Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setBoostVisible(false)}>
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