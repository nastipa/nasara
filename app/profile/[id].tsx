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

// ================= FAST CLOUDINARY IMAGE UPLOAD =================
async function uploadToCloudinary(file: any): Promise<string> {
  const CLOUD_NAME = "ajars"; // your Cloudinary cloud name
  const PRESET = "ajars_avatars"; // upload preset
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
        else resolve(data.secure_url + "?t=" + Date.now()); // cache bust
      } catch (e) {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network upload error"));
    xhr.send(formData);
  });
}

// ================= EDIT PROFILE COMPONENT =================
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

  // SAVE PROFILE
  const saveProfile = async () => {
    if (!userId) return;

    setSaving(true);

    let avatar_url = avatar;

    if (avatar && (avatar.startsWith("file") || avatar?.startsWith("blob"))) {
      try {
        const uploaded = await uploadToCloudinary(avatar);
        avatar_url = uploaded;
      } catch (e: any) {
        Alert.alert("Upload Error", e.message);
        setSaving(false);
        return;
      }
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