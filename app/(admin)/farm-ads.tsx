import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmAdsAdminScreen() {
  const [requests, setRequests] =
    useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests =
    async () => {
      const { data, error } =
        await (supabase as any)
          .from(
            "farm_ad_requests"
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

        const { error: adError } =
          await (supabase as any)
            .from(
              "farm_ad_requests"
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

        if (adError)
          throw adError;

        const {
          error:
            profileError,
        } =
          await (supabase as any)
            .from(
              "farm_profiles"
            )
            .update({
              is_advertised:
                true,
              ad_expires_at:
                expiresAt.toISOString(),
            })
            .eq(
              "id",
              item.farm_id
            );

        if (
          profileError
        )
          throw profileError;

        setRequests(
          (prev) =>
            prev.filter(
              (x) =>
                x.id !==
                item.id
            )
        );

        Alert.alert(
          "Success",
          "Advertisement approved"
        );
      } catch (e: any) {
        console.log(e);

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
        const { error } =
          await (supabase as any)
            .from(
              "farm_ad_requests"
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
          (prev) =>
            prev.filter(
              (x) =>
                x.id !==
                item.id
            )
        );

        Alert.alert(
          "Rejected"
        );
      } catch (e: any) {
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
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Farm Advertisements
      </Text>

      <FlatList
        data={requests}
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
              marginBottom: 15,
            }}
          >
            {!!item.banner_url && (
              <Image
                source={{
                  uri:
                    item.banner_url,
                }}
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              />
            )}

            <Text
              style={{
                fontWeight:
                  "bold",
                fontSize: 18,
              }}
            >
              {item.title}
            </Text>

            <Text>
              Farm ID:{" "}
              {
                item.farm_id
              }
            </Text>

            <Text>
              Phone:{" "}
              {
                item.phone
              }
            </Text>

            <Text>
              Days:{" "}
              {
                item.days
              }
            </Text>

            <Text>
              Amount:
              GH₵{" "}
              {
                item.amount
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
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  approve(
                    item
                  )
                }
                style={{
                  flex: 1,
                  backgroundColor:
                    "#16a34a",
                  padding: 12,
                  borderRadius: 10,
                  marginRight: 10,
                }}
              >
                <Text
                  style={{
                    color:
                      "#fff",
                    textAlign:
                      "center",
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
                  flex: 1,
                  backgroundColor:
                    "#dc2626",
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color:
                      "#fff",
                    textAlign:
                      "center",
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
      />
    </View>
  );
}