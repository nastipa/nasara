import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type OrganizationType = "restaurant" | "hospital";

type Subscription = {
  id: string;
  organization_id: string;
  organization_type: OrganizationType;
  subscription_plan: string | null;
  amount_paid: number | null;
  start_date: string | null;
  expiry_date: string | null;
  status: "active" | "suspended";
  payment_reference: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Organization = {
  id: string;
  name: string;
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(value: number | null) {
  const amount = Number(value ?? 0);

  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getSubscriptionState(subscription: Subscription | null) {
  if (!subscription) {
    return "none" as const;
  }

  if (subscription.status === "suspended") {
    return "suspended" as const;
  }

  if (!subscription.expiry_date) {
    return "expired" as const;
  }

  const expiry = new Date(subscription.expiry_date);

  if (Number.isNaN(expiry.getTime())) {
    return "expired" as const;
  }

  if (expiry.getTime() < Date.now()) {
    return "expired" as const;
  }

  return "active" as const;
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const segments = useSegments();

  const params = useLocalSearchParams<{
    organizationType?: string;
    organizationId?: string | string[];
  }>();

  const routeIsRestaurant = segments.some(
    (segment) =>
      segment === "(restaurant-owner)" ||
      segment === "restaurant-owner"
  );

  const routeIsHospital = segments.some(
    (segment) =>
      segment === "(hospital-admin)" ||
      segment === "hospital-admin"
  );

  const organizationType =
    params.organizationType === "restaurant" ||
    params.organizationType === "hospital"
      ? (params.organizationType as OrganizationType)
      : null;

  const organizationId =
    typeof params.organizationId === "string"
      ? params.organizationId
      : Array.isArray(params.organizationId)
        ? params.organizationId[0]
        : null;

  const [resolvedOrganizationType, setResolvedOrganizationType] =
    useState<OrganizationType | null>(organizationType);

  const [resolvedOrganizationId, setResolvedOrganizationId] =
    useState<string | null>(organizationId);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const subscriptionState = useMemo(
    () => getSubscriptionState(subscription),
    [subscription]
  );

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await (supabase as any).auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      let currentOrganizationType: OrganizationType | null =
        organizationType;

      let currentOrganizationId: string | null =
        organizationId;

      /*
       * If the dashboard already passed the organization,
       * use it directly.
       *
       * This is the preferred path.
       */
      if (!currentOrganizationType || !currentOrganizationId) {
        /*
         * Restaurant dashboard fallback.
         *
         * This is only checked when the current route indicates
         * that the user came from the restaurant-owner section.
         */
        if (routeIsRestaurant) {
          const { data: owner, error: ownerError } = await (supabase as any)
            .from("restaurant_owners")
            .select("restaurant_id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();

          if (ownerError) {
            throw ownerError;
          }

          if (owner?.restaurant_id) {
            currentOrganizationType = "restaurant";
            currentOrganizationId = owner.restaurant_id;
          }
        }

        /*
         * Hospital dashboard fallback.
         *
         * This is only checked when the current route indicates
         * that the user came from the hospital-admin section.
         */
        if (routeIsHospital) {
          const {
            data: hospitalAdmin,
            error: hospitalAdminError,
          } = await (supabase as any)
            .from("hospital_admins")
            .select("hospital_id")
            .eq("user_id", user.id)
            .eq("status", "approved")
            .limit(1)
            .maybeSingle();

          if (hospitalAdminError) {
            throw hospitalAdminError;
          }

          if (hospitalAdmin?.hospital_id) {
            currentOrganizationType = "hospital";
            currentOrganizationId = hospitalAdmin.hospital_id;
          }
        }
      }

      /*
       * If the current route did not identify the organization
       * and no organization parameters were supplied, do not
       * guess between restaurant and hospital.
       */
      if (!currentOrganizationType || !currentOrganizationId) {
        setResolvedOrganizationType(null);
        setResolvedOrganizationId(null);
        setOrganization(null);
        setSubscription(null);
        setLoading(false);
        setRefreshing(false);

        showMessage(
          "Subscription Error",
          "This account is not connected to an active hospital or restaurant administrator."
        );

        return;
      }

      setResolvedOrganizationType(currentOrganizationType);
      setResolvedOrganizationId(currentOrganizationId);

      /*
       * Load the organization itself.
       */
      let organizationData: Organization | null = null;

      if (currentOrganizationType === "restaurant") {
        const { data, error } = await (supabase as any)
          .from("restaurants")
          .select("id, name")
          .eq("id", currentOrganizationId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          organizationData = {
            id: data.id,
            name: data.name,
          };
        }
      }

      if (currentOrganizationType === "hospital") {
        const { data, error } = await (supabase as any)
          .from("hospitals")
          .select("id, name")
          .eq("id", currentOrganizationId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          organizationData = {
            id: data.id,
            name: data.name,
          };
        }
      }

      setOrganization(organizationData);

      /*
       * IMPORTANT:
       *
       * Subscription is filtered by BOTH:
       *
       * organization_id
       * organization_type
       *
       * Therefore a restaurant subscription can never be
       * mistaken for a hospital subscription.
       */
      const {
        data: subscriptionData,
        error: subscriptionError,
      } = await (supabase as any)
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
        .eq("organization_id", currentOrganizationId)
        .eq("organization_type", currentOrganizationType)
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      setSubscription(subscriptionData as Subscription | null);
    } catch (error: any) {
      console.error("Error loading subscription:", error);

      showMessage(
        "Subscription Error",
        error?.message || "Unable to load subscription information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    organizationId,
    organizationType,
    routeIsHospital,
    routeIsRestaurant,
    router,
  ]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscription();
  };

  const handleBack = () => {
    router.back();
  };

  const organizationLabel =
    resolvedOrganizationType === "restaurant"
      ? "Restaurant"
      : "Hospital";

  const statusTitle = {
    active: "Active",
    suspended: "Suspended",
    expired: "Expired",
    none: "No Subscription",
  }[subscriptionState];

  const statusDescription = {
    active:
      "Your subscription is active and your organization can access its admin dashboard.",
    suspended:
      "This subscription has been suspended by the Super Admin. Dashboard access is restricted.",
    expired:
      "This subscription has expired. Renew the subscription to restore dashboard access.",
    none:
      "No subscription has been created for this organization. Contact the Super Admin.",
  }[subscriptionState];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F766E" />

        <Text style={styles.loadingText}>
          Loading subscription...
        </Text>
      </View>
    );
  }

  if (!resolvedOrganizationType || !resolvedOrganizationId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#111827"
            />
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Subscription
            </Text>

            <Text style={styles.headerSubtitle}>
              Organization information is missing
            </Text>
          </View>
        </View>

        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color="#DC2626"
            />
          </View>

          <Text style={styles.errorTitle}>
            Organization Information Missing
          </Text>

          <Text style={styles.errorText}>
            This subscription page could not determine whether
            you are accessing the hospital or restaurant
            subscription.
          </Text>

          <Pressable
            onPress={handleBack}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111827"
          />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Subscription
          </Text>

          <Text style={styles.headerSubtitle}>
            {organizationLabel} subscription
          </Text>
        </View>

        <Pressable
          onPress={handleRefresh}
          style={styles.refreshButton}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator
              size="small"
              color="#0F766E"
            />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={23}
              color="#0F766E"
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0F766E"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.organizationCard}>
          <View style={styles.organizationIcon}>
            <Ionicons
              name={
                resolvedOrganizationType === "restaurant"
                  ? "restaurant-outline"
                  : "medkit-outline"
              }
              size={30}
              color="#0F766E"
            />
          </View>

          <View style={styles.organizationInfo}>
            <Text style={styles.organizationType}>
              {organizationLabel}
            </Text>

            <Text style={styles.organizationName}>
              {organization?.name || "Organization"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusCard,
            subscriptionState === "active"
              ? styles.statusActive
              : subscriptionState === "suspended"
                ? styles.statusSuspended
                : styles.statusInactive,
          ]}
        >
          <View style={styles.statusIconContainer}>
            <Ionicons
              name={
                subscriptionState === "active"
                  ? "checkmark-circle"
                  : subscriptionState === "suspended"
                    ? "pause-circle"
                    : "close-circle"
              }
              size={38}
              color={
                subscriptionState === "active"
                  ? "#15803D"
                  : subscriptionState === "suspended"
                    ? "#D97706"
                    : "#DC2626"
              }
            />
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>
              Subscription Status
            </Text>

            <Text
              style={[
                styles.statusTitle,
                subscriptionState === "active"
                  ? styles.statusTextActive
                  : subscriptionState === "suspended"
                    ? styles.statusTextSuspended
                    : styles.statusTextInactive,
              ]}
            >
              {statusTitle}
            </Text>

            <Text style={styles.statusDescription}>
              {statusDescription}
            </Text>
          </View>
        </View>

        {subscription ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Subscription Details
              </Text>

              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Ionicons
                      name="layers-outline"
                      size={21}
                      color="#6B7280"
                    />

                    <Text style={styles.detailLabel}>
                      Plan
                    </Text>
                  </View>

                  <Text style={styles.detailValue}>
                    {subscription.subscription_plan ||
                      "Standard"}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Ionicons
                      name="cash-outline"
                      size={21}
                      color="#6B7280"
                    />

                    <Text style={styles.detailLabel}>
                      Amount Paid
                    </Text>
                  </View>

                  <Text style={styles.detailValue}>
                    {formatAmount(subscription.amount_paid)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={21}
                      color="#6B7280"
                    />

                    <Text style={styles.detailLabel}>
                      Start Date
                    </Text>
                  </View>

                  <Text style={styles.detailValue}>
                    {formatDate(subscription.start_date)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Ionicons
                      name="calendar-clear-outline"
                      size={21}
                      color="#6B7280"
                    />

                    <Text style={styles.detailLabel}>
                      Expiry Date
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.detailValue,
                      subscriptionState === "expired" &&
                        styles.expiredValue,
                    ]}
                  >
                    {formatDate(subscription.expiry_date)}
                  </Text>
                </View>

                {subscription.payment_method ? (
                  <>
                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                      <View style={styles.detailLeft}>
                        <Ionicons
                          name="card-outline"
                          size={21}
                          color="#6B7280"
                        />

                        <Text style={styles.detailLabel}>
                          Payment Method
                        </Text>
                      </View>

                      <Text style={styles.detailValue}>
                        {subscription.payment_method}
                      </Text>
                    </View>
                  </>
                ) : null}

                {subscription.payment_reference ? (
                  <>
                    <View style={styles.divider} />

                    <View style={styles.detailColumn}>
                      <View style={styles.detailLeft}>
                        <Ionicons
                          name="receipt-outline"
                          size={21}
                          color="#6B7280"
                        />

                        <Text style={styles.detailLabel}>
                          Payment Reference
                        </Text>
                      </View>

                      <Text style={styles.referenceText}>
                        {subscription.payment_reference}
                      </Text>
                    </View>
                  </>
                ) : null}

                {subscription.notes ? (
                  <>
                    <View style={styles.divider} />

                    <View style={styles.detailColumn}>
                      <View style={styles.detailLeft}>
                        <Ionicons
                          name="document-text-outline"
                          size={21}
                          color="#6B7280"
                        />

                        <Text style={styles.detailLabel}>
                          Notes
                        </Text>
                      </View>

                      <Text style={styles.notesText}>
                        {subscription.notes}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>

            <View style={styles.accessCard}>
              <View style={styles.accessIcon}>
                <Ionicons
                  name={
                    subscriptionState === "active"
                      ? "lock-open-outline"
                      : "lock-closed-outline"
                  }
                  size={25}
                  color={
                    subscriptionState === "active"
                      ? "#15803D"
                      : "#DC2626"
                  }
                />
              </View>

              <View style={styles.accessContent}>
                <Text style={styles.accessTitle}>
                  {subscriptionState === "active"
                    ? "Admin Access Available"
                    : "Admin Access Restricted"}
                </Text>

                <Text style={styles.accessText}>
                  {subscriptionState === "active"
                    ? `Your ${organizationLabel.toLowerCase()} subscription is currently active.`
                    : `Your ${organizationLabel.toLowerCase()} dashboard access is restricted until the subscription is active.`}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noSubscriptionCard}>
            <View style={styles.noSubscriptionIcon}>
              <Ionicons
                name="card-outline"
                size={42}
                color="#DC2626"
              />
            </View>

            <Text style={styles.noSubscriptionTitle}>
              No Subscription Found
            </Text>

            <Text style={styles.noSubscriptionText}>
              There is currently no subscription registered for
              this {organizationLabel.toLowerCase()}.
            </Text>

            <Text style={styles.noSubscriptionText}>
              Please contact the Nasara Super Admin to create or
              renew the subscription.
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={23}
            color="#0F766E"
          />

          <Text style={styles.infoText}>
            Subscription access is tied specifically to this{" "}
            {organizationLabel.toLowerCase()}, not to your login
            account. If the same account manages another
            organization, that organization has its own separate
            subscription.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
  },

  header: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
  },

  refreshButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#F0FDFA",
  },

  content: {
    padding: 16,
  },

  organizationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },

  organizationIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },

  organizationInfo: {
    flex: 1,
    marginLeft: 14,
  },

  organizationType: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  organizationName: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  statusCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
    borderWidth: 1,
  },

  statusActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  statusSuspended: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  statusInactive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  statusIconContainer: {
    marginRight: 13,
  },

  statusContent: {
    flex: 1,
  },

  statusLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  statusTitle: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "900",
  },

  statusTextActive: {
    color: "#15803D",
  },

  statusTextSuspended: {
    color: "#B45309",
  },

  statusTextInactive: {
    color: "#DC2626",
  },

  statusDescription: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },

  section: {
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  detailRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailColumn: {
    paddingVertical: 15,
  },

  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  detailLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },

  detailValue: {
    marginLeft: 15,
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },

  expiredValue: {
    color: "#DC2626",
  },

  referenceText: {
    marginTop: 10,
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
    lineHeight: 19,
  },

  notesText: {
    marginTop: 10,
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  accessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
  },

  accessIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
  },

  accessContent: {
    flex: 1,
    marginLeft: 12,
  },

  accessTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  accessText: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  noSubscriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 18,
  },

  noSubscriptionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  noSubscriptionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  noSubscriptionText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#F0FDFA",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#99F6E4",
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#115E59",
  },

  errorCard: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  errorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 20,
    minWidth: 140,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 40,
  },
});