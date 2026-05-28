import { useEffect, useState } from "react";

import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function GroupsScreen() {

  const router = useRouter();

  const [groups, setGroups] =
    useState<any[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user)
        return;

      const { data } =
        await (supabase as any)
          .from(
            "group_members"
          )
          .select(`
            group_id,
            groups(*)
          `)
          .eq(
            "user_id",
            user.id
          );

      if (data) {
        setGroups(
          data.map(
            (x: any) =>
              x.groups
          )
        );
      }
    };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "#0f172a",
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection:
            "row",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 28,
            fontWeight:
              "bold",
          }}
        >
          Groups
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push(
              "/groups/create"
            )
          }
          style={{
            backgroundColor:
              "#22c55e",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "black",
              fontWeight:
                "bold",
            }}
          >
            + Create
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/groups/${item.id}`
              )
            }

            style={{
              backgroundColor:
                "#1e293b",
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
              flexDirection:
                "row",
              alignItems:
                "center",
            }}
          >
            {!!item.image_url && (
              <Image
                source={{
                  uri:
                    item.image_url,
                }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  marginRight: 14,
                }}
              />
            )}

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                  fontSize: 18,
                  fontWeight:
                    "bold",
                }}
              >
                {item.name}
              </Text>

              {!!item.description && (
                <Text
                  style={{
                    color:
                      "#94a3b8",
                    marginTop: 4,
                  }}
                  numberOfLines={
                    2
                  }
                >
                  {
                    item.description
                  }
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}