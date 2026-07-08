import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function JoinQueue() {
  const router = useRouter();

  const params = useLocalSearchParams();

const {
  hospital_id,
  department_id,
  department_name,
} = useLocalSearchParams<{
  hospital_id: string;
  department_id: string;
  department_name: string;
}>();

const department = department_id;
console.log("QUEUE PARAMS:", {
  hospital_id,
  department_id,
  department_name,
});
  const [condition, setCondition] = useState("");
  const [nhia, setNhia] = useState("");
  const [loading, setLoading] = useState(false);

  const showMessage = (
    title: string,
    message?: string
  ) => {
    if (Platform.OS === "web") {
      window.alert(
  message
    ? `${title}\n\n${message}`
    : title
);
    } else {
      Alert.alert(title, message);
    }
  };

  async function joinQueue() {
    if (!condition.trim()) {
      showMessage(
        "Condition Required",
        "Please briefly describe your condition."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        showMessage("Login Required");
        return;
      }

      // Generate today's queue number
      const today = new Date().toISOString().split("T")[0];

      const { count } = await supabase
        .from("hospital_bookings")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      const queueNumber = (count || 0) + 1;

      const { data, error } = await (supabase as any)
        .from("hospital_bookings")
        .insert({
          hospital_id: hospital_id,
          department_id: department_id,
          department : department_name,
          condition: condition,
          nhia_number: nhia || null,
          queue_number: queueNumber,
          booking_code:
  "HB-" +
  Date.now().toString().slice(-8),
  
          status: "waiting",
          patient_id: user.id,
          booking_date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      setLoading(false);

      if (error) {
        showMessage("Error", error.message);
        return;
      }

      showMessage(
        "Queue Joined",
        `Your queue number is ${queueNumber}`
      );

      router.replace({
        pathname: "/health/my-queue",
        params: {
          booking_id: data.id,
        },
      });
    } catch (e: any) {
      setLoading(false);
      showMessage("Error", e.message);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.header}>
        Join Hospital Queue
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Department
        </Text>

        <Text style={styles.value}>
          {department_name}
        </Text>
      </View>

      <Text style={styles.label}>
        Describe your condition
      </Text>

      <TextInput
        multiline
        numberOfLines={5}
        placeholder="Example: I have had a severe headache and fever for two days."
        value={condition}
        onChangeText={setCondition}
        style={styles.textArea}
      />

      <Text style={styles.label}>
        NHIA Card Number (Optional)
      </Text>

      <TextInput
        placeholder="Enter NHIA Number"
        value={nhia}
        onChangeText={setNhia}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={joinQueue}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Joining..."
            : "Join Queue"}
        </Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          style={{ marginTop: 20 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f4f6fb",
    flexGrow: 1,
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  label: {
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 16,
  },

  value: {
    fontSize: 18,
    color: "#2563eb",
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },

  textArea: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    height: 140,
    marginBottom: 20,
    textAlignVertical: "top",
  },

  button: {
    backgroundColor: "#16a34a",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});