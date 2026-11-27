import { useRouter } from "expo-router";
import { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

// ==========================================
// NASARA BRAND COLOURS
// ==========================================

const COLORS = {
  navy: "#101B3D",
  navyLight: "#1A2B55",
  gold: "#D6A84F",
  goldLight: "#F3E4BD",
  white: "#FFFFFF",
  background: "#F7F6F2",
  text: "#17213A",
  muted: "#8A91A3",
  border: "#E7E8ED",
  input: "#F9FAFC",
};

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const generateCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  // ==========================================
  // SIGNUP
  // ==========================================

  const signUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing information",
        "Email and password are required."
      );
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert(
        "Weak password",
        "Your password must contain at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      // ==========================================
      // CREATE AUTH ACCOUNT
      // ==========================================

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error || !data.user) {
        setLoading(false);

        Alert.alert(
          "Signup failed",
          error?.message || "No user created"
        );

        return;
      }

      const userId = data.user.id;

      // ==========================================
      // FIND INVITER
      // ==========================================

      let inviterId: string | null = null;

      if (inviteCode.trim()) {
        const { data: found } = await (supabase as any)
          .from("profiles")
          .select("id")
          .eq("invite_code", inviteCode.trim().toUpperCase())
          .maybeSingle();

        if (found?.id) {
          inviterId = found.id;
        }
      }

      // ==========================================
      // CREATE PROFILE
      // ==========================================

      const newCode = generateCode();

      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .insert({
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

      // ==========================================
      // REFERRAL REWARD SYSTEM
      // ==========================================

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

      // ==========================================
      // SUCCESS
      // ==========================================

      setLoading(false);

      Alert.alert(
        "Welcome to Nasara!",
        inviterId
          ? "Your account has been created successfully. Referral rewards have been applied."
          : "Your account has been created successfully."
      );

      router.replace("/(auth)/login");

    } catch (err: any) {
      setLoading(false);

      Alert.alert(
        "Signup error",
        err.message || "Something went wrong."
      );
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ======================================
            HERO HEADER
        ====================================== */}

        <View style={styles.hero}>
          <View style={styles.heroDecorationOne} />
          <View style={styles.heroDecorationTwo} />

          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>N</Text>
            </View>

            <Text style={styles.logo}>NASARA</Text>
          </View>

          <View style={styles.goldLine} />

          <Text style={styles.heroTitle}>
            Join Nasara
          </Text>

          <Text style={styles.tagline}>
            Your marketplace. Your opportunities.
          </Text>

          <Text style={styles.subtitle}>
            Create an account and start buying, selling,
            connecting and growing.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Text style={styles.featureText}>🛍️ Buy & Sell</Text>
            </View>

            <View style={styles.featurePill}>
              <Text style={styles.featureText}>📢 Promote</Text>
            </View>

            <View style={styles.featurePill}>
              <Text style={styles.featureText}>🤝 Connect</Text>
            </View>
          </View>
        </View>

        {/* ======================================
            SIGNUP CARD
        ====================================== */}

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <Text style={styles.title}>
              Create Your Account
            </Text>

            <Text style={styles.cardSubtitle}>
              It only takes a few moments to get started.
            </Text>
          </View>

          {/* EMAIL */}

          <Text style={styles.label}>
            Email Address
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>✉️</Text>

            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>

          {/* PASSWORD */}

          <Text style={styles.label}>
            Create Password
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔒</Text>

            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              returnKeyType="next"
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            Use at least 6 characters for your password.
          </Text>

          {/* INVITE CODE */}

          <View style={styles.inviteHeading}>
            <Text style={styles.label}>
              Invite Code
            </Text>

            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>
                OPTIONAL
              </Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🎁</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter invite code"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={inviteCode}
              onChangeText={setInviteCode}
              returnKeyType="done"
              onSubmitEditing={signUp}
            />
          </View>

          <View style={styles.inviteInfo}>
            <Text style={styles.inviteInfoIcon}>✦</Text>

            <Text style={styles.inviteInfoText}>
              Have an invite code? Enter it to connect
              your account with the person who invited you.
            </Text>
          </View>

          {/* CREATE ACCOUNT BUTTON */}

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={signUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>

            {!loading && (
              <Text style={styles.buttonArrow}>→</Text>
            )}
          </TouchableOpacity>

          {/* LOGIN LINK */}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />

            <Text style={styles.dividerText}>
              ALREADY A MEMBER?
            </Text>

            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() =>
              router.replace("/(auth)/login")
            }
            activeOpacity={0.8}
          >
            <Text style={styles.loginText}>
              Sign In to Your Account
            </Text>

            <Text style={styles.loginArrow}>→</Text>
          </TouchableOpacity>

          {/* BACK TO MARKETPLACE */}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace("/browse")
            }
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>
              ← Explore Marketplace
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            NASARA
          </Text>

          <Text style={styles.footerText}>
            One platform. Endless opportunities.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 35 : 55,
    paddingBottom: 35,
    justifyContent: "center",
  },

  // HERO

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 25,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 25,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 22,
  },

  heroDecorationOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 25,
    borderColor: "rgba(214,168,79,0.08)",
    top: -95,
    right: -60,
  },

  heroDecorationTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.035)",
    bottom: -80,
    left: -50,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logoIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },

  logoIconText: {
    fontSize: 27,
    fontWeight: "900",
    color: COLORS.navy,
  },

  logo: {
    fontSize: 29,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 2,
  },

  goldLine: {
    width: 55,
    height: 3,
    backgroundColor: COLORS.gold,
    borderRadius: 5,
    marginTop: 17,
    marginBottom: 17,
  },

  heroTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: COLORS.white,
    textAlign: "center",
  },

  tagline: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gold,
    marginTop: 9,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: "#D2D8E8",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 290,
  },

  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7,
    marginTop: 19,
  },

  featurePill: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  featureText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },

  // SIGNUP CARD

  card: {
    backgroundColor: COLORS.white,
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 4,
  },

  cardHeading: {
    marginBottom: 23,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },

  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 7,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 9,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
    borderRadius: 13,
    minHeight: 54,
    paddingHorizontal: 13,
    marginBottom: 18,
  },

  inputIcon: {
    fontSize: 16,
    color: COLORS.navy,
    width: 28,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 14,
    minWidth: 0,
  },

  eyeButton: {
    paddingHorizontal: 5,
    paddingVertical: 8,
  },

  eyeText: {
    fontSize: 12,
    color: COLORS.navy,
    fontWeight: "800",
  },

  helperText: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: -12,
    marginBottom: 19,
  },

  // INVITE CODE

  inviteHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionalBadge: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 9,
  },

  optionalText: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  inviteInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFCF5",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.goldLight,
    padding: 11,
    marginTop: -7,
    marginBottom: 19,
  },

  inviteInfoIcon: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "900",
    marginRight: 9,
  },

  inviteInfoText: {
    flex: 1,
    color: "#77716A",
    fontSize: 10,
    lineHeight: 16,
  },

  // CREATE ACCOUNT BUTTON

  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 13,
    marginTop: 5,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },

  buttonArrow: {
    color: COLORS.gold,
    fontSize: 21,
    fontWeight: "900",
    marginLeft: 12,
  },

  // LOGIN LINK

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 19,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginHorizontal: 12,
  },

  loginButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: "#FFFCF5",
    paddingVertical: 14,
    borderRadius: 13,
  },

  loginText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  loginArrow: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 10,
  },

  backButton: {
    alignItems: "center",
    marginTop: 21,
    paddingVertical: 5,
  },

  backText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  // FOOTER

  footer: {
    alignItems: "center",
    marginTop: 23,
  },

  footerBrand: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 3,
    color: COLORS.gold,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },
});