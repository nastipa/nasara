import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";
  const tickerMessage =
  "WELCOME • PLEASE LISTEN FOR YOUR QUEUE NUMBER • FOLLOW THE DIGITAL DISPLAY FOR LIVE UPDATES • KEEP YOUR PHONE AVAILABLE FOR NOTIFICATIONS • FOLLOW STAFF INSTRUCTIONS AT ALL TIMES • EMERGENCY PATIENTS ARE GIVEN PRIORITY • THANK YOU FOR CHOOSING OUR HOSPITAL • ";

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
    const pulseAnimations =
  useRef<
    Record<string, Animated.Value>
  >({});
const fadeAnim =
  useRef(
    new Animated.Value(1)
  ).current;
  
const previousServing =
  useRef<Record<string,string>>({});
const [showBanner, setShowBanner] =
  useState(false);
const [currentTime, setCurrentTime] =
  useState(new Date());
  const [page, setPage] = useState(0);
  

const rowsPerPage = 4;

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
  if (
  !pulseAnimations.current[
    dept.department_id
  ]
) {

  pulseAnimations.current[
    dept.department_id
  ] = new Animated.Value(1);

}
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
pulseAnimations.current[
dept.department_id
],
{
toValue:1.25,
duration:180,
useNativeDriver:true,
}
),

Animated.timing(
pulseAnimations.current[
dept.department_id
],
{
toValue:1,
duration:180,
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
    const pageInterval =
  setInterval(() => {

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          departments.length / rowsPerPage
        )
      );

    Animated.sequence([

Animated.timing(
fadeAnim,
{
toValue:0,
duration:350,
useNativeDriver:true,
}
),

]).start(() => {

setPage(prev =>
(prev + 1) % totalPages
);

Animated.timing(
fadeAnim,
{
toValue:1,
duration:350,
useNativeDriver:true,
}
).start();

});
  }, 8000);

  return () => {
  clearInterval(refreshInterval);
  clearInterval(clockInterval);
  clearInterval(pageInterval);
};

}, [loadBoard, departments.length]);

  const onRefresh = () => {

    setRefreshing(true);

    loadBoard();

  };
   const visibleDepartments =
  departments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
     <Animated.View
style={[
styles.boardContainer,
{
opacity:fadeAnim,
},
]}
>

<View style={styles.boardHeader}>

<Text style={[styles.colDepartment]}>
Department
</Text>

<Text style={[styles.colServing]}>
Now Serving
</Text>

<Text style={[styles.colWaiting]}>
Waiting
</Text>

<Text style={[styles.colAverage]}>
Est.
</Text>

</View>

{visibleDepartments.map((dept) => (
<View
key={dept.department_id}
style={styles.boardRow}
>

<Text
style={[
styles.colDepartment,
{
color:getDepartmentColor(
dept.department_name
),
},
]}
numberOfLines={1}
>

{dept.department_name}

</Text>

<Animated.Text
  style={[
    styles.colServing,
    {
      color:
        dept.current_serving
          ? "#22C55E"
          : "#9CA3AF",
      transform: [
        {
          scale:
            pulseAnimations.current[
              dept.department_id
            ] || 1,
        },
      ],
    },
  ]}
>
  {dept.current_serving || "--"}
</Animated.Text>
<Text
  style={[
    styles.colWaiting,
    {
      color:
        dept.waiting > 20
          ? "#DC2626" // Red
          : dept.waiting > 10
          ? "#CA8A04" // Amber
          : "#16A34A", // Green
    },
  ]}
>
  {dept.waiting}
</Text>

<Text style={styles.colAverage}>

{dept.average_wait_minutes}m

</Text>

</View>

))}

</Animated.View>
<View style={styles.footer}>

  <Text style={styles.footerText}>
    Page {page + 1} of{" "}
    {Math.max(
      1,
      Math.ceil(
        departments.length / rowsPerPage
      )
    )}
  </Text>

</View>
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
footer: {
  alignItems: "center",
  marginTop: 16,
  marginBottom: 10,
},

footerText: {
  fontSize: 18,
  fontWeight: "700",
  color: "#6B7280",
},

title:{
fontSize:28,
fontWeight:"800",
color:"#111827",
textAlign:"center",
},
boardContainer:{
backgroundColor:"#FFFFFF",
borderRadius:18,
overflow:"hidden",
marginBottom:20,
},

boardRow:{
flexDirection:"row",
height:95,
paddingHorizontal:24,
borderBottomWidth:1,
borderBottomColor:"#E5E7EB",
alignItems:"center",
justifyContent:"center",
},
colDepartment:{
flex:2.6,
fontSize:28,
fontWeight:"800",
color:"#111827",
},

colServing:{
flex:1.8,
fontSize:46,
fontWeight:"900",
textAlign:"center",
letterSpacing:2,
color:"#16A34A",
},
colWaiting:{
flex:1,
fontSize:36,
fontWeight:"900",
textAlign:"center",
color:"#2563EB",
},
colAverage:{
flex:1,
fontSize:28,
fontWeight:"800",
textAlign:"center",
color:"#EA580C",
},
boardHeader:{
flexDirection:"row",
backgroundColor:"#111827",
paddingVertical:22,
paddingHorizontal:24,
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