import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const SUPER_ADMIN_EMAIL = "dinnanitipa@gmail.com";

type OrganizationType = "restaurant" | "hospital";

type Organization = {
  id: string;
  name: string;
};

type Subscription = {
  id: string;
  organization_id: string;
  organization_type: OrganizationType;
  subscription_plan: string;
  amount_paid: number;
  start_date: string;
  expiry_date: string;
  status: "active" | "suspended";
  payment_reference: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }

  const { Alert } = require("react-native");
  Alert.alert(title, message);
}

function formatMoney(value: number) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isExpired(subscription: Subscription) {
  return new Date(subscription.expiry_date).getTime() < Date.now();
}

function getSubscriptionState(subscription: Subscription | null) {
  if (!subscription) {
    return "none";
  }

  if (subscription.status === "suspended") {
    return "suspended";
  }

  if (isExpired(subscription)) {
    return "expired";
  }

  return "active";
}

export default function AdminSubscriptionsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [restaurants, setRestaurants] = useState<Organization[]>([]);
  const [hospitals, setHospitals] = useState<Organization[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [organizationType, setOrganizationType] =
    useState<OrganizationType>("restaurant");

  const [organizationId, setOrganizationId] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("standard");
  const [amountPaid, setAmountPaid] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MoMo");
  const [notes, setNotes] = useState("");

  const [editingSubscriptionId, setEditingSubscriptionId] = useState<
    string | null
  >(null);

  const organizations = useMemo(() => {
    return organizationType === "restaurant" ? restaurants : hospitals;
  }, [organizationType, restaurants, hospitals]);

  const selectedSubscription = useMemo(() => {
    if (!organizationId) {
      return null;
    }

    return (
      subscriptions.find(
        (subscription) =>
          subscription.organization_id === organizationId &&
          subscription.organization_type === organizationType
      ) ?? null
    );
  }, [subscriptions, organizationId, organizationType]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const email = user.email?.toLowerCase().trim();

      if (email !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        throw new Error("You are not authorized to manage subscriptions.");
      }

      const [
        restaurantsResult,
        hospitalsResult,
        subscriptionsResult,
      ] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id,name")
          .order("name", { ascending: true }),

        supabase
          .from("hospitals")
          .select("id,name")
          .order("name", { ascending: true }),

        supabase
          .from("subscriptions")
          .select(
            `
              id,
              organization_id,
              organization_type,
              subscription_plan,
              amount_paid,
              start_date,
              expiry_date,
              status,
              payment_reference,
              payment_method,
              notes,
              created_at,
              updated_at
            `
          )
          .order("created_at", { ascending: false }),
      ]);

      if (restaurantsResult.error) {
        throw restaurantsResult.error;
      }

      if (hospitalsResult.error) {
        throw hospitalsResult.error;
      }

      if (subscriptionsResult.error) {
        throw subscriptionsResult.error;
      }

      setRestaurants(
        (restaurantsResult.data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
        }))
      );

      setHospitals(
        (hospitalsResult.data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
        }))
      );

      setSubscriptions(
        (subscriptionsResult.data ?? []).map((item: any) => ({
          ...item,
          amount_paid: Number(item.amount_paid ?? 0),
        }))
      );
    } catch (error: any) {
      console.error("Subscription admin load error:", error);

      showMessage(
        "Unable to load subscriptions",
        error?.message ?? "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const existing = subscriptions.find(
      (subscription) =>
        subscription.organization_id === organizationId &&
        subscription.organization_type === organizationType
    );

    if (!existing) {
      return;
    }

    setEditingSubscriptionId(existing.id);
    setSubscriptionPlan(existing.subscription_plan || "standard");
    setAmountPaid(String(existing.amount_paid ?? ""));
    setStartDate(existing.start_date?.slice(0, 10) ?? "");
    setExpiryDate(existing.expiry_date?.slice(0, 10) ?? "");
    setPaymentReference(existing.payment_reference ?? "");
    setPaymentMethod(existing.payment_method ?? "MoMo");
    setNotes(existing.notes ?? "");
  }, [organizationId, organizationType, subscriptions]);

  function clearForm() {
    setEditingSubscriptionId(null);
    setOrganizationId("");
    setSubscriptionPlan("standard");
    setAmountPaid("");
    setStartDate("");
    setExpiryDate("");
    setPaymentReference("");
    setPaymentMethod("MoMo");
    setNotes("");
  }

  function handleOrganizationTypeChange(type: OrganizationType) {
    setOrganizationType(type);
    setOrganizationId("");
    setEditingSubscriptionId(null);
    setSubscriptionPlan("standard");
    setAmountPaid("");
    setStartDate("");
    setExpiryDate("");
    setPaymentReference("");
    setPaymentMethod("MoMo");
    setNotes("");
  }

  function loadExistingSubscription(subscription: Subscription) {
    setOrganizationType(subscription.organization_type);
    setOrganizationId(subscription.organization_id);
    setEditingSubscriptionId(subscription.id);
    setSubscriptionPlan(subscription.subscription_plan || "standard");
    setAmountPaid(String(subscription.amount_paid ?? ""));
    setStartDate(subscription.start_date?.slice(0, 10) ?? "");
    setExpiryDate(subscription.expiry_date?.slice(0, 10) ?? "");
    setPaymentReference(subscription.payment_reference ?? "");
    setPaymentMethod(subscription.payment_method ?? "MoMo");
    setNotes(subscription.notes ?? "");
  }

  async function saveSubscription() {
    try {
      if (!organizationId) {
        showMessage(
          "Missing organization",
          `Select a ${organizationType} first.`
        );
        return;
      }

      if (!startDate) {
        showMessage("Missing start date", "Enter the subscription start date.");
        return;
      }

      if (!expiryDate) {
        showMessage("Missing expiry date", "Enter the subscription expiry date.");
        return;
      }

      const start = new Date(`${startDate}T00:00:00`);
      const expiry = new Date(`${expiryDate}T23:59:59`);

      if (Number.isNaN(start.getTime())) {
        showMessage("Invalid start date", "Use YYYY-MM-DD format.");
        return;
      }

      if (Number.isNaN(expiry.getTime())) {
        showMessage("Invalid expiry date", "Use YYYY-MM-DD format.");
        return;
      }

      if (expiry.getTime() < start.getTime()) {
        showMessage(
          "Invalid dates",
          "Expiry date cannot be earlier than the start date."
        );
        return;
      }

      const parsedAmount = Number(amountPaid || 0);

      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        showMessage(
          "Invalid amount",
          "Enter a valid subscription amount."
        );
        return;
      }

      setSaving(true);

      const payload = {
        organization_id: organizationId,
        organization_type: organizationType,
        subscription_plan:
          subscriptionPlan.trim() || "standard",
        amount_paid: parsedAmount,
        start_date: start.toISOString(),
        expiry_date: expiry.toISOString(),
        status: "active" as const,
        payment_reference:
          paymentReference.trim() || null,
        payment_method:
          paymentMethod.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingSubscriptionId) {
        const { error } = await (supabase as any)
          .from("subscriptions")
          .update(payload)
          .eq("id", editingSubscriptionId);

        if (error) {
          throw error;
        }

        showMessage(
          "Subscription updated",
          "The subscription has been updated and activated."
        );
      } else {
        const { error } = await (supabase as any)
          .from("subscriptions")
          .insert(payload);

        if (error) {
          if (error.code === "23505") {
            showMessage(
              "Subscription already exists",
              "This organization already has a subscription. Select it from the list and update it instead."
            );
          } else {
            throw error;
          }

          return;
        }

        showMessage(
          "Subscription created",
          "The subscription has been created and activated."
        );
      }

      await loadData();
      clearForm();
    } catch (error: any) {
      console.error("Save subscription error:", error);

      showMessage(
        "Unable to save subscription",
        error?.message ?? "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateSubscriptionStatus(
    subscription: Subscription,
    status: "active" | "suspended"
  ) {
    try {
      const action = status === "active" ? "activate" : "suspend";

      const confirmed =
        Platform.OS === "web"
          ? typeof window !== "undefined"
            ? window.confirm(
                `${action === "activate" ? "Activate" : "Suspend"} this subscription?`
              )
            : true
          : true;

      if (!confirmed) {
        return;
      }

      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");

        await new Promise<void>((resolve) => {
          Alert.alert(
            status === "active"
              ? "Activate Subscription"
              : "Suspend Subscription",
            status === "active"
              ? "Are you sure you want to activate this subscription?"
              : "Are you sure you want to suspend this subscription?",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(),
              },
              {
                text: status === "active" ? "Activate" : "Suspend",
                style: status === "active" ? "default" : "destructive",
                onPress: async () => {
                  try {
                    const { error } = await (supabase as any)
                      .from("subscriptions")
                      .update({
                        status,
                      })
                      .eq("id", subscription.id);

                    if (error) {
                      throw error;
                    }

                    await loadData();

                    showMessage(
                      status === "active"
                        ? "Subscription activated"
                        : "Subscription suspended"
                    );
                  } catch (error: any) {
                    console.error(
                      "Update subscription status error:",
                      error
                    );

                    showMessage(
                      "Unable to update subscription",
                      error?.message ?? "Something went wrong."
                    );
                  } finally {
                    resolve();
                  }
                },
              },
            ]
          );
        });

        return;
      }

      const { error } = await (supabase as any)
        .from("subscriptions")
        .update({
          status,
        })
        .eq("id", subscription.id);

      if (error) {
        throw error;
      }

      await loadData();

      showMessage(
        status === "active"
          ? "Subscription activated"
          : "Subscription suspended"
      );
    } catch (error: any) {
      console.error("Update subscription status error:", error);

      showMessage(
        "Unable to update subscription",
        error?.message ?? "Something went wrong."
      );
    }
  }

  function getOrganizationName(subscription: Subscription) {
    const list =
      subscription.organization_type === "restaurant"
        ? restaurants
        : hospitals;

    return (
      list.find(
        (organization) =>
          organization.id === subscription.organization_id
      )?.name ?? "Unknown organization"
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>
            Loading subscriptions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="card-outline"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>Subscriptions</Text>
            <Text style={styles.subtitle}>
              Manage Nasara organization subscriptions
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Create or Update Subscription
          </Text>

          <Text style={styles.label}>Organization Type</Text>

          <View style={styles.segmentRow}>
            <Pressable
              style={[
                styles.segmentButton,
                organizationType === "restaurant" &&
                  styles.segmentButtonActive,
              ]}
              onPress={() =>
                handleOrganizationTypeChange("restaurant")
              }
            >
              <Ionicons
                name="restaurant-outline"
                size={18}
                color={
                  organizationType === "restaurant"
                    ? "#FFFFFF"
                    : "#334155"
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  organizationType === "restaurant" &&
                    styles.segmentTextActive,
                ]}
              >
                Restaurant
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentButton,
                organizationType === "hospital" &&
                  styles.segmentButtonActive,
              ]}
              onPress={() =>
                handleOrganizationTypeChange("hospital")
              }
            >
              <Ionicons
                name="medical-outline"
                size={18}
                color={
                  organizationType === "hospital"
                    ? "#FFFFFF"
                    : "#334155"
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  organizationType === "hospital" &&
                    styles.segmentTextActive,
                ]}
              >
                Hospital
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>
            {organizationType === "restaurant"
              ? "Restaurant"
              : "Hospital"}
          </Text>

          <View style={styles.organizationList}>
            {organizations.length === 0 ? (
              <Text style={styles.emptyText}>
                No {organizationType}s found.
              </Text>
            ) : (
              organizations.map((organization) => {
                const existing = subscriptions.find(
                  (subscription) =>
                    subscription.organization_id ===
                      organization.id &&
                    subscription.organization_type ===
                      organizationType
                );

                const state = getSubscriptionState(existing ?? null);

                return (
                  <Pressable
                    key={organization.id}
                    style={[
                      styles.organizationOption,
                      organizationId === organization.id &&
                        styles.organizationOptionActive,
                    ]}
                    onPress={() => {
                      setOrganizationId(organization.id);

                      if (existing) {
                        loadExistingSubscription(existing);
                      } else {
                        setEditingSubscriptionId(null);
                        setSubscriptionPlan("standard");
                        setAmountPaid("");
                        setStartDate("");
                        setExpiryDate("");
                        setPaymentReference("");
                        setPaymentMethod("MoMo");
                        setNotes("");
                      }
                    }}
                  >
                    <View style={styles.organizationOptionLeft}>
                      <View style={styles.organizationIcon}>
                        <Ionicons
                          name={
                            organizationType === "restaurant"
                              ? "restaurant-outline"
                              : "medical-outline"
                          }
                          size={20}
                          color="#0F766E"
                        />
                      </View>

                      <View style={styles.organizationInfo}>
                        <Text style={styles.organizationName}>
                          {organization.name}
                        </Text>

                        <Text style={styles.organizationId}>
                          ID: {organization.id}
                        </Text>
                      </View>
                    </View>

                    {existing && (
                      <View
                        style={[
                          styles.statusBadge,
                          state === "active" &&
                            styles.statusActive,
                          state === "suspended" &&
                            styles.statusSuspended,
                          state === "expired" &&
                            styles.statusExpired,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            state === "active" &&
                              styles.statusActiveText,
                            state === "suspended" &&
                              styles.statusSuspendedText,
                            state === "expired" &&
                              styles.statusExpiredText,
                          ]}
                        >
                          {state === "active"
                            ? "Active"
                            : state === "suspended"
                              ? "Suspended"
                              : "Expired"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>

          {organizationId ? (
            <>
              <Text style={styles.label}>Subscription Plan</Text>

              <TextInput
                value={subscriptionPlan}
                onChangeText={setSubscriptionPlan}
                placeholder="standard"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.label}>Amount Paid</Text>

              <TextInput
                value={amountPaid}
                onChangeText={setAmountPaid}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>
                Start Date
              </Text>

              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                Expiry Date
              </Text>

              <TextInput
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                Payment Reference
              </Text>

              <TextInput
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="Optional payment reference"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.label}>
                Payment Method
              </Text>

              <TextInput
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="MoMo"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.label}>Notes</Text>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  styles.notesInput,
                ]}
                multiline
                textAlignVertical="top"
              />

              {selectedSubscription && (
                <View style={styles.currentSubscriptionCard}>
                  <Text style={styles.currentTitle}>
                    Current Subscription
                  </Text>

                  <View style={styles.currentRow}>
                    <Text style={styles.currentLabel}>
                      Status
                    </Text>

                    <Text style={styles.currentValue}>
                      {getSubscriptionState(
                        selectedSubscription
                      ).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.currentRow}>
                    <Text style={styles.currentLabel}>
                      Start
                    </Text>

                    <Text style={styles.currentValue}>
                      {formatDate(
                        selectedSubscription.start_date
                      )}
                    </Text>
                  </View>

                  <View style={styles.currentRow}>
                    <Text style={styles.currentLabel}>
                      Expiry
                    </Text>

                    <Text style={styles.currentValue}>
                      {formatDate(
                        selectedSubscription.expiry_date
                      )}
                    </Text>
                  </View>

                  <View style={styles.currentRow}>
                    <Text style={styles.currentLabel}>
                      Amount
                    </Text>

                    <Text style={styles.currentValue}>
                      {formatMoney(
                        selectedSubscription.amount_paid
                      )}
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                style={[
                  styles.primaryButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveSubscription}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        editingSubscriptionId
                          ? "save-outline"
                          : "add-circle-outline"
                      }
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text style={styles.primaryButtonText}>
                      {editingSubscriptionId
                        ? "Update Subscription"
                        : "Create Subscription"}
                    </Text>
                  </>
                )}
              </Pressable>

              {editingSubscriptionId && (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={clearForm}
                  disabled={saving}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color="#334155"
                  />

                  <Text style={styles.secondaryButtonText}>
                    Clear Form
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <View style={styles.selectHint}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#0F766E"
              />

              <Text style={styles.selectHintText}>
                Select a {organizationType} above to create or
                manage its subscription.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                All Subscriptions
              </Text>

              <Text style={styles.sectionSubtitle}>
                {subscriptions.length} subscription
                {subscriptions.length === 1 ? "" : "s"}
              </Text>
            </View>

            <Pressable
              style={styles.refreshButton}
              onPress={loadData}
            >
              <Ionicons
                name="refresh"
                size={19}
                color="#0F766E"
              />
            </Pressable>
          </View>

          {subscriptions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="card-outline"
                size={40}
                color="#94A3B8"
              />

              <Text style={styles.emptyCardTitle}>
                No subscriptions yet
              </Text>

              <Text style={styles.emptyCardText}>
                Create a subscription by selecting an
                organization above.
              </Text>
            </View>
          ) : (
            subscriptions.map((subscription) => {
              const state =
                getSubscriptionState(subscription);

              return (
                <View
                  key={subscription.id}
                  style={styles.subscriptionCard}
                >
                  <View style={styles.subscriptionTopRow}>
                    <View style={styles.subscriptionMain}>
                      <Text style={styles.subscriptionName}>
                        {getOrganizationName(subscription)}
                      </Text>

                      <Text
                        style={styles.subscriptionType}
                      >
                        {subscription.organization_type ===
                        "restaurant"
                          ? "Restaurant"
                          : "Hospital"}{" "}
                        • {subscription.subscription_plan}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        state === "active" &&
                          styles.statusActive,
                        state === "suspended" &&
                          styles.statusSuspended,
                        state === "expired" &&
                          styles.statusExpired,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          state === "active" &&
                            styles.statusActiveText,
                          state === "suspended" &&
                            styles.statusSuspendedText,
                          state === "expired" &&
                            styles.statusExpiredText,
                        ]}
                      >
                        {state === "active"
                          ? "Active"
                          : state === "suspended"
                            ? "Suspended"
                            : "Expired"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subscriptionDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Amount
                      </Text>

                      <Text style={styles.detailValue}>
                        {formatMoney(
                          subscription.amount_paid
                        )}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Start
                      </Text>

                      <Text style={styles.detailValue}>
                        {formatDate(
                          subscription.start_date
                        )}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Expiry
                      </Text>

                      <Text style={styles.detailValue}>
                        {formatDate(
                          subscription.expiry_date
                        )}
                      </Text>
                    </View>
                  </View>

                  {subscription.payment_reference && (
                    <Text
                      style={styles.referenceText}
                    >
                      Ref: {subscription.payment_reference}
                    </Text>
                  )}

                  <View style={styles.subscriptionActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() =>
                        loadExistingSubscription(
                          subscription
                        )
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#0F766E"
                      />

                      <Text style={styles.editButtonText}>
                        Edit
                      </Text>
                    </Pressable>

                    {subscription.status === "active" ? (
                      <Pressable
                        style={styles.suspendButton}
                        onPress={() =>
                          updateSubscriptionStatus(
                            subscription,
                            "suspended"
                          )
                        }
                      >
                        <Ionicons
                          name="pause-circle-outline"
                          size={18}
                          color="#B45309"
                        />

                        <Text
                          style={styles.suspendButtonText}
                        >
                          Suspend
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.activateButton}
                        onPress={() =>
                          updateSubscriptionStatus(
                            subscription,
                            "active"
                          )
                        }
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#15803D"
                        />

                        <Text
                          style={styles.activateButtonText}
                        >
                          Activate
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },

  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },

  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  segmentButtonActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },

  segmentText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  segmentTextActive: {
    color: "#FFFFFF",
  },

  organizationList: {
    gap: 9,
  },

  organizationOption: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  organizationOptionActive: {
    borderColor: "#0F766E",
    backgroundColor: "#F0FDFA",
  },

  organizationOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  organizationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  organizationInfo: {
    flex: 1,
    marginLeft: 10,
  },

  organizationName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  organizationId: {
    marginTop: 2,
    fontSize: 10,
    color: "#94A3B8",
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 13,
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },

  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },

  currentSubscriptionCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  currentTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 9,
  },

  currentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },

  currentLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  currentValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "800",
  },

  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.65,
  },

  secondaryButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  secondaryButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },

  selectHint: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
    flexDirection: "row",
    alignItems: "center",
  },

  selectHintText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    lineHeight: 19,
    color: "#115E59",
    fontWeight: "600",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  statusActive: {
    backgroundColor: "#DCFCE7",
  },

  statusActiveText: {
    color: "#166534",
  },

  statusSuspended: {
    backgroundColor: "#FEF3C7",
  },

  statusSuspendedText: {
    color: "#92400E",
  },

  statusExpired: {
    backgroundColor: "#FEE2E2",
  },

  statusExpiredText: {
    color: "#991B1B",
  },

  emptyText: {
    paddingVertical: 15,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },

  emptyCard: {
    padding: 28,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  emptyCardTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#334155",
  },

  emptyCardText: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },

  subscriptionCard: {
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 11,
  },

  subscriptionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  subscriptionMain: {
    flex: 1,
    paddingRight: 10,
  },

  subscriptionName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },

  subscriptionType: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },

  subscriptionDetails: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "800",
  },

  referenceText: {
    marginTop: 10,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  subscriptionActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 9,
  },

  editButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  editButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F766E",
  },

  suspendButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  suspendButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#B45309",
  },

  activateButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  activateButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#15803D",
  },
});