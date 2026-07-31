import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
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

    Alert.alert(
      title,
      message
    );

  }

};



type DashboardData = {

  waiting: number;
  called: number;
  checked_in: number;
  completed: number;
  total: number;

};



export default function HospitalDashboard() {


  const router = useRouter();



  const [dashboard, setDashboard] =
    useState<DashboardData>({

      waiting: 0,
      called: 0,
      checked_in: 0,
      completed: 0,
      total: 0,

    });



  const [analytics, setAnalytics] =
    useState<any>(null);



  const [
    departmentDashboard,
    setDepartmentDashboard,
  ] = useState<any[]>([]);



  const [loading, setLoading] =
    useState(true);



  const [refreshing, setRefreshing] =
    useState(false);



  const [role, setRole] =
    useState<
      "super_admin" |
      "hospital_admin" |
      null
    >(null);





const loadDashboard =
useCallback(async (currentRole:string) => {


  try {


    const {
      data:{
        session
      },
    } =
    await supabase.auth.getSession();



    if (!session?.access_token) {


      showMessage(
        "Login Required",
        "Please login again."
      );


      setLoading(false);

      return;

    }




    // SUPER ADMIN MUST NOT ACCESS HOSPITAL ANALYTICS

    if (
      currentRole !== "hospital_admin"
    ) {

      setLoading(false);

      return;

    }





    const response =
      await fetch(

        `${API_URL}/hospital/executive-analytics`,

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
        "Unable to load dashboard."
      );

    }





    setDashboard({

      waiting:
        json.analytics?.waiting_patients || 0,


      called:
        json.analytics?.called_patients || 0,


      checked_in:
        json.analytics?.checked_in_patients || 0,


      completed:
        json.analytics?.completed_patients || 0,


      total:
        json.analytics?.total_bookings || 0,


    });





    setAnalytics(
      json.analytics
    );






    /*
    ===========================================
    DEPARTMENT UTILISATION
    ONLY HOSPITAL ADMIN
    ===========================================
    */


    const utilisationResponse =
      await fetch(

        `${API_URL}/hospital/department-utilisation`,

        {

          headers: {

            Authorization:
              `Bearer ${session.access_token}`,

          },

        }

      );





    const utilisationJson =
      await utilisationResponse.json();





    if (
      utilisationResponse.ok
    ) {


      setDepartmentDashboard(

        utilisationJson.departments || []

      );


    } else {


      console.log(
        "Department utilisation error:",
        utilisationJson
      );


      setDepartmentDashboard([]);


    }





  } catch(err:any) {


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


  loadRole();


}, []);







const loadRole = async () => {


try {


  const {
    data:{
      user
    },
  } =
  await supabase.auth.getUser();





  if (!user) {


    setLoading(false);

    return;

  }





  const {
    data,
    error
  } =
  await (supabase as any)

  .from("hospital_admins")

  .select(
    "role,status"
  )

  .eq(
    "user_id",
    user.id
  )

  .eq(
    "status",
    "approved"
  )

  .maybeSingle();





  if(error){


    console.log(
      "Role check error:",
      error
    );


    setLoading(false);

    return;


  }






  if(!data){


    console.log(
      "No hospital admin record found"
    );


    setLoading(false);

    return;


  }






  const userRole =
    data.role as
    "super_admin" |
    "hospital_admin";





  setRole(
    userRole
  );






  // ONLY HOSPITAL ADMIN LOADS HOSPITAL DATA

  if(
    userRole === "hospital_admin"
  ){


    loadDashboard(
      userRole
    );



    const interval =
      setInterval(()=>{


        loadDashboard(
          userRole
        );


      },15000);




    return ()=>{


      clearInterval(
        interval
      );


    };


  } else {


    // SUPER ADMIN STOP LOADING

    setLoading(false);


  }





}catch(err){


  console.log(
    "Load role error:",
    err
  );


  setLoading(false);


}



};





const onRefresh = () => {


  setRefreshing(true);


  loadRole();


};
const StatCard = ({
  title,
  value,
  color,
  icon,
}: {
  title:string;
  value:number;
  color:string;
  icon:keyof typeof Ionicons.glyphMap;
}) => (

  <View
    style={[
      styles.statCard,
      {
        borderLeftColor:color,
      },
    ]}
  >

    <View style={styles.statHeader}>

      <Ionicons
        name={icon}
        size={26}
        color={color}
      />


      <Text style={styles.statValue}>
        {value}
      </Text>


    </View>



    <Text style={styles.statTitle}>
      {title}
    </Text>


  </View>

);






const QuickAction = ({
  title,
  icon,
  color,
  onPress,
}:{
  title:string;
  icon:keyof typeof Ionicons.glyphMap;
  color:string;
  onPress:()=>void;
}) => (

  <TouchableOpacity

    style={styles.actionCard}

    onPress={onPress}

    activeOpacity={0.8}

  >


    <View

      style={[
        styles.actionIcon,
        {
          backgroundColor:color,
        },
      ]}

    >


      <Ionicons

        name={icon}

        size={24}

        color="#fff"

      />


    </View>




    <Text style={styles.actionTitle}>

      {title}

    </Text>


  </TouchableOpacity>

);






const goToQueue = () => {

  router.push(
    "/(hospital-admin)/queue"
  );

};






const goToDepartments = () => {

  router.push(
    "/(hospital-admin)/departments"
  );

};






const goToCreateDepartmentStaff = () => {

  router.push(
    "/(hospital-admin)/create-department-staff"
  );

};






const goToCheckIn = () => {

  router.push(
    "/(hospital-admin)/checkin"
  );

};






const goToPatientRegistration = () => {

  router.push(
    "/(hospital-admin)/patient-registration"
  );

};






const goToWorkingHours = () => {

  router.push(
    "/(hospital-admin)/working-hours"
  );

};






const goToAnalytics = () => {

  router.push(
    "/(hospital-admin)/analytics"
  );

};






const goToLiveBoard = () => {

  router.push(
    "/(hospital-admin)/live-board"
  );

};






const goToDepartmentLiveBoard = () => {

  router.push(
    "/(hospital-admin)/department-live-board"
  );

};






const goToNotifications = () => {

  router.push(
    "/(hospital-admin)/notifications"
  );

};






const goToCreateHospitalAdmin = () => {

  router.push(
    "/(hospital-admin)/create-hospital-admin"
  );

};






const goToCreateHospital = () => {

  router.push(
    "/(hospital-admin)/create-hospital"
  );

};






const goToManageHospitals = () => {

  router.push(
    "/(hospital-admin)/manage-hospitals"
  );

};






const goToManageHospitalAdmins = () => {

  router.push(
    "/(hospital-admin)/hospital-admins"
  );

};






const goToHospitalSettings = () => {

  router.push(
    "/(hospital-admin)/hospital-settings"
  );

};






if(loading){

  return (

    <View style={styles.loadingContainer}>


      <ActivityIndicator

        size="large"

        color="#0A7CFF"

      />



      <Text style={styles.loadingText}>

        Loading dashboard...

      </Text>


    </View>

  );

}
return (

<ScrollView

  style={styles.container}

  contentContainerStyle={styles.content}

  refreshControl={

    <RefreshControl

      refreshing={refreshing}

      onRefresh={onRefresh}

    />

  }

>


<View style={styles.header}>


<Text style={styles.title}>

  Hospital Dashboard

</Text>



<Text style={styles.subtitle}>

  Monitor today's hospital queue and manage your departments.

</Text>


</View>





{
role === "hospital_admin" && (

<View style={styles.statsGrid}>


<StatCard

title="Waiting"

value={dashboard.waiting}

color="#F59E0B"

icon="time"

/>



<StatCard

title="Called"

value={dashboard.called}

color="#3B82F6"

icon="megaphone"

/>



<StatCard

title="Checked In"

value={dashboard.checked_in}

color="#10B981"

icon="checkmark-circle"

/>



<StatCard

title="Completed"

value={dashboard.completed}

color="#8B5CF6"

icon="medical"

/>



<StatCard

title="Emergency"

value={analytics?.emergency || 0}

color="#DC2626"

icon="warning"

/>



<StatCard

title="Today's Total"

value={dashboard.total}

color="#EF4444"

icon="people"

/>


</View>

)
}






{
role === "hospital_admin" && (

<>


<Text style={styles.sectionTitle}>

Department Utilisation

</Text>




{
departmentDashboard.length > 0 ? (


departmentDashboard.map(
(dept:any)=>(


<View

key={dept.department_id}

style={styles.infoCard}

>


<View style={styles.infoContent}>


<Text style={styles.infoTitle}>

{dept.department_name}

</Text>




<Text style={styles.infoText}>

Utilisation: {dept.utilisation}%

</Text>




<Text style={styles.infoText}>

Total Patients: {dept.total}

</Text>


</View>


</View>


)

)


)

:(


<View style={styles.infoCard}>


<View style={styles.infoContent}>


<Text style={styles.infoText}>

No department utilisation available.

</Text>


</View>


</View>


)

}


</>

)

}







{
role === "hospital_admin" && (

<View style={styles.actionsGrid}>


<QuickAction

title="Departments"

icon="business"

color="#16A34A"

onPress={goToDepartments}

/>



<QuickAction

title="Create Department Staff"

icon="person-add"

color="#0891B2"

onPress={goToCreateDepartmentStaff}

/>



<QuickAction

title="Analytics"

icon="bar-chart"

color="#7C3AED"

onPress={goToAnalytics}

/>



<QuickAction

title="Department Live Board"

icon="desktop"

color="#DC2626"

onPress={goToDepartmentLiveBoard}

/>



<QuickAction

title="Working Hours"

icon="time"

color="#16A34A"

onPress={goToWorkingHours}

/>



</View>

)

}








{
role === "super_admin" && (

<>


<Text style={styles.sectionTitle}>

Hospital Management

</Text>




<View style={styles.actionsGrid}>


<QuickAction

title="Create Hospital"

icon="business"

color="#2563EB"

onPress={goToCreateHospital}

/>




<QuickAction

title="Manage Hospitals"

icon="list"

color="#16A34A"

onPress={goToManageHospitals}

/>




<QuickAction

title="Create Hospital Admin"

icon="person-add"

color="#eb25e5"

onPress={goToCreateHospitalAdmin}

/>




<QuickAction

title="Manage Admins"

icon="people"

color="#16A34A"

onPress={goToManageHospitalAdmins}

/>




<QuickAction

title="Hospital Settings"

icon="settings"

color="#F59E0B"

onPress={goToHospitalSettings}

/>


</View>


</>

)

}






<View style={styles.infoCard}>


<Ionicons

name="information-circle"

size={28}

color="#0A7CFF"

/>




<View style={styles.infoContent}>


<Text style={styles.infoTitle}>

Hospital Queue Management

</Text>



<Text style={styles.infoText}>

Use the quick actions above to manage hospitals, departments,
monitor queues, and check in patients by scanning their QR code
or booking code.

</Text>



</View>


</View>





</ScrollView>

);

}
const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F5F7FA",
  },


  content:{
    padding:18,
    paddingBottom:40,
  },


  loadingContainer:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:"#F5F7FA",
  },


  loadingText:{
    marginTop:14,
    fontSize:16,
    color:"#666",
  },


  header:{
    marginBottom:22,
  },


  title:{
    fontSize:30,
    fontWeight:"700",
    color:"#111827",
  },


  subtitle:{
    marginTop:6,
    fontSize:15,
    color:"#6B7280",
    lineHeight:22,
  },


  statsGrid:{
    flexDirection:"row",
    flexWrap:"wrap",
    justifyContent:"space-between",
    marginBottom:26,
  },


  statCard:{
    width:"48%",
    backgroundColor:"#FFFFFF",
    borderRadius:16,
    padding:16,
    marginBottom:14,
    borderLeftWidth:6,

    shadowColor:"#000",
    shadowOpacity:0.08,
    shadowRadius:6,
    shadowOffset:{
      width:0,
      height:3,
    },

    elevation:3,
  },


  statHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:12,
  },


  statValue:{
    fontSize:28,
    fontWeight:"700",
    color:"#111827",
  },


  statTitle:{
    fontSize:15,
    color:"#6B7280",
    fontWeight:"600",
  },


  sectionTitle:{
    fontSize:22,
    fontWeight:"700",
    color:"#111827",
    marginBottom:16,
  },


  actionsGrid:{
    flexDirection:"row",
    flexWrap:"wrap",
    justifyContent:"space-between",
    marginBottom:28,
  },


  actionCard:{
    width:"48%",
    backgroundColor:"#FFFFFF",
    borderRadius:16,
    alignItems:"center",
    paddingVertical:22,
    marginBottom:16,

    shadowColor:"#000",
    shadowOpacity:0.08,
    shadowRadius:6,
    shadowOffset:{
      width:0,
      height:3,
    },

    elevation:3,
  },


  actionIcon:{
    width:58,
    height:58,
    borderRadius:29,
    justifyContent:"center",
    alignItems:"center",
    marginBottom:12,
  },


  actionTitle:{
    fontSize:15,
    fontWeight:"600",
    color:"#111827",
    textAlign:"center",
  },


  infoCard:{
    backgroundColor:"#FFFFFF",
    borderRadius:18,
    padding:18,
    flexDirection:"row",
    alignItems:"flex-start",

    shadowColor:"#000",
    shadowOpacity:0.08,
    shadowRadius:6,
    shadowOffset:{
      width:0,
      height:3,
    },

    elevation:3,
  },


  infoContent:{
    flex:1,
    marginLeft:14,
  },


  infoTitle:{
    fontSize:17,
    fontWeight:"700",
    color:"#111827",
    marginBottom:8,
  },


  infoText:{
    fontSize:15,
    color:"#6B7280",
    lineHeight:22,
  },


});