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

  const [userId, setUserId] =
    useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {

    const { data: auth } =
      await (supabase as any)
        .auth.getUser();

    if (!auth.user) return;

    setUserId(auth.user.id);

    const { data: memberships } =
      await (supabase as any)
        .from("group_members")
        .select("group_id")
        .eq("user_id", auth.user.id);

    if (!memberships) return;

    const ids =
      memberships.map(
        (m: any) => m.group_id
      );

    if (ids.length === 0) {
      setGroups([]);
      return;
    }

    const { data } =
      await (supabase as any)
        .from("groups")
        .select("*")
        .in("id", ids)
        .order("created_at", {
          ascending: false,
        });

    if (data) {
      setGroups(data);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
        padding: 20,
      }}
    >
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: "bold",
          }}
        >
          Groups
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push("/groups/create")
          }
          style={{
            backgroundColor: "#22c55e",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              color: "black",
              fontWeight: "bold",
            }}
          >
            + Create
          </Text>
        </TouchableOpacity>
      </View>

      {/* GROUPS */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname:
                  "/groups/chat",
                params: {
                  id: item.id,
                },
              })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1f2937",
              padding: 14,
              borderRadius: 16,
              marginBottom: 12,
            }}
          >
            {item.image_url ? (
              <Image
                source={{
                  uri: item.image_url,
                }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  marginRight: 14,
                }}
              />
            ) : (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: "#374151",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 24,
                  }}
                >
                  👥
                </Text>
              </View>
            )}

            <View>
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                {item.name}
              </Text>

              <Text
                style={{
                  color: "#9ca3af",
                  marginTop: 4,
                }}
              >
                Group Chat
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}