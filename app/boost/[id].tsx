import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type BoostPlan = {
  id: string;
  label: string;
  days: number;
  price: number;
};

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

  const itemId = useMemo(() => {
    const raw = params?.id;
    if (!raw || Array.isArray(raw)) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!itemId) {
      Alert.alert("Error", "Invalid item");
      router.back();
      return;
    }
    loadPlans();
  }, [itemId]);

  /* ================= LOAD PLANS ================= */
  const loadPlans = async () => {
    const { data } = await supabase
      .from("boost_plans")
      .select("id,label,days,price")
      .eq("is_active", true)
      .order("days");

    setPlans(data ?? []);
    setLoading(false);
  };

  /* ================= REQUEST BOOST ================= */
  const handleContinue = async () => {
    if (!selectedPlan || !itemId) {
      Alert.alert("Select a plan");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      Alert.alert("Login required");
      return;
    }

    try {
      setProcessing(true);

      // ✅ CREATE BOOST REQUEST
      const { error } = await (supabase as any).from("boost_requests").insert({
        live_item_id: itemId,
        plan_id: selectedPlan.id,
        amount: selectedPlan.price,
        seller_id: auth.user.id,
        status: "pending",
      });

      if (error) throw error;

      // ✅ GET ADMIN MOMO DETAILS
      const { data: admin } = await (supabase as any)
        .from("profiles")
        .select("momo_name, momo_number")
        .eq("is_admin", true)
        .single();

      // 🔔 NOTIFY ADMIN
      await (supabase as any).from("notifications").insert({
        message: "🚀 New boost request awaiting approval",
        is_admin: true,
      });

      // ✅ PAYMENT INSTRUCTION POPUP
      showAlert(
        "Pay to Boost Item",
        "Name: " +
          admin.momo_name +
          "\nNumber: " +
          admin.momo_number +
          "\nAmount: " +
          selectedPlan.price +
          " GHS\n\nAfter payment, wait for admin approval."
      );

      router.back();
    } catch (e: any) {
      Alert.alert("Boost failed", e.message);
    } finally {
      setProcessing(false);
    }
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Boost Item" }} />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12 }}>
          Choose Boost Duration
        </Text>

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
                marginBottom: 10,
                backgroundColor: active ? "#ecfdf5" : "white",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{plan.label}</Text>
              <Text>{plan.days} days</Text>
              <Text>{plan.price} GHS</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={handleContinue}
          disabled={processing}
          style={{
            backgroundColor: "green",
            padding: 14,
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {processing ? "Processing..." : "Request Boost"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}