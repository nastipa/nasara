import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function EditFarmScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [farmId, setFarmId] = useState<number | null>(null);

  const [farmName, setFarmName] = useState("");
  const [farmType, setFarmType] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await (supabase as any)
      .from("farm_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setFarmId(data.id);
      setFarmName(data.farm_name || "");
      setFarmType(data.farm_type || "");
      setRegion(data.region || "");
      setDistrict(data.district || "");
      setBio(data.bio || "");
    }

    setLoading(false);
  };

  const saveFarm = async () => {
    try {
      if (!farmId) return;

      setSaving(true);

      const { error } = await (supabase as any)
        .from("farm_profiles")
        .update({
          farm_name: farmName,
          farm_type: farmType,
          region,
          district,
          bio,
        })
        .eq("id", farmId);

      if (error) throw error;

      Alert.alert("Success", "Farm updated");

      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to update farm");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Edit Farm
      </Text>

      <TextInput
        placeholder="Farm Name"
        value={farmName}
        onChangeText={setFarmName}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Farm Type"
        value={farmType}
        onChangeText={setFarmType}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Region"
        value={region}
        onChangeText={setRegion}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="District"
        value={district}
        onChangeText={setDistrict}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Farm Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          minHeight: 120,
        }}
      />

      <TouchableOpacity
        onPress={saveFarm}
        disabled={saving}
        style={{
          backgroundColor: "green",
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}