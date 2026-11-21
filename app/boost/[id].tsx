import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ===============================
   TYPES
================================ */
type BoostPlan = {
  id: string;
  label: string;
  days: number;
  price: number;
};
type LiveItem = {
  title: string;
  image_url: string | null;
  video_url: string | null;
  price: number;
};
/* ===============================
   ALERT FIX (Web + Mobile)
================================ */
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

export default function BoostItem() {
  const params = useLocalSearchParams();
  const router = useRouter();

  /* ===============================
     GET ITEM ID
  ================================ */
  const itemId = useMemo(() => {
    const raw = params?.id;
    if (!raw || Array.isArray(raw)) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  /* ===============================
     STATES
  ================================ */
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [video, setVideo] = useState<any>(null);

  /* PAYMENT MODAL */
  const [payVisible, setPayVisible] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  /* ADMIN MOMO */
  const [adminMomoName, setAdminMomoName] = useState("");
  const [adminMomoNumber, setAdminMomoNumber] = useState("");
  const [adminMomoNetwork, setAdminMomoNetwork] = useState("");

  /* ===============================
     LOAD DATA
  ================================ */
  useEffect(() => {
    if (!itemId) {
      showAlert("Error", "Invalid Item ID");
      router.back();
      return;
    }

    loadPlans();
    loadAdminMomo();
  }, [itemId]);

  /* ===============================
     LOAD BOOST PLANS
  ================================ */
  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("boost_plans")
      .select("id,label,days,price")
      .eq("is_active", true)
      .order("days");

    if (error) {
      showAlert("Error", error.message);
      return;
    }

    setPlans(data ?? []);
    setLoading(false);
  };

  /* ===============================
     LOAD ADMIN MOMO
  ================================ */
  const loadAdminMomo = async () => {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("momo_name,momo_number,momo_network")
      .eq("is_admin", true)
      .single();

    if (!error && data) {
      setAdminMomoName(data.momo_name);
      setAdminMomoNumber(data.momo_number);
      setAdminMomoNetwork(data.momo_network);
    }
  };

  /* ===============================
     STEP 1: SELECT PLAN → CONTINUE
  ================================ */
  const handleContinue = async () => {
    if (!selectedPlan || !itemId) {
      showAlert("Error", "Please select a boost plan first");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      showAlert("Login Required", "Please sign in first");
      return;
    }

    /* ✅ OPEN PAYMENT AFTER PLAN */
    setAmountInput(String(selectedPlan.price));
    setPayVisible(true);
  };

  /* ===============================
     STEP 2: SEND PAYMENT REQUEST
  ================================ */
const sendPayment = async () => {
  if (!amountInput.trim() || !selectedPlan || !itemId) {
    showAlert("Error", "Missing payment info");
    return;
  }

  try {
    setProcessing(true);

    // ==========================================
    // GET USER SESSION
    // ==========================================

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user || !session.access_token) {
      showAlert("Login Required", "Please sign in again.");
      return;
    }

    const user = session.user;
    const amount = Number(amountInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert("Error", "Enter a valid payment amount.");
      return;
    }

    // ==========================================
    // LOAD ITEM DETAILS
    // ==========================================

    const { data, error: itemError } = await supabase
      .from("items_live")
      .select("title,image_url,video_url,price,user_id")
      .eq("id", itemId)
      .single();

    if (itemError || !data) {
      showAlert("Error", "Item not found. Cannot boost.");
      return;
    }

    const itemData = data as {
      title: string;
      image_url: string | null;
      video_url: string | null;
      price: number;
      user_id: string;
    };

    if (itemData.user_id !== user.id) {
      showAlert("Error", "You can only boost your own item.");
      return;
    }

    console.log("ITEM DATA:", itemData);

    // ==========================================
    // GENERATE PAYMENT CODE
    // ==========================================

    const paymentCode =
      "BOOST-" + user.id.slice(0, 6) + "-" + Date.now();

    // ==========================================
    // INSERT BOOST REQUEST
    // ==========================================

    const { data: boostData, error: boostError } = await (
      supabase as any
    )
      .from("boost")
      .insert({
        live_item_id: itemId,
        plan_id: selectedPlan.id,
        days: selectedPlan.days,
        amount,

        seller_id: user.id,

        item_title: itemData.title,
        item_image_url: itemData.image_url,
        item_video_url: itemData.video_url,
        item_price: itemData.price,

        payment_code: paymentCode,
        network: adminMomoNetwork,

        status: "pending",
      })
      .select("id")
      .single();

    if (boostError || !boostData) {
      console.log("BOOST INSERT ERROR:", boostError);

      showAlert(
        "Boost Failed",
        boostError?.message || "Could not create boost request."
      );
      return;
    }

    // ==========================================
    // INSERT PENDING PAYMENT
    // ==========================================

    const { data: paymentData, error: paymentError } = await (
      supabase as any
    )
      .from("payments")
      .insert({
        user_id: user.id,
        product_type: "boost",
        amount,

        momo_name: adminMomoName,
        momo_number: adminMomoNumber,
        network: adminMomoNetwork,

        code: paymentCode,
        status: "pending",
      })
      .select("id")
      .single();

    if (paymentError || !paymentData) {
      console.log("BOOST PAYMENT ERROR:", paymentError);

      // Roll back the boost request if payment creation fails.
      await (supabase as any)
        .from("boost")
        .delete()
        .eq("id", boostData.id)
        .eq("seller_id", user.id);

      showAlert(
        "Payment Error",
        paymentError?.message || "Could not save payment record."
      );
      return;
    }

    // ==========================================
    // NOTIFY NASARA ADMINS
    // ==========================================

    let notificationSent = false;

    try {
      const response = await fetch(
        "https://nasara-upload-server.onrender.com/notifications/admin-submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: "boost_payment_request",
            ref_id: paymentData.id,
            related_id: boostData.id,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success === true) {
  notificationSent = true;

  console.log(
    "BOOST ADMIN NOTIFICATION CONFIRMED:",
    result
  );
} else {
  notificationSent = false;

  console.log(
    "BOOST ADMIN NOTIFICATION FAILED:",
    result
  );
}
    } catch (notificationError) {
      console.log(
        "BOOST NOTIFICATION NETWORK ERROR:",
        notificationError
      );
    }

    // ==========================================
    // SUCCESS MESSAGE
    // ==========================================

    showAlert(
      "Boost Payment Submitted",
      "Your boost request has been saved and is pending admin verification.\n\nPayment Code:\n" +
        paymentCode +
        "\n\n" +
        (notificationSent
          ? "Nasara admins have been notified."
          : "Your payment request is saved, but the admin notification could not be sent.")
    );

    setPayVisible(false);
    router.back();

  } catch (e: any) {
    console.log("BOOST PAYMENT ERROR:", e);

    showAlert(
      "Error",
      e?.message || "Something went wrong while submitting your boost."
    );
  } finally {
    setProcessing(false);
  }
};

  /* ===============================
     UI LOADING
  ================================ */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ===============================
     UI
  ================================ */
  return (
    <>
      <Stack.Screen options={{ title: "Boost Item" }} />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          Choose Boost Duration
        </Text>

        {/* ===============================
            BOOST PLANS
        ================================ */}
        {plans.map((plan) => {
          const active = selectedPlan?.id === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan)}
              style={{
                borderWidth: 1,
                borderColor: active ? "green" : "#ccc",
                padding: 14,
                borderRadius: 8,
                marginTop: 12,
                backgroundColor: active ? "#ecfdf5" : "white",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{plan.label}</Text>
              <Text>{plan.days} days</Text>
              <Text>{plan.price} GHS</Text>
            </TouchableOpacity>
          );
        })}

        {/* ===============================
            CONTINUE BUTTON
        ================================ */}
        <TouchableOpacity
          onPress={handleContinue}
          style={{
            backgroundColor: "green",
            padding: 14,
            borderRadius: 8,
            marginTop: 25,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            Continue to Payment
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===============================
          PAYMENT MODAL
      ================================ */}
      <Modal transparent visible={payVisible} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              MoMo Payment Details
            </Text>

            {/* NETWORK */}
            <Text style={{ marginTop: 12 }}>Network</Text>
            <TextInput
              value={adminMomoNetwork}
              editable={false}
              style={{ borderWidth: 1, padding: 12 }}
            />

            {/* NAME */}
            <Text style={{ marginTop: 12 }}>MoMo Name</Text>
            <TextInput
              value={adminMomoName}
              editable={false}
              style={{ borderWidth: 1, padding: 12 }}
            />

            {/* NUMBER */}
            <Text style={{ marginTop: 12 }}>MoMo Number</Text>
            <TextInput
              value={adminMomoNumber}
              editable={false}
              style={{ borderWidth: 1, padding: 12 }}
            />

            {/* AMOUNT */}
            <Text style={{ marginTop: 12 }}>Amount Paid</Text>
            <TextInput
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="numeric"
              style={{ borderWidth: 1, padding: 12 }}
            />

            {/* PAY BUTTON */}
            <TouchableOpacity
              onPress={sendPayment}
              disabled={processing}
              style={{
                backgroundColor: "#2563eb",
                padding: 14,
                marginTop: 18,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                {processing ? "Sending..." : "Send Payment Request"}
              </Text>
            </TouchableOpacity>

            {/* CANCEL */}
            <TouchableOpacity
              onPress={() => setPayVisible(false)}
              style={{ marginTop: 12 }}
            >
              <Text style={{ textAlign: "center", color: "red" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}