// 🔵 ==========================================
// 🔵 NASARA - FIND A MENTOR
// 🔵 PREMIUM MENTEE APPLICATION SCREEN
// 🔵 ==========================================

import { useState } from "react";

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

import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

// 🟡 ==========================================
// 🟡 COLOUR SYSTEM
// 🟡 ==========================================

const COLORS = {
  navy: "#14213D",
  navyLight: "#203354",
  gold: "#D6A84F",
  goldLight: "#F8EFD9",
  background: "#F5F6FA",
  white: "#FFFFFF",
  text: "#172238",
  muted: "#7C8799",
  border: "#E5E9F0",
  green: "#16865B",
};

// 🟣 ==========================================
// 🟣 MAIN SCREEN
// 🟣 ==========================================

export default function RequestMentorScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [field, setField] = useState("");
  const [goals, setGoals] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");

  // 🔵 ==========================================
  // 🔵 SUBMIT MENTOR REQUEST
  // 🔵 ==========================================

  const requestMentor = async () => {
    try {
      if (
        !fullName.trim() ||
        !field.trim() ||
        !phoneNumber.trim() ||
        !email.trim()
      ) {
        Alert.alert(
          "Missing Info",
          "Please fill all required fields"
        );

        return;
      }

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          "Login Required",
          "Please login first"
        );

        setLoading(false);
        return;
      }

      const { error } = await (supabase as any)
        .from("mentor_requests")
        .insert({
          user_id: user.id,
          full_name: fullName,
          field,
          goals,
          phone_number: phoneNumber,
          email,
          occupation,
        });

      if (error) {
        console.log(error);

        Alert.alert(
          "Error",
          error.message
        );

        setLoading(false);
        return;
      }

      if (Platform.OS === "web") {
        window.alert(
          "Mentor request submitted successfully"
        );
      } else {
        Alert.alert(
          "Success",
          "Mentor request submitted successfully"
        );
      }

      router.back();

    } catch (e: any) {
      console.log(e);

      Alert.alert(
        "Error",
        e.message
      );
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ==========================================
  // 🟢 REUSABLE FORM FIELD
  // 🟢 ==========================================

  const FormField = ({
    label,
    placeholder,
    value,
    onChangeText,
    icon,
    keyboardType,
    multiline = false,
    required = false,
    autoCapitalize,
  }: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    icon: keyof typeof Ionicons.glyphMap;
    keyboardType?: "default" | "email-address" | "phone-pad";
    multiline?: boolean;
    required?: boolean;
    autoCapitalize?: "none" | "sentences" | "words";
  }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
        </Text>

        {required && (
          <Text style={styles.requiredLabel}>
            REQUIRED
          </Text>
        )}
      </View>

      <View
        style={[
          styles.inputContainer,
          multiline && styles.multilineContainer,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.gold}
          style={[
            styles.inputIcon,
            multiline && styles.multilineIcon,
          ]}
        />

        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9AA3B2"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          autoCapitalize={autoCapitalize || "sentences"}
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
        />
      </View>
    </View>
  );

  // 🟡 ==========================================
  // 🟡 MAIN UI
  // 🟡 ==========================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🔵 PREMIUM HEADER */}

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons
                name="school"
                size={20}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.brandName}>
              NASARA
            </Text>

            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                MENTORSHIP
              </Text>
            </View>
          </View>

          {/* HERO CONTENT */}

          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroEyebrow}>
                LEARN • GROW • ACHIEVE
              </Text>

              <Text style={styles.heroTitle}>
                Find Your{"\n"}Mentor
              </Text>

              <Text style={styles.heroSubtitle}>
                Connect with experienced people who can
                guide you towards your personal and
                professional goals.
              </Text>
            </View>

            <View style={styles.heroIllustration}>
              <Ionicons
                name="people"
                size={42}
                color={COLORS.gold}
              />

              <View style={styles.heroSmallIcon}>
                <Ionicons
                  name="search"
                  size={15}
                  color={COLORS.navy}
                />
              </View>
            </View>
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.headerLine} />

            <Text style={styles.headerBottomText}>
              Your growth. Your journey. Your mentor.
            </Text>
          </View>
        </View>

        {/* 🟡 FORM INTRODUCTION */}

        <View style={styles.formIntro}>
          <View style={{ flex: 1 }}>
            <Text style={styles.formTitle}>
              Mentee application
            </Text>

            <Text style={styles.formSubtitle}>
              Tell us what you want to learn and achieve.
            </Text>
          </View>

          <View style={styles.formIcon}>
            <Ionicons
              name="create-outline"
              size={23}
              color={COLORS.navy}
            />
          </View>
        </View>

        {/* 🟢 PERSONAL INFORMATION */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="person-outline"
                size={19}
                color={COLORS.gold}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Personal information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Your contact and identity details
              </Text>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <FormField
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            icon="person-outline"
            required
          />

          <FormField
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            icon="call-outline"
            keyboardType="phone-pad"
            required
          />

          <FormField
            label="Email Address"
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />
        </View>

        {/* 🔵 LEARNING INTERESTS */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="book-outline"
                size={19}
                color={COLORS.gold}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Learning interests
              </Text>

              <Text style={styles.sectionSubtitle}>
                What kind of mentorship are you seeking?
              </Text>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <FormField
            label="Field Needed"
            placeholder="e.g. Technology, Business, Agriculture"
            value={field}
            onChangeText={setField}
            icon="layers-outline"
            required
          />

          <FormField
            label="Occupation / Profession"
            placeholder="Enter your current profession"
            value={occupation}
            onChangeText={setOccupation}
            icon="briefcase-outline"
          />

          <FormField
            label="What Help Do You Need?"
            placeholder="Describe your goals, challenges and what you want to learn from a mentor..."
            value={goals}
            onChangeText={setGoals}
            icon="bulb-outline"
            multiline
          />
        </View>

        {/* 🟣 MENTORSHIP INFORMATION */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="sparkles-outline"
              size={26}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Your mentorship journey
            </Text>

            <Text style={styles.infoDescription}>
              After matching, you can contact your mentor
              using their phone number or connect through
              Discover Users on Nasara.
            </Text>
          </View>
        </View>

        {/* 🟢 SUBMIT BUTTON */}

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={requestMentor}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.navy} />
          ) : (
            <>
              <Ionicons
                name="paper-plane"
                size={19}
                color={COLORS.navy}
              />

              <Text style={styles.buttonText}>
                Request Mentor
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color={COLORS.navy}
              />
            </>
          )}
        </TouchableOpacity>

        {/* 🔵 FOOTER */}

        <View style={styles.footer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={COLORS.muted}
          />

          <Text style={styles.footerText}>
            Take the next step towards achieving your goals.
          </Text>
        </View>

        <View style={styles.bottomBrand}>
          <Text style={styles.bottomBrandText}>
            POWERED BY NASARA
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// 🎨 ==========================================
// 🎨 STYLES
// 🎨 ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // 🔵 HEADER

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 23,
    paddingTop: 58,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  brandIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },

  brandName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },

  headerBadge: {
    marginLeft: "auto",
    backgroundColor: "rgba(255,255,255,0.09)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },

  headerBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },

  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 37,
  },

  heroSubtitle: {
    color: "#C1CAD9",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 245,
  },

  heroIllustration: {
    width: 90,
    height: 90,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(214,168,79,0.35)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  heroSmallIcon: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    right: -5,
    top: -5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.navy,
  },

  headerBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 30,
  },

  headerLine: {
    width: 27,
    height: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },

  headerBottomText: {
    color: "#C1CAD9",
    fontSize: 11,
  },

  // 🟡 FORM INTRO

  formIntro: {
    marginHorizontal: 20,
    marginTop: 27,
    marginBottom: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  formTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },

  formSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  formIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
  },

  // 🟢 SECTION CARDS

  sectionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 17,
    marginBottom: 15,
    padding: 17,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sectionIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 17,
    marginBottom: 17,
  },

  // 🟣 FORM FIELDS

  fieldContainer: {
    marginBottom: 17,
  },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  requiredLabel: {
    color: "#A17A32",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFD",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 13,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 13,
    minHeight: 52,
  },

  multilineContainer: {
    alignItems: "flex-start",
    minHeight: 125,
    paddingTop: 13,
  },

  multilineIcon: {
    marginTop: 2,
  },

  multilineInput: {
    minHeight: 105,
    paddingTop: 0,
  },

  // 🔵 INFORMATION CARD

  infoCard: {
    marginHorizontal: 18,
    marginTop: 5,
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 19,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "rgba(214,168,79,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  infoDescription: {
    color: "#C1CAD9",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6,
  },

  // 🟡 BUTTON

  button: {
    marginHorizontal: 18,
    marginTop: 22,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 18,
    shadowColor: COLORS.navy,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 3,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  // 🟢 FOOTER

  footer: {
    marginTop: 19,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "center",
    flexShrink: 1,
  },

  bottomBrand: {
    alignItems: "center",
    marginTop: 22,
  },

  bottomBrandText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});