import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function InstitutionVoters() {
  const router = useRouter();

  const { battle } =
    useLocalSearchParams();

  const [phones, setPhones] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [voters, setVoters] =
    useState<any[]>([]);

  /* ================= LOAD VOTERS ================= */

  async function loadVoters() {
    if (!battle) return;

    const { data, error } =
      await supabase
        .from("institution_voters")
        .select("*")
        .eq("battle_id", battle)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.log(
        "LOAD VOTERS ERROR:",
        error
      );

      return;
    }

    setVoters(data || []);
  }

  useEffect(() => {
    if (battle) {
      loadVoters();
    }
  }, [battle]);

  /* ================= ADD VOTERS ================= */

  async function addVoters() {
    try {
      setLoading(true);

      if (!phones.trim()) {
        Alert.alert(
          "Error",
          "Enter phone numbers"
        );

        setLoading(false);

        return;
      }

      const splitPhones =
        phones
          .split("\n")
          .map((p) =>
            p
              .replace(/\s/g, "")
              .replace(/\-/g, "")
              .trim()
          )
          .filter(Boolean);

      if (splitPhones.length === 0) {
        Alert.alert(
          "Error",
          "No valid phone numbers"
        );

        setLoading(false);

        return;
      }

      /* ================= REMOVE DUPLICATES ================= */

      const uniquePhones = [
        ...new Set(splitPhones),
      ];

      const rows =
        uniquePhones.map(
          (phone) => ({
            battle_id: battle,
            phone,
            approved: true,
            has_voted: false,
          })
        );

      console.log(
        "INSERT ROWS:",
        rows
      );

      const { error } =
        await (supabase as any)
          .from(
            "institution_voters"
          )
          .insert(rows);

      if (error) {
        console.log(
          "INSERT ERROR:",
          error
        );

        Alert.alert(
          "Error",
          error.message
        );

        setLoading(false);

        return;
      }

      Alert.alert(
        "Success",
        `${uniquePhones.length} voters added`
      );

      setPhones("");

      await loadVoters();

    } catch (e: any) {
      console.log(e);

      Alert.alert(
        "Error",
        e.message
      );
    }

    setLoading(false);
  }

  /* ================= DELETE ================= */

  async function removeVoter(
    id: string
  ) {
    Alert.alert(
      "Remove Voter",
      "Remove this voter?",
      [
        {
          text: "Cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error } =
              await supabase
                .from(
                  "institution_voters"
                )
                .delete()
                .eq("id", id);

            if (error) {
              Alert.alert(
                "Error",
                error.message
              );

              return;
            }

            loadVoters();
          },
        },
      ]
    );
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 15,
        backgroundColor: "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 5,
        }}
      >
        🏫 Institution Voters
      </Text>

      <Text
        style={{
          color: "gray",
          marginBottom: 15,
        }}
      >
        One phone number per line
      </Text>

      <TextInput
        multiline
        value={phones}
        onChangeText={setPhones}
        placeholder={
          "0201111111\n0552222222\n+2348012345678"
        }
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 12,
          minHeight: 150,
          textAlignVertical: "top",
        }}
      />

      <TouchableOpacity
        onPress={addVoters}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
          padding: 14,
          borderRadius: 10,
          marginTop: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Adding..."
            : "Add Approved Voters"}
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          marginTop: 20,
          marginBottom: 10,
          fontWeight: "bold",
        }}
      >
        Approved Voters (
        {voters.length})
      </Text>

      <FlatList
        data={voters}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#f5f5f5",
              padding: 12,
              borderRadius: 10,
              marginBottom: 10,
              flexDirection: "row",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{
                  fontWeight: "bold",
                }}
              >
                {item.phone}
              </Text>

              {item.has_voted && (
                <Text
                  style={{
                    color: "green",
                    marginTop: 3,
                  }}
                >
                  ✅ Voted
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() =>
                removeVoter(item.id)
              }
              style={{
                backgroundColor: "red",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                }}
              >
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}