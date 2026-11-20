import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const API =
  "https://nasara-upload-server.onrender.com";

type AdminNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  ref_id?: string | null;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>;
};

export default function AdminNotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<AdminNotification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [filter, setFilter] =
    useState<"all" | "unread">("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Please log in again.");
    }

    return session.access_token;
  };

  const loadNotifications = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        setError("");

        const token = await getToken();

        const response = await fetch(
          `${API}/admin/notifications?limit=100${
            filter === "unread"
              ? "&unread_only=true"
              : ""
          }`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Could not load admin notifications."
          );
        }

        setNotifications(
          Array.isArray(result.notifications)
            ? result.notifications
            : []
        );

        setUnreadCount(
          Number(result.unread_count || 0)
        );
      } catch (err: any) {
        console.log(
          "ADMIN NOTIFICATIONS ERROR:",
          err
        );

        setError(
          err.message ||
            "Unable to load notifications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const refresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await getToken();

      const response = await fetch(
        `${API}/admin/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Could not mark as read."
        );
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await getToken();

      const response = await fetch(
        `${API}/admin/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Could not update notifications."
        );
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getIcon = (type: string) => {
    const value = (type || "").toLowerCase();

    if (value.includes("payment")) return "💰";
    if (value.includes("market")) return "🛍️";
    if (value.includes("seller")) return "🏪";
    if (value.includes("user")) return "👤";
    if (value.includes("order")) return "📦";
    if (value.includes("report")) return "🚩";
    if (value.includes("security")) return "🔐";
    if (value.includes("live")) return "🔴";

    return "🔔";
  };

  const formatDate = (date: string) => {
    if (!date) return "";

    return new Date(date).toLocaleString();
  };

  const openNotification = async (
    item: AdminNotification
  ) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }

    const target =
      item.data?.url ||
      "/(admin)/notifications";

    router.push(target as any);
  };

  const renderNotification = ({
    item,
  }: {
    item: AdminNotification;
  }) => (
    <TouchableOpacity
      style={[
        styles.notification,
        !item.is_read && styles.unreadNotification,
      ]}
      activeOpacity={0.8}
      onPress={() => openNotification(item)}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>
          {getIcon(item.type)}
        </Text>
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text style={styles.notificationTitle}>
            {item.title || "Nasara Admin Alert"}
          </Text>

          {!item.is_read && (
            <View style={styles.unreadDot} />
          )}
        </View>

        <Text style={styles.notificationBody}>
          {item.body ||
            item.message ||
            "An important platform event requires attention."}
        </Text>

        <Text style={styles.date}>
          {formatDate(item.created_at)}
        </Text>

        <Text style={styles.openText}>
          View notification →
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Admin Notifications
          </Text>

          <Text style={styles.headerSubtitle}>
            Nasara Platform Control Centre
          </Text>
        </View>

        <View style={styles.countCircle}>
          <Text style={styles.countText}>
            {unreadCount}
          </Text>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          UNREAD ALERTS
        </Text>

        <Text style={styles.summaryCount}>
          {unreadCount}
        </Text>

        <Text style={styles.summaryDescription}>
          Important events requiring admin attention
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.filters}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "all" && styles.activeFilter,
            ]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.activeFilterText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "unread" && styles.activeFilter,
            ]}
            onPress={() => setFilter("unread")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "unread" && styles.activeFilterText,
              ]}
            >
              Unread
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <Text
            style={[
              styles.markAllText,
              unreadCount === 0 && { opacity: 0.4 },
            ]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={() => loadNotifications()}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#D4AF37"
          />

          <Text style={styles.loadingText}>
            Loading admin alerts...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#D4AF37"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>
                🔔
              </Text>

              <Text style={styles.emptyTitle}>
                No notifications yet
              </Text>

              <Text style={styles.emptyDescription}>
                Important Nasara platform events will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },

  header: {
    backgroundColor: "#101B35",
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#263653",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#B9C3D5",
    fontSize: 11,
    marginTop: 4,
  },

  countCircle: {
    backgroundColor: "#D4AF37",
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  countText: {
    color: "#101B35",
    fontWeight: "900",
  },

  summary: {
    backgroundColor: "#101B35",
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
  },

  summaryLabel: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  summaryCount: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8,
  },

  summaryDescription: {
    color: "#B9C3D5",
    fontSize: 12,
    marginTop: 4,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  filters: {
    flexDirection: "row",
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  activeFilter: {
    backgroundColor: "#101B35",
  },

  filterText: {
    color: "#526078",
    fontSize: 12,
    fontWeight: "700",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  markAllText: {
    color: "#A27D12",
    fontSize: 12,
    fontWeight: "800",
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  notification: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 17,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  unreadNotification: {
    borderColor: "#D4AF37",
    backgroundColor: "#FFFEF8",
  },

  iconCircle: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#F0F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  icon: {
    fontSize: 21,
  },

  notificationContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  notificationTitle: {
    flex: 1,
    color: "#17243D",
    fontSize: 14,
    fontWeight: "800",
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#D4AF37",
    marginLeft: 8,
  },

  notificationBody: {
    color: "#596579",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  date: {
    color: "#9AA3B2",
    fontSize: 10,
    marginTop: 9,
  },

  openText: {
    color: "#A27D12",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 9,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#667085",
    marginTop: 12,
    fontSize: 12,
  },

  empty: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 65,
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    color: "#17243D",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
  },

  emptyDescription: {
    color: "#788397",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
  },

  errorBox: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FDECEC",
    marginBottom: 12,
  },

  errorText: {
    color: "#A12626",
    fontSize: 12,
  },

  retryText: {
    color: "#A12626",
    fontWeight: "800",
    marginTop: 8,
  },
});