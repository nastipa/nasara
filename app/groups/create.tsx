import { useEffect, useState } from "react";

import {
    FlatList,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function CreateGroup() {

  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);

  const [selected, setSelected] =
    useState<string[]>([]);

  const [groupName, setGroupName] =
    useState("");

  const [image, setImage] =
    useState<string | null>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {

    const { data: auth } =
      await (supabase as any)
        .auth.getUser();

    if (!auth.user) return;

    setUserId(auth.user.id);

    const { data } =
      await (supabase as any)
        .from("profiles")
        .select("*")
        .neq("id", auth.user.id);

    if (data) {
      setUsers(data);
    }
  };

  const pickImage = async () => {

    const res =
      await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
      });

    if (!res.canceled) {
      setImage(
        res.assets[0].uri
      );
    }
  };

  const createGroup = async () => {

    if (!groupName || !userId) return;

    const { data: group, error } =
      await (supabase as any)
        .from("groups")
        .insert({
          name: groupName,
          image_url: image,
          owner_id: userId,
        })
        .select()
        .single();

    if (error || !group) {
      console.log(error);
      return;
    }

    /* OWNER */
    await (supabase as any)
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: userId,
        role: "owner",
      });

    /* MEMBERS */
    for (const memberId of selected) {

      await (supabase as any)
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: memberId,
        });
    }

    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
        padding: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Create Group
      </Text>

      <TouchableOpacity
        onPress={pickImage}
        style={{
          alignSelf: "center",
          marginBottom: 20,
        }}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
            }}
          />
        ) : (
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#1f2937",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 30,
              }}
            >
              📷
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Group name"
        placeholderTextColor="#9ca3af"
        style={{
          backgroundColor: "#1f2937",
          color: "white",
          padding: 14,
          borderRadius: 14,
          marginBottom: 20,
        }}
      />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {

          const active =
            selected.includes(item.id);

          return (
            <TouchableOpacity
              onPress={() => {

                if (active) {

                  setSelected((prev) =>
                    prev.filter(
                      (x) => x !== item.id
                    )
                  );

                } else {

                  setSelected((prev) => [
                    ...prev,
                    item.id,
                  ]);
                }
              }}
              style={{
                backgroundColor: active
                  ? "#22c55e"
                  : "#1f2937",
                padding: 14,
                borderRadius: 14,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: active
                    ? "black"
                    : "white",
                }}
              >
                {item.full_name || "User"}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        onPress={createGroup}
        style={{
          backgroundColor: "#22c55e",
          padding: 16,
          borderRadius: 16,
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "black",
            fontWeight: "bold",
          }}
        >
          Create Group
        </Text>
      </TouchableOpacity>
    </View>
  );
}