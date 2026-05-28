import * as ImagePicker from "expo-image-picker";

import { useRouter } from "expo-router";

import {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  FlatList,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";

type User = {
  id: string;
  full_name: string;
  avatar_url?: string;
  username?: string;
};

export default function CreateGroup() {
  const router = useRouter();

  const [groupName, setGroupName] =
    useState("");

  const [groupImage, setGroupImage] =
    useState("");

  const [loading, setLoading] =
    useState(false);
    const [
  loadingUsers,
  setLoadingUsers,
] = useState(false);

  const [tab, setTab] =
    useState<
      "followers" | "discover"
    >("followers");

  const [followers, setFollowers] =
    useState<User[]>([]);

  const [discoverUsers, setDiscoverUsers] =
    useState<User[]>([]);

const [
  currentUserId,
  setCurrentUserId,
] = useState<string | null>(null);

  const [selectedUsers, setSelectedUsers] =
    useState<string[]>([]);

  const [userId, setUserId] =
    useState("");

  /* ================= LOAD USERS ================= */
useEffect(() => {
  loadUsers();
}, []);

const loadUsers = async () => {
  try {
    setLoadingUsers(true);

    /* CURRENT USER */
    const {
      data: { user },
    } = await (supabase as any).auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);

    /* ================= FOLLOWERS ================= */
    const { data: followerRows } = await (supabase as any)
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id);

    const followerIds =
      followerRows?.map(
        (x: any) => x.follower_id
      ) || [];

    if (followerIds.length > 0) {
      const { data: followerProfiles } =
        await (supabase as any)
          .from("profiles")
          .select(
            "id, full_name, username, avatar_url, verified"
          )
          .in("id", followerIds)
          .order("full_name", {
            ascending: true,
          });

      setFollowers(
        followerProfiles || []
      );
    } else {
      setFollowers([]);
    }

    /* ================= DISCOVER USERS ================= */
    const { data: discoverProfiles, error } =
      await (supabase as any)
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, verified"
        )
        .neq("id", user.id)
        .order("full_name", {
          ascending: true,
        })
        .limit(200);

    if (error) {
      console.log(
        "discover users error:",
        error
      );
    }

    setDiscoverUsers(
      discoverProfiles || []
    );
  } catch (e) {
    console.log(
      "loadUsers error:",
      e
    );
  } finally {
    setLoadingUsers(false);
  }
};
  /* ================= PICK IMAGE ================= */
  const pickImage =
    async () => {
      const res =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            quality: 0.8,
          }
        );

      if (
        res.canceled
      )
        return;

      setGroupImage(
        res.assets[0].uri
      );
    };

  /* ================= UPLOAD ================= */
  const uploadToServer =
    async (
      uri: string,
      fileName?: string
    ) => {
      const formData =
        new FormData();

      const ext =
        fileName
          ?.split(".")
          .pop() ||
        "jpg";

      let type =
        "image/jpeg";

      if (
        ext === "png"
      ) {
        type =
          "image/png";
      }

      if (
        Platform.OS ===
        "web"
      ) {
        const response =
          await fetch(
            uri
          );

        const blob =
          await response.blob();

        formData.append(
          "file",
          blob,
          fileName ||
            `group-${Date.now()}.${ext}`
        );
      } else {
        formData.append(
          "file",
          {
            uri,
            name:
              fileName ||
              `group-${Date.now()}.${ext}`,
            type,
          } as any
        );
      }

      const res =
        await fetch(
          "https://nasara-upload-server.onrender.com/upload",
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const result =
        await res.json();

      let url =
        result?.url ||
        result?.file ||
        result?.path;

      if (!url) {
        throw new Error(
          "Upload failed"
        );
      }

      if (
        !url.startsWith(
          "http"
        )
      ) {
        url =
          `https://nasara-upload-server.onrender.com/${url}`;
      }

      return url;
    };

  /* ================= SELECT USER ================= */
  const toggleUser =
    (
      id: string
    ) => {
      setSelectedUsers(
        (prev) => {
          if (
            prev.includes(
              id
            )
          ) {
            return prev.filter(
              (x) =>
                x !== id
            );
          }

          return [
            ...prev,
            id,
          ];
        }
      );
    };

  /* ================= CREATE GROUP ================= */
  const createGroup =
    async () => {
      if (
        !groupName.trim()
      ) {
        Alert.alert(
          "Enter group name"
        );

        return;
      }

      try {
        setLoading(true);

        let imageUrl =
          "";

        /* ================= UPLOAD IMAGE ================= */
        if (
          groupImage
        ) {
          imageUrl =
            await uploadToServer(
              groupImage
            );
        }

        /* ================= CREATE GROUP ================= */
        const {
          data,
          error,
        } = await (
          supabase as any
        )
          .from("groups")
          .insert({
            name:
              groupName,
            image_url:
              imageUrl,
            owner_id:
              userId,
          })
          .select()
          .single();

        if (error)
          throw error;

        /* ================= MEMBERS ================= */
        const members =
          [
            {
              group_id:
                data.id,
              user_id:
                userId,
              role:
                "admin",
            },

            ...selectedUsers.map(
              (id) => ({
                group_id:
                  data.id,
                user_id:
                  id,
                role:
                  "member",
              })
            ),
          ];

        await (
          supabase as any
        )
          .from(
            "group_members"
          )
          .insert(
            members
          );

        Alert.alert(
          "Success",
          "Group created"
        );

        router.back();
      } catch (e: any) {
        console.log(e);

        Alert.alert(
          "Error",
          e.message ||
            "Failed to create group"
        );
      } finally {
        setLoading(false);
      }
    };

  const users =
    tab ===
    "followers"
      ? followers
      : discoverUsers;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor:
          "#0f172a",
      }}
    >
      <FlatList
        data={users}
        keyExtractor={(
          item
        ) => item.id}
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <View
              style={{
                padding: 20,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                  fontSize: 24,
                  fontWeight:
                    "bold",
                  marginBottom: 20,
                }}
              >
                Create Group
              </Text>

              {/* IMAGE */}
              <TouchableOpacity
                onPress={
                  pickImage
                }
                style={{
                  alignSelf:
                    "center",
                  marginBottom: 20,
                }}
              >
                {groupImage ? (
                  <Image
                    source={{
                      uri:
                        groupImage,
                    }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor:
                        "#1f2937",
                      justifyContent:
                        "center",
                      alignItems:
                        "center",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "white",
                        fontSize: 40,
                      }}
                    >
                      👥
                    </Text>
                  </View>
                )}

                <Text
                  style={{
                    color:
                      "#22c55e",
                    marginTop: 10,
                    textAlign:
                      "center",
                  }}
                >
                  Pick Group Image
                </Text>
              </TouchableOpacity>

              {/* GROUP NAME */}
              <TextInput
                value={
                  groupName
                }
                onChangeText={
                  setGroupName
                }
                placeholder="Group name"
                placeholderTextColor="#9ca3af"
                style={{
                  backgroundColor:
                    "#1f2937",
                  color:
                    "white",
                  padding: 15,
                  borderRadius: 14,
                  marginBottom: 20,
                }}
              />

              {/* TABS */}
              <View
                style={{
                  flexDirection:
                    "row",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setTab(
                      "followers"
                    )
                  }
                  style={{
                    flex: 1,
                    backgroundColor:
                      tab ===
                      "followers"
                        ? "#22c55e"
                        : "#1f2937",
                    padding: 12,
                    borderRadius: 12,
                    marginRight: 8,
                    alignItems:
                      "center",
                  }}
                >
                  <Text
                    style={{
                      color:
                        tab ===
                        "followers"
                          ? "black"
                          : "white",
                      fontWeight:
                        "bold",
                    }}
                  >
                    Followers
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    setTab(
                      "discover"
                    )
                  }
                  style={{
                    flex: 1,
                    backgroundColor:
                      tab ===
                      "discover"
                        ? "#22c55e"
                        : "#1f2937",
                    padding: 12,
                    borderRadius: 12,
                    alignItems:
                      "center",
                  }}
                >
                  <Text
                    style={{
                      color:
                        tab ===
                        "discover"
                          ? "black"
                          : "white",
                      fontWeight:
                        "bold",
                    }}
                  >
                    Discover Users
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SELECTED */}
              <Text
                style={{
                  color:
                    "#22c55e",
                  marginBottom: 10,
                }}
              >
                Selected:
                {" "}
                {
                  selectedUsers.length
                }
              </Text>
            </View>
          </>
        }
        renderItem={({
          item,
        }) => {
          const selected =
            selectedUsers.includes(
              item.id
            );

          return (
            <TouchableOpacity
              onPress={() =>
                toggleUser(
                  item.id
                )
              }
              style={{
                flexDirection:
                  "row",
                alignItems:
                  "center",
                backgroundColor:
                  selected
                    ? "#14532d"
                    : "#1f2937",
                marginHorizontal: 20,
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
              }}
            >
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    "https://placehold.co/100x100",
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
                <Text
                  style={{
                    color:
                      "white",
                    fontWeight:
                      "bold",
                    fontSize: 16,
                  }}
                >
                  {item.full_name ||
                    "User"}
                </Text>

                <Text
                  style={{
                    color:
                      "#9ca3af",
                    marginTop: 2,
                  }}
                >
                  @
                  {item.username ||
                    "user"}
                </Text>
              </View>

              <Text
                style={{
                  color:
                    selected
                      ? "#22c55e"
                      : "white",
                  fontSize: 22,
                }}
              >
                {selected
                  ? "✓"
                  : "+"}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity
            onPress={
              createGroup
            }
            disabled={
              loading
            }
            style={{
              backgroundColor:
                "#22c55e",
              margin: 20,
              padding: 16,
              borderRadius: 16,
              alignItems:
                "center",
              marginBottom: 40,
            }}
          >
            <Text
              style={{
                color:
                  "black",
                fontWeight:
                  "bold",
                fontSize: 16,
              }}
            >
              {loading
                ? "Creating..."
                : "Create Group"}
            </Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}