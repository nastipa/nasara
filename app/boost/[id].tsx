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

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    try {
      setProcessing(true);

      /* ===============================
   LOAD ITEM DETAILS (FIX TS)
================================ */

const { data, error: itemError } = await supabase
  .from("items_live")
  .select("title,image_url,video_url,price")
  .eq("id", itemId)
  .single();

if (itemError || !data) {
  showAlert("Error", "Item not found. Cannot boost.");
  setProcessing(false);
  return;
}

/* ✅ FIX TYPE HERE */
const itemData = data as {
  title: string;
  image_url: string | null;
  video_url: string | null;
  price: number;
};

/* ✅ DEBUG */
console.log("ITEM DATA:", itemData);
      /* ===============================
         AUTO PAYMENT CODE
      ================================ */
      const paymentCode =
        "BOOST-" + auth.user.id.slice(0, 6) + "-" + Date.now();

      /* ===============================
         INSERT BOOST REQUEST (ADMIN CAN SEE IMAGE)
      ================================ */
      const { error } = await (supabase as any).from("boost").insert({
  live_item_id: itemId,

  plan_id: selectedPlan.id,
  days: selectedPlan.days,
  amount: Number(amountInput),

  seller_id: auth.user.id,

  item_title: itemData.title,
  item_image_url: itemData.image_url,
  item_video_url: itemData.video_url, // ✅ NO ?? null
  item_price: itemData.price,

  payment_code: paymentCode,
  network: adminMomoNetwork,

  status: "pending",
});
      if (error) {
        showAlert("Boost Failed", error.message);
        return;
      }

      /* ===============================
         INSERT PAYMENT RECORD
      ================================ */
      await (supabase as any).from("payments").insert({
        user_id: auth.user.id,
        product_type: "boost",
        amount: Number(amountInput),

        momo_name: adminMomoName,
        momo_number: adminMomoNumber,
        network: adminMomoNetwork,

        code: paymentCode,
        status: "pending",
      });

      showAlert(
        "Boost Request Sent ✅",
        "Your boost is pending admin approval.\n\nPayment Code:\n" +
          paymentCode
      );

      setPayVisible(false);
      router.back();
    } catch (e: any) {
      showAlert("Error", e.message);
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