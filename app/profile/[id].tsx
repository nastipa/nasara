import * as ImagePicker from "expo-image-picker";
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
import { blockUser, isBlocked, unblockUser } from "../../lib/blockUser";
import { supabase } from "../../lib/supabase";

/* ================= CLOUDINARY ================= */
async function uploadToCloudinary(file: any): Promise<string> {
  const CLOUD_NAME = "ajars";
  const PRESET = "ajars_avatars";
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();

  if (Platform.OS === "web") {
    formData.append("file", file);
  } else {
    formData.append("file", {
      uri: file,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);
  }

  formData.append("upload_preset", PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.response);
        if (!data.secure_url) reject(new Error("Upload failed"));
        else resolve(data.secure_url + "?t=" + Date.now());
      } catch {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export default function ProfileScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(id) ? id[0] : id;

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const [isMe, setIsMe] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);

  /* ================= LOAD PROFILE ================= */
 useEffect(() => {
  const load = async () => {
    const { data } = await supabase.auth.getUser();
    const myId = data.user?.id ?? null;

    setSessionId(myId);

    // ✅ STRICT: ONLY fallback if no param
    const targetId = profileId ?? myId;

    if (!targetId) return;

    setIsMe(myId === targetId);

    const { data: profile, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();

    if (error) {
      console.log("Profile error:", error.message);
      return;
    }

    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setLocation(profile.location || "");
      setAvatar(profile.avatar_url || null);
    }

    // FOLLOW CHECK
    if (myId && targetId && myId !== targetId) {
      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", myId)
        .eq("following_id", targetId)
        .maybeSingle();

      setIsFollowing(!!data);
      // 🔥 BLOCK CHECK
if (myId && targetId && myId !== targetId) {
  const result = await isBlocked(targetId);
  setBlocked(result);
}
    }
  };

  load();
}, [profileId]);


  /* ================= FOLLOW USER ================= */
  const followUser = async () => {
    if (!sessionId || !profileId) return;

    const { error } = await (supabase as any).from("follows").insert({
      follower_id: sessionId,
      following_id: profileId,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setIsFollowing(true);
    Alert.alert("Followed");
  };

  /* ================= UNFOLLOW ================= */
  const unfollowUser = async () => {
    if (!sessionId || !profileId) return;

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", sessionId)
      .eq("following_id", profileId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setIsFollowing(false);
  };

  /* ================= PICK IMAGE ================= */
  const pickAvatar = async () => {
    if (!isMe) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!res.canceled) {
      setAvatar(res.assets[0].uri);
    }
  };

  /* ================= SAVE ================= */
  const saveProfile = async () => {
    if (!sessionId || !isMe) return;

    let avatar_url = avatar;

    if (avatar && (avatar.startsWith("file") || avatar.startsWith("blob"))) {
      avatar_url = await uploadToCloudinary(avatar);
    }

    const { error } = await (supabase as any).from("profiles").upsert({
      id: sessionId,
      full_name: fullName,
      phone,
      location,
      avatar_url,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.back();
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <TouchableOpacity disabled={!isMe} onPress={pickAvatar}>
        <Image
          source={{
            uri:
              avatar ??
              "https://ui-avatars.com/api/?background=ccc&size=200",
          }}
          style={styles.avatar}
        />
        <Text style={styles.changeText}>
          {isMe ? "Change Avatar" : "Profile"}
        </Text>
      </TouchableOpacity>

      <TextInput value={fullName} editable={isMe} style={styles.input} />
      <TextInput value={phone} editable={isMe} style={styles.input} />
      <TextInput value={location} editable={isMe} style={styles.input} />

      {/* ================= FOLLOW BUTTON ================= */}
      {!isMe && sessionId && profileId && (
        <TouchableOpacity
          onPress={isFollowing ? unfollowUser : followUser}
          style={{
            backgroundColor: isFollowing ? "#ef4444" : "#2563eb",
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {isFollowing ? "Unfollow" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}

      {/* ================= SAVE ================= */}
      {isMe && (
        <TouchableOpacity onPress={saveProfile}>
          <Text style={styles.saveBtn}>Save Profile</Text>
        </TouchableOpacity>
      )}

      {/* ================= REPORT ================= */}
      {!isMe && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/report",
              params: {
                reportedUserId: profileId,
                type: "user",
              },
            })
          }
          style={{
            marginTop: 12,
            backgroundColor: "#ef4444",
            padding: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            🚨 Report User
          </Text>
        </TouchableOpacity>
      )}
      {/* ================= BLOCK USER ================= */}
{!isMe && sessionId && profileId && (
  <TouchableOpacity
    onPress={() => {
  if (!profileId) return;

  Alert.alert(
    blocked ? "Unblock User" : "Block User",
    blocked
      ? "Are you sure you want to unblock this user?"
      : "Are you sure you want to block this user?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: blocked ? "Unblock" : "Block",
        style: "destructive",
        onPress: async () => {
          try {
            if (!blocked) {
              const { error } = await blockUser(profileId);

              if (error) throw new Error(error);

              setBlocked(true);
              Alert.alert("Success", "User blocked 🚫");
            } else {
              const { error } = await unblockUser(profileId);

              if (error) throw new Error(error);

              setBlocked(false);
              Alert.alert("Success", "User unblocked ✅");
            }
          } catch (err: any) {
            console.log("Block error:", err);
            Alert.alert("Error", err.message || "Something went wrong");
          }
        },
      },
    ]
  );
}}
    style={{
      marginTop: 10,
      backgroundColor: blocked ? "#6b7280" : "#111827",
      padding: 12,
      borderRadius: 8,
    }}
  >
    <Text style={{ color: "white", textAlign: "center" }}>
      {blocked ? "Unblock User" : "🚫 Block User"}
    </Text>
  </TouchableOpacity>
)}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

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
    backgroundColor: "#16a34a",
    color: "white",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
});