import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function QuotationPreview() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [app, setApp] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const [pdfFile, setPdfFile] =
    useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data, error } =
      await supabase
        .from("utility_applications")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setApp(data);
  };

  const pickPdf = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
        });

      if (result.canceled) return;

      setPdfFile(result.assets[0]);
    } catch (err) {
      Alert.alert(
        "Error",
        "Unable to select PDF."
      );
    }
  };

  const uploadPdfToCloudflare =
    async () => {
      if (!pdfFile) {
        throw new Error(
          "Please select a quotation PDF."
        );
      }

      const formData = new FormData();

      formData.append("file", {
        uri: pdfFile.uri,
        name:
          pdfFile.name ||
          `quotation-${id}.pdf`,
        type: "application/pdf",
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

  const saveQuotation =
    async () => {
      if (!amount) {
        Alert.alert(
          "Enter quotation amount."
        );
        return;
      }

      if (!pdfFile) {
        Alert.alert(
          "Please upload the official NEDCo quotation PDF."
        );
        return;
      }

      try {
        setLoading(true);

        const pdfUrl =
          await uploadPdfToCloudflare();

        const { error } =
          await (supabase as any)
            .from(
              "utility_quotations"
            )
            .insert({
              application_id: id,
              amount:
                Number(amount),
              pdf_url: pdfUrl,
              status: "issued",
            });

        if (error) {
          throw error;
        }

        const {
          error:
            updateError,
        } = await (supabase as any)
          .from(
            "utility_applications"
          )
          .update({
            status:
              "Waiting Payment",
          })
          .eq("id", id);

        if (updateError) {
          throw updateError;
        }

        Alert.alert(
          "Success",
          "Official quotation uploaded successfully.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace(
                  "/(utilities-admin)/applications"
                ),
            },
          ]
        );
      } catch (err: any) {
        Alert.alert(
          "Error",
          err.message
        );
      } finally {
        setLoading(false);
      }
    };

  if (!app) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems: "center",
        }}
      >
        <Text>
          Loading application...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor:
          "#f8fafc",
      }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 40,
      }}
    >
      <View
        style={{
          backgroundColor:
            "#2563eb",
          borderRadius: 20,
          padding: 20,
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
          Upload Official Quotation
        </Text>

        <Text
          style={{
            color: "#dbeafe",
            marginTop: 6,
          }}
        >
          Upload the signed NEDCo quotation PDF.
        </Text>
      </View>

      <View
        style={{
          backgroundColor:
            "#fff",
          borderRadius: 18,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          Applicant Details
        </Text>

        <Text
          style={{
            marginTop: 12,
          }}
        >
          👤 {app.full_name}
        </Text>

        <Text
          style={{
            marginTop: 6,
          }}
        >
          📍 {app.area}
        </Text>

        <Text
          style={{
            marginTop: 6,
          }}
        >
          🏠 {app.address}
        </Text>

        <Text
          style={{
            marginTop: 6,
          }}
        >
          ⚡{" "}
          {app.service_type.replace(
            /_/g,
            " "
          )}
        </Text>
        </View>

      {/* AMOUNT INPUT */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 18,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Quotation Amount
        </Text>

        <TextInput
          placeholder="Enter amount (GH₵)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            padding: 14,
            borderRadius: 12,
          }}
        />
      </View>

      {/* PDF PICKER */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 18,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Official Quotation PDF
        </Text>

        <TouchableOpacity
          onPress={pickPdf}
          style={{
            backgroundColor: "#111827",
            padding: 14,
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
            Choose PDF File
          </Text>
        </TouchableOpacity>

        {pdfFile && (
          <Text
            style={{
              marginTop: 10,
              color: "#16a34a",
              fontWeight: "600",
            }}
          >
            Selected: {pdfFile.name}
          </Text>
        )}
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        onPress={saveQuotation}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
          padding: 18,
          borderRadius: 16,
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
            ? "Uploading..."
            : "Upload & Approve"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}