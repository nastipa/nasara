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

    // Only allow internal app routes.
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
      Alert.alert(
        "Error",
        "Email and password required"
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
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

        Alert.alert(
          "Login failed",
          error.message
        );

        return;
      }

      const user = data.user;

      if (!user) {
        setLoading(false);

        Alert.alert(
          "Error",
          "Login failed"
        );

        return;
      }

      // ==========================================
      // STEP 1: ADMIN CHECK
      // ==========================================

      const {
        data: adminData,
      } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminData) {
        setLoading(false);

        // Preserve existing admin destination.
        router.replace("/browse" as any);
        return;
      }

      // ==========================================
      // STEP 2: GET VERIFICATION STATUS
      // ==========================================

      const {
        data: profile,
        error: profileError,
      } = await (supabase as any)
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

      if (
        profile.verification_status === "rejected"
      ) {
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

        // Return the visitor to the seller shop
        // or their original requested destination.
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
    const {
      error,
    } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      Alert.alert(
        "Error",
        error.message
      );
    } else {
      Alert.alert(
        "OTP sent to your email"
      );

      router.push("/reset-password" as any);
    }
  };

  // ==========================================
  // UPDATE EMAIL / PASSWORD
  // ==========================================

  const handleUpdate = async () => {
    if (!mode || !newValue || !currentPassword) {
      Alert.alert(
        "Error",
        "All fields required"
      );

      return;
    }

    setLoading(true);

    const {
      error: authError,
    } = await supabase.auth.signInWithPassword({
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

    const {
      error,
    } = await supabase.auth.updateUser(payload);

    setLoading(false);

    if (error) {
      Alert.alert(
        "Update failed",
        error.message
      );

      return;
    }

    Alert.alert(
      "Success",
      "Updated successfully!"
    );

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
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>
          Nasara
        </Text>

        <Text style={styles.tagline}>
          Create. Trade. Compete. Earn. 🚀
        </Text>

        <Text style={styles.subtitle}>
          One platform for ads, battles, auctions, reels & more.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>
          Sign In
        </Text>

        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
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

          <TouchableOpacity
            onPress={() =>
              setShowPassword(!showPassword)
            }
            style={{
              position: "absolute",
              right: 15,
              top: 18,
            }}
          >
            <Text>
              {showPassword ? "🙈" : "👁️"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            loading && { opacity: 0.7 },
          ]}
          onPress={signIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={goSignup}
        >
          <Text style={styles.secondaryText}>
            New customer? Create Account →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push("/forgot-password" as any)
          }
        >
          <Text
            style={{
              color: "#2563eb",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.replace("/browse" as any)
          }
        >
          <Text style={styles.backText}>
            ← Back to Marketplace
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => {
            setMode("email");
            setModalVisible(true);
          }}
        >
          <Text style={styles.linkText}>
            Change Email
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => {
            setMode("password");
            setModalVisible(true);
          }}
        >
          <Text style={styles.linkText}>
            Change Password
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================
          CHANGE EMAIL / PASSWORD MODAL
      ====================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {mode === "email"
                ? "Change Email"
                : "Change Password"}
            </Text>

            {/* CURRENT FIELD */}

            {mode === "password" ? (
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Current Password"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                  style={{
                    position: "absolute",
                    right: 15,
                    top: 18,
                  }}
                >
                  <Text>
                    {showCurrentPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Current Email"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            )}

            {/* NEW FIELD */}

            {mode === "password" ? (
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  secureTextEntry={!showNewPassword}
                  value={newValue}
                  onChangeText={setNewValue}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowNewPassword(!showNewPassword)
                  }
                  style={{
                    position: "absolute",
                    right: 15,
                    top: 18,
                  }}
                >
                  <Text>
                    {showNewPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="New Email"
                value={newValue}
                onChangeText={setNewValue}
                autoCapitalize="none"
              />
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleUpdate}
            >
              <Text style={styles.buttonText}>
                Update
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setMode(null);
              }}
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
// STYLES
// ==========================================

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
});