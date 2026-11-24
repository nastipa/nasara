import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useAdminGuard } from "../../hooks/useAdminGuard";
import { supabase } from "../../supabase";

const API_BASE_URL = "https://nasara-upload-server.onrender.com";

const COLORS = {
  navy: "#101B35",
  navyLight: "#192744",
  gold: "#D4AF37",
  background: "#F4F6FA",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#788398",
  border: "#E8ECF2",
  green: "#16834A",
  greenLight: "#E8F7EF",
  red: "#C73535",
  redLight: "#FCECEC",
};

type CommissionStatus = "pending" | "approved" | "rejected";

type Commission = {
  id: string;
  order_id: string;
  seller_id: string;
  currency: string;
  commission_rate: number;
  order_subtotal: number;
  commission_amount: number;
  seller_payment_reference: string | null;
  seller_submitted_at: string | null;
  payment_status: string;
  admin_notes: string | null;
  admin_verified_by: string | null;
  admin_verified_at: string | null;
  created_at?: string;
};

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }

  Alert.alert(title, message || "");
}

export default function MarketplaceCommissionsScreen() {
  useAdminGuard();

  const router = useRouter();

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<CommissionStatus>("pending");

  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});

  // ============================================================
  // FETCH ALL COMMISSION RECORDS
  // ============================================================

  const fetchCommissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("nasara_marketplace_commissions")
        .select("*")
        .in("payment_status", [
          "seller_submitted",
          "admin_approved",
          "rejected",
        ])
        .order("seller_submitted_at", { ascending: false });

      if (error) throw error;

      setCommissions((data || []) as Commission[]);
    } catch (error: any) {
      console.error("Commission loading error:", error);

      showMessage(
        "Unable to load commissions",
        error?.message || "Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommissions();
  };

  // ============================================================
  // FILTER COMMISSIONS BY TAB
  // ============================================================

  const pendingCommissions = useMemo(
    () =>
      commissions.filter(
        (item) => item.payment_status === "seller_submitted"
      ),
    [commissions]
  );

  const approvedCommissions = useMemo(
    () =>
      commissions.filter(
        (item) => item.payment_status === "admin_approved"
      ),
    [commissions]
  );

  const rejectedCommissions = useMemo(
    () =>
      commissions.filter(
        (item) => item.payment_status === "rejected"
      ),
    [commissions]
  );

  const displayedCommissions =
    activeTab === "pending"
      ? pendingCommissions
      : activeTab === "approved"
        ? approvedCommissions
        : rejectedCommissions;

  // ============================================================
  // FORMATTING
  // ============================================================

  const formatMoney = (
    currency: string,
    amount: number
  ): string => {
    return `${currency || "GHS"} ${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (value: string | null): string => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString();
  };

  // ============================================================
  // SUBMIT ADMIN DECISION
  // ============================================================

  const submitDecision = async (
    commission: Commission,
    decision: "approved" | "rejected"
  ) => {
    const adminNotes =
      rejectionReasons[commission.id]?.trim() || "";

    if (decision === "rejected" && !adminNotes) {
      showMessage(
        "Rejection reason required",
        "Please enter a reason before rejecting this payment."
      );
      return;
    }

    if (adminNotes.length > 500) {
      showMessage(
        "Reason too long",
        "The rejection reason cannot exceed 500 characters."
      );
      return;
    }

    const actionText =
      decision === "approved" ? "approve" : "reject";

    const confirmed = await new Promise<boolean>((resolve) => {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          resolve(
            window.confirm(
              `Are you sure you want to ${actionText} this commission payment?`
            )
          );
        } else {
          resolve(false);
        }

        return;
      }

      Alert.alert(
        decision === "approved"
          ? "Approve Commission Payment"
          : "Reject Commission Payment",
        `Are you sure you want to ${actionText} this commission payment?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: decision === "approved" ? "Approve" : "Reject",
            style: decision === "rejected" ? "destructive" : "default",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

    if (!confirmed) return;

    await performDecision(commission, decision, adminNotes);
  };

  // ============================================================
  // CALL EXISTING BACKEND ADMIN DECISION ENDPOINT
  // ============================================================

  const performDecision = async (
    commission: Commission,
    decision: "approved" | "rejected",
    adminNotes: string
  ) => {
    try {
      setProcessingId(commission.id);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const accessToken = session?.access_token;

      if (!accessToken) {
        showMessage(
          "Session expired",
          "Please sign in again before verifying this payment."
        );
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/marketplace/commissions/${commission.id}/admin-decision`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            admin_notes: adminNotes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Unable to process commission payment."
        );
      }

      setRejectionReasons((previous) => {
        const updated = { ...previous };
        delete updated[commission.id];
        return updated;
      });

      await fetchCommissions();

      showMessage(
        decision === "approved"
          ? "Payment Approved"
          : "Payment Rejected",
        result.message ||
          (decision === "approved"
            ? "The commission payment has been approved."
            : "The commission payment has been rejected.")
      );
    } catch (error: any) {
      console.error("Commission decision error:", error);

      showMessage(
        "Verification failed",
        error?.message || "Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // COMMISSION CARD
  // ============================================================

  const renderCommission = (commission: Commission) => {
    const isPending =
      commission.payment_status === "seller_submitted";

    const isApproved =
      commission.payment_status === "admin_approved";

    const isRejected =
      commission.payment_status === "rejected";

    const isProcessing = processingId === commission.id;

    return (
      <View key={commission.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              Commission Payment
            </Text>

            <Text style={styles.orderId}>
              Order ID: {commission.order_id}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isPending && styles.pendingBadge,
              isApproved && styles.approvedBadge,
              isRejected && styles.rejectedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isPending && styles.pendingBadgeText,
                isApproved && styles.approvedBadgeText,
                isRejected && styles.rejectedBadgeText,
              ]}
            >
              {isPending
                ? "Awaiting Review"
                : isApproved
                  ? "Approved"
                  : "Rejected"}
            </Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>
            Commission Amount
          </Text>

          <Text style={styles.amount}>
            {formatMoney(
              commission.currency,
              commission.commission_amount
            )}
          </Text>
        </View>

        <View style={styles.details}>
          <Detail
            label="Seller ID"
            value={commission.seller_id}
          />

          <Detail
            label="Order Subtotal"
            value={formatMoney(
              commission.currency,
              commission.order_subtotal
            )}
          />

          <Detail
            label="Commission Rate"
            value={`${Number(commission.commission_rate || 0)}%`}
          />

          <Detail
            label="MoMo Transaction Reference"
            value={
              commission.seller_payment_reference ||
              "Not provided"
            }
            highlight
          />

          <Detail
            label="Payment Submitted"
            value={formatDate(commission.seller_submitted_at)}
          />

          <Detail
            label="Commission Record ID"
            value={commission.id}
          />

          {isPending && (
            <>
              <Detail
                label="Verification Status"
                value="Waiting for admin review"
              />
            </>
          )}

          {(isApproved || isRejected) && (
            <>
              <View style={styles.auditDivider} />

              <Text style={styles.auditTitle}>
                ADMIN VERIFICATION RECORD
              </Text>

              <Detail
                label={isApproved ? "Approved By (Admin ID)" : "Rejected By (Admin ID)"}
                value={
                  commission.admin_verified_by ||
                  "Not recorded"
                }
              />

              <Detail
                label="Decision Date"
                value={formatDate(commission.admin_verified_at)}
              />

              {isRejected && (
                <Detail
                  label="Rejection Reason"
                  value={commission.admin_notes || "No reason recorded"}
                  highlight
                />
              )}

              {isApproved && commission.admin_notes ? (
                <Detail
                  label="Admin Notes"
                  value={commission.admin_notes}
                />
              ) : null}
            </>
          )}
        </View>

        {isPending && (
          <>
            <View style={styles.divider} />

            <Text style={styles.inputLabel}>
              Rejection reason (required only when rejecting)
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason if payment cannot be approved..."
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={500}
              value={rejectionReasons[commission.id] || ""}
              onChangeText={(value) =>
                setRejectionReasons((previous) => ({
                  ...previous,
                  [commission.id]: value,
                }))
              }
              editable={!isProcessing}
            />

            <Text style={styles.characterCount}>
              {(rejectionReasons[commission.id] || "").length}/500
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.rejectButton,
                  isProcessing && styles.disabledButton,
                ]}
                disabled={isProcessing}
                onPress={() =>
                  submitDecision(commission, "rejected")
                }
              >
                {isProcessing ? (
                  <ActivityIndicator color={COLORS.red} />
                ) : (
                  <Text style={styles.rejectButtonText}>
                    Reject Payment
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.approveButton,
                  isProcessing && styles.disabledButton,
                ]}
                disabled={isProcessing}
                onPress={() =>
                  submitDecision(commission, "approved")
                }
              >
                {isProcessing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.approveButtonText}>
                    Approve Payment
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  // ============================================================
  // MAIN SCREEN
  // ============================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Commission Approvals
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage and review seller payments
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>₵</Text>
        </View>
      </View>

      {/* SUMMARY */}

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>
            Total Commission Records
          </Text>

          <Text style={styles.summaryNumber}>
            {commissions.length}
          </Text>
        </View>

        <View style={styles.summaryCounts}>
          <Text style={styles.summaryCountPending}>
            Pending: {pendingCommissions.length}
          </Text>

          <Text style={styles.summaryCountApproved}>
            Approved: {approvedCommissions.length}
          </Text>

          <Text style={styles.summaryCountRejected}>
            Rejected: {rejectedCommissions.length}
          </Text>
        </View>
      </View>

      {/* THREE TABS */}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "pending" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pending ({pendingCommissions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "approved" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("approved")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "approved" && styles.activeTabText,
            ]}
          >
            Approved ({approvedCommissions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "rejected" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("rejected")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "rejected" && styles.activeTabText,
            ]}
          >
            Rejected ({rejectedCommissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* COMMISSION RECORDS */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={COLORS.gold}
            />

            <Text style={styles.stateText}>
              Loading commission records...
            </Text>
          </View>
        ) : displayedCommissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {activeTab === "pending"
                ? "✓"
                : activeTab === "approved"
                  ? "✓"
                  : "—"}
            </Text>

            <Text style={styles.emptyTitle}>
              {activeTab === "pending"
                ? "No Pending Payments"
                : activeTab === "approved"
                  ? "No Approved Payments Yet"
                  : "No Rejected Payments"}
            </Text>

            <Text style={styles.emptyText}>
              {activeTab === "pending"
                ? "Seller commission payments awaiting verification will appear here."
                : activeTab === "approved"
                  ? "Commission payments approved by Nasara Admin will appear here for future reference."
                  : "Rejected commission payments will appear here with their rejection reasons."}
            </Text>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>
                Refresh Records
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedCommissions.map(renderCommission)
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Nasara Admin • Marketplace Finance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// DETAIL COMPONENT
// ============================================================

function Detail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text
        selectable
        style={[
          styles.detailValue,
          highlight && styles.referenceValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#C6CDDA",
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIconText: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: "900",
  },

  summary: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  summaryNumber: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 5,
  },

  summaryCounts: {
    gap: 5,
  },

  summaryCountPending: {
    color: "#946B0C",
    fontSize: 11,
    fontWeight: "800",
  },

  summaryCountApproved: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
  },

  summaryCountRejected: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },

  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: 9,
  },

  activeTab: {
    backgroundColor: COLORS.navy,
  },

  tabText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  activeTabText: {
    color: COLORS.white,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 35,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  cardHeaderText: {
    flex: 1,
    paddingRight: 8,
  },

  cardTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  orderId: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  pendingBadge: {
    backgroundColor: "#FFF4D8",
  },

  approvedBadge: {
    backgroundColor: COLORS.greenLight,
  },

  rejectedBadge: {
    backgroundColor: COLORS.redLight,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  pendingBadgeText: {
    color: "#946B0C",
  },

  approvedBadgeText: {
    color: COLORS.green,
  },

  rejectedBadgeText: {
    color: COLORS.red,
  },

  amountBox: {
    backgroundColor: "#F8F6EF",
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 15,
  },

  amountLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  amount: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 5,
  },

  details: {
    gap: 13,
  },

  detailRow: {
    gap: 5,
  },

  detailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  referenceValue: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  auditDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 5,
  },

  auditTitle: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },

  inputLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  reasonInput: {
    minHeight: 75,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    color: COLORS.text,
    fontSize: 13,
    textAlignVertical: "top",
    backgroundColor: "#FAFBFD",
  },

  characterCount: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 5,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  rejectButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  rejectButtonText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: "900",
  },

  approveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  approveButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.55,
  },

  centerState: {
    paddingVertical: 60,
    alignItems: "center",
  },

  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 12,
  },

  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    color: COLORS.green,
    fontSize: 38,
    fontWeight: "900",
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 12,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },

  refreshButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 9,
    marginTop: 18,
  },

  refreshButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 10,
  },
});