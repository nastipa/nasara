import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getOrCreateRoom } from "../lib/chat";
import { supabase } from "../lib/supabase";

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const myId = userData.user?.id;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", myId); // ❗ remove yourself

      setUsers(data || []);
      setLoading(false);
    };

    loadUsers();
  }, []);

  const startChat = async (otherUserId: string) => {
    const { data } = await supabase.auth.getUser();
    const myId = data.user?.id;

    if (!myId || !otherUserId || myId === otherUserId) return;

    const roomId = await getOrCreateRoom(myId, otherUserId);

    if (!roomId) return;

    router.push(`/chat/${roomId}`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          No users found
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => startChat(item.id)}
          style={{
            padding: 15,
            borderBottomWidth: 1,
            borderColor: "#eee",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {item.full_name || "User"}
          </Text>

          <Text style={{ color: "gray" }}>
            Tap to start chat
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}