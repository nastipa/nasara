import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAdmin } from "../../hooks/useAdmin";
import { supabase } from "../../lib/supabase";

/* ================= CLOUDINARY ================= */
const CLOUD_NAME = "nasara123";
const UPLOAD_PRESET_IMAGES = "nasara_images";

export default function AdminBarnScreen() {
  const router = useRouter();
  const isAdmin = useAdmin();

  const [loading, setLoading] = useState(true);
  const [barn, setBarn] = useState<any[]>([]);

  /* ================= LOAD ALL BARN POSTS ================= */
  const loadBarn = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("barn")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Error loading barn", error.message);
        setBarn([]);
      } else {
        setBarn(data || []);
      }
    } catch (err: any) {
      Alert.alert("Unexpected error", err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE BARN POST ================= */
  const deleteBarnPost = async (post: any) => {
    Alert.alert(
      "Delete Barn Listing",
      "Are you sure you want to permanently delete this barn post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              /* CLOUDINARY: image_url already contains Cloudinary URL */
              /* No storage deletion required */

              /* DELETE FROM DATABASE */
              const { error } = await supabase
                .from("barn")
                .delete()
                .eq("id", post.id);

              if (error) {
                Alert.alert("Delete failed", error.message);
                return;
              }

              /* UPDATE UI */
              setBarn((prev) => prev.filter((x) => x.id !== post.id));

              Alert.alert("Deleted", "Barn listing removed successfully");
            } catch (err: any) {
              Alert.alert("Unexpected error", err.message);
            }
          },
        },
      ]
    );
  };

  /* ================= RUN ON OPEN ================= */
  useEffect(() => {
    if (isAdmin) {
      loadBarn();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  /* ================= GUARDS ================= */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return <Text style={{ margin: 20 }}>Not authorized</Text>;
  }

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={barn}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No barn listings found
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderColor: "#ddd",
            }}
          >
            {/* IMAGE */}
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={{
                  height: 160,
                  borderRadius: 10,
                  backgroundColor: "#eee",
                }}
              />
            ) : (
              <Text>No image</Text>
            )}

            {/* TITLE */}
            <Text style={{ fontWeight: "bold", fontSize: 16, marginTop: 8 }}>
              {item.title}
            </Text>

            {/* DELETE BUTTON */}
            <TouchableOpacity
              onPress={() => deleteBarnPost(item)}
              style={{
                backgroundColor: "#dc2626",
                padding: 12,
                marginTop: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Delete Barn Post
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.replace("/(admin)")}
        style={{
          padding: 14,
          backgroundColor: "#111827",
          margin: 12,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Back to Admin Dashboard
        </Text>
      </TouchableOpacity>
    </View>
  );
}