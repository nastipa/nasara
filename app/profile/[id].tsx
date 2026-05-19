import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";


import {
  blockUser,
  isBlocked,
  unblockUser,
} from "../../lib/blockUser";

import { supabase } from "../../lib/supabase";
/* ================= CLOUDINARY ================= */
async function uploadToCloudinary(
  file: any
): Promise<string> {
  const CLOUD_NAME = "ajars";

  const PRESET = "ajars_avatars";

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();

  if (Platform.OS === "web") {
    formData.append("file", file);
  } else {
    formData.append(
      "file",
      {
        uri: file,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as any
    );
  }

  formData.append(
    "upload_preset",
    PRESET
  );

  return new Promise(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open("POST", url);

      xhr.onload = () => {
        try {
          const data = JSON.parse(
            xhr.response
          );

          if (!data.secure_url) {
            reject(
              new Error(
                "Upload failed"
              )
            );
          } else {
            resolve(
              data.secure_url +
                "?t=" +
                Date.now()
            );
          }
        } catch {
          reject(
            new Error(
              "Upload failed"
            )
          );
        }
      };

      xhr.onerror = () =>
        reject(
          new Error(
            "Network error"
          )
        );

      xhr.send(formData);
    }
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  const {
    id,
  } = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const profileId = Array.isArray(id)
  ? id[0]
  : id;
  const [
    sessionId,
    setSessionId,
  ] = useState<string | null>(
    null
  );

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [phone, setPhone] =
    useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [avatar, setAvatar] =
    useState<string | null>(
      null
    );

  const [
    verified,
    setVerified,
  ] = useState(false);

  const [
    verificationStatus,
    setVerificationStatus,
  ] = useState("none");

  const [isMe, setIsMe] =
    useState(false);

  const [
    isFollowing,
    setIsFollowing,
  ] = useState(false);

  const [blocked, setBlocked] =
    useState(false);
    useEffect(() => {
  const saveLocation = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const loc =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      await (supabase as any)
        .from("profiles")
        .update({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch (e) {
      console.log(e);
    }
  };

  saveLocation();
}, []);
    /* ================= TRACK PROFILE VIEW ================= */
async function trackProfileView(
  viewerId: string | null,
  targetId: string
) {
  try {
    /* DON'T COUNT SELF VIEW */
    const profileId =
  typeof id === "string"
    ? id
    : Array.isArray(id)
    ? id[0]
    : null;
    if (viewerId === targetId) return;

    /* CHECK EXISTING */
    const { data: existing } =
      await (supabase as any)
        .from("business_analytics")
        .select("id, profile_views")
        .eq("user_id", targetId)
        .maybeSingle();

    /* CREATE */
    if (!existing) {
      await (supabase as any)
        .from("business_analytics")
        .insert({
          user_id: targetId,
          profile_views: 1,
        });

      return;
    }

    /* UPDATE */
    await (supabase as any)
      .from("business_analytics")
      .update({
        profile_views:
          (existing.profile_views || 0) + 1,
      })
      .eq("user_id", targetId);

  } catch (e) {
    console.log(
      "Track profile error:",
      e
    );
  }
}

  /* ================= FOLLOW COUNTS ================= */
  const [
    followersCount,
    setFollowersCount,
  ] = useState(0);

  const [
    followingCount,
    setFollowingCount,
  ] = useState(0);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    const load = async () => {
      const { data } =
        await supabase.auth.getUser();

      const myId =
        data.user?.id ?? null;

      setSessionId(myId);
      

      const targetId =
        profileId ?? myId;
      const openProfileId =
  profileId || myId;

      if (!targetId) return;
      if (targetId && myId !== targetId) {
  trackProfileView(
    myId,
    targetId
  );
}

      setIsMe(
        myId === targetId
      );

      /* ================= PROFILE ================= */
      const {
        data: profile,
        error,
      } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();

      if (error) {
        console.log(
          "Profile error:",
          error.message
        );

        return;
      }

      if (profile) {
        setFullName(
          profile.full_name || ""
        );

        setPhone(
          profile.phone || ""
        );

        setLocation(
          profile.location || ""
        );

        setAvatar(
          profile.avatar_url ||
            null
        );

        setVerified(
          profile.verified ||
            false
        );

        setVerificationStatus(
          profile.verification_status ||
            "none"
        );
      }

      /* ================= FOLLOWERS ================= */
      const {
        count: followers,
      } = await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "following_id",
          targetId
        );

      setFollowersCount(
        followers || 0
      );

      /* ================= FOLLOWING ================= */
      const {
        count: following,
      } = await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "follower_id",
          targetId
        );

      setFollowingCount(
        following || 0
      );

      /* ================= FOLLOW CHECK ================= */
      if (
        myId &&
        targetId &&
        myId !== targetId
      ) {
        const { data } =
          await supabase
            .from("follows")
            .select("*")
            .eq(
              "follower_id",
              myId
            )
            .eq(
              "following_id",
              targetId
            )
            .maybeSingle();

        setIsFollowing(!!data);

        /* ================= BLOCK CHECK ================= */
        const result =
          await isBlocked(
            targetId
          );

        setBlocked(result);
      }
    };

    load();
  }, [profileId]);

  /* ================= FOLLOW USER ================= */
  const followUser =
    async () => {
      if (
        !sessionId ||
        !profileId
      )
        return;

      const { error } =
        await (supabase as any)
          .from("follows")
          .insert({
            follower_id:
              sessionId,

            following_id:
              profileId,
          });

      if (error) {
        Alert.alert(
          "Error",
          error.message
        );

        return;
      }

      setIsFollowing(true);

      setFollowersCount(
        (prev) => prev + 1
      );

      Alert.alert(
        "Followed"
      );
    };

  /* ================= UNFOLLOW ================= */
  const unfollowUser =
    async () => {
      if (
        !sessionId ||
        !profileId
      )
        return;

      const { error } =
        await supabase
          .from("follows")
          .delete()
          .eq(
            "follower_id",
            sessionId
          )
          .eq(
            "following_id",
            profileId
          );

      if (error) {
        Alert.alert(
          "Error",
          error.message
        );

        return;
      }

      setIsFollowing(false);

      setFollowersCount(
        (prev) =>
          prev > 0
            ? prev - 1
            : 0
      );
    };
const openExistingChat = async () => {
  if (!profileId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const myId = user.id;

  try {
    // 1. Get ALL rooms where I participate
    const { data: myRooms } = await (supabase as any)
      .from("chat_participants")
      .select("room_id")
      .eq("user_id", myId);

    const myRoomIds = (myRooms || []).map((r: any) => r.room_id);

    if (myRoomIds.length > 0) {
      // 2. Find shared room with other user
      const { data: shared } = await (supabase as any)
        .from("chat_participants")
        .select("room_id")
        .eq("user_id", profileId)
        .in("room_id", myRoomIds);

      if (shared?.length) {
        router.push(`/chat/${shared[0].room_id}`);
        return;
      }
    }

    // 3. ONLY create if absolutely no shared room exists
    const { data: room, error } = await (supabase as any)
      .from("chat_rooms")
      .insert({
        buyer_id: myId,
        seller_id: profileId,
        item_id: null,
      })
      .select("id")
      .single();

    if (error || !room) {
      console.log("create error:", error);
      return;
    }

    await (supabase as any)
      .from("chat_participants")
      .insert([
        { room_id: room.id, user_id: myId },
        { room_id: room.id, user_id: profileId },
      ]);

    router.push(`/chat/${room.id}`);
  } catch (e) {
    console.log("chat open error:", e);
  }
};
  /* ================= PICK IMAGE ================= */
  const pickAvatar =
    async () => {
      if (!isMe) return;

      const res =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes: [
              "images",
            ],
            quality: 0.7,
          }
        );

      if (!res.canceled) {
        setAvatar(
          res.assets[0].uri
        );
      }
    };

  /* ================= SAVE ================= */
  const saveProfile =
    async () => {
      if (
        !sessionId ||
        !isMe
      )
        return;

      let avatar_url =
        avatar;

      if (
        avatar &&
        (avatar.startsWith(
          "file"
        ) ||
          avatar.startsWith(
            "blob"
          ))
      ) {
        avatar_url =
          await uploadToCloudinary(
            avatar
          );
      }

      const { error } =
        await (supabase as any)
          .from("profiles")
          .upsert({
            id: sessionId,

            full_name:
              fullName,

            phone,

            location,

            avatar_url,
          });

      if (error) {
        Alert.alert(
          "Error",
          error.message
        );

        return;
      }

      router.back();
    };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={!isMe}
        onPress={pickAvatar}
      >
        <Image
          source={{
            uri:
              avatar ??
              "https://ui-avatars.com/api/?background=ccc&size=200",
          }}
          style={styles.avatar}
        />

        <Text
          style={
            styles.changeText
          }
        >
          {isMe
            ? "Change Avatar"
            : "Profile"}
        </Text>
      </TouchableOpacity>

     {/* ================= FOLLOW STATS ================= */}
<View
  style={{
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 30,
  }}
>
  {/* FOLLOWERS */}
  <TouchableOpacity
    onPress={() => {
      if (profileId) {
        router.push(
          `/followers?id=${profileId}`
        );
      }
    }}
    style={{
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontSize: 20,
        fontWeight: "bold",
      }}
    >
      {followersCount}
    </Text>

    <Text
      style={{
        color: "gray",
      }}
    >
      Followers
    </Text>
  </TouchableOpacity>

  {/* FOLLOWING */}
  <TouchableOpacity
    onPress={() => {
      if (profileId) {
        router.push(
          `/following?id=${profileId}`
        );
      }
    }}
    style={{
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontSize: 20,
        fontWeight: "bold",
      }}
    >
      {followingCount}
    </Text>

    <Text
      style={{
        color: "gray",
      }}
    >
      Following
    </Text>
  </TouchableOpacity>
</View>
      <View
        style={{
          flexDirection: "row",
          alignItems:
            "center",
          marginBottom: 10,
        }}
      >
        <View
          style={{ flex: 1 }}
        >
          <TextInput
            value={fullName}
            editable={isMe}
            style={
              styles.input
            }
          />
        </View>

        {verified && (
          <Text
            style={{
              marginLeft: 8,
              color:
                "#3b82f6",
              fontSize: 20,
              fontWeight:
                "bold",
            }}
          >
            ✓
          </Text>
        )}
      </View>

      {isMe ? (
  <TextInput
    value={phone}
    onChangeText={setPhone}
    editable={true}
    placeholder="Phone Number"
    keyboardType="phone-pad"
    style={styles.input}
  />
) : null}

      <TextInput
        value={location}
        editable={isMe}
        style={styles.input}
      />

      {/* ================= FOLLOW BUTTON ================= */}
      {!isMe &&
        sessionId &&
        profileId && (
          <TouchableOpacity
            onPress={
              isFollowing
                ? unfollowUser
                : followUser
            }
            style={{
              backgroundColor:
                isFollowing
                  ? "#ef4444"
                  : "#2563eb",

              padding: 12,

              borderRadius: 8,

              marginTop: 10,
            }}
          >
            <Text
              style={{
                color:
                  "white",

                textAlign:
                  "center",
              }}
            >
              {isFollowing
                ? "Unfollow"
                : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
       <TouchableOpacity onPress={openExistingChat}>
  <Text>Message</Text>
</TouchableOpacity>
      {/* ================= SAVE ================= */}
      {isMe && (
        <TouchableOpacity
          onPress={
            saveProfile
          }
        >
          <Text
            style={
              styles.saveBtn
            }
          >
            Save Profile
          </Text>
        </TouchableOpacity>
      )}

      {/* ================= REPORT ================= */}
      {!isMe && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname:
                "/report",

              params: {
                reportedUserId:
                  profileId,

                type: "user",
              },
            })
          }
          style={{
            marginTop: 12,

            backgroundColor:
              "#ef4444",

            padding: 10,

            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color:
                "white",

              textAlign:
                "center",
            }}
          >
            🚨 Report User
          </Text>
        </TouchableOpacity>
      )}

      {/* ================= BLOCK USER ================= */}
      {!isMe &&
        sessionId &&
        profileId && (
          <TouchableOpacity
            onPress={() => {
              if (
                !profileId
              )
                return;

              Alert.alert(
                blocked
                  ? "Unblock User"
                  : "Block User",

                blocked
                  ? "Are you sure you want to unblock this user?"
                  : "Are you sure you want to block this user?",

                [
                  {
                    text:
                      "Cancel",

                    style:
                      "cancel",
                  },

                  {
                    text:
                      blocked
                        ? "Unblock"
                        : "Block",

                    style:
                      "destructive",

                    onPress:
                      async () => {
                        try {
                          if (
                            !blocked
                          ) {
                            const {
                              error,
                            } =
                              await blockUser(
                                profileId
                              );

                            if (
                              error
                            )
                              throw new Error(
                                error
                              );

                            setBlocked(
                              true
                            );

                            Alert.alert(
                              "Success",
                              "User blocked 🚫"
                            );
                          } else {
                            const {
                              error,
                            } =
                              await unblockUser(
                                profileId
                              );

                            if (
                              error
                            )
                              throw new Error(
                                error
                              );

                            setBlocked(
                              false
                            );

                            Alert.alert(
                              "Success",
                              "User unblocked ✅"
                            );
                          }
                        } catch (
                          err: any
                        ) {
                          console.log(
                            "Block error:",
                            err
                          );

                          Alert.alert(
                            "Error",
                            err.message ||
                              "Something went wrong"
                          );
                        }
                      },
                  },
                ]
              );
            }}
            style={{
              marginTop: 10,

              backgroundColor:
                blocked
                  ? "#6b7280"
                  : "#111827",

              padding: 12,

              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color:
                  "white",

                textAlign:
                  "center",
              }}
            >
              {blocked
                ? "Unblock User"
                : "🚫 Block User"}
            </Text>
          </TouchableOpacity>
        )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 8,
  },

  changeText: {
    textAlign: "center",
    color: "#2563eb",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },

  saveBtn: {
    textAlign: "center",
    backgroundColor:
      "#16a34a",
    color: "white",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  
},
});