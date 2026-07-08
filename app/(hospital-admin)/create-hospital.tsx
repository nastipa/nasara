import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function CreateHospital() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [hospitalName, setHospitalName] =
    useState("");

  const [hospitalCode, setHospitalCode] =
    useState("");

  const [region, setRegion] =
    useState("");

  const [district, setDistrict] =
    useState("");

  const [city, setCity] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");
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

  const saveHospital = async () => {
    try {
      if (!hospitalName.trim()) {
        showMessage(
          "Hospital name is required."
        );
        return;
      }

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showMessage("Please login again.");
        return;
      }
      const { error } = await (supabase as any)
        .from("hospitals")
        .insert({
          name: hospitalName.trim(),
          code: hospitalCode.trim() || null,
          region: region.trim(),
          district: district.trim(),
          city: city.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          status: "active",
          created_by: user.id,
        });

      if (error) {
        showMessage(
          "Error",
          error.message
        );
        return;
      }

      showMessage(
        "Success",
        "Hospital created successfully."
      );

      router.back();

    } catch (e: any) {
      showMessage(
        "Error",
        e.message || "Failed to create hospital."
      );

    } finally {
      setLoading(false);
    }
  };
  return (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
  >
    <Text style={styles.title}>
      Create Hospital
    </Text>

    <Text style={styles.subtitle}>
      Register a new hospital.
    </Text>

    <TextInput
      style={styles.input}
      placeholder="Hospital Name *"
      value={hospitalName}
      onChangeText={setHospitalName}
    />

    <TextInput
      style={styles.input}
      placeholder="Hospital Code"
      value={hospitalCode}
      onChangeText={setHospitalCode}
    />

    <TextInput
      style={styles.input}
      placeholder="Region"
      value={region}
      onChangeText={setRegion}
    />

    <TextInput
      style={styles.input}
      placeholder="District"
      value={district}
      onChangeText={setDistrict}
    />

    <TextInput
      style={styles.input}
      placeholder="Town / City"
      value={city}
      onChangeText={setCity}
    />

    <TextInput
      style={styles.input}
      placeholder="Address"
      value={address}
      onChangeText={setAddress}
    />

    <TextInput
      style={styles.input}
      placeholder="Phone Number"
      keyboardType="phone-pad"
      value={phone}
      onChangeText={setPhone}
    />

    <TextInput
      style={styles.input}
      placeholder="Email"
      keyboardType="email-address"
      autoCapitalize="none"
      value={email}
      onChangeText={setEmail}
    />

    <TouchableOpacity
      style={styles.saveButton}
      disabled={loading}
      onPress={saveHospital}
    >
      <Text style={styles.saveButtonText}>
        {loading
          ? "Creating..."
          : "Create Hospital"}
      </Text>
    </TouchableOpacity>
  </ScrollView>
);
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 24,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },

  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});