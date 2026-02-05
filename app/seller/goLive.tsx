import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { supabase } from "../../lib/supabase";

export default function GoLiveScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const startLive = async () => {
    if (!title) {
      Alert.alert("Enter title");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Not logged in");
      return;
    }

    const channelName = "live_" + user.id + "_" + Date.now();

    const { error } = await (supabase as any).from("live_streams").insert({
      user_id: user.id,
      title,
      channel_name: channelName,
      is_live: true,
    });

    if (error) {
      Alert.alert("Error starting live", error.message);
      setLoading(false);
      return;
    }

    Alert.alert("Live Started!");

    router.push("/liveHost/" + channelName);

    setLoading(false);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        🎥 Start Live Selling
      </Text>

      <TextInput
        placeholder="Enter Live Title"
        value={title}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
        }}
      />

      <TouchableOpacity
        onPress={startLive}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: 14,
          backgroundColor: "red",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {loading ? "Starting..." : "Go Live Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}