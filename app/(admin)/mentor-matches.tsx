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

import { supabase } from "../../lib/supabase";

export default function MentorMatchesScreen() {
  const [loading, setLoading] =
    useState(true);

  const [requests, setRequests] =
    useState<any[]>([]);

  const [mentors, setMentors] =
    useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  /*
   =========================
   LOAD DATA
   =========================
  */

  const fetchData =
    async () => {
      try {
        setLoading(true);

        /*
         LOAD APPROVED MENTORS
        */

        const {
          data: mentorData,
          error: mentorError,
        } = await (supabase as any)
          .from("mentors")
          .select("*")
          .eq("approved", true);

        if (mentorError) {
          console.log(
            mentorError
          );
        }

        /*
         LOAD PENDING REQUESTS
        */

        const {
          data: requestData,
          error: requestError,
        } = await (supabase as any)
          .from(
            "mentor_requests"
          )
          .select("*")
          .eq("status", "pending");

        if (requestError) {
          console.log(
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

  /*
   =========================
   MATCH MENTOR
   =========================
  */

  const matchMentor =
    async (
      mentor: any,
      request: any
    ) => {
      try {

        /*
 =========================
 CREATE / FIND CHAT ROOM
 =========================
*/

let roomId = null;

/* CHECK EXISTING ROOM */

const {
  data: existingRoom,
} = await (supabase as any)
  .from("chat_rooms")
  .select("id")
  .or(
    `and(buyer_id.eq.${mentor.user_id},seller_id.eq.${request.user_id}),and(buyer_id.eq.${request.user_id},seller_id.eq.${mentor.user_id})
  `)
  .maybeSingle();

if (existingRoom) {
  roomId =
    existingRoom.id;
}

/* CREATE ROOM IF NONE EXISTS */

if (!roomId) {
  const {
    data: newRoom,
    error: roomError,
  } = await (supabase as any)
    .from("chat_rooms")
    .insert({
      buyer_id:
        mentor.user_id,

      seller_id:
        request.user_id,

      item_id: null,
    })
    .select("id")
    .single();

  if (roomError) {
    console.log(
      "roomError:",
      roomError
    );

    Alert.alert(
      "Error",
      roomError.message
    );

    return;
  }

  roomId =
    newRoom.id;
}
        /*
         =========================
         CREATE MATCH
         =========================
        */

        const { error } =
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

              mentor_whatsapp:
                mentor.whatsapp ||
                mentor.whatsapp_number ||
                "",

              mentee_whatsapp:
                request.whatsapp ||
                "",

              room_id:
                roomId,
            });

        if (error) {
          Alert.alert(
            "Error",
            error.message
          );

          return;
        }

        /*
         =========================
         UPDATE REQUEST STATUS
         =========================
        */

        const {
          error:
            requestUpdateError,
        } =
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

        if (
          requestUpdateError
        ) {
          Alert.alert(
            "Error",
            requestUpdateError.message
          );

          return;
        }

        /*
         =========================
         AUTO FOLLOW
         =========================
        */

        await (supabase as any)
          .from("follows")
          .insert([
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
         BADGES
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

              body: `${request.full_name} has been assigned to you.,
          `},

            {
              user_id:
                request.user_id,

              title:
                "Mentor Match Found",

              body: `You were matched with ${mentor.full_name}.,
            `},
          ]);

        /*
         =========================
         SYSTEM MESSAGES
         =========================
        */

        const mentorMessage =
          `🎉 You have been matched with a mentee.

Mentee:
${request.full_name}

Field Needed:
${request.field}

Goals:
${request.goals || "Not provided"}

WhatsApp:
${request.whatsapp || "Not provided"}

Email:
${request.email || "Not provided"}

Please reach out respectfully.

— Nasara Team`;

        const menteeMessage =
          `🎉 You have been matched with a mentor.

Mentor:
${mentor.full_name}

Field:
${mentor.field}

WhatsApp:
${mentor.whatsapp || "Not provided"}

Email:
${mentor.email || "Not provided"}

Please reach out respectfully and begin your mentorship journey.

— Nasara Team`;

        if (roomId) {
          await (supabase as any)
            .from("messages")
            .insert([
              {
                room_id:
                  roomId,

                sender_id:
                  mentor.user_id,

                text:
                  mentorMessage,

                topic:
                  "system",

                extension:
                  "text",

                inserted_at:
                  new Date().toISOString(),

                updated_at:
                  new Date().toISOString(),
              },

              {
                room_id:
                  roomId,

                sender_id:
                  request.user_id,

                text:
                  menteeMessage,

                topic:
                  "system",

                extension:
                  "text",

                inserted_at:
                  new Date().toISOString(),

                updated_at:
                  new Date().toISOString(),
              },
            ]);
        }

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
          `${mentor.full_name} matched with ${request.full_name}
        `);

      } catch (e: any) {
        console.log(e);

        Alert.alert(
          "Error",
          e.message
        );
      }
    };

  /*
   =========================
   RENDER REQUEST
   =========================
  */

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
            No approved mentors
            yet
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
            No pending mentee
            requests
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