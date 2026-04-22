import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function CreateBattle() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [compare, setCompare] = useState("");
  const [category, setCategory] = useState("");

  const [durationValue, setDurationValue] = useState("");
  const [durationType, setDurationType] = useState("minutes");

  const [loading, setLoading] = useState(false);

  const categories = [
    "Music",
    "Auto & Vehicles",
    "Sports",
    "Food & Grocery",
    "Fashion",
    "Politics",
    "Electronics",
    "Education & Health",
  ];

  function getDurationMs() {
    const value = Number(durationValue);
    if (isNaN(value) || value <= 0) return null;

    if (durationType === "minutes") return value * 60000;
    if (durationType === "hours") return value * 3600000;
    if (durationType === "days") return value * 86400000;

    return null;
  }

  const createBattle = async () => {
  if (loading) return; // 🔥 prevent duplicates

  if (!title || !compare || !category || !durationValue) {
    Alert.alert("Fill all fields");
    return;
  }

  let names = compare
    .split(/vs/i)
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.toLowerCase() !== "vs");

  names = [...new Set(names)];

  names = names.map(
    (n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
  );

  if (names.length < 2) {
    Alert.alert("Minimum 2 participants");
    return;
  }

  if (names.length > 10) {
    Alert.alert("Maximum 10 participants");
    return;
  }

  const durationMs = getDurationMs();
  if (!durationMs) {
    Alert.alert("Invalid duration");
    return;
  }

  setLoading(true);

  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      Alert.alert("Login required");
      setLoading(false);
      return;
    }

    const endTime = new Date(Date.now() + durationMs + 5000);

    const { data, error } = await (supabase as any)
      .from("battles")
      .insert({
        title,
        compare_text: compare,
        category,
        end_time: endTime.toISOString(),
        creator_id: user.id,
        status: "active",
      })
      .select()
      .single();

    if (error || !data) {
      Alert.alert("Error creating battle");
      setLoading(false);
      return;
    }

    const payload = names.map((name) => ({
      battle_id: data.id,
      name,
      votes: 0,
    }));

    const { error: candidateError } = await (supabase as any)
      .from("candidates")
      .insert(payload);

    if (candidateError) {
      Alert.alert(candidateError.message);
      setLoading(false);
      return;
    }

    /* ================= NOTIFICATIONS (FOLLOWERS ONLY) ================= */
    /* ================= NOTIFICATIONS (GLOBAL + PUSH) ================= */

// 1️⃣ SAVE IN DATABASE (ALL USERS)
const { data: users } = await (supabase as any)
  .from("profiles")
  .select("id");

if (users) {
  const inserts = users.map((u: any) => ({
    user_id: u.id,
    type: "battle",
    title: "⚔️ New Battle",
    body: title,
    ref_id: data.id,
    read: false,
  }));

  await (supabase as any).from("notifications").insert(inserts);
}

// 2️⃣ SEND PUSH NOTIFICATION (SERVER)
await fetch("https://nasara-upload-server.onrender.com/send-push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "battle", // 🔥 used in Step 7
    title: "⚔️ New Battle",
    body: title,
    ref_id: data.id,
  }),
});

    Alert.alert("Battle Created 🚀");
    router.replace("/battle");

  } catch (err: any) {
    Alert.alert(err.message);
  }

  setLoading(false);
};
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.box}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
          Create Battle
        </Text>

        <TextInput
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <TextInput
          placeholder="A vs B vs C..."
          value={compare}
          onChangeText={setCompare}
          style={styles.input}
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {categories.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)}>
              <Text
                style={[
                  styles.btn,
                  { backgroundColor: category === c ? "green" : "#000" },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text>Duration</Text>

        <TextInput
          placeholder="Enter number"
          value={durationValue}
          onChangeText={setDurationValue}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={{ flexDirection: "row" }}>
          {["minutes", "hours", "days"].map((type) => (
            <TouchableOpacity key={type} onPress={() => setDurationType(type)}>
              <Text
                style={[
                  styles.btn,
                  {
                    backgroundColor:
                      durationType === type ? "orange" : "#000",
                  },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={createBattle}>
          <Text style={styles.btn}>🚀 Create</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  box: { width: "85%", gap: 10 },
  input: { borderWidth: 1, padding: 10, borderRadius: 6 },
  btn: {
    backgroundColor: "#000",
    color: "#fff",
    padding: 10,
    margin: 5,
    textAlign: "center",
    borderRadius: 6,
  },
});