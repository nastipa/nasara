import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function BattleScreen() {
  const router = useRouter();

  const [userId, setUserId] =
    useState<string | null>(null);

  const [battles, setBattles] =
    useState<any[]>([]);

  const [tab, setTab] = useState<
    "all" | "my" | "history"
  >("all");

  const [loading, setLoading] =
    useState(true);

  const [showAuthNotice, setShowAuthNotice] =
    useState(false);

  const [boostedIds, setBoostedIds] =
    useState<string[]>([]);

  /* ================= PHONE VOTE ================= */

  const [voteModalVisible, setVoteModalVisible] =
    useState(false);

  const [selectedBattle, setSelectedBattle] =
    useState<any>(null);

  const [phoneNumber, setPhoneNumber] =
    useState("");

  /* ================= SHARE ================= */

  const shareBattle = async (
    battle: any
  ) => {
    try {
      const webLink = `https://nasara-six.vercel.app/battle-room?id=${battle.id}`;

      const appLink = `nasara://battle-room?id=${battle.id}`;

      await Share.share({
        message:
          `⚔️ Vote in this battle on Nasara!\n\n` +
          `${battle.title}\n\n` +
          `Open in app: ${appLink}\n` +
          `Or web: ${webLink}`,
      });
    } catch (error) {
      console.log(
        "Share error:",
        error
      );
    }
  };

  /* ================= GET USER ================= */

  useEffect(() => {
    const getUser = async () => {
      const { data } =
        await supabase.auth.getUser();

      setUserId(
        data?.user?.id || null
      );

      if (!data?.user) {
        setShowAuthNotice(true);
      }
    };

    getUser();
  }, []);

  /* ================= LOAD BOOSTS ================= */

  const loadBoosts = async () => {
    const { data, error } =
      await supabase
        .from("battle_boost")
        .select("battle_id")
        .eq(
          "status",
          "approved"
        );

    if (!error && data) {
      setBoostedIds(
        data.map(
          (b: any) =>
            b.battle_id
        )
      );
    }
  };

  /* ================= LOAD BATTLES ================= */

  const loadBattles =
    async () => {
      try {
        setLoading(true);

        const { data: auth } =
          await supabase.auth.getUser();

        const currentUser =
          auth?.user;

        if (currentUser) {
          setUserId(
            currentUser.id
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from("battles")
          .select("*")
          .eq(
            "payment_status",
            "approved"
          )
          .eq(
            "approval_status",
            "approved"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.log(
            "LOAD ERROR:",
            error
          );

          setLoading(false);
          return;
        }

        const now =
          Date.now();

        const updated =
          (data || []).map(
            (b: any) => {
              const expired =
                b.boost_expires_at &&
                new Date(
                  b.boost_expires_at
                ).getTime() <
                  now;

              return {
                ...b,
                is_boosted:
                  expired
                    ? false
                    : boostedIds.includes(
                        b.id
                      ),
              };
            }
          );

        let filtered: any[] =
          [];

        /* ================= ALL ================= */

        if (tab === "all") {
          filtered =
            updated.filter(
              (b: any) =>
                new Date(
                  b.end_time ||
                    b.end_at
                ).getTime() >
                now
            );
        }

        /* ================= MY ================= */

        if (tab === "my") {
          filtered =
            updated.filter(
              (b: any) =>
                b.creator_id ===
                currentUser?.id
            );
        }

        /* ================= HISTORY ================= */

        if (
          tab === "history"
        ) {
          filtered =
            updated.filter(
              (b: any) =>
                new Date(
                  b.end_time ||
                    b.end_at
                ).getTime() <=
                now
            );
        }

        filtered.sort(
          (
            a: any,
            b: any
          ) => {
            if (
              a.is_boosted ===
              b.is_boosted
            ) {
              return (
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
              );
            }

            return a.is_boosted
              ? -1
              : 1;
          }
        );

        setBattles(
          filtered
        );
      } catch (e) {
        console.log(
          "LOAD CRASH:",
          e
        );
      }

      setLoading(false);
    };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    loadBoosts();
  }, []);

  useEffect(() => {
    loadBattles();
  }, [
    tab,
    userId,
    boostedIds,
  ]);

  /* ================= REALTIME ================= */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "battle-live"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "battles",
          },
          async () => {
            await loadBattles();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "battle_boost",
          },
          async () => {
            await loadBoosts();
            await loadBattles();
          }
        )

        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    tab,
    userId,
    boostedIds,
  ]);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadBattles();
      }, 60000);

    return () =>
      clearInterval(
        interval
      );
  }, [
    tab,
    userId,
    boostedIds,
  ]);

  /* ================= COUNTDOWN ================= */

  const renderCountdown =
    (endTime: string) => {
      const diff =
        new Date(
          endTime
        ).getTime() -
        Date.now();

      if (diff <= 0) {
        return "⛔ Ended";
      }

      const m =
        Math.floor(
          diff / 60000
        );

      const s =
        Math.floor(
          (diff % 60000) /
            1000
        );

      return `${m}m ${s}s`;
    };

  /* ================= DELETE ================= */

  const deleteBattle =
    async (id: string) => {
      Alert.alert(
        "Delete?",
        "This cannot be undone",
        [
          {
            text: "Yes",
            onPress:
              async () => {
                await supabase
                  .from(
                    "battles"
                  )
                  .delete()
                  .eq(
                    "id",
                    id
                  );

                loadBattles();
              },
          },
          {
            text: "Cancel",
          },
        ]
      );
    };

  /* ================= OPEN VOTE ================= */

  const openVote = async (
    battle: any
  ) => {

    /* ================= PUBLIC BATTLE ================= */

    if (
      battle.battle_type ===
      "public"
    ) {
      router.push(
        `/battle-room?id=${battle.id}`
      );

      return;
    }

    /* ================= INSTITUTION BATTLE ================= */

    setSelectedBattle(
      battle
    );

    setPhoneNumber("");

    setVoteModalVisible(
      true
    );
  };

  /* ================= CONTINUE TO VOTE ================= */

  const continueToVote =
    async () => {

      if (
        !phoneNumber ||
        !selectedBattle
      ) {
        Alert.alert(
          "Enter phone number"
        );

        return;
      }

      try {

        /* ================= CLEAN PHONE ================= */

        const cleanPhone =
          phoneNumber
            .replace(/\s/g, "")
            .replace(/\-/g, "")
            .replace(/\+/g, "")
            .trim();

        /* ===================================================== */
        /* ================= INSTITUTION CHECK ================= */
        /* ===================================================== */

        if (
          selectedBattle.battle_type ===
          "institution"
        ) {

          const {
            data: allowed,
            error: allowedError,
          } = await (supabase as any)
            .from(
              "institution_voters"
            )
            .select("*")
            .eq(
              "battle_id",
              selectedBattle.id
            )
            .eq(
              "phone",
              cleanPhone
            )
            .eq(
              "approved",
              true
            )
            .maybeSingle();

          console.log(
            "PHONE:",
            cleanPhone
          );

          console.log(
            "ALLOWED:",
            allowed
          );

          console.log(
            "ALLOWED ERROR:",
            allowedError
          );

          if (
            allowedError ||
            !allowed
          ) {
            Alert.alert(
              "Access Denied",
              "This phone number is not approved for this institution battle"
            );

            return;
          }

          /* ================= ALREADY VOTED ================= */

          if (
            allowed.has_voted
          ) {
            Alert.alert(
              "Already Voted",
              "This phone number has already voted"
            );

            return;
          }
        }

        /* ================= CLOSE MODAL ================= */

        setVoteModalVisible(
          false
        );

        /* ================= ENTER ROOM ================= */

        router.push(
          `/battle-room?id=${selectedBattle.id}&phone=${cleanPhone}`
        );

      } catch (e) {

        console.log(e);

        Alert.alert(
          "Error",
          "Something went wrong"
        );
      }
    };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
      />
    );
  }

  /* ================= UI ================= */

  return (
    <View
      style={{
        flex: 1,
        padding: 15,
      }}
    >
      {/* ================= TABS ================= */}

      <View
        style={{
          flexDirection:
            "row",
          marginBottom: 15,
        }}
      >
        {[
          "all",
          "my",
          "history",
        ].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() =>
              setTab(
                t as any
              )
            }
            style={{
              flex: 1,
              padding: 12,
              backgroundColor:
                tab === t
                  ? "#16a34a"
                  : "#000",
              marginRight:
                t !==
                "history"
                  ? 5
                  : 0,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color:
                  "#fff",
                textAlign:
                  "center",
                fontWeight:
                  "600",
              }}
            >
              {t === "all"
                ? "⚔️ Active Elections/Battles"
                : t ===
                  "my"
                ? "🏠 My Elections/Battles"
                : "📜 Ended Elections/Battles"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ================= AUTH NOTICE ================= */}

      {showAuthNotice && (
        <View
          style={{
            position:
              "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor:
              "rgba(0,0,0,0.6)",
            justifyContent:
              "center",
            alignItems:
              "center",
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor:
                "#fff",
              padding: 20,
              borderRadius: 12,
              width: "85%",
              alignItems:
                "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight:
                  "bold",
                marginBottom: 10,
              }}
            >
              ⚔️ Welcome to
              Battle Room
            </Text>

            <Text
              style={{
                textAlign:
                  "center",
                marginBottom: 15,
              }}
            >
              Sign up or
              login to vote
              in battles
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowAuthNotice(
                  false
                );

                router.push(
                  "/(auth)/login"
                );
              }}
              style={{
                backgroundColor:
                  "#16a34a",
                padding: 12,
                borderRadius: 8,
                width: "100%",
                marginBottom: 10,
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
                Login /
                Sign Up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setShowAuthNotice(
                  false
                )
              }
            >
              <Text
                style={{
                  color:
                    "gray",
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ================= LIST ================= */}

      <FlatList
        data={battles}
        keyExtractor={(
          item
        ) => item.id}
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <Text
            style={{
              textAlign:
                "center",
              marginTop: 20,
            }}
          >
            No battles found
          </Text>
        }
        renderItem={({
          item,
        }) => {
          const isEnded =
            new Date(
              item.end_time ||
                item.end_at
            ).getTime() <=
            Date.now();

          const isMyBattle =
            item.creator_id ===
            userId;

          return (
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
                    : "#e5e7eb",
              }}
            >
              {/* TITLE */}

              <Text
                style={{
                  fontSize: 16,
                  fontWeight:
                    "bold",
                }}
              >
                {item.title}
              </Text>

              {/* DESCRIPTION */}

              <Text
                style={{
                  marginTop: 5,
                  color:
                    "#374151",
                }}
              >
                {
                  item.compare_text
                }
              </Text>

              {/* INSTITUTION */}

              {item.battle_type ===
                "institution" && (
                <Text
                  style={{
                    marginTop: 5,
                    color:
                      "#7c3aed",
                    fontWeight:
                      "bold",
                  }}
                >
                  🏫 Institution:
                  {" "}
                  {
                    item.institution_name
                  }
                </Text>
              )}

              {/* TYPE */}

              <Text
                style={{
                  marginTop: 5,
                  fontWeight:
                    "bold",
                  color:
                    item.battle_type ===
                    "institution"
                      ? "#7c3aed"
                      : "#16a34a",
                }}
              >
                {item.battle_type ===
                "institution"
                  ? "Institution Election"
                  : "Public Battle"}
              </Text>

              {/* PRIVATE */}

              {item.is_private && (
                <Text
                  style={{
                    marginTop: 5,
                    color:
                      "orange",
                  }}
                >
                  🔒 Private
                  Election
                </Text>
              )}

              {/* BOOSTED */}

              {item.is_boosted && (
                <Text
                  style={{
                    color:
                      "green",
                    marginTop: 5,
                    fontWeight:
                      "bold",
                  }}
                >
                  🚀 Boosted
                </Text>
              )}

              {/* COUNTDOWN */}

              <Text
                style={{
                  marginTop: 5,
                  color:
                    isEnded
                      ? "red"
                      : "orange",
                  fontWeight:
                    "600",
                }}
              >
                {isEnded
                  ? "⛔ Ended"
                  : `⏱️ ${renderCountdown(
                      item.end_time ||
                        item.end_at
                    )}`}
              </Text>

              {/* SHARE */}

              <TouchableOpacity
                onPress={() =>
                  shareBattle(
                    item
                  )
                }
                style={{
                  backgroundColor:
                    "#22c55e",
                  padding: 10,
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
                    fontWeight:
                      "600",
                  }}
                >
                  🔗 Share
                  Election/Battle
                </Text>
              </TouchableOpacity>

              {/* ENTER */}

              <TouchableOpacity
                onPress={() =>
                  openVote(item)
                }
                style={{
                  backgroundColor:
                    "#000",
                  padding: 10,
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
                    fontWeight:
                      "600",
                  }}
                >
                  Voting Booth ⚔️
                </Text>
              </TouchableOpacity>

              {/* LEADERBOARD */}

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/battle-leaderboard?id=${item.id}`
                  )
                }
                style={{
                  backgroundColor:
                    "#2563eb",
                  padding: 10,
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
                    fontWeight:
                      "600",
                  }}
                >
                  View
                  Leaderboard
                  🏆
                </Text>
              </TouchableOpacity>

              {/* ONLY MY TAB */}

              {tab ===
                "my" &&
                isMyBattle && (
                  <>
                    {!isEnded && (
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            `/my-battle?boost=${item.id}`
                          )
                        }
                        style={{
                          backgroundColor:
                            "#7c3aed",
                          padding: 10,
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
                            fontWeight:
                              "600",
                          }}
                        >
                          🚀 Boost
                          Battle
                        </Text>
                      </TouchableOpacity>
                    )}

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
                            "600",
                        }}
                      >
                        🗑️ Delete
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
            </View>
          );
        }}
      />

      {/* ================= PHONE MODAL ================= */}

      <Modal
        visible={
          voteModalVisible
        }
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              "rgba(0,0,0,0.5)",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor:
                "#fff",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight:
                  "bold",
              }}
            >
              Enter Phone
              Number
            </Text>

            <Text
              style={{
                marginTop: 10,
                color:
                  "gray",
              }}
            >
              Institution Election
              require approved
              phone numbers
            </Text>

            <TextInput
              placeholder="Enter phone number"
              value={
                phoneNumber
              }
              onChangeText={
                setPhoneNumber
              }
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor:
                  "#d1d5db",
                padding: 12,
                borderRadius: 8,
                marginTop: 15,
              }}
            />

            <TouchableOpacity
              onPress={
                continueToVote
              }
              style={{
                backgroundColor:
                  "#16a34a",
                padding: 14,
                borderRadius: 8,
                marginTop: 20,
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
                Continue To Vote
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setVoteModalVisible(
                  false
                )
              }
              style={{
                marginTop: 15,
              }}
            >
              <Text
                style={{
                  textAlign:
                    "center",
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