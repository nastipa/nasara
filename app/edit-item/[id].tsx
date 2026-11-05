// ==========================================
// 🟢 NASARA - EDIT ITEM SCREEN
// ==========================================

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// ==========================================
// 🟡 ITEM TYPE
// ==========================================

type Item = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  location?: string | null;
  seller_phone?: string | null;
};

// ==========================================
// 🟡 MAIN EDIT ITEM SCREEN
// ==========================================

export default function EditItemScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const rawId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  // ==========================================
  // 🔵 SCREEN STATES
  // ==========================================

  const [itemId, setItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ==========================================
  // 🟣 EDITABLE COLUMN STATES
  // ==========================================

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");

  // ==========================================
  // 🟡 LOAD ITEM
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const loadItem = async () => {
      if (!rawId) {
        Alert.alert("Error", "Item ID is missing.");
        setLoading(false);
        return;
      }

      const idNumber = Number(rawId);

      if (!Number.isSafeInteger(idNumber) || idNumber <= 0) {
        Alert.alert("Error", "Invalid item ID.");
        setLoading(false);
        return;
      }

      setItemId(idNumber);
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from("items_live")
        .select("*")
        .eq("id", idNumber)
        .single();

      if (!isMounted) return;

      if (error) {
        Alert.alert("Unable to Load Item", error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        Alert.alert("Error", "Item not found.");
        setLoading(false);
        return;
      }

      // ==========================================
      // 🟢 POPULATE FORM
      // ==========================================

      setTitle(data.title ?? "");
      setPrice(String(data.price ?? ""));
      setDescription(data.description ?? "");
      setLocation(data.location ?? "");
      setSellerPhone(data.seller_phone ?? "");

      setLoading(false);
    };

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [rawId]);

  // ==========================================
  // 🟡 SAVE ITEM CHANGES
  // ==========================================

  const saveItem = async () => {
    const cleanTitle = title.trim();
    const cleanPrice = price.trim();

    if (!cleanTitle) {
      Alert.alert("Missing Information", "Please enter the item title.");
      return;
    }

    if (!cleanPrice) {
      Alert.alert("Missing Information", "Please enter the item price.");
      return;
    }

    const numericPrice = Number(cleanPrice);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return;
    }

    if (!itemId) {
      Alert.alert("Error", "Item ID is missing. Please reopen this item.");
      return;
    }

    setSaving(true);

    try {
      // ==========================================
      // 🟢 UPDATE ONLY THESE DATABASE COLUMNS
      // ==========================================

      const updateData = {
        title: cleanTitle,
        price: numericPrice,
        description: description.trim() || null,
        location: location.trim() || null,
        seller_phone: sellerPhone.trim() || null,
      };

      const { data, error } = await (supabase as any)
        .from("items_live")
        .update(updateData)
        .eq("id", itemId)
        .select("id")
        .maybeSingle();

      if (error) {
        Alert.alert("Update Failed", error.message);
        return;
      }

      if (!data) {
        Alert.alert(
          "Update Not Confirmed",
          "No item was updated. Check that you have permission to edit this item."
        );
        return;
      }

      Alert.alert(
        "Success",
        "Your item has been updated successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/browse"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Save item error:", error);

      Alert.alert(
        "Error",
        error?.message || "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // 🟡 REUSABLE INPUT FIELD
  // ==========================================

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: "default" | "numeric" | "phone-pad";
      helper?: string;
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={options?.multiline}
        keyboardType={options?.keyboardType || "default"}
        textAlignVertical={options?.multiline ? "top" : "center"}
        editable={!saving}
        style={[
          styles.input,
          options?.multiline && styles.multilineInput,
        ]}
      />

      {options?.helper ? (
        <Text style={styles.helperText}>{options.helper}</Text>
      ) : null}
    </View>
  );

  // ==========================================
  // 🔵 LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#07865B" />

        <Text style={styles.loadingText}>
          Loading item details...
        </Text>
      </View>
    );
  }

  // ==========================================
  // 🟢 MAIN USER INTERFACE
  // ==========================================

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 🟢 HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={saving}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Edit Item</Text>
            <Text style={styles.headerSubtitle}>
              Update your product information
            </Text>
          </View>
        </View>

        {/* 🟡 INFORMATION CARD */}

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✏️</Text>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Manage Your Listing</Text>

            <Text style={styles.infoDescription}>
              Edit your product details and save your changes.
            </Text>
          </View>
        </View>

        {/* 🟢 PRODUCT INFORMATION */}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            📦 Product Information
          </Text>

          {renderInput(
            "Product Title *",
            title,
            setTitle,
            "Enter product name"
          )}

          {renderInput(
            "Price (GH₵) *",
            price,
            setPrice,
            "Enter product price",
            {
              keyboardType: "numeric",
              helper: "Enter the selling price in Ghana cedis.",
            }
          )}

          {renderInput(
            "Location",
            location,
            setLocation,
            "Enter product location"
          )}

          {renderInput(
            "Description",
            description,
            setDescription,
            "Describe your product...",
            {
              multiline: true,
              helper: "Provide details buyers should know about this product.",
            }
          )}
        </View>

        {/* 🟢 SELLER CONTACT */}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            📞 Seller Contact
          </Text>

          {renderInput(
            "Seller Phone Number",
            sellerPhone,
            setSellerPhone,
            "Enter seller phone number",
            {
              keyboardType: "phone-pad",
              helper: "Buyers can use this number to contact the seller.",
            }
          )}
        </View>

        {/* 🟡 SAVE BUTTON */}

        <TouchableOpacity
          onPress={saveItem}
          disabled={saving}
          activeOpacity={0.85}
          style={[
            styles.saveButton,
            saving && styles.saveButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              ✓ Save Changes
            </Text>
          )}
        </TouchableOpacity>

        {/* 🔴 CANCEL BUTTON */}

        <TouchableOpacity
          onPress={() => router.back()}
          disabled={saving}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Nasara Ghana • Manage your marketplace listing
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// 🎨 SCREEN STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7F6",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 45,
  },

  // 🟢 LOADING

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7F6",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  // 🟢 HEADER

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: "#E5EDE9",
  },

  backButtonText: {
    fontSize: 25,
    color: "#07865B",
    fontWeight: "700",
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#12372B",
  },

  headerSubtitle: {
    color: "#718078",
    fontSize: 12,
    marginTop: 4,
  },

  // 🟡 INFORMATION CARD

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F7EF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C9EBDD",
  },

  infoIcon: {
    fontSize: 27,
    marginRight: 12,
  },

  infoTextContainer: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#126344",
    marginBottom: 4,
  },

  infoDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#477461",
  },

  // 🟢 FORM CARD

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E8EEEB",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#173D30",
    marginBottom: 20,
  },

  // 🟣 INPUTS

  inputGroup: {
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#344C42",
    marginBottom: 8,
  },

  input: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: "#DCE6E0",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: "#FAFCFB",
    color: "#183B2E",
    fontSize: 14,
  },

  multilineInput: {
    height: 115,
    textAlignVertical: "top",
    paddingTop: 13,
  },

  helperText: {
    fontSize: 11,
    color: "#89968F",
    marginTop: 7,
    lineHeight: 16,
  },

  // 🟢 SAVE BUTTON

  saveButton: {
    backgroundColor: "#07865B",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: 5,
    elevation: 2,
  },

  saveButtonDisabled: {
    backgroundColor: "#83A99A",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  // 🔴 CANCEL BUTTON

  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },

  cancelButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
  },

  // ⚪ FOOTER

  footerText: {
    textAlign: "center",
    color: "#A0AAA4",
    fontSize: 10,
    marginTop: 18,
  },
});