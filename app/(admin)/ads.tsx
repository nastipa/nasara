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

import { supabase } from "../../lib/supabase";
import { useAdmin } from "../../lib/useAdmin";
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};


export default function AdsAdmin() {
  const router = useRouter();
  const isAdmin = useAdmin();

  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  /* ================= LOAD PENDING ADS ================= */
  const loadAds = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("LOAD ADS ERROR:", error.message);
      Alert.alert("Error loading ads", error.message);
      setAds([]);
    } else {
      setAds(data || []);
    }

    setLoading(false);
  };

  /* ================= RUN ON OPEN ================= */
  useEffect(() => {
    if (isAdmin) {
      loadAds();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  /* ================= APPROVE AD ================= */
  const approveAd = async (ad: any) => {
    if (approvingId === ad.id) return;

    setApprovingId(ad.id);

    try {
      console.log("APPROVING AD:", ad.id);

      /* ✅ FIX: ALWAYS VALID DAYS */
      const totalDays = Number(ad.days) > 0 ? Number(ad.days) : 1;

      /* ✅ FIX: SET START + END DATES PROPERLY */
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + totalDays);

      console.log("START:", start.toISOString());
      console.log("END:", end.toISOString());

      /* ✅ UPDATE AD PROPERLY */
      const { data, error } = await (supabase as any)
        .from("ads")
        .update({
          status: "active",

          // REQUIRED FOR BROWSE
          is_active: true,

          // REQUIRED FOR FEED QUERY
          position: "feed",

          // REQUIRED FOR DATE FILTERS
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),

           // ✅ ADD THIS
         approved_at: new Date().toISOString(),
        })
        .eq("id", ad.id)
        .select()
        .single();

      if (error) {
        console.log("APPROVE ERROR FULL:", error);
        showAlert("Approval failed", error.message);
        setApprovingId(null);
        return;
      }

      console.log("APPROVED RESULT:", data);

      /* ✅ Notify user */
      await (supabase as any).from("notifications").insert({
        user_id: ad.user_id,
        message: "Your ad has been approved and is now live 🎉",
      });

      showAlert("Approved!", "Ad is now active");

      /* ✅ Remove instantly from UI */
      setAds((prev) => prev.filter((x) => x.id !== ad.id));
    } catch (e: any) {
      console.log("UNEXPECTED APPROVE ERROR:", e.message);
      showAlert("Unexpected error", e.message);
    }

    setApprovingId(null);
  };

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
        data={ads}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No pending ads 🎉
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
                source={{ uri: item.image_url + "?t=" + Date.now() }}
                style={{
                  height: 160,
                  borderRadius: 8,
                  backgroundColor: "#eee",
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ marginBottom: 8 }}>No image uploaded</Text>
            )}

            {/* TITLE */}
            <Text style={{ marginTop: 8, fontWeight: "bold", fontSize: 16 }}>
              {item.title}
            </Text>

            <Text>Days: {item.days}</Text>
            <Text>Amount: {item.amount} GHS</Text>

            {/* APPROVE BUTTON */}
            <TouchableOpacity
              onPress={() => approveAd(item)}
              disabled={approvingId === item.id}
              style={{
                backgroundColor:
                  approvingId === item.id ? "#9ca3af" : "green",
                padding: 12,
                marginTop: 10,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                {approvingId === item.id ? "Approving..." : "Approve Ad"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* BACK */}
      <TouchableOpacity
        onPress={() => router.replace("/(admin)")}
        style={{
          padding: 14,
          backgroundColor: "#111827",
          margin: 12,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Back to Admin Dashboard
        </Text>
      </TouchableOpacity>
    </View>
  );
}