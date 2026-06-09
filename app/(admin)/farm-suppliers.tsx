import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmSuppliersAdminScreen() {
  const [requests, setRequests] =
    useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } =
      await (supabase as any)
        .from(
          "farm_supplier_requests"
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

    setRequests(data || []);
  };

  const approve =
    async (item: any) => {
      try {
        await (supabase as any)
          .from("farm_profiles")
          .update({
            is_supplier: true,
            supplier_verified_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            item.farm_id
          );

        await (supabase as any)
          .from(
            "farm_supplier_requests"
          )
          .update({
            status: "approved",
            approved_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            item.id
          );

        setRequests(
          (prev) =>
            prev.filter(
              (r) =>
                r.id !== item.id
            )
        );

        Alert.alert(
          "Success",
          "Supplier approved"
        );
      } catch {
        Alert.alert(
          "Error",
          "Approval failed"
        );
      }
    };

  const reject =
    async (item: any) => {
      await (supabase as any)
        .from(
          "farm_supplier_requests"
        )
        .update({
          status: "rejected",
        })
        .eq(
          "id",
          item.id
        );

      setRequests(
        (prev) =>
          prev.filter(
            (r) =>
              r.id !== item.id
          )
      );
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
        Supplier Requests
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
              {item.farm_id}
            </Text>

            <Text>
              Business:{" "}
              {
                item.business_name
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