import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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

export default function LoginScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    returnTo?: string;
    sellerId?: string;
    action?: string;
    itemId?: string;
  }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"email" | "password" | null>(null);
  const [newValue, setNewValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ==========================================
  // GET SAFE RETURN DESTINATION
  // ==========================================

  const getReturnRoute = () => {
    const destination = Array.isArray(params.returnTo)
      ? params.returnTo[0]
      : params.returnTo;

    if (
      destination &&
      destination.startsWith("/") &&
      !destination.startsWith("//")
    ) {
      return destination;
    }

    return "/browse";
  };

  // ==========================================
  // NAVIGATE AFTER SUCCESSFUL LOGIN
  // ==========================================

  const continueAfterLogin = () => {
    const destination = getReturnRoute();
    router.replace(destination as any);
  };

  // ==========================================
  // NAVIGATE TO PHONE VERIFICATION
  // ==========================================

  const goToVerification = () => {
    const destination = getReturnRoute();

    router.replace({
      pathname: "/verify-phone" as any,
      params: {
        returnTo: destination,
        sellerId: params.sellerId || "",
        action: params.action || "",
        itemId: params.itemId || "",
      },
    } as any);
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const signIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        });

      if (error) {
        if (error.message?.includes("JWT expired")) {
          await supabase.auth.signOut();
          setLoading(false);
          router.replace("/(auth)/login" as any);
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

      // ==========================================
      // STEP 1: ADMIN CHECK
      // ==========================================

      const { data: adminData } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminData) {
        setLoading(false);
        router.replace("/browse" as any);
        return;
      }

      // ==========================================
      // STEP 2: GET VERIFICATION STATUS
      // ==========================================

      const { data: profile, error: profileError } =
        await (supabase as any)
          .from("profiles")
          .select("verification_status")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        setLoading(false);
        goToVerification();
        return;
      }

      // ==========================================
      // STEP 3: REJECTED USERS
      // ==========================================

      if (profile.verification_status === "rejected") {
        setLoading(false);

        Alert.alert(
          "Account Blocked",
          "Your ID verification was rejected. Please contact support."
        );

        await supabase.auth.signOut();
        return;
      }

      // ==========================================
      // STEP 4: PENDING OR APPROVED
      // ==========================================

      if (
        profile.verification_status === "pending" ||
        profile.verification_status === "approved"
      ) {
        setLoading(false);
        continueAfterLogin();
        return;
      }

      // ==========================================
      // STEP 5: NOT SUBMITTED
      // ==========================================

      if (
        !profile.verification_status ||
        profile.verification_status === "none"
      ) {
        setLoading(false);
        goToVerification();
        return;
      }

      // ==========================================
      // STEP 6: DEFAULT DESTINATION
      // ==========================================

      setLoading(false);
      continueAfterLogin();

    } catch (err: any) {
      setLoading(false);

      Alert.alert(
        "Error",
        err.message || "Something went wrong."
      );
    }
  };

  // ==========================================
  // SIGNUP
  // ==========================================

  const goSignup = () => {
    router.push({
      pathname: "/(auth)/signup" as any,
      params: {
        returnTo: getReturnRoute(),
        sellerId: params.sellerId || "",
        action: params.action || "",
        itemId: params.itemId || "",
      },
    } as any);
  };

  // ==========================================
  // FORGOT PASSWORD
  // ==========================================

  const sendOTP = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("OTP sent to your email");
      router.push("/reset-password" as any);
    }
  };

  // ==========================================
  // UPDATE EMAIL / PASSWORD
  // ==========================================

  const handleUpdate = async () => {
    if (!mode || !newValue || !currentPassword) {
      Alert.alert("Error", "All fields required");
      return;
    }

    setLoading(true);

    const { error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: currentPassword,
      });

    if (authError) {
      setLoading(false);

      Alert.alert(
        "Wrong password",
        authError.message
      );

      return;
    }

    const payload =
      mode === "email"
        ? {
            email: newValue.trim().toLowerCase(),
          }
        : {
            password: newValue.trim(),
          };

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
            Welcome Back
          </Text>

          <Text style={styles.tagline}>
            Your marketplace. Your opportunities.
          </Text>

          <Text style={styles.subtitle}>
            Buy, sell, connect, promote and grow with Nasara.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Text style={styles.featureText}>🛍️ Marketplace</Text>
            </View>

            <View style={styles.featurePill}>
              <Text style={styles.featureText}>📢 Business</Text>
            </View>

            <View style={styles.featurePill}>
              <Text style={styles.featureText}>🤝 Community</Text>
            </View>
          </View>
        </View>

        {/* ======================================
            LOGIN CARD
        ====================================== */}

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <Text style={styles.title}>Sign in to Nasara</Text>

            <Text style={styles.cardSubtitle}>
              Enter your account details to continue.
            </Text>
          </View>

          {/* EMAIL */}

          <Text style={styles.label}>Email Address</Text>

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

          <View style={styles.passwordLabelRow}>
            <Text style={styles.label}>Password</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔒</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={signIn}
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

          {/* FORGOT PASSWORD */}

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() =>
              router.push("/forgot-password" as any)
            }
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* LOGIN BUTTON */}

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={signIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>

            {!loading && (
              <Text style={styles.buttonArrow}>→</Text>
            )}
          </TouchableOpacity>

          {/* DIVIDER */}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              NEW TO NASARA?
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* SIGNUP */}

          <TouchableOpacity
            style={styles.signupButton}
            onPress={goSignup}
            activeOpacity={0.8}
          >
            <Text style={styles.signupText}>
              Create Your Account
            </Text>

            <Text style={styles.signupArrow}>→</Text>
          </TouchableOpacity>

          {/* BACK TO MARKETPLACE */}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace("/browse" as any)
            }
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>
              ← Explore Marketplace
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================
            ACCOUNT SETTINGS
        ====================================== */}

        <View style={styles.accountSettings}>
          <Text style={styles.settingsTitle}>
            Account settings
          </Text>

          <View style={styles.settingsRow}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                setMode("email");
                setModalVisible(true);
              }}
            >
              <Text style={styles.settingsButtonText}>
                Change Email
              </Text>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                setMode("password");
                setModalVisible(true);
              }}
            >
              <Text style={styles.settingsButtonText}>
                Change Password
              </Text>
            </TouchableOpacity>
          </View>
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

      {/* ======================================
          CHANGE EMAIL / PASSWORD MODAL
      ====================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setMode(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {mode === "email"
                    ? "Change Email"
                    : "Change Password"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Verify your account before updating.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setMode(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* CURRENT PASSWORD */}

            <Text style={styles.label}>
              Current Account Password
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowCurrentPassword(!showCurrentPassword)
                }
                style={styles.eyeButton}
              >
                <Text style={styles.eyeText}>
                  {showCurrentPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* NEW VALUE */}

            <Text style={styles.label}>
              {mode === "email" ? "New Email Address" : "New Password"}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>
                {mode === "email" ? "✉️" : "🔐"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder={
                  mode === "email"
                    ? "Enter new email"
                    : "Enter new password"
                }
                placeholderTextColor={COLORS.muted}
                secureTextEntry={
                  mode === "password" && !showNewPassword
                }
                value={newValue}
                onChangeText={setNewValue}
                autoCapitalize="none"
                keyboardType={
                  mode === "email"
                    ? "email-address"
                    : "default"
                }
              />

              {mode === "password" && (
                <TouchableOpacity
                  onPress={() =>
                    setShowNewPassword(!showNewPassword)
                  }
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeText}>
                    {showNewPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {loading ? "Updating..." : "Update Account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setMode(null);
                setNewValue("");
                setCurrentPassword("");
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

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
  green: "#16845B",
};

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

  // LOGIN CARD

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

  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 17,
  },

  forgotText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "800",
  },

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

  // SIGNUP

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

  signupButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: "#FFFCF5",
    paddingVertical: 14,
    borderRadius: 13,
  },

  signupText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  signupArrow: {
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

  // ACCOUNT SETTINGS

  accountSettings: {
    marginTop: 19,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
  },

  settingsTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 13,
  },

  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
  },

  settingsButtonText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "800",
  },

  settingsDivider: {
    height: 20,
    width: 1,
    backgroundColor: COLORS.border,
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

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9,17,40,0.72)",
    justifyContent: "center",
    padding: 22,
  },

  modalBox: {
    backgroundColor: COLORS.white,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.goldLight,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.navy,
  },

  modalSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 5,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.navy,
  },

  cancelButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },

  cancelText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
});