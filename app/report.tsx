import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

type ReportType = "user" | "item" | "video" | "live";
export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const reportedUserId = params.reportedUserId as string;
  const reportedItemId = params.reportedItemId as string;
  const reportedType = (params.type as string) || "item";

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const submitReport = async () => {
    if (!reason.trim()) {
      Alert.alert("Error", "Please select a reason");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    const { error } = await (supabase as any).from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId || null,
      reported_item_id: reportedItemId || null,
      reported_type: reportedType,
      reason,
      details,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Thank you", "Report submitted successfully");
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Report Content</Text>

      {/* REASON SELECT (simple version) */}
      <TextInput
        placeholder="Reason (Spam, Scam, Abuse, etc.)"
        value={reason}
        onChangeText={setReason}
        style={styles.input}
      />

      <TextInput
        placeholder="Additional details (optional)"
        value={details}
        onChangeText={setDetails}
        style={[styles.input, { height: 100 }]}
        multiline
      />

      <TouchableOpacity onPress={submitReport} style={styles.button}>
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Submit Report
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});