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
// 🟡 MAIN EDIT ITEM SCREEN
// ==========================================

export default function ItemEdit() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const itemId =
    typeof params.id === "string"
      ? params.id
      : params.id?.[0] ?? "";

  // ==========================================
  // 🔵 SCREEN STATES
  // ==========================================

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // ==========================================
// 🟡 CROSS-PLATFORM MESSAGE
// ==========================================

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

  // ==========================================
  // 🟡 LOAD ITEM FROM SUPABASE
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const loadItem = async () => {
      if (!itemId) {
        Alert.alert("Error", "Item ID is missing.");

        if (isMounted) {
          setLoading(false);
        }

        return;
      }

      setLoading(true);

      const { data, error } = await (supabase as any)
        .from("items_live")
        .select(
          "id, title, price, location, description, seller_phone"
        )
        .eq("id", itemId)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("Load item error:", error.message);

        Alert.alert(
          "Unable to Load Item",
          error.message
        );

        setLoading(false);
        return;
      }

      if (!data) {
        Alert.alert(
          "Item Not Found",
          "This item could not be found."
        );

        setLoading(false);
        return;
      }

      // ==========================================
      // 🟢 POPULATE ALL EDITABLE FIELDS
      // ==========================================

      setTitle(data.title ?? "");
      setPrice(String(data.price ?? ""));
      setLocation(data.location ?? "");
      setDescription(data.description ?? "");
      setSellerPhone(data.seller_phone ?? "");

      setLoading(false);
    };

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

 // 💾 SAVE ITEM — ALL FIELDS OPTIONAL
const saveItem = async () => {
  if (!itemId) {
    showMessage("Error", "Item ID is missing.");
    return;
  }

  setSaving(true);

  try {
    const updateData: any = {};

    // 📝 UPDATE ONLY FIELDS THE USER ENTERED
    if (title.trim() !== "") {
      updateData.title = title.trim();
    }

    if (price.trim() !== "") {
      const numericPrice = Number(price.trim());

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        showMessage("Invalid Price", "Enter a valid price.");
        return;
      }

      updateData.price = numericPrice;
    }

    if (location.trim() !== "") {
      updateData.location = location.trim();
    }

    if (description.trim() !== "") {
      updateData.description = description.trim();
    }

    if (sellerPhone.trim() !== "") {
      updateData.seller_phone = sellerPhone.trim();
    }

    // ⚠️ NOTHING ENTERED
    if (Object.keys(updateData).length === 0) {
      showMessage("No Changes", "Enter at least one field to update.");
      return;
    }

    console.log("Updating item:", itemId);
    console.log("Update data:", updateData);

    // 🔄 UPDATE SUPABASE
    const { data, error } = await (supabase as any)
      .from("items_live")
      .update(updateData)
      .eq("id", Number(itemId))
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("SUPABASE UPDATE ERROR:", error);
      showMessage("Save Failed", error.message);
      return;
    }

    // 🔍 CHECK WHETHER A ROW WAS UPDATED
    if (!data) {
      showMessage(
        "Update Failed",
        "No item was updated. Check that the item exists and you have permission to edit it."
      );
      return;
    }

    // ✅ SUCCESS
    showMessage("Success", "Your item has been updated successfully.");
    router.back();

  } catch (error: any) {
    console.error("SAVE ITEM ERROR:", error);

    showMessage(
      "Unexpected Error",
      error?.message || "Unable to save your item."
    );
  } finally {
    setSaving(false);
  }
};

  // ==========================================
  // 🟣 REUSABLE INPUT COMPONENT
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
  ) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={options?.multiline}
          keyboardType={options?.keyboardType || "default"}
          textAlignVertical={
            options?.multiline ? "top" : "center"
          }
          editable={!saving}
          style={[
            styles.input,
            options?.multiline && styles.multilineInput,
          ]}
        />

        {options?.helper ? (
          <Text style={styles.helperText}>
            {options.helper}
          </Text>
        ) : null}
      </View>
    );
  };

  // ==========================================
  // 🔵 LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator
            size="large"
            color="#07865B"
          />
        </View>

        <Text style={styles.loadingTitle}>
          Loading Your Item
        </Text>

        <Text style={styles.loadingSubtitle}>
          Please wait while we retrieve your product details.
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
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Edit Item
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage your marketplace listing
            </Text>
          </View>
        </View>

        {/* 🟡 INTRODUCTION CARD */}

        <View style={styles.introCard}>
          <View style={styles.introIconContainer}>
            <Text style={styles.introIcon}>
              ✏️
            </Text>
          </View>

          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>
              Update Your Product
            </Text>

            <Text style={styles.introDescription}>
              Keep your product information accurate so
              buyers can easily contact you.
            </Text>
          </View>
        </View>

        {/* 🟢 PRODUCT DETAILS */}

        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text>📦</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Product Details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Basic information about your product
              </Text>
            </View>
          </View>

          {renderInput(
            "Product Title *",
            title,
            setTitle,
            "Enter product title"
          )}

          {renderInput(
            "Price (GH₵) *",
            price,
            setPrice,
            "Enter selling price",
            {
              keyboardType: "numeric",
              helper: "Enter the price in Ghana cedis.",
            }
          )}

          {renderInput(
            "Location",
            location,
            setLocation,
            "Enter product location",
            {
              helper: "Where is this product available?",
            }
          )}

          {renderInput(
            "Description",
            description,
            setDescription,
            "Write something about your product...",
            {
              multiline: true,
              helper: "Give buyers useful information about your product.",
            }
          )}
        </View>

        {/* 🟢 SELLER CONTACT DETAILS */}

        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text>📞</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Seller Contact
              </Text>

              <Text style={styles.sectionSubtitle}>
                Contact information for buyers
              </Text>
            </View>
          </View>

          {renderInput(
            "Seller Phone Number",
            sellerPhone,
            setSellerPhone,
            "Enter seller phone number",
            {
              keyboardType: "phone-pad",
              helper: "Enter the phone number buyers should use to contact you.",
            }
          )}

          <View style={styles.contactNotice}>
            <Text style={styles.contactNoticeIcon}>
              ℹ️
            </Text>

            <Text style={styles.contactNoticeText}>
              Make sure your contact number is correct
              before saving your changes.
            </Text>
          </View>
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
            <View style={styles.savingContent}>
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text style={styles.saveButtonText}>
                Saving Changes...
              </Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>
              ✓  Save Changes
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

        {/* ⚪ FOOTER */}

        <Text style={styles.footerText}>
          NASARA GHANA
        </Text>

        <Text style={styles.footerSubtitle}>
          Connecting buyers and sellers
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// 🎨 BEAUTIFUL NASARA UI STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F7F5",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 45,
  },

  // ==========================================
  // 🔵 LOADING
  // ==========================================

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F7F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingIcon: {
    width: 75,
    height: 75,
    borderRadius: 22,
    backgroundColor: "#E2F5EB",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#173D30",
    marginTop: 18,
  },

  loadingSubtitle: {
    color: "#819087",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },

  // ==========================================
  // 🟢 HEADER
  // ==========================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },

  backButtonText: {
    fontSize: 34,
    color: "#07865B",
    fontWeight: "500",
    lineHeight: 38,
    marginTop: -4,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#143A2D",
  },

  headerSubtitle: {
    color: "#7A8981",
    fontSize: 12,
    marginTop: 4,
  },

  // ==========================================
  // 🟡 INTRODUCTION
  // ==========================================

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E4F5EC",
    borderRadius: 17,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#CDEBDD",
  },

  introIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  introIcon: {
    fontSize: 23,
  },

  introTextContainer: {
    flex: 1,
  },

  introTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#126344",
    marginBottom: 5,
  },

  introDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: "#537765",
  },

  // ==========================================
  // 🟢 FORM CARDS
  // ==========================================

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E8EEEA",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  sectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#EAF6EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#173D30",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#87948D",
    marginTop: 4,
  },

  // ==========================================
  // 🟣 INPUT FIELDS
  // ==========================================

  inputGroup: {
    marginBottom: 19,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#344C42",
    marginBottom: 8,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#DFE8E2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFCFB",
    color: "#173D30",
    fontSize: 14,
  },

  multilineInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 13,
  },

  helperText: {
    fontSize: 10,
    color: "#929E97",
    marginTop: 7,
    lineHeight: 15,
  },

  // ==========================================
  // 🟡 CONTACT NOTICE
  // ==========================================

  contactNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F7F3",
    padding: 12,
    borderRadius: 11,
    marginTop: -3,
  },

  contactNoticeIcon: {
    fontSize: 14,
    marginRight: 8,
  },

  contactNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#527361",
    lineHeight: 17,
  },

  // ==========================================
  // 🟢 SAVE BUTTON
  // ==========================================

  saveButton: {
    backgroundColor: "#07865B",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
    marginTop: 3,
    elevation: 2,
  },

  saveButtonDisabled: {
    backgroundColor: "#82AA98",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  savingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // ==========================================
  // 🔴 CANCEL
  // ==========================================

  cancelButton: {
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 5,
  },

  cancelButtonText: {
    color: "#718078",
    fontSize: 13,
    fontWeight: "800",
  },

  // ==========================================
  // ⚪ FOOTER
  // ==========================================

  footerText: {
    textAlign: "center",
    color: "#07865B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 20,
  },

  footerSubtitle: {
    textAlign: "center",
    color: "#A0AAA4",
    fontSize: 10,
    marginTop: 5,
  },
});