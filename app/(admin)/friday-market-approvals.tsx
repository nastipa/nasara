import { useEffect, useState } from "react";
import {
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import { supabase } from "../../lib/supabase";

type Stall = {
  id: number;
  momo_name: string;
  momo_number: string;
  payment_reference: string;
  payment_screenshot: string | null;
  status: string;
};

export default function FridayMarketApprovals() {
  const [stalls, setStalls] =
    useState<Stall[]>([]);

  const loadStalls =
    async () => {
      const { data } =
        await (supabase as any)
          .from(
            "friday_market_stalls"
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

      setStalls(data || []);
    };

  useEffect(() => {
    loadStalls();
  }, []);

  const approve =
    async (id: number) => {
      const { error } =
        await (
          supabase as any
        )
          .from(
            "friday_market_stalls"
          )
          .update({
            status:
              "approved",
          })
          .eq("id", id);

      if (!error) {
        loadStalls();
      }
    };

  const reject =
    async (id: number) => {
      const { error } =
        await (
          supabase as any
        )
          .from(
            "friday_market_stalls"
          )
          .update({
            status:
              "rejected",
          })
          .eq("id", id);

      if (!error) {
        loadStalls();
      }
    };

  return (
    <View
      style={{
        flex: 1,
        padding: 15,
        backgroundColor:
          "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight:
            "bold",
          marginBottom: 15,
        }}
      >
        Friday Market Approvals
      </Text>

      <FlatList
        data={stalls}
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
              borderWidth: 1,
              borderColor:
                "#ddd",
              padding: 12,
              marginBottom: 12,
              borderRadius: 10,
            }}
          >
            <Text>
              Name:{" "}
              {
                item.momo_name
              }
            </Text>

            <Text>
              Number:{" "}
              {
                item.momo_number
              }
            </Text>

            <Text>
              Ref:{" "}
              {
                item.payment_reference
              }
            </Text>

            {item.payment_screenshot && (
              <Image
                source={{
                  uri: item.payment_screenshot,
                }}
                style={{
                  height: 200,
                  marginTop: 10,
                }}
              />
            )}

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
                    item.id
                  )
                }
                style={{
                  flex: 1,
                  backgroundColor:
                    "#16a34a",
                  padding: 12,
                  marginRight: 5,
                  borderRadius: 8,
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
                    item.id
                  )
                }
                style={{
                  flex: 1,
                  backgroundColor:
                    "#dc2626",
                  padding: 12,
                  marginLeft: 5,
                  borderRadius: 8,
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