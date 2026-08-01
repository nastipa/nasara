import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function StaffDashboard() {
  const router = useRouter();
const API_URL =
"https://nasara-upload-server.onrender.com";


const [staff,setStaff] =
useState<any>(null);
const [utilisation, setUtilisation] = useState(0);

const [averageMinutes, setAverageMinutes] = useState(0);

const [stats, setStats] = useState({
  waiting: 0,
  called: 0,
  consultation: 0,
  admitted: 0,
  discharged: 0,
  transferred: 0,
  referred: 0,
  completed: 0,
});


useEffect(() => {
  loadStaff();
  loadDashboard();
  loadUtilisation();

  const interval = setInterval(() => {
    loadDashboard();
    loadUtilisation();
  }, 5000);

  return () => clearInterval(interval);
}, []);


const loadStaff = async()=>{

try{

const {
data:{
session
}
}
=
await supabase.auth.getSession();



const response =
await fetch(
`${API_URL}/hospital/staff-profile`,
{
headers:{
Authorization:
`Bearer ${session?.access_token}`
}
}
);



const json =
await response.json();



if(response.ok){

setStaff(
json.staff
);

}


}catch(err){

console.log(err);

}

};
const loadDashboard = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const response = await fetch(
      `${API_URL}/hospital/staff-department-dashboard`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const json = await response.json();

    if (response.ok) {
      setStats(json.stats || {});
    }
  } catch (err) {
    console.log(err);
  }
};

const loadUtilisation = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const response = await fetch(
    `${API_URL}/hospital/department-utilisation`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const json = await response.json();

    if (response.ok && json.departments?.length > 0) {
      const dept = json.departments[0];

      setUtilisation(dept.utilisation || 0);
      setAverageMinutes(dept.average_minutes || 0);
    }
  } catch (err) {
    console.log(err);
  }
};
  const quickActions = [
    {
      title: "Department Dashboard",
      subtitle: "Today's overview, queue and performance",
      icon: "speedometer",
      color: "#2563EB",
      route: "/health/department-dashboard",
    },
    {
  title: "Referral Inbox",
  subtitle: "Incoming patient referrals",
  icon: "mail-unread",
  color: "#90ed3a",
  route: "/health/referral-inbox",
},
    {
      title: "Department Live Board",
      subtitle: "Live queue board for only the department",
      icon: "tv",
      color: "#16A34A",
      route: "/health/department-live-board",
    },
    {
      title: "Hospital Live Board",
      subtitle: "Live queue board for all departments",
      icon: "tv",
      color: "#16A34A",
      route: "/health/live-board",
    },
    
    {
      title: "Patient Registration",
      subtitle: "Register walk-in patients",
      icon: "person-add",
      color: "#0891B2",
      route: "/health/department-registration",
    },
   
    {
      title: "Queue Board",
      subtitle: "Manage today's patient queue",
      icon: "people",
      color: "#F59E0B",
      route: "/health/department-queue",
    },
    {
      title: "Notifications",
      subtitle: "Hospital alerts and updates",
      icon: "notifications",
      color: "#DC2626",
      route: "/health/notifications",
    },
    {
      title: "Referral History",
      subtitle: "Hospital alerts and updates",
      icon: "document-text",
      color: "#3edc26",
      route: "/health/referral-history",
    },
    {
      title: "Department Analytics",
      subtitle: "Performance reports and statistics",
      icon: "stats-chart",
      color: "#7C3AED",
      route: "/health/department-analytics",
    },
   
  ];
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        {/* Header */}

        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={34}
              color="#2563EB"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.welcome}>
              Department Staff
            </Text>

            <Text style={styles.staffName}>
 {staff?.name || "Loading..."}
</Text>


<Text style={styles.staffDepartment}>
 {staff?.department || ""}
</Text>


<Text style={styles.staffDepartment}>
 {staff?.hospital || ""}
</Text>


<Text style={styles.staffDepartment}>
 Role: {staff?.role || ""}
</Text>
          </View>
        </View>

        {/* Quick Statistics */}

       <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.statsRow}
>


<View style={styles.statCard}>
<Text style={styles.statValue}>
{stats.waiting}
</Text>
<Text style={styles.statLabel}>
Waiting
</Text>
</View>


<View style={styles.statCard}>
<Text style={styles.statValue}>
{stats.called}
</Text>
<Text style={styles.statLabel}>
Called
</Text>
</View>


<View style={styles.statCard}>
  <Text style={styles.statValue}>
    {stats.consultation}
  </Text>
  <Text style={styles.statLabel}>
    Consultation
  </Text>
</View>

<View style={styles.statCard}>
  <Text style={styles.statValue}>
    {stats.admitted}
  </Text>
  <Text style={styles.statLabel}>
    Admitted
  </Text>
</View>

<View style={styles.statCard}>
  <Text style={styles.statValue}>
    {stats.discharged}
  </Text>
  <Text style={styles.statLabel}>
    Discharged
  </Text>
</View>

<View style={styles.statCard}>
  <Text style={styles.statValue}>
    {stats.transferred}
  </Text>
  <Text style={styles.statLabel}>
    Transferred
  </Text>
</View>

<View style={styles.statCard}>
  <Text style={styles.statValue}>
    {stats.referred}
  </Text>
  <Text style={styles.statLabel}>
    Referred
  </Text>
</View>

<View style={styles.statCard}>
  <Text style={styles.statValue}>
    {stats.completed}
  </Text>
  <Text style={styles.statLabel}>
    Completed
  </Text>
</View>

</ScrollView>

        <View style={styles.metricCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricTitle}>
              Department Utilisation
            </Text>

            <Text style={styles.metricValue}>
  {utilisation}%
</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                 width: `${utilisation}%`,
                },
              ]}
            />
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.smallText}>
              Average Waiting
            </Text>

            <Text style={styles.smallValue}>
  {averageMinutes} mins
</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.smallText}>
              Average Consultation
            </Text>

            <Text style={styles.smallValue}>
              0 mins
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Department Tools
        </Text>

        {quickActions.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.card}
            onPress={() =>
              router.push(item.route as any)
            }
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: item.color,
                },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={28}
                color="#fff"
              />
            </View>

            <View style={styles.textBox}>
              <Text style={styles.cardTitle}>
                {item.title}
              </Text>

              <Text style={styles.cardText}>
                {item.subtitle}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  headerCard: {
    margin: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  welcome: {
    fontSize: 14,
    color: "#6B7280",
  },

  staffName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginTop: 3,
  },

  staffDepartment: {
    fontSize: 15,
    color: "#2563EB",
    marginTop: 4,
    fontWeight: "600",
  },

  statsRow: {
  paddingHorizontal: 20,
  marginBottom: 18,
  alignItems: "stretch",
},

  statCard: {
  width: 120,
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  paddingVertical: 18,
  alignItems: "center",
  marginRight: 12,
  elevation: 2,
},

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  statLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },

  metricCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 2,
  },

  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  metricTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#16A34A",
  },

  progressTrack: {
    height: 10,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 18,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 10,
  },

  smallText: {
    fontSize: 14,
    color: "#6B7280",
  },

  smallValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginHorizontal: 20,
    marginBottom: 15,
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  textBox: {
    flex: 1,
    marginLeft: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  cardText: {
    marginTop: 5,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});