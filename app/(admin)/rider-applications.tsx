import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function RiderApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  /* ================= LOAD ================= */

  async function loadApplications() {
    try {
      const { data, error } = await (supabase as any)
        .from("rider_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        Alert.alert("Load Error", error.message);
        setLoading(false);
        return;
      }

      setApplications(data || []);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  /* ================= APPROVE ================= */

  async function approveRider(application: any) {
    if (processingId) return;

    try {
      setProcessingId(application.id);

      /* approve application */

      const { error: appError } = await (supabase as any)
        .from("rider_applications")
        .update({
          status: "approved",
        })
        .eq("id", application.id);

      if (appError) {
        Alert.alert("Approval Error", appError.message);
        setProcessingId("");
        return;
      }

      /* check existing rider */

      const { data: existingRider } = await (supabase as any)
        .from("riders")
        .select("id")
        .eq("user_id", application.user_id)
        .maybeSingle();

      /* create rider */

      if (!existingRider) {
        const { error: riderError } = await (supabase as any)
          .from("riders")
          .insert({
            user_id: application.user_id,
            full_name: application.full_name,
            phone: application.phone,
            national_id: application.ghana_card,
            bike_number: application.bike_type,
            approved: true,
            is_verified: true,
            is_online: false,
            online: false,
            total_earnings: 0,
            total_deliveries: 0,
          });

        if (riderError) {
          console.log("RIDER INSERT ERROR:", riderError);
          Alert.alert("Rider Creation Error", riderError.message);
          setProcessingId("");
          return;
        }
      }

      /* notification */

      await (supabase as any)
        .from("notifications")
        .insert({
          user_id: application.user_id,
          type: "rider",
          title: "Rider Approved",
          body: "Your rider application has been approved.",
          read: false,
        });

      /* remove from ui */

      setApplications((prev) =>
        prev.filter((item) => item.id !== application.id)
      );

      await loadApplications();

      Alert.alert("Success", "Rider approved successfully");
    } catch (err: any) {
      console.log(err);
      Alert.alert("Error", err?.message);
    }

    setProcessingId("");
  }

  /* ================= REJECT ================= */

  async function rejectRider(application: any) {
    if (processingId) return;

    try {
      setProcessingId(application.id);

      const { error } = await (supabase as any)
        .from("rider_applications")
        .update({
          status: "rejected",
        })
        .eq("id", application.id);

      if (error) {
        Alert.alert("Reject Error", error.message);
        setProcessingId("");
        return;
      }

      await (supabase as any)
        .from("notifications")
        .insert({
          user_id: application.user_id,
          type: "rider",
          title: "Application Rejected",
          body: "Your rider application was rejected.",
          read: false,
        });

      Alert.alert("Rejected");

      loadApplications();
    } catch (err: any) {
      console.log(err);
    }

    setProcessingId("");
  }

  /* ================= INITIAL ================= */

  useEffect(() => {
    loadApplications();
  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {
    const channel = (supabase as any)
      .channel("rider-applications-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rider_applications",
        },
        () => {
          loadApplications();
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        size="large"
      />
    );
  }

  /* ================= UI ================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
        padding: 15,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        🚚 Rider Applications
      </Text>

      {applications.length === 0 && (
        <View
          style={{
            marginTop: 60,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#cbd5e1",
              fontSize: 16,
            }}
          >
            No rider applications found
          </Text>
        </View>
      )}

      <FlatList
        data={applications}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#1e293b",
              padding: 18,
              borderRadius: 14,
              marginBottom: 15,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              {item.full_name}
            </Text>

            <Text style={{ color: "#cbd5e1", marginTop: 5 }}>
              📞 {item.phone}
            </Text>

            <Text style={{ color: "#cbd5e1", marginTop: 5 }}>
              🪪 {item.ghana_card}
            </Text>

            <Text style={{ color: "#cbd5e1", marginTop: 5 }}>
              🏍️ {item.bike_type}
            </Text>

            <Text style={{ color: "#cbd5e1", marginTop: 5 }}>
              👤 MOMO Name: {item.momo_name}
            </Text>

            <Text style={{ color: "#cbd5e1", marginTop: 5 }}>
              💳 MOMO Number: {item.momo_number}
            </Text>

            <Text style={{ color: "#cbd5e1", marginTop: 5 }}>
              📡 Network: {item.network}
            </Text>

            <Text
              style={{
                color:
                  item.status === "approved"
                    ? "#22c55e"
                    : item.status === "rejected"
                    ? "#ef4444"
                    : "#facc15",
                marginTop: 10,
                fontWeight: "bold",
              }}
            >
              {item.status}
            </Text>

            {item.status === "pending" && (
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 15,
                }}
              >
                <TouchableOpacity
                  disabled={processingId === item.id}
                  onPress={() => approveRider(item)}
                  style={{
                    backgroundColor: "#16a34a",
                    padding: 12,
                    borderRadius: 10,
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    Approve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={processingId === item.id}
                  onPress={() => rejectRider(item)}
                  style={{
                    backgroundColor: "#dc2626",
                    padding: 12,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}