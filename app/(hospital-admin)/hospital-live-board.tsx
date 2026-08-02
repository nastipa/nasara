import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

type DepartmentBoard = {
  department_id: string;
  department_name: string;

  current_serving: string | null;

  waiting: number;

  average_wait_minutes: number;

  next_numbers: string[];
};

export default function LiveBoardScreen() {

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [hospital, setHospital] =
    useState("");

  const [departments, setDepartments] =
    useState<DepartmentBoard[]>([]);
    const pulse =
  useRef(
    new Animated.Value(1)
  ).current;

const previousServing =
  useRef<Record<string,string>>({});
const [showBanner, setShowBanner] =
  useState(false);
const [currentTime, setCurrentTime] =
  useState(new Date());

  const loadBoard =
    useCallback(async () => {

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
            `${API_URL}/hospital/live-board`,
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
            json.error
          );
        }

        setHospital(
          json.hospital || ""
        );

        setDepartments(
          json.departments || []
        );
        (json.departments || []).forEach(
  (dept: DepartmentBoard) => {

    const previous =
      previousServing.current[
        dept.department_id
      ];

    if (
      previous &&
      previous !== dept.current_serving
    ) {
   setShowBanner(true);

setTimeout(() => {
  setShowBanner(false);
}, 4000)
      Animated.sequence([

        Animated.timing(
          pulse,
          {
            toValue:1.12,
            duration:300,
            useNativeDriver:true,
          }
        ),

        Animated.timing(
          pulse,
          {
            toValue:1,
            duration:300,
            useNativeDriver:true,
          }
        ),

        Animated.timing(
          pulse,
          {
            toValue:1.12,
            duration:300,
            useNativeDriver:true,
          }
        ),

        Animated.timing(
          pulse,
          {
            toValue:1,
            duration:300,
            useNativeDriver:true,
          }
        ),

      ]).start();

    }

    previousServing.current[
      dept.department_id
    ] = dept.current_serving || "";

});

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    }, []);

  useEffect(() => {

  loadBoard();

  const refreshInterval =
    setInterval(
      loadBoard,
      5000
    );

  const clockInterval =
    setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

  return () => {
    clearInterval(refreshInterval);
    clearInterval(clockInterval);
  };

}, [loadBoard]);

  const onRefresh = () => {

    setRefreshing(true);

    loadBoard();

  };

  if (loading) {

    return (

      <View style={styles.loading}>

        <ActivityIndicator
          size="large"
        />

      </View>

    );

  }
  const getDepartmentColor = (
  name: string
) => {

  const department =
    name.toLowerCase();

  // 🔴 Emergency
  if (department.includes("emergency"))
    return "#DC2626";

  // 🔵 OPD / General
  if (
    department.includes("opd") ||
    department.includes("outpatient") ||
    department.includes("general")
  )
    return "#2563EB";

  // 🟢 Pharmacy
  if (department.includes("pharmacy"))
    return "#16A34A";

  // 🟣 Laboratory
  if (
    department.includes("laboratory") ||
    department.includes("lab")
  )
    return "#7C3AED";

  // 🟠 Surgery / Theatre
  if (
    department.includes("surgery") ||
    department.includes("surgical") ||
    department.includes("theatre") ||
    department.includes("operating")
  )
    return "#EA580C";

  // 🟡 Billing / Cash Office / Accounts
  if (
    department.includes("billing") ||
    department.includes("cash") ||
    department.includes("accounts") ||
    department.includes("finance")
  )
    return "#CA8A04";

  // 🩷 Maternity
  if (
    department.includes("maternity") ||
    department.includes("labour") ||
    department.includes("obstetric")
  )
    return "#DB2777";

  // 🟦 ENT
  if (department.includes("ent"))
    return "#0891B2";

  // 🟤 Dental
  if (department.includes("dental"))
    return "#92400E";

  // 🟪 Eye / Ophthalmology
  if (
    department.includes("eye") ||
    department.includes("ophthalmology")
  )
    return "#8B5CF6";

  // 🟩 Pediatrics / Children
  if (
    department.includes("child") ||
    department.includes("paediatric") ||
    department.includes("pediatric")
  )
    return "#10B981";

  // ❤️ Cardiology
  if (department.includes("card"))
    return "#E11D48";

  // 💜 Radiology / X-ray
  if (
    department.includes("radiology") ||
    department.includes("x-ray") ||
    department.includes("scan") ||
    department.includes("imaging")
  )
    return "#9333EA";

  // ⚫ Default
  return "#6B7280";
};

  return (
    <>
       {showBanner && (

<View style={styles.banner}>

<Text style={styles.bannerTitle}>
🔔 NEW PATIENT CALLED
</Text>

<Text style={styles.bannerText}>
Please proceed to your department
</Text>

</View>

)}
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
<View style={styles.header}>

  <Text style={styles.title}>
    🏥 {hospital}
  </Text>

  <Text style={styles.subtitle}>
    LIVE HOSPITAL QUEUE BOARD
  </Text>

  <Text style={styles.dateText}>
    {currentTime.toLocaleDateString(undefined,{
      weekday:"long",
      year:"numeric",
      month:"long",
      day:"numeric",
    })}
  </Text>

  <Text style={styles.timeText}>
    {currentTime.toLocaleTimeString()}
  </Text>

</View>
      {departments.map((dept) => (
<View
  key={dept.department_id}
  style={[
    styles.card,
    {
      borderTopWidth:8,
      borderTopColor:
        getDepartmentColor(
          dept.department_name
        ),
    },
  ]}
>


   <Text
  style={[
    styles.departmentName,
    {
      color:
        getDepartmentColor(
          dept.department_name
        ),
    },
  ]}
>
  {dept.department_name}
</Text>

    <View style={styles.servingBox}>

  <Text style={styles.servingLabel}>
    🟢 NOW SERVING
  </Text>

 <Animated.View
  style={[
    styles.servingBubble,
    {
      transform:[
        {
          scale:pulse,
        },
      ],
    },
  ]}
>

    <Text style={styles.servingNumber}>
  {(dept.current_serving ?? "--").replace("-", "\n")}
</Text>

  </Animated.View>

  <Text style={styles.servingMessage}>

    {dept.current_serving
      ? "Please proceed to this department"
      : "Waiting for next patient"}

  </Text>

</View>

    <View style={styles.statsRow}>

      <View style={styles.statCard}>

        <Text style={styles.statValue}>
          {dept.waiting}
        </Text>

        <Text style={styles.statLabel}>
          Waiting
        </Text>

      </View>

      <View style={styles.statCard}>

        <Text style={styles.statValue}>
          {dept.average_wait_minutes}
        </Text>

        <Text style={styles.statLabel}>
          Est. Wait
        </Text>

      </View>

    </View>

    <Text style={styles.nextTitle}>
      NEXT NUMBERS
    </Text>

    <View style={styles.waitingContainer}>

  {dept.next_numbers.length > 0 ? (

    <>
      {dept.next_numbers
        .slice(0,5)
        .map(number => (

          <View
            key={number}
            style={styles.waitingBubble}
          >

            <Text style={styles.waitingText}>
  {number.replace("-", "\n")}
</Text>

          </View>

      ))}

      {dept.waiting > 5 && (

        <View style={styles.moreBubble}>

          <Text style={styles.moreText}>
            +{dept.waiting - 5} More
          </Text>

        </View>

      )}

    </>

  ) : (

    <Text style={styles.empty}>
      No waiting patients
    </Text>

  )}

</View>

  </View>

))}

</ScrollView>
 </>
);

}

const styles =
StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F5F7FA",
padding:16,
},
header:{
alignItems:"center",
marginBottom:25,
},
dateText:{
fontSize:17,
color:"#6B7280",
marginTop:8,
},

timeText:{
fontSize:36,
fontWeight:"900",
color:"#16A34A",
marginTop:8,
},
loading:{
flex:1,
justifyContent:"center",
alignItems:"center",
},

title:{
fontSize:28,
fontWeight:"800",
color:"#111827",
textAlign:"center",
},

subtitle:{
fontSize:16,
color:"#6B7280",
textAlign:"center",
marginBottom:20,
},

card:{
backgroundColor:"#FFFFFF",
borderRadius:18,
padding:18,
marginBottom:18,
shadowColor:"#000",
shadowOpacity:0.08,
shadowRadius:6,
shadowOffset:{
width:0,
height:3,
},
elevation:3,
},

departmentName:{
fontSize:22,
fontWeight:"700",
marginBottom:15,
color:"#111827",
},

servingBox:{
alignItems:"center",
marginBottom:18,
},

servingLabel:{
fontSize:14,
fontWeight:"700",
color:"#6B7280",
},

servingNumber: {
  fontSize: 40,
  fontWeight: "900",
  color: "#FFFFFF",
  textAlign: "center",
  lineHeight: 46,
  includeFontPadding: false, // Android
},
servingBubble: {
  width: 190,
  height: 190,
  borderRadius: 95,
  backgroundColor: "#16A34A",
  justifyContent: "center",
  alignItems: "center",
  alignSelf: "center",
  paddingHorizontal: 16,
  paddingVertical: 16,
  marginVertical: 16,
},
servingMessage:{
fontSize:16,
fontWeight:"600",
color:"#374151",
textAlign:"center",
},

statsRow:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:18,
},

statCard:{
flex:1,
alignItems:"center",
backgroundColor:"#F3F4F6",
padding:12,
borderRadius:12,
marginHorizontal:5,
},

statValue:{
fontSize:26,
fontWeight:"800",
color:"#111827",
},
waitingContainer:{
flexDirection:"row",
flexWrap:"wrap",
justifyContent:"center",
gap:12,
marginBottom:15,
},
waitingBubble:{
  width:90,
  height:90,
  borderRadius:45,
  backgroundColor:"#2563EB",
  justifyContent:"center",
  alignItems:"center",
  paddingHorizontal:8,
  paddingVertical:8,
  margin:6,
},
waitingText:{
  color:"#FFFFFF",
  fontSize:22,
  fontWeight:"900",
  textAlign:"center",
  lineHeight:24,
  includeFontPadding:false,
},
moreBubble:{
height:80,
paddingHorizontal:24,
borderRadius:40,
backgroundColor:"#1D4ED8",
justifyContent:"center",
alignItems:"center",
},
banner:{
backgroundColor:"#16A34A",
paddingVertical:18,
paddingHorizontal:20,
alignItems:"center",
justifyContent:"center",
},

bannerTitle:{
color:"#FFFFFF",
fontSize:24,
fontWeight:"900",
},

bannerText:{
color:"#FFFFFF",
fontSize:18,
marginTop:6,
fontWeight:"600",
},
moreText:{
color:"#FFFFFF",
fontSize:20,
fontWeight:"800",
},
statLabel:{
fontSize:13,
color:"#6B7280",
marginTop:4,
},

nextTitle:{
fontSize:16,
fontWeight:"700",
marginBottom:10,
color:"#111827",
},

nextRow:{
flexDirection:"row",
flexWrap:"wrap",
},

badge:{
backgroundColor:"#2563EB",
paddingHorizontal:15,
paddingVertical:10,
borderRadius:24,
marginRight:8,
marginBottom:8,
},

badgeText:{
color:"#FFFFFF",
fontWeight:"700",
},

empty:{
color:"#9CA3AF",
fontSize:15,
},

});