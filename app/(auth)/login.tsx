import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"email" | "password" | null>(null);
  const [newValue, setNewValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  /* ================= LOGIN ================= */
  const signIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
  if (error?.message?.includes("JWT expired")) {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
    return;
  }

  setLoading(false);
  Alert.alert("Login failed", error.message);
  return;
}

      const user = data.user;
      if (!user) {
        setLoading(false);
        Alert.alert("Error", "Login failed");
        return;
      }
      
      /* ======================================================
         STEP 1: ADMIN CHECK
      ====================================================== */
      const { data: adminData } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminData) {
        setLoading(false);
        router.replace("/browse");
        return;
      }

      /* ======================================================
         STEP 2: GET VERIFICATION STATUS
      ====================================================== */
      const { data: profile, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();

      setLoading(false);

      if (profileError || !profile) {
        router.replace("/verify-phone");
        return;
      }

      /* ======================================================
         REJECTED USERS
      ====================================================== */
      if (profile.verification_status === "rejected") {
        Alert.alert(
          "Account Blocked",
          "Your ID verification was rejected. Please contact support."
        );
        await supabase.auth.signOut();
        return;
      }

      /* ======================================================
         PENDING OR APPROVED
      ====================================================== */
      if (
        profile.verification_status === "pending" ||
        profile.verification_status === "approved"
      ) {
        router.replace("/browse");
        return;
      }

      /* ======================================================
         NOT SUBMITTED
      ====================================================== */
      if (
        !profile.verification_status ||
        profile.verification_status === "none"
      ) {
        router.replace("/verify-phone");
        return;
      }

      router.replace("/browse");
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  };

  /* ================= SIGNUP ================= */
  const goSignup = () => {
    router.push("/(auth)/signup");
  };
/* ================= FORGOT PASSWORD ================= */
const forgotPassword = async () => {
  if (!email) {
    Alert.alert("Enter your email");
    return;
  }

  const redirectUrl = Linking.createURL("reset-password");

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: redirectUrl,
    }
  );

  if (error) {
    Alert.alert("Error", error.message);
    return;
  }

  Alert.alert("Check your email", "Reset link sent.");
};
  /* ================= UPDATE EMAIL/PASSWORD ================= */
  const handleUpdate = async () => {
    if (!mode || !newValue || !currentPassword) {
      Alert.alert("Error", "All fields required");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: currentPassword,
    });

    if (authError) {
      setLoading(false);
      Alert.alert("Wrong password", authError.message);
      return;
    }

    const payload =
      mode === "email"
        ? { email: newValue.trim().toLowerCase() }
        : { password: newValue.trim() };

    const { error } = await supabase.auth.updateUser(payload);

    setLoading(false);

    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }

    Alert.alert("Success", "Updated successfully!");
    setModalVisible(false);
    setMode(null);
    setNewValue("");
    setCurrentPassword("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
  <Text style={styles.logo}>Nasara</Text>

  <Text style={styles.tagline}>
    Create. Trade. Compete. Earn. 🚀
  </Text>

  <Text style={styles.subtitle}>
    One platform for ads, battles, auctions, reels & more.
  </Text>
</View>

      <View style={styles.card}>
        <Text style={styles.title}>Sign In</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        

        <TouchableOpacity style={styles.button} onPress={signIn}>
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goSignup}>
          <Text style={styles.secondaryText}>
            New customer? Create Account →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/browse")}
        >
          <Text style={styles.backText}>← Back to Marketplace</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => {
            setMode("email");
            setModalVisible(true);
          }}
        >
          <Text style={styles.linkText}>Change Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => {
            setMode("password");
            setModalVisible(true);
          }}
        >
          <Text style={styles.linkText}>Change Password</Text>
        </TouchableOpacity>
        
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {mode === "email" ? "Change Email" : "Change Password"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Current password"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <TextInput
              style={styles.input}
              placeholder={mode === "email" ? "New Email" : "New Password"}
              secureTextEntry={mode === "password"}
              value={newValue}
              onChangeText={setNewValue}
            />

            <TouchableOpacity style={styles.button} onPress={handleUpdate}>
              <Text style={styles.buttonText}>Update</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setMode(null);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
  flex: 1,
  padding: 20,
  justifyContent: "center",
  backgroundColor: "#f1f5f9",
},

  topBanner: {
    alignItems: "center",
    marginBottom: 25,
  },
  
logo: {
  fontSize: 38,
  fontWeight: "900",
  color: "#22c55e", // green accent
  letterSpacing: 1.2,
},

subtitle: {
  fontSize: 13,
  marginTop: 6,
  color: "#cbd5f5",
  textAlign: "center",
  },

  card: {
  backgroundColor: "#ffffff",
  padding: 22,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 5,
},

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
    textAlign: "center",
  },

  label: {
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 12,
  padding: 14,
  marginBottom: 14,
  backgroundColor: "#f9fafb",
},

  button: {
  backgroundColor: "#16a34a",
  padding: 15,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 6,
},

buttonText: {
  color: "#fff",
  fontWeight: "800",
  fontSize: 16,
},

  secondaryButton: {
    marginTop: 14,
    alignItems: "center",
  },

  secondaryText: {
  color: "#2563eb",
  fontWeight: "700",
  fontSize: 14,
},
  backButton: {
    marginTop: 14,
    alignItems: "center",
  },

  backText: {
    color: "gray",
    fontSize: 13,
  },

  link: {
    marginTop: 14,
    alignItems: "center",
  },

  linkText: {
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },

  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },

  cancelText: {
    textAlign: "center",
    marginTop: 14,
    color: "red",
    fontWeight: "600",
     },
    header: {
  alignItems: "center",
  marginBottom: 30,
  paddingVertical: 25,
  borderRadius: 16,
  backgroundColor: "#0f172a", // dark premium
},

tagline: {
  fontSize: 16,
  color: "#fff",
  marginTop: 8,
  fontWeight: "700",

  },
});