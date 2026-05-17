import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function FollowersScreen() {
  const router = useRouter();

  const { id } =
    useLocalSearchParams();

  const [users, setUsers] =
    useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadFollowers();
    }
  }, [id]);

  const loadFollowers =
    async () => {
      try {
        const {
          data: followRows,
          error,
        } = await supabase
          .from("follows")
          .select(
            "follower_id"
          )
          .eq(
            "following_id",
            String(id)
          );

        if (error) {
          console.log(
            error
          );
          return;
        }

        const ids =
          (followRows || []).map(
            (x: any) =>
              x.follower_id
          );

        if (
          ids.length === 0
        ) {
          setUsers([]);
          return;
        }

        const {
          data: profiles,
          error:
            profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, verified"
          )
          .in("id", ids);

        if (
          profileError
        ) {
          console.log(
            profileError
          );
          return;
        }

        setUsers(
          profiles || []
        );
      } catch (e) {
        console.log(e);
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
      <FlatList
        data={users}
        keyExtractor={(i) =>
          i.id
        }
        ListEmptyComponent={
          <Text>
            No followers
          </Text>
        }
        renderItem={({
          item,
        }) => (
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

              marginBottom: 15,

              backgroundColor:
                "#f9fafb",

              padding: 12,

              borderRadius: 12,
            }}
          >
            <Image
              source={{
                uri:
                  item.avatar_url ||
                  "https://ui-avatars.com/api/?name=User",
              }}
              style={{
                width: 55,
                height: 55,
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

                      fontWeight:
                        "bold",
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
                View Profile
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}