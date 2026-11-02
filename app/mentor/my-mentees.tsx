import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function MyMenteesScreen() {
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState<any[]>([]);

  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const router = useRouter();

  // ==========================================
  // 📋 FETCH MY MENTEES
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
      // 📋 GET MENTOR MATCHES
      // ==========================================

      const { data, error } = await supabase
        .from("mentor_matches")
        .select("*")
        .eq("mentor_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.log("Fetch mentees error:", error);
        setLoading(false);
        return;
      }

      // ==========================================
      // 👤 LOAD MENTEE PROFILE INFORMATION
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
            .eq("id", item.mentee_id)
            .maybeSingle();

          return {
            ...item,

            mentee_name:
              profile?.full_name ||
              item.mentee_name ||
              "Unknown",

            phone: profile?.phone || "",

            email: profile?.email || "",

            profession:
              profile?.profession ||
              profile?.occupation ||
              "",
          };
        })
      );

      setMatches(formatted);
    } catch (e) {
      console.log("Mentee loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 💬 OPEN EXISTING CHAT WITH MENTEE
  // ==========================================

  const openMenteeChat = async (menteeId: string) => {
    try {
      if (!menteeId) {
        Alert.alert("Chat Error", "Mentee information not found.");
        return;
      }

      setOpeningChat(menteeId);

      // 👤 GET LOGGED-IN MENTOR

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/(auth)/login");
        return;
      }

      const mentorId = user.id;

      if (mentorId === menteeId) {
        Alert.alert(
          "Notice",
          "You cannot open a chat with yourself."
        );
        return;
      }

      let existingRoom: any = null;

      // ==========================================
      // 🔍 CHECK MENTOR → MENTEE CHAT
      // ==========================================

      const {
        data: directRoom,
        error: directError,
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

      if (directError) {
        console.log("Direct chat search error:", directError);

        Alert.alert(
          "Chat Error",
          directError.message
        );

        return;
      }

      existingRoom = directRoom;

      // ==========================================
      // 🔍 CHECK REVERSE MENTEE → MENTOR CHAT
      // ==========================================

      if (!existingRoom) {
        const {
          data: reverseRoom,
          error: reverseError,
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

        if (reverseError) {
          console.log("Reverse chat search error:", reverseError);

          Alert.alert(
            "Chat Error",
            reverseError.message
          );

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
            buyer_id: mentorId,
            seller_id: menteeId,
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
            .eq("buyer_id", mentorId)
            .eq("seller_id", menteeId)
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
              .eq("buyer_id", menteeId)
              .eq("seller_id", mentorId)
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
      console.log("Open mentee chat error:", error);

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
  // 📧 OPEN EMAIL
  // ==========================================

  const openEmail = (email: string) => {
    if (!email) return;

    Linking.openURL(`mailto:${email}`);
  };

  // ==========================================
  // 👥 RENDER MENTEE CARD
  // ==========================================

  const renderItem = ({ item }: any) => {
    const isOpening = openingChat === item.mentee_id;

    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          👤 {item.mentee_name}
        </Text>

        <Text style={styles.field}>
          📚 Field: {item.field || "Not provided"}
        </Text>

        <Text style={styles.info}>
          💼 Profession: {item.profession || "Not provided"}
        </Text>

        <Text style={styles.info}>
          📞 Phone: {item.phone || "Not provided"}
        </Text>

        <Text style={styles.info}>
          📧 Email: {item.email || "Not provided"}
        </Text>

        {/* 💬 OPEN CHAT BUTTON */}

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => openMenteeChat(item.mentee_id)}
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

        {/* 📧 SEND EMAIL BUTTON */}

        {item.email ? (
          <TouchableOpacity
            style={styles.emailBtn}
            onPress={() => openEmail(item.email)}
          >
            <Text style={styles.btnText}>
              📧 Send Email
            </Text>
          </TouchableOpacity>
        ) : null}
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
        My Mentees
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
            No mentees yet
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
    marginBottom: 8,
  },

  field: {
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 6,
  },

  info: {
    fontSize: 15,
    marginBottom: 6,
    color: "#374151",
  },

  chatBtn: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },

  emailBtn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});