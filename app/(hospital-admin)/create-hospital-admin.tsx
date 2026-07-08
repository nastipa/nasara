import { Picker } from "@react-native-picker/picker";
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
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

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

export default function CreateHospitalAdmin() {
  const [loading, setLoading] =
    useState(false);

  const [hospitals, setHospitals] =
    useState<any[]>([]);
const [hospitalId, setHospitalId] = useState("");
const [fullName, setFullName] = useState("");
  
  

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const loadHospitals = async () => {
    const { data, error } =
      await supabase
        .from("hospitals")
        .select("id,name")
        .eq("is_active", true)
        .order("name");

    if (error) {
      showMessage(
        "Error",
        error.message
      );
      return;
    }

    setHospitals(data || []);
  };

  useEffect(() => {
    loadHospitals();
  }, []);
  const createHospitalAdmin = async () => {
  try {
    if (
      !hospitalId ||
      !fullName.trim() ||
      !email.trim()
    ) {
      showMessage(
        "Error",
        "Please fill all required fields."
      );
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      showMessage(
        "Login Required",
        "Please login again."
      );
      return;
    }

    // Check whether this email already belongs to a Nasara user
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profile) {
      // Check if already a hospital admin
      const { data: existing } =
        await supabase
          .from("hospital_admins")
          .select("id")
          .eq("user_id", profile.id)
          .maybeSingle();

      if (existing) {
        showMessage(
          "Error",
          "This user is already a hospital admin."
        );
        return;
      }

      const { error } = await (supabase as any)
        .from("hospital_admins")
        .insert({
          hospital_id: hospitalId,
          user_id: profile.id,
          role: "hospital_admin",
          status: "approved",
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
        "Existing Nasara user added as Hospital Admin."
      );

    } else {
      // User doesn't exist, create a new Auth user
      if (!password.trim()) {
        showMessage(
          "Error",
          "Password is required for new users."
        );
        return;
      }

      const response = await fetch(
 `${API_URL}/hospital/create-hospital-admin`,
{
 method:"POST",
 headers:{
  "Content-Type":"application/json",
  Authorization:`Bearer ${session.access_token}`
 },
 body: JSON.stringify({
  email,
  password,
  full_name: fullName,
  hospital_id: hospitalId,
  role: "hospital_admin"
})
}
)
     const text = await response.text();

console.log("SERVER RESPONSE:", text);

let json;

try {
  json = JSON.parse(text);
} catch {
  throw new Error(
    "Server returned invalid response: " + text.substring(0,100)
  );
}

      if (!response.ok) {
        throw new Error(
          json.error ||
            "Unable to create hospital admin."
        );
      }

      showMessage(
        "Success",
        "New hospital admin created successfully."
      );
    }

    setHospitalId("");
    setFullName("");
    setEmail("");
    setPassword("");

  } catch (e: any) {
    showMessage(
      "Error",
      e.message
    );
  } finally {
    setLoading(false);
  }
};
if (loading && hospitals.length === 0) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size="large"
        color="#2563EB"
      />

      <Text
        style={{
          marginTop: 12,
          color: "#6B7280",
        }}
      >
        Loading hospitals...
      </Text>
    </View>
  );
}

return (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
  >
    <Text style={styles.title}>
      Create Hospital Admin
    </Text>

    <Text style={styles.subtitle}>
      Assign an administrator to a hospital.
    </Text>

    <Text style={styles.label}>
      Hospital
    </Text>

    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={hospitalId}
        onValueChange={(value) =>
          setHospitalId(value)
        }
      >
        <Picker.Item
          label="Select Hospital"
          value=""
        />

        {hospitals.map((hospital) => (
          <Picker.Item
            key={hospital.id}
            label={hospital.name}
            value={hospital.id}
          />
        ))}
      </Picker>
    </View>

    <TextInput
      style={styles.input}
      placeholder="Full Name"
      value={fullName}
      onChangeText={setFullName}
    />

    <TextInput
      style={styles.input}
      placeholder="Email Address"
      autoCapitalize="none"
      keyboardType="email-address"
      value={email}
      onChangeText={setEmail}
    />

    <TextInput
      style={styles.input}
      placeholder="Password (only for new users)"
      secureTextEntry
      value={password}
      onChangeText={setPassword}
    />

    <TouchableOpacity
      style={styles.saveButton}
      disabled={loading}
      onPress={createHospitalAdmin}
    >
      <Text style={styles.saveButtonText}>
        {loading
          ? "Creating..."
          : "Create Hospital Admin"}
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
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

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: 18,
    overflow: "hidden",
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
    marginBottom: 18,
  },

  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
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
