import {
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

export default function DiscoverScreen() {
  const router = useRouter();

  const [users, setUsers] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
  loadUsers();

  const channel = supabase
    .channel("discover-users")

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "profiles",
      },

      () => {
        loadUsers();
      }
    )

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
  const loadUsers = async () => {
  const { data, error } =
    await (supabase as any)
      .from("profiles")
      .select(
        `
        id,
        full_name,
        avatar_url,
        verified,
        created_at
      `
      )
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {
    console.log(error);
    return;
  }

  setUsers(data || []);
};

  const filtered =
    users.filter((u) =>
      (
        u.full_name || ""
      )
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "#fff",
        padding: 15,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        Discover Users
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search users..."
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(i) =>
          i.id
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/profile/${item.id}`
              )
            }
            style={{
              flexDirection:
                "row",

              alignItems:
                "center",

              marginBottom: 16,

              backgroundColor:
                "#f9fafb",

              padding: 12,

              borderRadius: 14,
            }}
          >
            <Image
              source={{
                uri:
                  item.avatar_url ||
                  "https://ui-avatars.com/api/?name=User",
              }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                marginRight: 12,
              }}
            />

            <View
              style={{
                flex: 1,
              }}
            >
              <View
                style={{
                  flexDirection:
                    "row",

                  alignItems:
                    "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,

                    fontWeight:
                      "bold",
                  }}
                >
                  {item.full_name ||
                    "User"}
                </Text>

                {item.verified && (
                  <Text
                    style={{
                      marginLeft: 6,
                      color:
                        "#2563eb",
                    }}
                  >
                    ✔️
                  </Text>
                )}
              </View>

              <Text
                style={{
                  color:
                    "#6b7280",
                  marginTop: 2,
                }}
              >
                View profile
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}