import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [updating, setUpdating] = useState(false);
  const [app, setApp] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);

  useEffect(() => {
    load();
    loadQuotation();
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("utility_applications")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setApp(data);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.message || "Failed to load application."
      );
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

  const updateStatus = async (status: string) => {
    try {
      setUpdating(true);

      const { error } = await (supabase as any)
        .from("utility_applications")
        .update({
          status,
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert(
        "Success",
        `Application ${status}.`
      );

      load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.message || "Failed to update."
      );
    } finally {
      setUpdating(false);
    }
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
        <Text>No application found.</Text>
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
          fontSize: 26,
          fontWeight: "bold",
        }}
      >
        Utility Application
      </Text>

      <View
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 12,
          marginTop: 16,
        }}
      >
        <Text>
          <Text style={{ fontWeight: "bold" }}>
            Application No:
          </Text>{" "}
          {app.application_no}
        </Text>

        <Text style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: "bold" }}>
            Status:
          </Text>{" "}
          {app.status}
        </Text>

        <Text style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: "bold" }}>
            Service:
          </Text>{" "}
          {app.service_type}
        </Text>

        <Text style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: "bold" }}>
            Name:
          </Text>{" "}
          {app.full_name}
        </Text>

        <Text>
          <Text style={{ fontWeight: "bold" }}>
            Phone:
          </Text>{" "}
          {app.phone}
        </Text>

        <Text>
          <Text style={{ fontWeight: "bold" }}>
            Area:
          </Text>{" "}
          {app.area}
        </Text>

        <Text>
          <Text style={{ fontWeight: "bold" }}>
            Station:
          </Text>{" "}
          {app.station}
        </Text>
        <Text>
          <Text style={{ fontWeight: "bold" }}>
            Phase Type:
          </Text>{" "}
          {app.phase_type}
        </Text>
        <Text>
  <Text style={{ fontWeight: "bold" }}>
    Address:
  </Text>{" "}
  {app.address}
</Text>

<Text style={{ marginTop: 8 }}>
  <Text style={{ fontWeight: "bold" }}>
    Latitude:
  </Text>{" "}
  {app?.latitude ?? "Not captured"}
</Text>

<Text>
  <Text style={{ fontWeight: "bold" }}>
    Longitude:
  </Text>{" "}
  {app?.longitude ?? "Not captured"}
</Text>

<Text>
  <Text style={{ fontWeight: "bold" }}>
    GPS Accuracy:
  </Text>{" "}
  {typeof app?.location_accuracy === "number" && !isNaN(app.location_accuracy)
    ? `${Math.round(app.location_accuracy)} m`
    : app?.location_accuracy
    ? `${Math.round(Number(app.location_accuracy))} m`
    : "Not captured"}
</Text>
<Text
  style={{
    marginTop: 16,
    color: "#2563eb",
    fontWeight: "bold",
  }}
  onPress={() => {
    if (app.latitude != null && app.longitude != null) {
      Linking.openURL(
        `https://www.google.com/maps?q=${app.latitude},${app.longitude}`
      );
    }
  }}
>
  📍 Open Exact Location
</Text>
         

      </View>
      
     

      <Text
        style={{
          marginTop: 24,
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        Uploaded Documents
      </Text>

      {app.ghana_card_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(app.ghana_card_url)
          }
        >
          <Text style={btnText}>
            View Ghana Card
          </Text>
        </TouchableOpacity>
      )}

      {app.energy_commission_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(
              app.energy_commission_url
            )
          }
        >
          <Text style={btnText}>
            View Energy Commission
          </Text>
        </TouchableOpacity>
      )}

      {app.current_bill_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(
              app.current_bill_url
            )
          }
        >
          <Text style={btnText}>
            View Current Bill
          </Text>
        </TouchableOpacity>
      )}

      {app.site_plan_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(app.site_plan_url)
          }
        >
          <Text style={btnText}>
            View Site Plan
          </Text>
        </TouchableOpacity>
      )}

      {app.application_letter_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(
              app.application_letter_url
            )
          }
        >
          <Text style={btnText}>
            View Application Letter
          </Text>
        </TouchableOpacity>
      )}
      {app.transfer_letter_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(app.transfer_letter_url)
          }
        >
          <Text style={btnText}>
            View Transfer Letter
          </Text>
        </TouchableOpacity>
      )}

      {app.nedco_receipt_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(app.nedco_receipt_url)
          }
        >
          <Text style={btnText}>
            View NEDCo Receipt
          </Text>
        </TouchableOpacity>
      )}

      {app.nasara_payment_proof_url && (
        <TouchableOpacity
          style={btn}
          onPress={() =>
            openFile(app.nasara_payment_proof_url)
          }
        >
          <Text style={btnText}>
            View Nasara Payment Proof
          </Text>
        </TouchableOpacity>
      )}
      {app.payment_receipt_url && (
  <TouchableOpacity
    style={btn}
    onPress={() =>
      openFile(
        app.payment_receipt_url
      )
    }
  >
    <Text style={btnText}>
      View Payment Receipt
    </Text>
  </TouchableOpacity>
)}

      {/* QUOTATION */}
      {quotation && (
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              `https://nasara-upload-server.onrender.com/quotation-pdf/${quotation.id}`
            )
          }
          style={{
            backgroundColor: "#111827",
            padding: 14,
            marginTop: 15,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Download PDF Quotation
          </Text>
        </TouchableOpacity>
      )}

      {/* STATUS TIMELINE */}
      <Text
        style={{
          marginTop: 25,
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        Status Timeline
      </Text>

      <View style={timeline}>
        <Text>✔️ Application Submitted</Text>

        <Text>
          {["Under Review", "Approved", "Completed"].includes(app.status)
            ? "✔️ Under Review"
            : "⏳ Under Review"}
        </Text>

        <Text>
          {["Approved", "Completed"].includes(app.status)
            ? "✔️ Approved"
            : "⏳ Approved"}
        </Text>

        <Text>
          {app.status === "Completed"
            ? "✔️ Meter Assigned"
            : "⏳ Meter Assigned"}
        </Text>
      </View>

      {/* ADMIN ACTIONS */}

<View style={{ marginTop: 25 }}>
  <Text
    style={{
      fontWeight: "bold",
      fontSize: 18,
      marginBottom: 10,
    }}
  >
    Admin Actions
  </Text>

  {/* START REVIEW */}
{app.status === "Pending" && (
  <TouchableOpacity
    onPress={() =>
      updateStatus("Under Review")
    }
    style={{
      backgroundColor: "#f59e0b",
      padding: 14,
      borderRadius: 10,
    }}
  >
    <Text
      style={{
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
      }}
    >
      Start Review
    </Text>
  </TouchableOpacity>
)}

{/* APPROVE APPLICATION */}
{app.status === "Under Review" && (
  <>
    <TouchableOpacity
      onPress={() =>
        updateStatus("Approved")
      }
      style={{
        backgroundColor: "#16a34a",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Approve Application
      </Text>
    </TouchableOpacity>

    
  </>
)}

{/* ISSUE QUOTATION */}
{app.status === "Approved" && (
  <TouchableOpacity
    onPress={() =>
      router.push({
        pathname:
          "/(utilities-admin)/quotation-preview",
        params: {
          id: app.id,
        },
      })
    }
    style={{
      backgroundColor: "#2563eb",
      padding: 14,
      borderRadius: 10,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
      }}
    >
      Issue Quotation
    </Text>
  </TouchableOpacity>
)}

  {/* WAITING FOR CUSTOMER CONFIRM */}
  {app.status === "Awaiting Payment" && (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname:
            "/(utilities-admin)/payment-confirm",
          params: {
            applicationId: app.id,
          },
        })
      }
      style={{
        backgroundColor: "#16a34a",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Confirm Payment
      </Text>
    </TouchableOpacity>
  )}
  {/* CONFIRM PAYMENT */}
{app.status === "Payment Submitted" && (
  <TouchableOpacity
    onPress={() =>
      updateStatus("Payment Confirmed")
    }
    style={{
      backgroundColor: "#16a34a",
      padding: 14,
      borderRadius: 10,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
      }}
    >
      Confirm Payment
    </Text>
  </TouchableOpacity>
)}

  {/* ASSIGN METER */}
  {app.status === "Payment Confirmed" && (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname:
            "/(utilities-admin)/assign-meter",
          params: {
            applicationId: app.id,
          },
        })
      }
      style={{
        backgroundColor: "#7c3aed",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Assign Meter
      </Text>
    </TouchableOpacity>
  )}

  {/* COMPLETE */}
  {app.status === "Meter Assigned" && (
    <TouchableOpacity
      onPress={() =>
        updateStatus("Completed")
      }
      style={{
        backgroundColor: "#059669",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Mark Installation Complete
      </Text>
    </TouchableOpacity>
  )}

  {/* REJECT */}
  {!["Completed", "Rejected"].includes(
    app.status
  ) && (
    <TouchableOpacity
      onPress={() =>
        updateStatus("Rejected")
      }
      style={{
        backgroundColor: "#dc2626",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Reject Application
      </Text>
    </TouchableOpacity>
  )}
</View>
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