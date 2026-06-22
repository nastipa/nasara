import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Apply() {
  const router = useRouter();
  const { service } = useLocalSearchParams();

  const serviceType = String(service || "");

// Service checks
const isDomestic =
  serviceType === "separate_domestic";

const isNewService =
  serviceType === "new_service";

const isCommercial =
  serviceType === "commercial_meter";

const isTransfer =
  serviceType === "transfer_meter";

  const [loading, setLoading] = useState(false);

  // User info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [station, setStation] = useState("");
  const [address, setAddress] = useState("");
  const [nedcoReceipt, setNedcoReceipt] =
  useState<string | null>(null);
  const [
  nasaraPaymentProof,
  setNasaraPaymentProof,
] = useState<string | null>(null);
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
  // Documents
  const [ghanaCard, setGhanaCard] = useState<string | null>(null);
  const [energyCommission, setEnergyCommission] = useState<string | null>(null);
  const [currentBill, setCurrentBill] = useState<string | null>(null);
  const [sitePlan, setSitePlan] = useState<string | null>(null);
  const [transferLetter, setTransferLetter] = useState<string | null>(null);
  const [applicationLetter, setApplicationLetter] =
  useState<string | null>(null);
  
  const inputStyle = {
  backgroundColor: "#fff",
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 16,
  fontSize: 16,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  marginBottom: 16,
};

  // Upload function (Cloudflare backend)
  const uploadFile = async (uri: string) => {
    const formData = new FormData();

    formData.append("file", {
      uri: uri.startsWith("file://") ? uri : `file://${uri}`,
      name: "document.jpg",
      type: "image/jpeg",
    } as any);

    const res = await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  };

  // Pick image
  const pickImage = async (setter: any) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  // Reusable upload card UI
  const uploadCard = (title: string, onPress: any, uploaded: boolean) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <Text style={{ fontWeight: "700", fontSize: 18 }}>{title}</Text>
      <Text style={{ marginTop: 6, color: uploaded ? "green" : "#666" }}>
        {uploaded ? "Uploaded" : "Tap to upload"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f5f5f5" }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text
  style={{
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  }}
>
  Apply for Utility Service
</Text>

<Text
  style={{
    color: "#6b7280",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 10,
  }}
>
  Complete the form below to submit your application.
</Text>
      <View
  style={{
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    marginTop: 10,
    marginBottom: 24,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
      textTransform: "capitalize",
    }}
  >
    {serviceType.replace(/_/g, " ")}
  </Text>
</View>
      {/* FORM INPUTS */}
      
<TextInput
  placeholder="👤 Full Name"
  value={name}
  onChangeText={setName}
  style={inputStyle}
/>

<TextInput
  placeholder="📞 Phone Number"
  keyboardType="phone-pad"
  value={phone}
  onChangeText={setPhone}
  style={inputStyle}
/>

<TextInput
  placeholder="📍 Area"
  value={area}
  onChangeText={setArea}
  style={inputStyle}
/>

<TextInput
  placeholder="🏢 Station"
  value={station}
  onChangeText={setStation}
  style={inputStyle}
/>

<TextInput
  placeholder="🏠 Full Address"
  value={address}
  onChangeText={setAddress}
  style={[
    inputStyle,
    {
      height: 110,
      textAlignVertical: "top",
    },
  ]}
  multiline
/>
      
   {/* ---------------- DOMESTIC / SEPARATE METER ---------------- */}
{isDomestic && (
  <>
    {uploadCard(
      "Upload Ghana Card",
      () => pickImage(setGhanaCard),
      !!ghanaCard
    )}

    {uploadCard(
      "Upload Energy Commission",
      () => pickImage(setEnergyCommission),
      !!energyCommission
    )}

    {uploadCard(
      "Upload Current Bill",
      () => pickImage(setCurrentBill),
      !!currentBill
    )}
  </>
)}

{/* ---------------- COMMERCIAL METER ---------------- */}
{isCommercial && (
  <>
    {uploadCard(
      "Upload Ghana Card",
      () => pickImage(setGhanaCard),
      !!ghanaCard
    )}

    {uploadCard(
      "Upload Energy Commission",
      () => pickImage(setEnergyCommission),
      !!energyCommission
    )}

    {uploadCard(
      "Upload Current Bill",
      () => pickImage(setCurrentBill),
      !!currentBill
    )}
  </>
)}

{/* ---------------- NEW SERVICE ---------------- */}
{isNewService && (
  <>
    {uploadCard(
      "Upload Ghana Card",
      () => pickImage(setGhanaCard),
      !!ghanaCard
    )}

    {uploadCard(
      "Upload Energy Commission",
      () => pickImage(setEnergyCommission),
      !!energyCommission
    )}

    {uploadCard(
      "Upload Site Plan",
      () => pickImage(setSitePlan),
      !!sitePlan
    )}

    {uploadCard(
      "Upload Application Letter",
      () => pickImage(setApplicationLetter),
      !!applicationLetter
    )}
  </>
)}

{/* ---------------- TRANSFER METER ---------------- */}
{isTransfer && (
  <>
    {uploadCard(
      "Upload Ghana Card",
      () => pickImage(setGhanaCard),
      !!ghanaCard
    )}

    {uploadCard(
      "Upload Energy Commission",
      () => pickImage(setEnergyCommission),
      !!energyCommission
    )}

    {uploadCard(
      "Upload Transfer Letter",
      () => pickImage(setTransferLetter),
      !!transferLetter
    )}
  </>
)}

{/* Common uploads */}
{uploadCard(
  "Upload NEDCo Receipt",
  () => pickImage(setNedcoReceipt),
  !!nedcoReceipt
)}

{uploadCard(
  "Upload Nasara Payment Proof",
  () => pickImage(setNasaraPaymentProof),
  !!nasaraPaymentProof
)}
<View
  style={{
    backgroundColor: "#fff7ed",
    borderRadius: 20,
    padding: 22,
    marginTop: 20,
    shadowColor: "#000",
shadowOpacity: 0.08,
shadowRadius: 8,
shadowOffset: {
  width: 0,
  height: 3,
},
elevation: 4,
  }}
>
  <Text style={{ fontWeight: "700" }}>
    Nasara Processing Fee
  </Text>

  <Text>
    Amount: GH₵20.00
  </Text>

  <Text>
    Network: MTN
  </Text>

  <Text>
    MoMo Number: 0539703374
  </Text>

  <Text
    style={{
      marginTop: 10,
    }}
  >
    Pay GH₵5 to Nasara and upload
    your NEDCo receipt before
    submitting.
  </Text>
</View>

      <View
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 14,
          marginTop: 20,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 18,
            marginBottom: 10,
          }}
        >
          Application Fee
        </Text>

        <Text>NEDCo Form Fee: GH₵10.00</Text>
        <Text>Nasara Service Fee: GH₵20.00</Text>

        <Text
          style={{
            fontWeight: "bold",
            marginTop: 8,
            fontSize: 16,
          }}
        >
          Total: GH₵30.00
        </Text>
      </View>

      <TouchableOpacity
        onPress={async () => {
          try {
            setLoading(true);

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              Alert.alert(
                "Login Required",
                "Please login first."
              );
              return;
            }

            if (
              !name ||
              !phone ||
              !area ||
              !station
            ) {
              showMessage(
                "Missing Information",
                "Complete all required fields."
              );
              return;
            }

            let ghanaCardUrl = null;
            let energyCommissionUrl = null;
            let currentBillUrl = null;
            let sitePlanUrl = null;
            let transferLetterUrl = null;
            let nedcoReceiptUrl = null;
            let nasaraPaymentProofUrl = null;
            let applicationLetterUrl = null;
            if (ghanaCard) {
  ghanaCardUrl = await uploadFile(ghanaCard);
}

if (energyCommission) {
  energyCommissionUrl = await uploadFile(energyCommission);
}

if ((isDomestic || isCommercial) && currentBill) {
  currentBillUrl = await uploadFile(currentBill);
}

if (isNewService && sitePlan) {
  sitePlanUrl = await uploadFile(sitePlan);
}

if (isNewService && applicationLetter) {
  applicationLetterUrl = await uploadFile(applicationLetter);
}

if (isTransfer && transferLetter) {
  transferLetterUrl = await uploadFile(transferLetter);
}

if (nedcoReceipt) {
  nedcoReceiptUrl = await uploadFile(nedcoReceipt);
}

if (nasaraPaymentProof) {
  nasaraPaymentProofUrl = await uploadFile(
    nasaraPaymentProof
  );
}

             const applicationNo =
              `UTL-${Date.now()}`;

            const { error } =
              await (supabase as any)
                .from(
                  "utility_applications"
                )
                .insert({
                  user_id: user.id,
                  application_no:
                    applicationNo,
                  full_name: name,
                  phone,
                  area,
                  station,
                  address,
                  service_type:
                    serviceType,
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
                    nedco_receipt_url:
                    nedcoReceiptUrl,
                    nasara_payment_proof_url:
                    nasaraPaymentProofUrl,
                    application_letter_url:
                    applicationLetterUrl,
                  status: "Pending",
                });

            if (error) throw error;

            showMessage(
              "Success",
              "Application submitted successfully. Waiting for approval."
            );

            router.replace(
              "/services/my-applications"
            );
          } catch (error: any) {
  console.log(error);

  Alert.alert(
    "Error",
    error?.message || JSON.stringify(error)
  );

          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
          padding: 18,
          borderRadius: 14,
          marginTop: 24,
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
          {loading
            ? "Submitting..."
            : "Submit Application"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}