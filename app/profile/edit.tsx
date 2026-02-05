import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import { supabase } from "../../lib/supabase";

export default function EditProfile() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // LOAD USER + PROFILE
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (!uid) return;

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setLocation(profile.location || "");
        setAvatar(profile.avatar_url || null);
      }
    };

    load();
  }, []);

  // PICK IMAGE
  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: Platform.OS === "web",
    });

    if (!res.canceled) {
      setAvatar(res.assets[0].uri);
    }
  };

  // UPLOAD IMAGE (WEB + MOBILE SAFE)
  const uploadAvatar = async (uri: string) => {
    if (!userId) return null;

    const fileName = "avatar_" + userId + ".jpg";

    let fileBody: any;

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      fileBody = blob;
    } else {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      fileBody = arrayBuffer;
    }

    await supabase.storage.from("avatars").upload(fileName, fileBody, {
      contentType: "image/jpeg",
      upsert: true,
    });

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // 🔥 cache bust so avatar refreshes
    return data.publicUrl + "?t=" + Date.now();
  };

  // SAVE PROFILE
  const saveProfile = async () => {
    if (!userId) return;

    setSaving(true);

    let avatar_url = avatar;

    if (avatar && avatar.startsWith("file") || avatar?.startsWith("blob")) {
      const uploaded = await uploadAvatar(avatar);
      avatar_url = uploaded;
    }

    const { error } = await (supabase as any).from("profiles").upsert({
      id: userId,
      full_name: fullName,
      phone,
      location,
      avatar_url,
    });

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // GO BACK TO PROFILE
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* AVATAR */}
      <TouchableOpacity onPress={pickAvatar}>
        <Image
          source={{
            uri:
              avatar ??
              "https://ui-avatars.com/api/?background=ccc&size=200",
          }}
          style={styles.avatar}
        />
        <Text style={styles.changeText}>Change Avatar</Text>
      </TouchableOpacity>

      {/* INPUTS */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />

      <Text style={styles.label}>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} style={styles.input} />

      <Text style={styles.label}>Location</Text>
      <TextInput value={location} onChangeText={setLocation} style={styles.input} />

      <TouchableOpacity onPress={saveProfile} disabled={saving}>
        <Text style={styles.saveBtn}>
          {saving ? "Saving..." : "Save Profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

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

  label: { fontWeight: "600", marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },

  saveBtn: {
    textAlign: "center",
    color: "white",
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 8,
    fontWeight: "600",
  },
});