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
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const generateCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  /* ================= SIGNUP ================= */
  const signUp = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Email and password are required");
    return;
  }

  setLoading(true);

  try {
    /* ================= CREATE AUTH ================= */
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error || !data.user) {
      setLoading(false);
      Alert.alert("Signup failed", error?.message || "No user created");
      return;
    }

    const userId = data.user.id;

    /* ================= FIND INVITER ================= */
    let inviterId: string | null = null;

    if (inviteCode.trim()) {
      const { data: found, error: findError } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (found?.id) {
        inviterId = found.id;
      }
    }

    /* ================= CREATE PROFILE ================= */
    const newCode = generateCode();

    const { error: profileError } = await (supabase as any).from("profiles").insert({
      id: userId,
      email: email.trim().toLowerCase(),

      invite_code: newCode,
      invited_by: inviterId,

      coins: 0,
      boost_credits: 0,
      invites_count: 0,

      phone_verified: false,
      human_verified: false,
      trust_score: 50,
      risk_score: 0,
      verification_level: "tier_0",

      created_at: new Date(),
    });

    if (profileError) {
      console.log("PROFILE ERROR:", profileError.message);
    }

    /* ================= REWARD SYSTEM (FIXED) ================= */
    if (inviterId) {
  const { data: inviterProfile } = await (supabase as any)
    .from("profiles")
    .select("coins, boost_credits, invites_count")
    .eq("id", inviterId)
    .single();

  await (supabase as any)
    .from("profiles")
    .update({
      coins: (inviterProfile?.coins || 0) + 10,
      boost_credits: (inviterProfile?.boost_credits || 0) + 1,
      invites_count: (inviterProfile?.invites_count || 0) + 1,
    })
    .eq("id", inviterId);


      // 2. give rewards (COINS + BOOST)
      const { error: rewardError } = await (supabase as any).rpc(
        "add_referral_reward",
        {
          user_id_input: inviterId,
        }
      );

      if (rewardError) {
        console.log("REWARD ERROR:", rewardError.message);
      }
    }

    setLoading(false);

    Alert.alert(
      "Welcome 🚀",
      inviterId
        ? "Referral applied! Your inviter earned rewards 🪙"
        : "Account created successfully"
    );

    router.replace("/(auth)/login");
  } catch (err: any) {
    setLoading(false);
    Alert.alert("Error", err.message);
  }
};

  /* ================= UI ================= */
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

        <Text style={styles.label}>Password</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ position: "absolute", right: 15, top: 18 }}
          >
            <Text>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Invite Code (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
        />

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

  header: {
    alignItems: "center",
    marginBottom: 30,
    paddingVertical: 25,
    borderRadius: 16,
    backgroundColor: "#0f172a",
  },

  logo: {
    fontSize: 38,
    fontWeight: "900",
    color: "#22c55e",
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
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },

  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },

  secondaryText: {
    color: "#2563eb",
    fontWeight: "700",
  },

  backButton: {
    marginTop: 14,
    alignItems: "center",
  },

  backText: {
    color: "gray",
    fontSize: 13,
  },
});