import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

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

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;

  hospital_bookings?: {
    queue_number: string;
  } | null;
};

export default function HospitalNotifications() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);
    
    const loadNotifications =
  useCallback(async () => {
    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        showMessage(
          "Login Required",
          "Please login again."
        );
        return;
      }

      const response =
        await fetch(
          `${API_URL}/hospital/notifications`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "Unable to load notifications."
        );
      }

      setNotifications(
        json.notifications || []
      );

    } catch (err: any) {

      showMessage(
        "Error",
        err.message
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, []);
  useEffect(() => {

  loadNotifications();

  const interval =
    setInterval(
      loadNotifications,
      10000
    );

  return () =>
    clearInterval(interval);

}, [loadNotifications]);

const onRefresh = () => {
  setRefreshing(true);
  loadNotifications();
};
if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading notifications...
        </Text>
      </View>
    );
  }
const markAsRead = async (
  notificationId: number
) => {
  try {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }


    const response =
      await fetch(
        `${API_URL}/hospital/notification-read`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            notification_id:
              notificationId,
          }),
        }
      );


    const json =
      await response.json();


    if (!response.ok) {
      throw new Error(
        json.error ||
        "Unable to update notification."
      );
    }


    setNotifications(prev =>
      prev.map(item =>
        item.id === notificationId
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    );


  } catch (err: any) {

    showMessage(
      "Error",
      err.message
    );

  }
};
  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>
          Notifications
        </Text>

        <Text style={styles.subtitle}>
          Patient queue updates and hospital alerts.
        </Text>
      </View>


      <FlatList
        data={notifications}
        keyExtractor={(item) =>
          item.id.toString()
        }

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }


        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off"
              size={50}
              color="#9CA3AF"
            />

            <Text style={styles.emptyText}>
              No notifications yet.
            </Text>
          </View>
        }


        renderItem={({ item }) => (

         <TouchableOpacity
  style={[
    styles.notificationCard,
    !item.is_read &&
    styles.unreadCard
  ]}
  activeOpacity={0.8}
  onPress={() =>
    markAsRead(item.id)
  }
>

            <View style={styles.iconBox}>

              <Ionicons
                name={
                  item.is_read
                    ? "notifications-outline"
                    : "notifications"
                }
                size={26}
                color="#2563EB"
              />

            </View>


            <View style={styles.notificationContent}>

              <View style={styles.row}>

                <Text
                  style={styles.notificationTitle}
                >
                  {item.title}
                </Text>


                {!item.is_read && (
                  <View
                    style={styles.badge}
                  >
                    <Text
                      style={styles.badgeText}
                    >
                      NEW
                    </Text>
                  </View>
                )}

              </View>


              <Text
                style={styles.message}
              >
                {item.message}
              </Text>


              {item.hospital_bookings
                ?.queue_number && (

                <Text
                  style={styles.queue}
                >
                  Queue:
                  {" "}
                  {
                    item.hospital_bookings
                      .queue_number
                  }
                </Text>

              )}


              <Text
                style={styles.date}
              >
                {new Date(
                  item.created_at
                ).toLocaleString()}
              </Text>

            </View>

          </TouchableOpacity>

        )}
      />

    </View>
  );
}
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 18,
  },


  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },


  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 16,
  },


  header: {
    marginBottom: 20,
  },


  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },


  subtitle: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 15,
  },


  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },


  unreadCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#2563EB",
  },


  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },


  notificationContent: {
    flex: 1,
    marginLeft: 14,
  },


  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },


  notificationTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },


  badge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },


  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },


  message: {
    marginTop: 8,
    color: "#374151",
    fontSize: 15,
    lineHeight: 21,
  },


  queue: {
    marginTop: 8,
    fontWeight: "700",
    color: "#16A34A",
  },


  date: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
  },


  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },


  emptyText: {
    marginTop: 12,
    color: "#9CA3AF",
    fontSize: 16,
  },

});