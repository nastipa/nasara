import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function MyMentorshipsScreen() {
  const [loading, setLoading] =
    useState(true);

  const [matches, setMatches] =
    useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches =
    async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("mentor_matches")
          .select("*")
          .eq("mentee_id", user.id)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.log(error);
          return;
        }

        setMatches(data || []);

      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

  const openWhatsapp = (
    phone: string
  ) => {
    if (!phone) return;

    const clean =
      phone.replace(/\D/g, "");

    Linking.openURL(
      `https://wa.me/${clean}`
    );
  };

  /*
   =========================
   OPEN SHARED CHAT ROOM
   =========================
  */

  const openChat = async (
    roomId: string
  ) => {
    try {
      if (!roomId) {
        console.log(
          "No room_id found"
        );

        return;
      }

      router.push(
        `/chat/${roomId}`
      );

    } catch (e) {
      console.log(
        "openChat error:",
        e
      );
    }
  };

  const renderItem = ({
    item,
  }: any) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          👨‍🏫 {item.mentor_name}
        </Text>

        <Text style={styles.field}>
          📚 Field:
          {" "}
          {item.field}
        </Text>

        {!!item.mentor_whatsapp && (
          <TouchableOpacity
            style={
              styles.whatsappBtn
            }
            onPress={() =>
              openWhatsapp(
                item.mentor_whatsapp
              )
            }
          >
            <Text
              style={
                styles.btnText
              }
            >
              💬 Chat on WhatsApp
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            openChat(
              item.room_id
            )
          }
        >
          <Text
            style={styles.btnText}
          >
            📩 Chat on Nasara
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        My Mentor
      </Text>

      <FlatList
        data={matches}
        keyExtractor={(item) =>
          item.id.toString()
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <Text
            style={styles.empty}
          >
            No mentor yet
          </Text>
        }
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    loadingContainer: {
      flex: 1,

      justifyContent:
        "center",

      alignItems: "center",
    },

    container: {
      flex: 1,

      padding: 20,

      backgroundColor:
        "#fff",
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
    },

    name: {
      fontSize: 18,

      fontWeight: "bold",
    },

    field: {
      marginTop: 5,

      color: "#2563eb",

      fontWeight: "600",
    },

    whatsappBtn: {
      backgroundColor:
        "#16a34a",

      padding: 12,

      borderRadius: 10,

      marginTop: 15,

      alignItems: "center",
    },

    chatBtn: {
      backgroundColor:
        "#2563eb",

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