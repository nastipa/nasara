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

import { startChat } from "../lib/startChat";
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
            "id, full_name, avatar_url"
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
          <View
            style={{
              flexDirection:
                "row",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom: 15,
            }}
          >
           <TouchableOpacity
  onPress={async () => {
    const roomId = await startChat(item.id);

    if (roomId) {
      router.push(`/chat/${roomId}`);
    }
  }}
              style={{
                flexDirection:
                  "row",
                alignItems:
                  "center",
                flex: 1,
              }}
            >
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    "https://ui-avatars.com/api/?name=User",
                }}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  marginRight: 10,
                }}
              />

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
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                const roomId =
                  await startChat(
                    item.id
                  );

                if (
                  roomId
                ) {
                  router.push(
                    `/chat/${roomId}`
                  );
                }
              }}
              style={{
                backgroundColor:
                  "#2563eb",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                  fontSize: 12,
                }}
              >
                Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}