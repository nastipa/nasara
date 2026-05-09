import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type UserVerification = {
  id: string;
  username?: string;
  verification_status: string;
  verification_document: string;
  payment_status?: string;
  payment_reference?: string;
};

export default function VerificationsPage() {
  const [users, setUsers] = useState<UserVerification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPending();
  }, []);

  /* ================= LOAD ================= */
  const loadPending = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, verification_status, verification_document, payment_status, payment_reference"
      )
      .eq("verification_status", "pending")
      .order("verification_submitted_at", {
        ascending: false,
      });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  /* ================= APPROVE ================= */
  const approveUser = async (user: UserVerification) => {
    // 🔒 BLOCK IF NOT PAID
    if (user.payment_status !== "paid") {
      Alert.alert("Error", "User has not paid");
      return;
    }

    // ⏳ SET 30 DAYS EXPIRY
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        verified: true,
        verification_status: "approved",
        verification_expires_at: expiry.toISOString(), // ✅ IMPORTANT
      })
      .eq("id", user.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "User verified for 30 days ✅");

    loadPending();
  };

  /* ================= REJECT ================= */
  const rejectUser = async (userId: string) => {
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        verified: false,
        verification_status: "rejected",
      })
      .eq("id", userId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Rejected", "Verification rejected");

    loadPending();
  };

  /* ================= UI ================= */
  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: "#000",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Verification Requests
      </Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadPending}
        ListEmptyComponent={
          <Text
            style={{
              color: "#9ca3af",
              textAlign: "center",
              marginTop: 50,
            }}
          >
            No pending verifications
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#111",
              padding: 15,
              borderRadius: 10,
              marginBottom: 15,
            }}
          >
            <Text style={{ color: "#fff", marginBottom: 5 }}>
              User ID: {item.id}
            </Text>

            {item.username && (
              <Text style={{ color: "#9ca3af", marginBottom: 10 }}>
                @{item.username}
              </Text>
            )}

            {/* 🔥 PAYMENT INFO */}
            <Text style={{ color: "#22c55e" }}>
              Payment: {item.payment_status || "unpaid"}
            </Text>

            {item.payment_reference && (
              <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                Ref: {item.payment_reference}
              </Text>
            )}

            {/* VIEW DOCUMENT */}
            <TouchableOpacity
              onPress={() => {
                if (item.verification_document) {
                  Linking.openURL(item.verification_document);
                } else {
                  Alert.alert("Error", "No document found");
                }
              }}
            >
              <Text
                style={{
                  color: "#3b82f6",
                  marginBottom: 15,
                }}
              >
                View Document
              </Text>
            </TouchableOpacity>

            {/* ACTIONS */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => approveUser(item)}
                style={{
                  backgroundColor: "#16a34a",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff" }}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => rejectUser(item.id)}
                style={{
                  backgroundColor: "#dc2626",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff" }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}