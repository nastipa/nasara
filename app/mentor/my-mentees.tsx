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

export default function MyMenteesScreen() {
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

        /*
         =========================
         GET MATCHES
         =========================
        */

        const {
          data,
          error,
        } = await supabase
          .from("mentor_matches")
          .select("*")
          .eq(
            "mentor_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.log(
            "fetch error:",
            error
          );

          setLoading(false);
          return;
        }

        /*
         =========================
         LOAD MENTEE PROFILE INFO
         =========================
        */

        const formatted =
          await Promise.all(
            (data || []).map(
              async (
                item: any
              ) => {
                const {
                  data:
                    profile,
                } =
                  await (supabase as any)
                    .from(
                      "profiles"
                    )
                    .select(
                      `
                      full_name,
                      phone,
                      email,
                      profession,
                      occupation
                    `
                    )
                    .eq(
                      "id",
                      item.mentee_id
                    )
                    .maybeSingle();

                return {
                  ...item,

                  mentee_name:
                    profile?.full_name ||
                    item.mentee_name ||
                    "Unknown",

                  phone:
                    profile?.phone ||
                    "",

                  email:
                    profile?.email ||
                    "",

                  profession:
                    profile?.profession ||
                    profile?.occupation ||
                    "",
                };
              }
            )
          );

        setMatches(
          formatted
        );

      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

  const openEmail = (
    email: string
  ) => {
    if (!email) return;

    Linking.openURL(
      `mailto:${email}`
    );
  };

  const goToDiscover =
    () => {
      router.push(
        "/discover"
      );
    };

  const renderItem = ({
    item,
  }: any) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          👤{" "}
          {item.mentee_name}
        </Text>

        <Text style={styles.field}>
          📚 Field:{" "}
          {item.field ||
            "Not provided"}
        </Text>

        <Text style={styles.info}>
          💼 Profession:{" "}
          {item.profession ||
            "Not provided"}
        </Text>

        <Text style={styles.info}>
          📞 Phone:{" "}
          {item.phone ||
            "Not provided"}
        </Text>

        <Text style={styles.info}>
          📧 Email:{" "}
          {item.email ||
            "Not provided"}
        </Text>

        <View
          style={
            styles.messageBox
          }
        >
          <Text
            style={
              styles.messageText
            }
          >
            💬 You can connect
            and chat on Nasara
            using Discover Users.
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.discoverBtn
          }
          onPress={
            goToDiscover
          }
        >
          <Text
            style={
              styles.btnText
            }
          >
            Discover Users
          </Text>
        </TouchableOpacity>

        {item.email ? (
          <TouchableOpacity
            style={
              styles.emailBtn
            }
            onPress={() =>
              openEmail(
                item.email
              )
            }
          >
            <Text
              style={
                styles.btnText
              }
            >
              Send Email
            </Text>
          </TouchableOpacity>
        ) : null}
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
        My Mentees
      </Text>

      <FlatList
        data={matches}
        keyExtractor={(
          item,
          index
        ) =>
          item.id
            ? item.id.toString()
            : index.toString()
        }
        renderItem={
          renderItem
        }
        ListEmptyComponent={
          <Text
            style={
              styles.empty
            }
          >
            No mentees yet
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

      alignItems:
        "center",
    },

    container: {
      flex: 1,

      padding: 20,

      backgroundColor:
        "#fff",
    },

    title: {
      fontSize: 26,

      fontWeight:
        "bold",

      marginBottom: 20,
    },

    empty: {
      textAlign:
        "center",

      marginTop: 40,

      color: "#666",
    },

    card: {
      borderWidth: 1,

      borderColor:
        "#e5e7eb",

      borderRadius: 12,

      padding: 15,

      marginBottom: 15,

      backgroundColor:
        "#fff",
    },

    name: {
      fontSize: 18,

      fontWeight:
        "bold",

      marginBottom: 8,
    },

    field: {
      color: "#2563eb",

      fontWeight:
        "600",

      marginBottom: 6,
    },

    info: {
      fontSize: 15,

      marginBottom: 6,

      color: "#374151",
    },

    messageBox: {
      backgroundColor:
        "#eff6ff",

      padding: 12,

      borderRadius: 10,

      marginTop: 12,

      marginBottom: 10,
    },

    messageText: {
      color: "#1d4ed8",

      fontSize: 14,

      lineHeight: 20,
    },

    discoverBtn: {
      backgroundColor:
        "#16a34a",

      padding: 12,

      borderRadius: 10,

      marginTop: 10,

      alignItems:
        "center",
    },

    emailBtn: {
      backgroundColor:
        "#2563eb",

      padding: 12,

      borderRadius: 10,

      marginTop: 10,

      alignItems:
        "center",
    },

    btnText: {
      color: "#fff",

      fontWeight:
        "bold",
    },
  });