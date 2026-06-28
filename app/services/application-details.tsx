import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ApplicationDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<any>(null);
  const [quotation, setQuotation] =
    useState<any>(null);

  useEffect(() => {
    load();
    loadQuotation();
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from("utility_applications")
        .select("*")
        .eq("id", id)
        .single();

      setApp(data);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotation = async () => {
    const { data } = await supabase
      .from("utility_quotations")
      .select("*")
      .eq("application_id", id)
      .single();

    setQuotation(data);
  };

  const openFile = (url: string) => {
    if (!url) return;

    Linking.openURL(url);
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

  if (!app) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>No application found</Text>
      </View>
    );
  }
  const documentCard = (
  title: string,
  icon: string,
  url: string | null
) => {
  if (!url) return null;

  return (
    <TouchableOpacity
      onPress={() => openFile(url)}
      style={{
        backgroundColor: "#fff",
        marginTop: 12,
        padding: 18,
        borderRadius: 18,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            marginRight: 12,
          }}
        >
          {icon}
        </Text>

        <View>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            Uploaded
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: "#2563eb",
          fontWeight: "700",
          fontSize: 15,
        }}
      >
        Open →
      </Text>
    </TouchableOpacity>
  );
};
const progressItem = (
  completed: boolean,
  title: string
) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    }}
  >
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: completed
          ? "#16a34a"
          : "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "800",
          fontSize: 18,
        }}
      >
        {completed ? "✓" : "•"}
      </Text>
    </View>

    <View
      style={{
        marginLeft: 14,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: completed
            ? "#16a34a"
            : "#9ca3af",
          marginTop: 2,
        }}
      >
        {completed
          ? "Completed"
          : "Waiting"}
      </Text>
    </View>
  </View>
);

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
    backgroundColor: "#2563eb",
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontSize: 28,
      fontWeight: "800",
    }}
  >
    ⚡ Utility Application
  </Text>

  <Text
    style={{
      color: "#dbeafe",
      fontSize: 15,
      marginTop: 6,
    }}
  >
    {app.application_no}
  </Text>

  <View
    style={{
      marginTop: 18,
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 30,
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "700",
        textTransform: "capitalize",
      }}
    >
      {app.status}
    </Text>
  </View>
</View>

      <View
  style={{
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  }}
>
  <Text
    style={{
      fontSize: 20,
      fontWeight: "800",
      color: "#111827",
      marginBottom: 18,
    }}
  >
    👤 Applicant Information
  </Text>

  <View style={row}>
    <Text style={label}>Service</Text>
    <Text style={value}>
      {app.service_type.replace(/_/g, " ")}
    </Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>Full Name</Text>
    <Text style={value}>{app.full_name}</Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>Phone</Text>
    <Text style={value}>{app.phone}</Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>Area</Text>
    <Text style={value}>{app.area}</Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>Station</Text>
    <Text style={value}>{app.station}</Text>
  </View>

  <View style={divider} />
  <View style={row}>
  <Text style={label}>Phase Type</Text>
  <Text style={value}>
    {app.phase_type || "Not Selected"}
  </Text>
</View>

<View style={divider} />

  <View style={row}>
    <Text style={label}>Address</Text>
    <Text
      style={[
        value,
        {
          flex: 1,
          textAlign: "right",
          marginLeft: 20,
        },
      ]}
    >
      {app.address}
    </Text>
  </View>
</View>


      <View
  style={{
    marginTop: 22,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  }}
>
  <Text
    style={{
      fontSize: 20,
      fontWeight: "800",
      color: "#111827",
      marginBottom: 18,
    }}
  >
    💳 Payment Information
  </Text>

  <View style={row}>
    <Text style={label}>Nasara Processing Fee</Text>
    <Text
      style={[
        value,
        {
          color: "#16a34a",
        },
      ]}
    >
      GH₵20.00
    </Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>NEDCo Form Fee</Text>
    <Text style={value}>
      Paid at NEDCo Station
    </Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>Network</Text>
    <Text style={value}>
      MTN Mobile Money
    </Text>
  </View>

  <View style={divider} />

  <View style={row}>
    <Text style={label}>MoMo Number</Text>
    <Text
      style={[
        value,
        {
          color: "#2563eb",
        },
      ]}
    >
      0539703374
    </Text>
  </View>

  <View
    style={{
      marginTop: 18,
      backgroundColor: "#eff6ff",
      padding: 14,
      borderRadius: 14,
    }}
  >
    <Text
      style={{
        color: "#1e40af",
        lineHeight: 22,
      }}
    >
      ℹ️ After approval, complete all required payments before your meter can be processed and assigned.
    </Text>
  </View>
</View>

      <Text
  style={{
    marginTop: 28,
    marginBottom: 10,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  }}
>
  📂 Uploaded Documents
</Text>

<Text
  style={{
    color: "#6b7280",
    marginBottom: 6,
  }}
>
  Tap any document below to view it.
</Text>

      {documentCard(
  "Ghana Card",
  "🪪",
  app.ghana_card_url
)}

{documentCard(
  "Energy Commission",
  "⚡",
  app.energy_commission_url
)}

{documentCard(
  "Current Bill",
  "🧾",
  app.current_bill_url
)}

{documentCard(
  "Site Plan",
  "📍",
  app.site_plan_url
)}

{documentCard(
  "Application Letter",
  "📄",
  app.application_letter_url
)}

{documentCard(
  "Transfer Letter",
  "🔄",
  app.transfer_letter_url
)}

{documentCard(
  "NEDCo Receipt",
  "🧾",
  app.nedco_receipt_url
)}

{documentCard(
  "Nasara Payment Proof",
  "💳",
  app.nasara_payment_proof_url
)}
    {app.status === "Waiting Payment" &&
 quotation?.pdf_url && (
  <>
    <TouchableOpacity
      onPress={() =>
        Linking.openURL(
          quotation.pdf_url
        )
      }
      style={{
        backgroundColor: "#2563eb",
        padding: 14,
        borderRadius: 12,
        marginTop: 12,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "700",
        }}
      >
        Download Quotation PDF
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() =>
        router.push(
          `/services/upload-payment?id=${app.id}`
        )
      }
      style={{
        backgroundColor: "#16a34a",
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "700",
        }}
      >
        Upload Payment Receipt
      </Text>
    </TouchableOpacity>
  </>
)}
      <Text
  style={{
    marginTop: 30,
    marginBottom: 14,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  }}
>
  📈 Application Progress
</Text>

      <View
  style={{
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  }}
>
 {progressItem(
  true,
  "Application Submitted"
)}

{progressItem(
  [
    "Under Review",
    "Approved",
    "Waiting Payment",
    "Payment Submitted",
    "Payment Confirmed",
    "Meter Assigned",
    "Completed",
  ].includes(app.status),
  "Under Review"
)}

{progressItem(
  [
    "Approved",
    "Waiting Payment",
    "Payment Submitted",
    "Payment Confirmed",
    "Meter Assigned",
    "Completed",
  ].includes(app.status),
  "Application Approved"
)}

{progressItem(
  [
    "Waiting Payment",
    "Payment Submitted",
    "Payment Confirmed",
    "Meter Assigned",
    "Completed",
  ].includes(app.status),
  "Quotation Issued"
)}

{progressItem(
  [
    "Payment Submitted",
    "Payment Confirmed",
    "Meter Assigned",
    "Completed",
  ].includes(app.status),
  "Payment Submitted"
)}

{progressItem(
  [
    "Payment Confirmed",
    "Meter Assigned",
    "Completed",
  ].includes(app.status),
  "Payment Confirmed"
)}

{progressItem(
  [
    "Meter Assigned",
    "Completed",
  ].includes(app.status),
  "Meter Assigned"
)}

{progressItem(
  app.status === "Completed",
  "Installation Complete"
)}
</View>
      {app.status ===
        "Rejected" && (
        <View
          style={{
            backgroundColor:
              "#fee2e2",
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text
            style={{
              color: "#dc2626",
              fontWeight: "bold",
            }}
          >
            Application Rejected
          </Text>
        </View>
      )}

      {app.status ===
        "Approved" && (
        <View
          style={{
            backgroundColor:
              "#dcfce7",
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text
            style={{
              color: "#166534",
              fontWeight: "bold",
            }}
          >
            Application Approved.
            Await quotation and
            payment processing.
          </Text>
        </View>
      )}
     

      {app.status ===
        "Completed" && (
        <View
          style={{
            backgroundColor:
              "#dcfce7",
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text
            style={{
              color: "#166534",
              fontWeight: "bold",
            }}
          >
            Meter Successfully
            Assigned.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const btn = {
  backgroundColor: "#2563eb",
  padding: 12,
  borderRadius: 10,
  marginTop: 10,
};

const btnText = {
  color: "#fff",
  fontWeight: "bold" as const,
  textAlign: "center" as const,
};

const timeline = {
  marginTop: 12,
  padding: 15,
  backgroundColor: "#f1f5f9",
  borderRadius: 10,
};
const row = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "flex-start" as const,
  paddingVertical: 6,
};

const label = {
  color: "#6b7280",
  fontSize: 15,
  fontWeight: "600" as const,
};

const value = {
  color: "#111827",
  fontSize: 15,
  fontWeight: "700" as const,
};

const divider = {
  height: 1,
  backgroundColor: "#f1f5f9",
  marginVertical: 10,
};