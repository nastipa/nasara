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

export default function ApproveMentorsScreen() {
  const [loading, setLoading] =
    useState(true);
    const router = useRouter();

  const [mentors, setMentors] =
    useState<any[]>([]);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors =
    async () => {
      try {
        setLoading(true);

        const {
          data,
          error,
        } = await supabase
          .from("mentors")
          .select("*")
          .eq("approved", false)
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

  /*
   =========================
   APPROVE MENTOR
   =========================
  */

 const approveMentor =
  async (id: string) => {
    try {
      /*
       =========================
       GET MENTOR
       =========================
      */

      const {
        data: mentorData,
        error:
          mentorFetchError,
      } = await (supabase as any)
        .from("mentors")
        .select("*")
        .eq("id", id)
        .single();

      if (
        mentorFetchError ||
        !mentorData
      ) {
        Alert.alert(
          "Error",
          "Mentor not found"
        );

        return;
      }

      /*
       =========================
       APPROVE MENTOR
       =========================
      */

      const {
        error: approveError,
      } = await (supabase as any)
        .from("mentors")
        .update({
          approved: true,

          /*
           IMPORTANT:
           makes mentor visible
           in mentor matching
          */
          status: "approved",
        })
        .eq("id", id);

      if (approveError) {
        Alert.alert(
          "Error",
          approveError.message
        );

        return;
      }

      /*
       =========================
       ADD MENTOR BADGE
       =========================
      */

      await (supabase as any)
        .from("profiles")
        .update({
          mentor_badge: true,
        })
        .eq(
          "id",
          mentorData.user_id
        );

      /*
       =========================
       SEND NOTIFICATION
       =========================
      */

      await (supabase as any)
        .from(
          "notifications"
        )
        .insert({
          user_id:
            mentorData.user_id,

          title:
            "Mentor Application Approved",

          body:
            "Congratulations! You are now an approved mentor on Nasara.",
        });

      Alert.alert(
        "Success",
        "Mentor approved successfully"
      );

      /*
       REMOVE FROM LIST
      */

      setMentors((prev) =>
        prev.filter(
          (m) => m.id !== id
        )
      );

    } catch (e: any) {
      Alert.alert(
        "Error",
        e.message
      );
    }
  };
  /*
   =========================
   REJECT MENTOR
   =========================
  */

  const rejectMentor =
    async (id: string) => {
      try {
        const { error } =
          await supabase
            .from("mentors")
            .delete()
            .eq("id", id);

        if (error) {
          Alert.alert(
            "Error",
            error.message
          );

          return;
        }

        Alert.alert(
          "Rejected",
          "Mentor application removed"
        );

       setMentors((prev) =>
  prev.filter(
    (m) => m.id !== id
  )
);

      } catch (e: any) {
        Alert.alert(
          "Error",
          e.message
        );
      }
    };

  /*
   =========================
   RENDER ITEM
   =========================
  */

  const renderItem = ({
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

        {!!item.whatsapp && (
          <Text style={styles.info}>
            WhatsApp:
            {" "}
            {item.whatsapp}
          </Text>
        )}

        {!!item.email && (
          <Text style={styles.info}>
            Email:
            {" "}
            {item.email}
          </Text>
        )}

        {!!item.years_experience && (
          <Text style={styles.info}>
            Experience:
            {" "}
            {
              item.years_experience
            }
          </Text>
        )}

        {!!item.availability && (
          <Text style={styles.info}>
            Availability:
            {" "}
            {
              item.availability
            }
          </Text>
        )}

        <View
          style={styles.row}
        >
          <TouchableOpacity
            style={
              styles.approveBtn
            }
            onPress={() =>
              approveMentor(
                item.id
              )
            }
          >
            <Text
              style={
                styles.btnText
              }
            >
              Approve
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.rejectBtn
            }
            onPress={() =>
              rejectMentor(
                item.id
              )
            }
          >
            <Text
              style={
                styles.btnText
              }
            >
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /*
   =========================
   LOADING
   =========================
  */

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

  /*
   =========================
   UI
   =========================
  */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Approve Mentors
      </Text>

      <FlatList
        data={mentors}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <Text
            style={styles.empty}
          >
            No pending mentor applications
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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

  bio: {
    marginTop: 10,

    color: "#444",
  },

  info: {
    marginTop: 5,

    color: "#555",
  },

  row: {
    flexDirection: "row",

    marginTop: 18,
  },

  approveBtn: {
    flex: 1,

    backgroundColor:
      "#16a34a",

    padding: 12,

    borderRadius: 10,

    alignItems: "center",

    marginRight: 10,
  },

  rejectBtn: {
    flex: 1,

    backgroundColor:
      "#dc2626",

    padding: 12,

    borderRadius: 10,

    alignItems: "center",
  },

  btnText: {
    color: "#fff",

    fontWeight: "bold",
  },
});