import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
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
          setLoading(false);
          return;
        }

        setMatches(data || []);
      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

  const renderItem = ({
    item,
  }: any) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          👨‍🏫 {item.mentor_name || "Mentor"}
        </Text>

        <Text style={styles.field}>
          📚 Field:{" "}
          {item.field || "Not specified"}
        </Text>

        {item.email && (
          <Text style={styles.info}>
            📧 {item.email}
          </Text>
        )}

        {item.phone && (
          <Text style={styles.info}>
            📞 {item.phone}
          </Text>
        )}

        {item.profession && (
          <Text style={styles.info}>
            💼 {item.profession}
          </Text>
        )}

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            💬 You can connect and
            chat on Nasara using
            Discover Users.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.discoverBtn}
          onPress={() =>
            router.push("/discover")
          }
        >
          <Text style={styles.btnText}>
            Discover Users
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

      backgroundColor:
        "#fff",
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

    noticeBox: {
      marginTop: 15,

      backgroundColor:
        "#eff6ff",

      padding: 12,

      borderRadius: 10,
    },

    noticeText: {
      color: "#1d4ed8",

      fontSize: 14,

      lineHeight: 20,
    },

    discoverBtn: {
      backgroundColor:
        "#2563eb",

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