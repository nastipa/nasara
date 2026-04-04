import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function VerifyPhoneScreen() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  /* ===============================
     ✅ CHECK IF ADMIN (AUTO BYPASS)
  =============================== */
  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data?.role?.toLowerCase() === "admin") {
        // ✅ Admin does NOT need phone verification
        router.replace("/browse");
        return;
      }

      setCheckingRole(false);
    };

    checkRole();
  }, []);

  /* ===============================
     ✅ SUBMIT PHONE VERIFICATION
  =============================== */
  const submitPhoneVerification = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      const cleanPhone = phone.replace(/\s+/g, "");

      /* =========================
         1️⃣ CHECK DUPLICATE FIRST
      ========================== */
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .neq("id", user.id)
        .maybeSingle();

      if (existing) {
        Alert.alert(
          "Phone Already Used",
          "This phone number is already in use. Please use a different number."
        );
        return;
      }

      /* =========================
         2️⃣ AUTO APPROVE
      ========================== */
      const { error, data } = await (supabase as any)
  .from("profiles")
  .update({
    phone: cleanPhone,
    phone_verified: true,
  })
  .eq("id", user.id)
  


      if (error) {
        if (
          error.message.includes("unique") ||
          error.message.includes("duplicate")
        ) {
          Alert.alert(
            "Phone Already Used",
            "This phone number is already in use. Please use a different number."
          );
        } else {
          Alert.alert("Error", error.message);
        }
        return;
      }

      Alert.alert("Success", "Phone verified successfully!");
      router.replace("/profile");
    } catch (err) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     ⏳ LOADING WHILE CHECKING ROLE
  =============================== */
  if (checkingRole) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ===============================
     UI
  =============================== */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone Verification</Text>

      <TextInput
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
      />

      <Button
        title={loading ? "Submitting..." : "Submit"}
        onPress={submitPhoneVerification}
        disabled={loading}
      />
    </View>
  );
}

/* ===============================
   STYLES
================================ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
});