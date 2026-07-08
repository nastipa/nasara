import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function HospitalRegister() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] =
    useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");

  const showMessage = (
    title: string,
    message?: string
  ) => {
    if (Platform.OS === "web") {
      window.alert(
        message
          ? `${title}\n\n${message}*`
          : title
      );
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  async function loadHospitals() {
    setLoading(true);

    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .eq("is_active", true)
      .order("name");

    setLoading(false);

    if (error) {
      showMessage("Error", error.message);
      return;
    }

    setHospitals(data || []);
  }

  async function registerHospitalAdmin() {
    if (!selectedHospital) {
      showMessage(
        "Hospital Required",
        "Please select your hospital."
      );
      return;
    }

    if (!fullName.trim()) {
      showMessage(
        "Full Name Required"
      );
      return;
    }

    if (!position.trim()) {
      showMessage(
        "Position Required"
      );
      return;
    }

    if (!phone.trim()) {
      showMessage(
        "Phone Required"
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaving(false);
        showMessage(
          "Login Required",
          "Please login first."
        );
        return;
      }

      // Check existing registration
      const { data: existing } = await (supabase as any)
        .from("hospital_admins")
        .select("id,status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setSaving(false);

        showMessage(
          "Already Registered",
          `Your hospital account is currently ${existing.status}.`
        );

        return;
      }

      const { error } = await (supabase as any)
        .from("hospital_admins") 
        .insert({
          hospital_id: selectedHospital.id,
          user_id: user.id,
          role: "admin",
          status: "pending",
        });

      if (error) {
        setSaving(false);
        showMessage(
          "Registration Failed",
          error.message
        );
        return;
      }

      showMessage(
        "Application Submitted",
        "Your hospital account has been submitted successfully. A Nasara Super Admin will review and approve your application."
      );

      router.replace("/");

    } catch (e: any) {
      setSaving(false);

      showMessage(
        "Error",
        e.message
      );

      return;
    }

    setSaving(false);
  }

  const filteredHospitals = hospitals.filter(
    (hospital) =>
      hospital.name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      hospital.town
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      hospital.region
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f6fb" }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 6,
        }}
      >
        Hospital Registration
      </Text>

      <Text
        style={{
          color: "#666",
          marginBottom: 20,
        }}
      >
        Register your hospital administrator account.
      </Text>

      <TextInput
        placeholder="Search hospital..."
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator
          size="large"
          style={{ marginVertical: 40 }}
        />
      ) : (
        <>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            Select Hospital
          </Text>

          {filteredHospitals.map((hospital) => (
            <TouchableOpacity
              key={hospital.id}
              onPress={() =>
                setSelectedHospital(hospital)
              }
              style={[
                styles.hospitalCard,
                selectedHospital?.id ===
                  hospital.id && {
                  borderColor: "#16a34a",
                  borderWidth: 2,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="medical"
                  size={28}
                  color="#2563eb"
                />

                <View
                  style={{
                    marginLeft: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 17,
                    }}
                  >
                    {hospital.name}
                  </Text>

                  <Text
                    style={{
                      color: "#666",
                      marginTop: 2,
                    }}
                  >
                    {hospital.town},{" "}
                    {hospital.region}
                  </Text>
                </View>

                {selectedHospital?.id ===
                  hospital.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={28}
                    color="#16a34a"
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}

          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            Administrator Information
          </Text>

          <TextInput
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
          />

          <TextInput
            placeholder="Position"
            value={position}
            onChangeText={setPosition}
            style={styles.input}
          />

          <TextInput
            placeholder="Phone Number"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            style={styles.input}
          />

          <TouchableOpacity
            disabled={saving}
            style={styles.registerButton}
            onPress={registerHospitalAdmin}
          >
            <Text
              style={styles.registerText}
            >
              {saving
                ? "Submitting..."
                : "Register Hospital Admin"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={{
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <Text
              style={{
                color: "#2563eb",
                fontWeight: "600",
              }}
            >
              ← Back
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 15,
  },

  hospitalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  registerButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#16a34a",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  registerText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});