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

  const [tab, setTab] = useState<
    "all" | "my" | "history" | "pending"
  >("all");

  const [boostVisible, setBoostVisible] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<any>(null);
  const [customTime, setCustomTime] =
    useState<string>("1");

  const [boostPrice, setBoostPrice] =
    useState<number>(0);

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  /* ================= TIMER ================= */
  const getRemainingTime = (end_time: string) => {
    const diff =
      new Date(end_time).getTime() - Date.now();

    if (diff <= 0) return "⛔ Ended";

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor(
      (diff % 60000) / 1000
    );

    return `${mins}m ${secs}s`;
  };

  /* ================= LOAD ================= */
  async function load() {
    try {
      await supabase.rpc("auto_end_battles");

      const { data: auth } =
        await supabase.auth.getUser();

      const u = auth?.user;

      setUser(u);

      const { data, error } = await supabase
        .from("battles")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.log(error);
        return;
      }

      const now = Date.now();

      const cleaned =
        (data || []).map((b: any) => {
          if (
            b.boost_expires_at &&
            new Date(
              b.boost_expires_at
            ).getTime() < now
          ) {
            return {
              ...b,
              is_boosted: false,
            };
          }

          return b;
        });

      setBattles(cleaned);
    } catch (e) {
      console.log(e);
    }
  }

  /* ================= AUTO REFRESH ================= */
  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  /* ================= FILTER ================= */
  useEffect(() => {
    if (!user) return;

    /* ================= ACTIVE ================= */
    if (tab === "all") {
      setFilteredBattles(
        battles.filter(
          (b) =>
            b.status === "active" &&
            b.approval_status ===
              "approved" &&
            b.payment_status ===
              "approved"
        )
      );
    }

    /* ================= MY BATTLES ================= */
    if (tab === "my") {
      setFilteredBattles(
        battles.filter(
          (b) =>
            b.creator_id === user.id &&
            b.approval_status ===
              "approved" &&
            b.payment_status ===
              "approved"
        )
      );
    }

    /* ================= PENDING APPROVAL ================= */
    if (tab === "pending") {
      setFilteredBattles(
        battles.filter(
          (b) =>
            b.creator_id === user.id &&
            (b.approval_status !==
              "approved" ||
              b.payment_status !==
                "approved")
        )
      );
    }

    /* ================= HISTORY ================= */
    if (tab === "history") {
      setFilteredBattles(
        battles.filter(
          (b) =>
            b.status === "ended" &&
            b.approval_status ===
              "approved"
        )
      );
    }
  }, [tab, battles, user]);

  /* ================= DELETE ================= */
  async function deleteBattle(id: string) {
    Alert.alert(
      "Delete?",
      "This cannot be undone",
      [
        {
          text: "Yes",
          onPress: async () => {
            await supabase
              .from("battles")
              .delete()
              .eq("id", id);

            load();
          },
        },
        {
          text: "Cancel",
        },
      ]
    );
  }

  /* ================= BOOST ================= */
  function openBoost(battle: any) {
    setSelectedBattle(battle);

    setCustomTime("60");

    setBoostPrice(
      calculateBoostPrice(60)
    );

    setBoostVisible(true);
  }

  function calculateBoostPrice(
    timeInMinutes: number
  ) {
    if (timeInMinutes <= 30)
      return 20;

    if (timeInMinutes <= 60)
      return 30;

    return (
      (50 / 1440) * timeInMinutes
    );
  }

  /* ================= SEND BOOST ================= */
  async function sendBoost() {
    if (!user || !selectedBattle)
      return;

    const minutes =
      Number(customTime);

    if (
      isNaN(minutes) ||
      minutes <= 0
    ) {
      Alert.alert(
        "Error",
        "Enter a valid number of minutes"
      );

      return;
    }

    const amount =
      calculateBoostPrice(minutes);

    const code =
      "BOOST-" + Date.now();

    const { error } = await (
      supabase as any
    )
      .from("battle_boost")
      .insert({
        user_id: user.id,
        battle_id:
          selectedBattle.id,
        amount,
        momo_name: momoName,
        momo_number: momoNumber,
        network: momoNetwork,
        code,
        status: "pending",
        duration_minutes:
          minutes,
      });

    if (error) {
      Alert.alert(
        "Error",
        error.message
      );

      return;
    }

    Alert.alert(
      "Boost Request Sent ✅",
      `Pay GH₵${amount.toFixed(
        2
      )}\n\n${momoName}\n${momoNumber}\n(${momoNetwork})\n\nCode: ${code}\n\nWaiting for admin approval`
    );

    setBoostVisible(false);
  }

  /* ================= UI ================= */
  return (
    <View
      style={{
        flex: 1,
        padding: 15,
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        ⚔️ Battles
      </Text>

      {/* ================= TABS ================= */}
      <View
        style={{
          flexDirection: "row",
          marginVertical: 10,
          flexWrap: "wrap",
        }}
      >
        {[
          "all",
          "my",
          "pending",
          "history",
        ].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() =>
              setTab(t as any)
            }
            style={{
              flex: 1,
              minWidth: "40%",
              padding: 10,
              backgroundColor:
                tab === t
                  ? "#16a34a"
                  : "#000",
              margin: 5,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ================= LIST ================= */}
      <FlatList
        data={filteredBattles}
        keyExtractor={(item) =>
          item.id
        }
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <Text
            style={{
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No battles found
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor:
                "#fff",
              padding: 15,
              borderRadius: 12,
              marginBottom: 12,
              elevation: 3,
              borderWidth: 1,
              borderColor:
                item.is_boosted
                  ? "#22c55e"
                  : "#eee",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              {item.title}
            </Text>

            <Text
              style={{
                marginTop: 5,
              }}
            >
              {item.compare_text}
            </Text>

            <Text
              style={{
                marginTop: 5,
                color: "rgb(37, 99, 235)",
              }}
            >
              ⏳{" "}
              {getRemainingTime(
               item.end_time || item.end_at
              )}
            </Text>

            {/* ================= TYPE ================= */}
            {item.battle_type ===
              "institution" && (
              <Text
                style={{
                  marginTop: 5,
                  color: "purple",
                  fontWeight:
                    "bold",
                }}
              >
                🏫 Institution Battle
              </Text>
            )}

            {/* ================= PRIVATE ================= */}
            {item.is_private && (
              <Text
                style={{
                  marginTop: 5,
                  color: "orange",
                }}
              >
                🔒 Private Battle
              </Text>
            )}

            {/* ================= BOOSTED ================= */}
            {item.is_boosted && (
              <Text
                style={{
                  color: "green",
                  marginTop: 5,
                  fontWeight:
                    "bold",
                }}
              >
                🚀 Boosted
              </Text>
            )}

            {/* ================= PENDING ================= */}
            {item.approval_status !==
              "approved" && (
              <Text
                style={{
                  color: "red",
                  marginTop: 5,
                }}
              >
                ⏳ Waiting for admin
                approval
              </Text>
            )}

            {/* ================= PAYMENT PENDING ================= */}
            {item.payment_status !==
              "approved" && (
              <Text
                style={{
                  color: "red",
                  marginTop: 5,
                }}
              >
                💳 Payment pending
              </Text>
            )}

            {/* ================= INVITE CODE ================= */}
            {item.battle_type ===
              "institution" && (
              <Text
                style={{
                  marginTop: 8,
                  fontWeight:
                    "bold",
                }}
              >
                Invite Code:{" "}
                {item.invite_code}
              </Text>
            )}

            {/* ================= BOOST BUTTON ================= */}
            {item.status ===
              "active" &&
              item.approval_status ===
                "approved" &&
              item.payment_status ===
                "approved" && (
                <TouchableOpacity
                  onPress={() =>
                    openBoost(item)
                  }
                  style={{
                    backgroundColor:
                      "#2563eb",
                    padding: 10,
                    marginTop: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      textAlign:
                        "center",
                    }}
                  >
                    🚀 Boost Battle
                  </Text>
                </TouchableOpacity>
              )}

            {/* ================= DELETE ================= */}
            {item.creator_id ===
              user?.id && (
              <TouchableOpacity
                onPress={() =>
                  deleteBattle(
                    item.id
                  )
                }
                style={{
                  backgroundColor:
                    "red",
                  padding: 10,
                  marginTop: 8,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    textAlign:
                      "center",
                  }}
                >
                  🗑️ Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* ================= BOOST MODAL ================= */}
      <Modal
        transparent
        visible={boostVisible}
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              "#0007",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor:
                "white",
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
              Boost Battle
            </Text>

            <Text
              style={{
                marginTop: 10,
              }}
            >
              Enter duration in
              minutes:
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
              onChangeText={(
                text
              ) => {
                setCustomTime(
                  text
                );

                const mins =
                  Number(text);

                setBoostPrice(
                  calculateBoostPrice(
                    mins
                  )
                );
              }}
            />

            <Text
              style={{
                marginTop: 10,
              }}
            >
              Calculated Amount:
              GH₵{" "}
              {boostPrice.toFixed(
                2
              )}
            </Text>

            <Text
              style={{
                marginTop: 10,
              }}
            >
              Pay To:
            </Text>

            <Text
              style={{
                fontWeight: "bold",
              }}
            >
              {momoName} -{" "}
              {momoNumber} (
              {momoNetwork})
            </Text>

            <TouchableOpacity
              onPress={sendBoost}
              style={{
                backgroundColor:
                  "#2563eb",
                padding: 14,
                marginTop: 15,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign:
                    "center",
                }}
              >
                Generate Payment
                Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setBoostVisible(
                  false
                )
              }
            >
              <Text
                style={{
                  textAlign:
                    "center",
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