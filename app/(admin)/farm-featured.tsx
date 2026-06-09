import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmFeaturedAdminScreen() {
  const [requests, setRequests] =
    useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } =
      await (supabase as any)
        .from(
          "farm_featured_requests"
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

    if (error) {
      console.log(error);
      return;
    }

    setRequests(data || []);
  };

  const approve =
    async (item: any) => {
      try {
        const expiresAt =
          new Date();

        expiresAt.setDate(
          expiresAt.getDate() +
            Number(
              item.days || 1
            )
        );

        const {
          error:
            requestError,
        } =
          await (supabase as any)
            .from(
              "farm_featured_requests"
            )
            .update({
              status:
                "approved",
              approved_at:
                new Date().toISOString(),
              expires_at:
                expiresAt.toISOString(),
            })
            .eq(
              "id",
              item.id
            );

        if (
          requestError
        )
          throw requestError;

        const {
          error:
            farmError,
        } =
          await (supabase as any)
            .from(
              "farm_profiles"
            )
            .update({
              is_featured:
                true,
              featured_expires_at:
                expiresAt.toISOString(),
            })
            .eq(
              "id",
              item.farm_id
            );

        if (
          farmError
        )
          throw farmError;

        setRequests(
          (
            prev
          ) =>
            prev.filter(
              (
                r
              ) =>
                r.id !==
                item.id
            )
        );

        Alert.alert(
          "Success",
          "Farm featured successfully"
        );
      } catch (
        e: any
      ) {
        console.log(
          e
        );

        Alert.alert(
          "Error",
          e.message ||
            "Approval failed"
        );
      }
    };

  const reject =
    async (item: any) => {
      try {
        const {
          error,
        } =
          await (supabase as any)
            .from(
              "farm_featured_requests"
            )
            .update({
              status:
                "rejected",
            })
            .eq(
              "id",
              item.id
            );

        if (error)
          throw error;

        setRequests(
          (
            prev
          ) =>
            prev.filter(
              (
                r
              ) =>
                r.id !==
                item.id
            )
        );

        Alert.alert(
          "Rejected"
        );
      } catch (
        e: any
      ) {
        Alert.alert(
          "Error",
          e.message
        );
      }
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
          fontWeight:
            "bold",
          marginBottom: 20,
        }}
      >
        ⭐ Featured Farm Requests
      </Text>

      <FlatList
        data={
          requests
        }
        keyExtractor={(
          item
        ) =>
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
              Farm ID:
              {" "}
              {
                item.farm_id
              }
            </Text>

            <Text>
              Days:
              {" "}
              {
                item.days
              }
            </Text>

            <Text>
              Amount:
              {" "}
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
                  approve(
                    item
                  )
                }
                style={{
                  backgroundColor:
                    "#16a34a",
                  padding: 10,
                  borderRadius: 10,
                  marginRight: 10,
                }}
              >
                <Text
                  style={{
                    color:
                      "#fff",
                    fontWeight:
                      "bold",
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
                    "#dc2626",
                  padding: 10,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color:
                      "#fff",
                    fontWeight:
                      "bold",
                  }}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text
            style={{
              textAlign:
                "center",
              marginTop: 40,
            }}
          >
            No pending featured requests
          </Text>
        }
      />
    </View>
  );
}