import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type?: string;
};
export default function HealthNotifications() {

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
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();


        if (!session?.access_token) {
          return;
        }


        const response =
          await fetch(
            `${API_URL}/hospital/patient-notifications`,
            {
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
            }
          );


        const json =
          await response.json();


        if (!response.ok) {
          throw new Error(
            json.error ||
            "Unable to load notifications"
          );
        }


        setNotifications(
          json.notifications || []
        );


      } catch(error) {

        console.log(
          "Notifications:",
          error
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    }, []);



  useEffect(() => {

    loadNotifications();

  }, [
    loadNotifications
  ]);



  const onRefresh = () => {

    setRefreshing(true);

    loadNotifications();

  };
  const formatDate = (
    date: string
  ) => {

    const d =
      new Date(date);

    return d.toLocaleString();

  };
const getNotificationStyle = (
  type?: string
) => {

  switch(type){

    case "called":
      return {
        icon:"🔔",
        color:"#16A34A",
      };

    case "consultation":
      return {
        icon:"🩺",
        color:"#2563EB",
      };

    case "admitted":
      return {
        icon:"🏥",
        color:"#7C3AED",
      };

    case "transferred":
      return {
        icon:"🚑",
        color:"#F59E0B",
      };

    case "referral":
      return {
        icon:"📄",
        color:"#DC2626",
      };

    case "discharged":
      return {
        icon:"✅",
        color:"#16A34A",
      };

    default:
      return {
        icon:"📢",
        color:"#6B7280",
      };

  }

};

  const renderItem = ({
    item,
  }: {
    item: NotificationItem;
  }) => (

    <View
      style={[
        styles.card,
        !item.is_read &&
        styles.unreadCard,
      ]}
    >

      <View style={styles.headerRow}>

        <View
style={{
flexDirection:"row",
alignItems:"center",
flex:1,
}}
>

<Text
style={{
fontSize:22,
marginRight:8,
}}
>
{
getNotificationStyle(item.type).icon
}
</Text>

<Text
style={styles.title}
>
{item.title}
</Text>

</View>

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
        style={styles.body}
      >
        {item.message}
      </Text>


      <Text
        style={styles.date}
      >
        {formatDate(
          item.created_at
        )}
      </Text>


    </View>

  );



  if (loading) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <ActivityIndicator
          size="large"
        />


        <Text
          style={
            styles.loadingText
          }
        >
          Loading notifications...
        </Text>

      </View>

    );

  }



  return (

    <View
      style={
        styles.container
      }
    >

      <View
        style={
          styles.pageHeader
        }
      >

        <Text
          style={
            styles.pageTitle
          }
        >
          Notifications
        </Text>


        <Text
          style={
            styles.subtitle
          }
        >
         Hospital consultation, referral and visit updates
        </Text>

      </View>



      {notifications.length === 0 ? (

        <View
          style={
            styles.emptyContainer
          }
        >

          <Text
            style={
              styles.emptyTitle
            }
          >
            No Notifications
          </Text>


          <Text
            style={
              styles.emptyText
            }
          >
            You don't have any hospital updates yet.
          </Text>


        </View>


      ) : (

        <FlatList

          data={
            notifications
          }

          keyExtractor={
            item => item.id
          }

          renderItem={
            renderItem
          }

          refreshControl={

            <RefreshControl

              refreshing={
                refreshing
              }

              onRefresh={
                onRefresh
              }

            />

          }

          contentContainerStyle={{
            padding: 16,
          }}

        />

      )}

    </View>

  );
}
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },


  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },


  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },


  pageHeader: {
    padding: 18,
    paddingBottom: 10,
  },


  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },


  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B7280",
  },


  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,

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


  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },


  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },


  body: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 12,
  },


  date: {
    fontSize: 13,
    color: "#9CA3AF",
  },


  badge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 10,
  },


  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },


  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },


  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },


  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

});
