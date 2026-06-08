import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmBoostsAdminScreen() {
  const [requests, setRequests] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } =
      await (supabase as any)
        .from(
          "farm_boost_requests"
        )
        .select("*")
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (!error) {
      setRequests(
        data || []
      );
    }

    setLoading(false);
  };

 const approveBoost = async (
  id: number,
  farm_id: number,
  days: number
) => {
  const boostExpiresAt = new Date(
    Date.now() +
      days *
        24 *
        60 *
        60 *
        1000
  ).toISOString();

  const { error } =
    await (supabase as any)
      .from(
        "farm_boost_requests"
      )
      .update({
        status: "approved",
        approved_at:
          new Date().toISOString(),
      })
      .eq("id", id);

  if (error) {
    Alert.alert(
      "Error",
      error.message
    );
    return;
  }

  await (supabase as any)
    .from("farm_profiles")
    .update({
      is_boosted: true,
      boost_expires_at:
        boostExpiresAt,
    })
    .eq("id", farm_id);

  loadRequests();
};
  const rejectRequest =
    async (id: number) => {
      await (supabase as any)
        .from(
          "farm_boost_requests"
        )
        .update({
          status:
            "rejected",
        })
        .eq("id", id);

      loadRequests();
    };

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Farm Boost Requests
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(
          item
        ) =>
          item.id.toString()
        }
        refreshing={loading}
        onRefresh={
          loadRequests
        }
        renderItem={({
          item,
        }) => (
          <View
            style={{
              backgroundColor:
                "#fff",
              padding: 15,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor:
                "#eee",
            }}
          >
            <Text>
              Farm ID:{" "}
              {
                item.farm_id
              }
            </Text>

            <Text>
              Days:{" "}
              {item.days}
            </Text>

            <Text>
              Amount:
              GH₵
              {
                item.amount
              }
            </Text>

            <Text>
              Ref:
              {" "}
              {
                item.momo_reference
              }
            </Text>

            <View
              style={{
                flexDirection:
                  "row",
                marginTop: 12,
              }}
            >
              <TouchableOpacity
  onPress={() =>
    approveBoost(
      item.id,
      item.farm_id,
      item.days
    )
  }
                style={{
                  backgroundColor:
                    "green",
                  padding: 10,
                  borderRadius: 10,
                  marginRight: 10,
                }}
              >
                <Text
                  style={{
                    color:
                      "#fff",
                  }}
                >
                  Approve
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  rejectRequest(
                    item.id
                  )
                }
                style={{
                  backgroundColor:
                    "red",
                  padding: 10,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color:
                      "#fff",
                  }}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}