import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const SERVER_URL = "https://nasara-upload-server.onrender.com";

export default function AddRestaurantOwnerScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const showMessage = (title: string, message?: string) => {
    if (Platform.OS === "web") {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      console.log(title, message || "");
    }
  };

  const handleCreateOwner = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = password;

    if (!cleanName) {
      showMessage("Missing Information", "Please enter the restaurant owner's full name.");
      return;
    }

    if (!cleanEmail) {
      showMessage("Missing Information", "Please enter the owner's email address.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      showMessage("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${SERVER_URL}/create-restaurant-owner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: cleanName,
            email: cleanEmail,
            phone: cleanPhone || null,
            password: cleanPassword || null,
          }),
        }
      );

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const errorMessage =
          result?.error ||
          result?.message ||
          "Unable to create restaurant owner.";

        showMessage("Could Not Add Restaurant Owner", errorMessage);
        return;
      }

      const isExistingUser = result?.existing_user === true;

      if (isExistingUser) {
        showMessage(
          "Restaurant Owner Added",
          "The existing Nasara account has been granted restaurant-owner access.\n\nThey can now log in and set up their restaurant."
        );
      } else {
        showMessage(
          "Restaurant Owner Created",
          "The new Nasara account and restaurant-owner access have been created.\n\nThe owner can now log in and set up their restaurant."
        );
      }

      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");

      setTimeout(() => {
        router.back();
      }, 500);
    } catch (error) {
      console.error("Create restaurant owner error:", error);

      showMessage(
        "Connection Error",
        "Could not connect to the Nasara server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Add Restaurant Owner</Text>
            <Text style={styles.subtitle}>
              Give a Nasara user access to manage a restaurant.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🍽️ Restaurant Owner Access</Text>

          <Text style={styles.infoText}>
            The Super Admin only creates or grants the owner's access here.
            The owner will complete the restaurant setup after logging in.
          </Text>

          <View style={styles.infoList}>
            <Text style={styles.infoItem}>✓ Restaurant name</Text>
            <Text style={styles.infoItem}>✓ Logo and cover image</Text>
            <Text style={styles.infoItem}>✓ GPS location and address</Text>
            <Text style={styles.infoItem}>✓ Opening and closing hours</Text>
            <Text style={styles.infoItem}>✓ MoMo and payment details</Text>
            <Text style={styles.infoItem}>✓ Food categories and menu</Text>
            <Text style={styles.infoItem}>✓ Food pictures and prices</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Owner Information</Text>

          <Text style={styles.label}>Full Name *</Text>

          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>Email Address *</Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="owner@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.helperText}>
            If this email already belongs to a Nasara user, their existing
            account will be used.
          </Text>

          <Text style={styles.label}>Phone Number</Text>

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Optional phone number"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Required only for a new account"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <View style={styles.passwordInfo}>
            <Text style={styles.passwordInfoText}>
              If the email already has a Nasara account, their existing
              password is preserved. For a brand-new account, enter a
              password of at least 6 characters.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              loading && styles.createButtonDisabled,
            ]}
            onPress={handleCreateOwner}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.createButtonText}>
                Add Restaurant Owner
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>What happens next?</Text>

          <Text style={styles.footerStep}>
            1. The owner receives restaurant-owner access.
          </Text>

          <Text style={styles.footerStep}>
            2. The owner logs into Nasara.
          </Text>

          <Text style={styles.footerStep}>
            3. They open Profile → Actions → Restaurant.
          </Text>

          <Text style={styles.footerStep}>
            4. They select "Set Up My Restaurant".
          </Text>

          <Text style={styles.footerStep}>
            5. They enter their restaurant information and menu.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  backButtonText: {
    fontSize: 34,
    lineHeight: 38,
    color: "#111827",
    marginTop: -4,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },

  infoCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#9a3412",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#7c2d12",
    marginBottom: 12,
  },

  infoList: {
    gap: 5,
  },

  infoItem: {
    fontSize: 13,
    color: "#7c2d12",
  },

  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },

  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
    marginTop: 6,
  },

  passwordInfo: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  passwordInfoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#1e40af",
  },

  createButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  cancelButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  cancelButtonText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "700",
  },

  footerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  footerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  footerStep: {
    fontSize: 13,
    lineHeight: 21,
    color: "#4b5563",
    marginBottom: 3,
  },
});