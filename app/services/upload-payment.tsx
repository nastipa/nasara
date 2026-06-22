import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function UploadPayment() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] =
    useState<any>(null);
    const showMessage = (
  title: string,
  message?: string
) => {
  if (Platform.OS === "web") {
    window.alert(
      message
        ? `${title}\n\n${message}`
        : title
    );
  } else {
    Alert.alert(title, message);
  }
};

  const pickReceipt = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "image/*",
          ],
          copyToCacheDirectory: true,
        });

      if (result.canceled) return;

      setReceiptFile(result.assets[0]);
    } catch {
      Alert.alert(
        "Error",
        "Unable to select receipt."
      );
    }
  };

  const uploadToCloudflare =
    async () => {
      if (!receiptFile) {
        throw new Error(
          "Please select receipt."
        );
      }

      const formData = new FormData();

      formData.append("file", {
        uri: receiptFile.uri,
        name:
          receiptFile.name ||
          "payment-receipt",
        type:
          receiptFile.mimeType ||
          "application/octet-stream",
      } as any);

      const response =
        await fetch(
          "https://nasara-upload-server.onrender.com/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Upload failed."
        );
      }

      return result.url;
    };

  const submitReceipt =
    async () => {
      if (!receiptFile) {
        Alert.alert(
          "Upload receipt first."
        );
        return;
      }

      try {
        setLoading(true);

        const receiptUrl =
          await uploadToCloudflare();

        const { error } =
          await (supabase as any)
            .from(
              "utility_applications"
            )
            .update({
              payment_receipt_url:
                receiptUrl,
              status:
                "Payment Submitted",
            })
            .eq("id", id);

        if (error) {
          throw error;
        }

        showMessage(
          "Success",
          "Payment receipt submitted successfully."
        );

        router.replace(
          "/services/my-applications"
        );
      } catch (e: any) {
        Alert.alert(
          "Error",
          e.message
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <View
        style={{
          backgroundColor: "#16a34a",
          padding: 22,
          borderRadius: 20,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 26,
            fontWeight: "800",
          }}
        >
          Upload Payment Receipt
        </Text>

        <Text
          style={{
            color: "#dcfce7",
            marginTop: 6,
          }}
        >
          Upload your NEDCo payment receipt
          after making payment.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 18,
            marginBottom: 12,
          }}
        >
          Payment Proof
        </Text>

        <TouchableOpacity
          onPress={pickReceipt}
          style={{
            backgroundColor: "#111827",
            padding: 15,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "700",
            }}
          >
            Choose Receipt
          </Text>
        </TouchableOpacity>

        {receiptFile && (
          <Text
            style={{
              marginTop: 12,
              color: "#16a34a",
              fontWeight: "600",
            }}
          >
            ✓ {receiptFile.name}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={submitReceipt}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          padding: 18,
          borderRadius: 16,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "800",
            fontSize: 16,
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Payment Receipt"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}