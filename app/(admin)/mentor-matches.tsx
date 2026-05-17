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

export default function MentorMatchesScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [requests, setRequests] =
    useState<any[]>([]);

  const [mentors, setMentors] =
    useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================
     LOAD DATA
  ========================= */

  const fetchData =
    async () => {
      try {
        setLoading(true);

        /*
         =========================
         LOAD APPROVED MENTORS
         =========================
        */

        const {
          data: mentorData,
          error: mentorError,
        } = await (supabase as any)
          .from("mentors")
          .select("*")
          .eq("approved", true)
          .order("created_at", {
            ascending: false,
          });

        if (mentorError) {
          console.log(
            "mentorError:",
            mentorError
          );
        }

        /*
         =========================
         LOAD PENDING REQUESTS
         =========================
        */

        const {
          data: requestData,
          error: requestError,
        } = await (supabase as any)
          .from("mentor_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", {
            ascending: false,
          });

        if (requestError) {
          console.log(
            "requestError:",
            requestError
          );
        }

        setMentors(
          mentorData || []
        );

        setRequests(
          requestData || []
        );

      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

  /* =========================
     MATCH MENTOR
  ========================= */

  const matchMentor =
    async (
      mentor: any,
      request: any
    ) => {
      try {

        /*
         =========================
         CHECK EXISTING MATCH
         =========================
        */

        const {
          data: existingMatch,
        } = await (supabase as any)
          .from("mentor_matches")
          .select("id")
          .eq(
            "mentor_id",
            mentor.user_id
          )
          .eq(
            "mentee_id",
            request.user_id
          )
          .maybeSingle();

        if (existingMatch) {
          Alert.alert(
            "Already Matched",
            "This mentor and mentee are already matched."
          );

          return;
        }

        /*
         =========================
         CREATE MATCH
         =========================
        */

        const {
          error: matchError,
        } =
          await (supabase as any)
            .from(
              "mentor_matches"
            )
            .insert({
              mentor_id:
                mentor.user_id,

              mentee_id:
                request.user_id,

              mentor_name:
                mentor.full_name,

              mentee_name:
                request.full_name,

              field:
                request.field,

              mentor_phone:
                mentor.phone || "",

              mentor_email:
                mentor.email || "",

              mentee_phone:
                request.phone || "",

              mentee_email:
                request.email || "",
            });

        if (matchError) {
          Alert.alert(
            "Error",
            matchError.message
          );

          return;
        }

        /*
         =========================
         UPDATE REQUEST STATUS
         =========================
        */

        await (supabase as any)
          .from(
            "mentor_requests"
          )
          .update({
            status:
              "matched",
          })
          .eq(
            "id",
            request.id
          );

        /*
         =========================
         AUTO FOLLOW
         =========================
        */

        await (supabase as any)
          .from("follows")
          .upsert([
            {
              follower_id:
                mentor.user_id,

              following_id:
                request.user_id,
            },

            {
              follower_id:
                request.user_id,

              following_id:
                mentor.user_id,
            },
          ]);

        /*
         =========================
         ADD BADGES
         =========================
        */

        await (supabase as any)
          .from("profiles")
          .update({
            mentor_badge:
              true,
          })
          .eq(
            "id",
            mentor.user_id
          );

        await (supabase as any)
          .from("profiles")
          .update({
            mentee_badge:
              true,
          })
          .eq(
            "id",
            request.user_id
          );

        /*
         =========================
         NOTIFICATIONS
         =========================
        */

        await (supabase as any)
          .from(
            "notifications"
          )
          .insert([
            {
              user_id:
                mentor.user_id,

              title:
                "New Mentee Assigned",

              body: `${request.full_name} has been matched with you on Nasara.,
            `},

            {
              user_id:
                request.user_id,

              title:
                "Mentor Match Found",

              body: `You have been matched with ${mentor.full_name} on Nasara.,
            `},
          ]);

        /*
         =========================
         REMOVE MATCHED REQUEST
         =========================
        */

        setRequests((prev) =>
          prev.filter(
            (r) =>
              r.id !==
              request.id
          )
        );

        Alert.alert(
          "Success",
          `${mentor.full_name} matched with ${request.full_name}`
        );

      } catch (e: any) {
        console.log(e);

        Alert.alert(
          "Error",
          e.message
        );
      }
    };

  /* =========================
     RENDER REQUEST
  ========================= */

  const renderRequest = ({
    item,
  }: any) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          {item.full_name}
        </Text>

        <Text style={styles.field}>
          Needs: {item.field}
        </Text>

        {!!item.occupation && (
          <Text style={styles.info}>
            Occupation: {item.occupation}
          </Text>
        )}

        {!!item.phone && (
          <Text style={styles.info}>
            Phone: {item.phone}
          </Text>
        )}

        {!!item.email && (
          <Text style={styles.info}>
            Email: {item.email}
          </Text>
        )}

        {!!item.goals && (
          <Text style={styles.goals}>
            {item.goals}
          </Text>
        )}

        <Text style={styles.subTitle}>
          Match With Mentor
        </Text>

        {mentors.length ===
        0 ? (
          <Text>
            No approved mentors yet
          </Text>
        ) : (
          mentors.map(
            (mentor) => (
              <TouchableOpacity
                key={
                  mentor.id
                }
                style={
                  styles.matchBtn
                }
                onPress={() =>
                  matchMentor(
                    mentor,
                    item
                  )
                }
              >
                <Text
                  style={
                    styles.btnText
                  }
                >
                  {
                    mentor.full_name
                  }{" "}
                  •{" "}
                  {
                    mentor.field
                  }
                </Text>
              </TouchableOpacity>
            )
          )
        )}
      </View>
    );
  };

  /* =========================
     LOADING
  ========================= */

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

  /* =========================
     UI
  ========================= */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Mentor Matching
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(item) =>
          item.id.toString()
        }
        renderItem={
          renderRequest
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <Text
            style={{
              textAlign:
                "center",
              marginTop: 40,
            }}
          >
            No pending mentee requests
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

      backgroundColor:
        "#fff",

      padding: 20,
    },

    title: {
      fontSize: 26,

      fontWeight:
        "bold",

      marginBottom: 20,
    },

    card: {
      borderWidth: 1,

      borderColor:
        "#e5e7eb",

      borderRadius: 12,

      padding: 15,

      marginBottom: 20,
    },

    name: {
      fontSize: 18,

      fontWeight:
        "bold",
    },

    field: {
      marginTop: 5,

      color:
        "#2563eb",

      fontWeight:
        "600",
    },

    info: {
      marginTop: 6,

      color: "#444",
    },

    goals: {
      marginTop: 10,

      color: "#444",
    },

    subTitle: {
      marginTop: 18,

      marginBottom: 10,

      fontWeight:
        "bold",
    },

    matchBtn: {
      backgroundColor:
        "#16a34a",

      padding: 12,

      borderRadius: 10,

      marginBottom: 10,
    },

    btnText: {
      color: "#fff",

      fontWeight:
        "bold",
    },
  });