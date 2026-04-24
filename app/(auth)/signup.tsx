import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  /* ================= SIGNUP ================= */
  const signUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    setLoading(true);

    try {
     
      /* ================= CREATE AUTH ACCOUNT ================= */
const { data, error } = await supabase.auth.signUp({
  email: email.trim().toLowerCase(),
  password: password.trim(),
});

if (error) {
  setLoading(false);
  Alert.alert("Signup failed", error.message);
  return;
}

/* ✅ ADD INVITE LOGIC HERE (EXACT SPOT) */
let invitedBy = null;

if (inviteCodeInput) {
  const { data: inviter } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("invite_code", inviteCodeInput.trim())
    .maybeSingle();

  if (inviter) {
    invitedBy = inviter.id;
  }
}

     
      /* ================= CREATE PROFILE ================= */
if (data?.user) {
  const newCode = generateCode();

  // 🔍 Check if user used invite code
  let inviter: any = null;

  if (inviteCode.trim()) {
    const { data: found } = await supabase
      .from("profiles")
      .select("*")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .single();

    inviter = found;
  }

  const { error: profileError } = await (supabase as any)
    .from("profiles")
    .insert([
      {
        id: data.user.id,
        email: email.trim().toLowerCase(),


        /* TRUST SYSTEM DEFAULTS */
        phone_verified: false,
        human_verified: false,
        trust_score: 50,
        risk_score: 0,
        verification_level: "tier_0",
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
           invited_by: invitedBy, // ✅ HERE

        created_at: new Date(),
      },
    ]);

  // 🔥 Increase inviter count
  if (inviter) {
    await (supabase as any)
      .from("profiles")
      .update({
        invites_count: (inviter.invites_count || 0) + 1,
      })
      .eq("id", inviter.id);
  }

  if (profileError) {
    console.log("Profile creation error:", profileError.message);
  }
}
      setLoading(false);

      Alert.alert(
  "Welcome to Nasara 🚀",
  "You are an early user! Invite friends and grow with us."
);

      router.replace("/(auth)/login");
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
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
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

       <View style={{ position: "relative" }}>
         <TextInput
           style={styles.input}
           placeholder="Enter password"
           secureTextEntry={!showPassword}
           value={password}
           onChangeText={setPassword}
         />
       <Text style={styles.label}>Invite Code (optional)</Text>
         <TextInput
        style={styles.input}
       placeholder="Enter invite code"
      value={inviteCode}
       onChangeText={setInviteCode}
       />
       
         <TouchableOpacity
           onPress={() => setShowPassword(!showPassword)}
           style={{
             position: "absolute",
             right: 15,
             top: 18,
           }}
         >
           <Text>{showPassword ? "🙈" : "👁️"}</Text>
         </TouchableOpacity>
       </View>

        <TouchableOpacity style={styles.button} onPress={signUp}>
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.secondaryText}>
            Already have an account? Sign In →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/browse")}
        >
          <Text style={styles.backText}>← Back to Marketplace</Text>
        </TouchableOpacity>
      </View>
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
tagline: {
  fontSize: 16,
  color: "#fff",
  marginTop: 8,
  fontWeight: "700",
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
    marginTop: 16,
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
  header: {
  alignItems: "center",
  marginBottom: 30,
  paddingVertical: 25,
  borderRadius: 16,
  backgroundColor: "#0f172a", // dark premium
},


  backText: {
    color: "gray",
    fontSize: 13,

  },
});