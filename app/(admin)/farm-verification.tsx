import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmVerificationsAdminScreen() {
  const [requests, setRequests] =
    useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } =
      await (supabase as any)
        .from(
          "farm_verification_requests"
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
       

    setRequests(
      data || []
    );
  };

 const approve = async (item: any) => {
  try {
    const {
  data: updatedFarm,
  error: verifyError,
} = await (supabase as any)
  .from("farm_profiles")
  .update({
    is_verified: true,
    verified_farm: true,
    verification_requested: false,
  })
  .eq("id", item.farm_id)
  .select();

console.log(
  "UPDATED FARM",
  updatedFarm
);

if (verifyError)
  throw verifyError;

    const { error: requestError } =
      await (supabase as any)
  .from("farm_verification_requests")
  .update({
    status: "approved",
    approved_at: new Date().toISOString(),
  })
  .eq("farm_id", item.farm_id)
  .eq("status", "pending");

    if (requestError)
      throw requestError;

    setRequests((prev) =>
      prev.filter(
        (r) => r.id !== item.id
      )
    );

    Alert.alert(
      "Success",
      "Farm verified"
    );
  } catch (e: any) {
    console.log(
      "VERIFY ERROR",
      e
    );

    Alert.alert(
      "Error",
      e?.message ||
        "Failed to approve"
    );
  }
};

  const reject =
    async (item: any) => {
      await (supabase as any)
        .from(
          "farm_verification_requests"
        )
        .update({
          status:
            "rejected",
        })
        .eq(
          "id",
          item.id
        );

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
        Farm Verification Requests
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(item) =>
          item.id.toString()
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
            }}
          >
            <Text>
              Farm ID:{" "}
              {
                item.farm_id
              }
            </Text>

            <Text>
              Ref:{" "}
              {
                item.momo_reference
              }
            </Text>

            <View
              style={{
                flexDirection:
                  "row",
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  approve(
                    item
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
                  reject(
                    item
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