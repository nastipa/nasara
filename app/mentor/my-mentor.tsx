import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function MyMentorshipsScreen() {
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState<any[]>([]);

  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const router = useRouter();

  // ==========================================
  // 📋 FETCH MY MENTORSHIPS
  // ==========================================

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // ==========================================
      // 📋 GET MENTORSHIP RECORDS
      // ==========================================

      const { data, error } = await supabase
        .from("mentor_matches")
        .select("*")
        .eq("mentee_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.log("Mentorship fetch error:", error);
        setLoading(false);
        return;
      }

      // ==========================================
      // 👨‍🏫 LOAD MENTOR PROFILE INFORMATION
      // ==========================================

      const formatted = await Promise.all(
        (data || []).map(async (item: any) => {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select(`
              full_name,
              phone,
              email,
              profession,
              occupation
            `)
            .eq("id", item.mentor_id)
            .maybeSingle();

          return {
            ...item,

            mentor_name:
              profile?.full_name ||
              item.mentor_name ||
              "Mentor",

            phone: profile?.phone || item.phone || "",

            email: profile?.email || item.email || "",

            profession:
              profile?.profession ||
              profile?.occupation ||
              item.profession ||
              "",
          };
        })
      );

      setMatches(formatted);
    } catch (e) {
      console.log("Mentorship loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 💬 OPEN EXISTING CHAT WITH MENTOR
  // ==========================================

  const openMentorChat = async (mentorId: string) => {
    try {
      if (!mentorId) {
        Alert.alert("Chat Error", "Mentor information not found.");
        return;
      }

      setOpeningChat(mentorId);

      // 👤 GET LOGGED-IN MENTEE

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/(auth)/login");
        return;
      }

      const menteeId = user.id;

      if (menteeId === mentorId) {
        Alert.alert(
          "Notice",
          "You cannot open a chat with yourself."
        );
        return;
      }

      let existingRoom: any = null;

      // ==========================================
      // 🔍 CHECK MENTEE → MENTOR CHAT
      // ==========================================

      const {
        data: directRoom,
        error: directError,
      } = await (supabase as any)
        .from("chat_rooms")
        .select("id")
        .eq("buyer_id", menteeId)
        .eq("seller_id", mentorId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (directError) {
        console.log("Direct chat search error:", directError);

        Alert.alert("Chat Error", directError.message);
        return;
      }

      existingRoom = directRoom;

      // ==========================================
      // 🔍 CHECK MENTOR → MENTEE CHAT
      // ==========================================

      if (!existingRoom) {
        const {
          data: reverseRoom,
          error: reverseError,
        } = await (supabase as any)
          .from("chat_rooms")
          .select("id")
          .eq("buyer_id", mentorId)
          .eq("seller_id", menteeId)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (reverseError) {
          console.log("Reverse chat search error:", reverseError);

          Alert.alert("Chat Error", reverseError.message);
          return;
        }

        existingRoom = reverseRoom;
      }

      let roomId = existingRoom?.id;

      // ==========================================
      // 🆕 CREATE CHAT ONLY IF NONE EXISTS
      // ==========================================

      if (!roomId) {
        const {
          data: newRoom,
          error: createError,
        } = await (supabase as any)
          .from("chat_rooms")
          .insert({
            buyer_id: menteeId,
            seller_id: mentorId,
          })
          .select("id")
          .single();

        if (createError) {
          console.log("Chat creation error:", createError);

          // ==========================================
          // 🔄 RECOVER EXISTING CHAT IF INSERT CONFLICTS
          // ==========================================

          const { data: retryDirect } = await (supabase as any)
            .from("chat_rooms")
            .select("id")
            .eq("buyer_id", menteeId)
            .eq("seller_id", mentorId)
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle();

          let recoveredRoom = retryDirect;

          if (!recoveredRoom) {
            const { data: retryReverse } = await (supabase as any)
              .from("chat_rooms")
              .select("id")
              .eq("buyer_id", mentorId)
              .eq("seller_id", menteeId)
              .order("created_at", {
                ascending: false,
              })
              .limit(1)
              .maybeSingle();

            recoveredRoom = retryReverse;
          }

          if (!recoveredRoom?.id) {
            Alert.alert(
              "Chat Failed",
              createError.message ||
                "Could not create or open the chat."
            );

            return;
          }

          roomId = recoveredRoom.id;
        } else {
          roomId = newRoom.id;
        }
      }

      // ==========================================
      // 🚀 OPEN CHAT
      // ==========================================

      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(roomId),
        },
      });
    } catch (error: any) {
      console.log("Open mentor chat error:", error);

      Alert.alert(
        "Chat Error",
        error?.message ||
          "Could not open chat. Please try again."
      );
    } finally {
      setOpeningChat(null);
    }
  };

  // ==========================================
  // 👥 RENDER MENTOR CARD
  // ==========================================

  const renderItem = ({ item }: any) => {
    const isOpening = openingChat === item.mentor_id;

    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          👨‍🏫 {item.mentor_name || "Mentor"}
        </Text>

        <Text style={styles.field}>
          📚 Field: {item.field || "Not specified"}
        </Text>

        {item.email ? (
          <Text style={styles.info}>
            📧 {item.email}
          </Text>
        ) : null}

        {item.phone ? (
          <Text style={styles.info}>
            📞 {item.phone}
          </Text>
        ) : null}

        {item.profession ? (
          <Text style={styles.info}>
            💼 {item.profession}
          </Text>
        ) : null}

        {/* 💬 OPEN CHAT */}

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => openMentorChat(item.mentor_id)}
          disabled={openingChat !== null}
        >
          {isOpening ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              💬 Open Chat
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ==========================================
  // ⏳ LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ==========================================
  // 📱 MAIN SCREEN
  // ==========================================

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        My Mentor
      </Text>

      <FlatList
        data={matches}
        keyExtractor={(item, index) =>
          item.id
            ? item.id.toString()
            : index.toString()
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No mentor yet
          </Text>
        }
      />
    </View>
  );
}

// ==========================================
// 🎨 SCREEN STYLES
// ==========================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
  },

  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    backgroundColor: "#fff",
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
  },

  field: {
    marginTop: 8,
    color: "#2563eb",
    fontWeight: "600",
  },

  info: {
    marginTop: 8,
    fontSize: 15,
    color: "#374151",
  },

  chatBtn: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});