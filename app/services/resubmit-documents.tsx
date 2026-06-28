import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ResubmitDocuments() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [app, setApp] = useState<any>(null);

  const [ghanaCard, setGhanaCard] =
    useState<string | null>(null);

  const [energyCommission, setEnergyCommission] =
    useState<string | null>(null);

  const [currentBill, setCurrentBill] =
    useState<string | null>(null);

  const [sitePlan, setSitePlan] =
    useState<string | null>(null);

  const [transferLetter, setTransferLetter] =
    useState<string | null>(null);
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


  useEffect(() => {
    loadApplication();
  }, []);

  const loadApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("utility_applications")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setApp(data);
    } catch (e: any) {
      showMessage(
        "Error",
        e.message || "Failed to load application."
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (setter: any) => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const uploadFile = async (uri: string) => {
    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();

      formData.append(
        "file",
        blob,
        "document.jpg"
      );
    } else {
      formData.append("file", {
        uri: uri.startsWith("file://")
          ? uri
          : `file://${uri}`,
        name: "document.jpg",
        type: "image/jpeg",
      } as any);
    }

    const res = await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Upload failed"
      );
    }

    return data.url;
  };

  const uploadCard = (
    title: string,
    value: string | null,
    setter: any
  ) => (
    <TouchableOpacity
      onPress={() => pickImage(setter)}
      style={{
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 16,
        marginTop: 14,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 17,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          marginTop: 6,
          color: value ? "#16a34a" : "#6b7280",
        }}
      >
        {value
          ? "✅ New document selected"
          : "Tap to select a replacement"}
      </Text>
    </TouchableOpacity>
  );
  const submitResubmission = async () => {
  try {
    setSaving(true);

    let ghanaCardUrl = app.ghana_card_url;
    let energyCommissionUrl =
      app.energy_commission_url;
    let currentBillUrl =
      app.current_bill_url;
    let sitePlanUrl =
      app.site_plan_url;
    let transferLetterUrl =
      app.transfer_letter_url;

    if (ghanaCard) {
      ghanaCardUrl =
        await uploadFile(ghanaCard);
    }

    if (energyCommission) {
      energyCommissionUrl =
        await uploadFile(
          energyCommission
        );
    }

    if (currentBill) {
      currentBillUrl =
        await uploadFile(currentBill);
    }

    if (sitePlan) {
      sitePlanUrl =
        await uploadFile(sitePlan);
    }

    if (transferLetter) {
      transferLetterUrl =
        await uploadFile(
          transferLetter
        );
    }

    const { error } = await (supabase as any)
      .from("utility_applications")
      .update({
        ghana_card_url:
          ghanaCardUrl,
        energy_commission_url:
          energyCommissionUrl,
        current_bill_url:
          currentBillUrl,
        site_plan_url:
          sitePlanUrl,
        transfer_letter_url:
          transferLetterUrl,

        admin_message: null,
        requires_resubmission: false,
        status: "Under Review",
      })
      .eq("id", id);

    if (error) throw error;

    showMessage(
      "Success",
      "Your updated documents have been submitted successfully."
    );

    router.replace(
      `/services/application-details?id=${id}`
    );
  } catch (e: any) {
    showMessage(
      "Upload Failed",
      e.message || "Please try again."
    );
  } finally {
    setSaving(false);
  }
};
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
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
    <Text
      style={{
        fontSize: 28,
        fontWeight: "800",
        color: "#111827",
      }}
    >
      Resubmit Documents
    </Text>

    <Text
      style={{
        marginTop: 8,
        color: "#6b7280",
        lineHeight: 22,
      }}
    >
      The administrator has requested new documents before your application
      can continue.
    </Text>

    {app?.admin_message && (
      <View
        style={{
          backgroundColor: "#fef3c7",
          borderRadius: 16,
          padding: 16,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            color: "#92400e",
            marginBottom: 8,
          }}
        >
          ⚠️ Admin Message
        </Text>

        <Text
          style={{
            color: "#92400e",
            lineHeight: 22,
          }}
        >
          {app.admin_message}
        </Text>
      </View>
    )}

    {uploadCard(
      "Replace Ghana Card",
      ghanaCard,
      setGhanaCard
    )}

    {uploadCard(
      "Replace Energy Commission",
      energyCommission,
      setEnergyCommission
    )}

    {uploadCard(
      "Replace Current Bill",
      currentBill,
      setCurrentBill
    )}

    {uploadCard(
      "Replace Site Plan",
      sitePlan,
      setSitePlan
    )}

    {uploadCard(
      "Replace Transfer Letter",
      transferLetter,
      setTransferLetter
    )}
    
    <TouchableOpacity
      onPress={submitResubmission}
      disabled={saving}
      style={{
        backgroundColor: "#2563eb",
        padding: 18,
        borderRadius: 16,
        marginTop: 28,
        marginBottom: 40,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "700",
          fontSize: 16,
        }}
      >
        {saving
          ? "Uploading..."
          : "Submit Resubmission"}
      </Text>
    </TouchableOpacity>
  </ScrollView>
);
}
