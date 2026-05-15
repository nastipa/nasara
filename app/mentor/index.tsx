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

export default function MentorHomeScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [mentors, setMentors] =
    useState<any[]>([]);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors =
    async () => {
      try {
        setLoading(true);

        const { data, error } =
          await supabase
            .from("mentors")
            .select("*")
            .eq("approved", true)
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

        setMentors(data || []);

      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

  const renderMentor = ({
    item,
  }: any) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          {item.full_name}
        </Text>

        <Text style={styles.field}>
          {item.field}
        </Text>

        {!!item.bio && (
          <Text style={styles.bio}>
            {item.bio}
          </Text>
        )}

        {!!item.years_experience && (
          <Text style={styles.info}>
            Experience:{" "}
            {
              item.years_experience
            }
          </Text>
        )}

        {!!item.availability && (
          <Text style={styles.info}>
            Availability:{" "}
            {item.availability}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Mentorship
      </Text>

      {/* TOP ACTIONS */}

      <TouchableOpacity
        style={styles.blueBtn}
        onPress={() =>
          router.push(
            "/mentor/apply"
          )
        }
      >
        <Text style={styles.btnText}>
          Become a Mentor
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.greenBtn}
        onPress={() =>
          router.push(
            "/mentor/request"
          )
        }
      >
        <Text style={styles.btnText}>
          Request a Mentor
        </Text>
      </TouchableOpacity>

      <Text style={styles.section}>
        Available Mentors
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
        />
      ) : (
        <FlatList
          data={mentors}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={
            renderMentor
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingBottom: 40,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  blueBtn: {
    backgroundColor: "#2563eb",

    padding: 15,

    borderRadius: 10,

    alignItems: "center",

    marginBottom: 12,
  },

  greenBtn: {
    backgroundColor: "#16a34a",

    padding: 15,

    borderRadius: 10,

    alignItems: "center",

    marginBottom: 25,
  },

  btnText: {
    color: "#fff",

    fontWeight: "bold",

    fontSize: 16,
  },

  section: {
    fontSize: 20,

    fontWeight: "bold",

    marginBottom: 15,
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

    marginBottom: 5,
  },

  field: {
    fontSize: 15,

    color: "#2563eb",

    fontWeight: "600",

    marginBottom: 8,
  },

  bio: {
    color: "#444",

    marginBottom: 8,
  },

  info: {
    color: "#666",

    marginTop: 3,
  },
});