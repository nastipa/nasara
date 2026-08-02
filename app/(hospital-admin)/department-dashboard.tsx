import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type QueuePatient = {
  booking_id: string;
  queue_number: string;
  booking_code: string;
  patient_name: string | null;
  priority: string;
  priority_level: number;
  status: string;
  checked_in: boolean;
  condition: string | null;
  created_at: string;
};

type DashboardResponse = {
  department: {
    id: string;
    name: string;
    average_minutes: number;
  };
statistics: {
  waiting: number;
  called: number;
  consultation: number;
  admitted: number;
  discharged: number;
  transferred: number;
  referred: number;
  completed: number;
  total_today: number;
};

  current_patient:
    | QueuePatient
    | null;

  queue: QueuePatient[];
};

export default function DepartmentDashboard() {
  const {
    department_id,
    department_name,
  } = useLocalSearchParams<{
    department_id: string;
    department_name: string;
  }>();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(
      null
    );
    const [transferVisible,setTransferVisible] =
useState(false);

const [selectedPatient,setSelectedPatient] =
useState<QueuePatient | null>(null);

const [departments,setDepartments] =
useState<any[]>([]);

const [selectedDepartment,setSelectedDepartment] =
useState<string | null>(null);

const [transferNote,setTransferNote] =
useState("");

  const loadDashboard =
    useCallback(async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();
          // DEBUG LOGS
console.log("Selected Patient:", selectedPatient);
console.log("Booking ID:", selectedPatient?.booking_id);
console.log("Next Department:", selectedDepartment);

        if (!session?.access_token) {
          return;
        }

        const response =
          await fetch(
            `${API_URL}/hospital/department-dashboard`,
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                department_id,
              }),
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error
          );
        }

        setDashboard(json);

      } catch (err: any) {
        showMessage(
          "Error",
          err.message
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [department_id]);

  useEffect(() => {
    loadDashboard();

    const timer =
      setInterval(
        loadDashboard,
        10000
      );

    return () =>
      clearInterval(timer);
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };
  const updateStatus = async (
    bookingId: string,
    status:
      | "called"
      | "checked_in"
      | "completed"
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
          `${API_URL}/hospital/update-booking-status`,
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              booking_id: bookingId,
              status,
            }),
          }
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error
        );
      }

      loadDashboard();

    } catch (err: any) {
      showMessage(
        "Error",
        err.message
      );
    }
  };
  const loadDepartments =
useCallback(async()=>{

try{

const {
data:{session}
}
=
await supabase.auth.getSession();


const response =
await fetch(
`${API_URL}/hospital/departments`,
{
headers:{
Authorization:
`Bearer ${session?.access_token}`
}
}
);


const json =
await response.json();


setDepartments(
json.departments || []
);


}catch(err:any){

showMessage(
"Error",
err.message
);

}


},[]);

const transferPatient =
async()=>{


if(
!selectedPatient ||
!selectedDepartment
){

showMessage(
"Select Department",
"Choose destination department"
);

return;

}


try{


const {
data:{session}
}
=
await supabase.auth.getSession();



const response =
await fetch(
`${API_URL}/hospital/transfer-patient`,
{

method:"POST",

headers:{
Authorization:
`Bearer ${session?.access_token}`,

"Content-Type":
"application/json",

},

body:JSON.stringify({

booking_id:
selectedPatient.booking_id,

next_department_id:
selectedDepartment,

note:
transferNote

})

}
);


const json =
await response.json();



if(!response.ok){

throw new Error(
json.error
);

}



showMessage(
"Success",
"Patient transferred successfully"
);



setTransferVisible(false);

setSelectedPatient(null);

setSelectedDepartment(null);

setTransferNote("");

loadDashboard();



}catch(err:any){

showMessage(
"Transfer Failed",
err.message
);

}


};

  const renderPatient = ({
    item,
  }: {
    item: QueuePatient;
  }) => (
    <View style={styles.patientCard}>

      <View
        style={styles.patientHeader}
      >
        <Text
          style={styles.queueNumber}
        >
          {item.queue_number}
        </Text>

        <Text
          style={styles.priority}
        >
          {item.priority.toUpperCase()}
        </Text>
      </View>

      <Text
        style={styles.patientName}
      >
        {item.patient_name ||
          "Unknown Patient"}
      </Text>

      {!!item.condition && (
        <Text
          style={styles.condition}
        >
          {item.condition}
        </Text>
      )}

      <Text
        style={styles.status}
      >
        Status:
        {" "}
        {item.status
          .replace(/_/g, " ")
          .toUpperCase()}
      </Text>

     <View style={styles.actions}>

  {item.status === "waiting" && (
    <TouchableOpacity
      style={styles.callButton}
      onPress={() =>
        updateStatus(
          item.booking_id,
          "called"
        )
      }
    >
      <Text style={styles.buttonText}>
        Call
      </Text>
    </TouchableOpacity>
  )}


  {item.status === "called" && (
    <TouchableOpacity
      style={styles.checkInButton}
      onPress={() =>
        updateStatus(
          item.booking_id,
          "checked_in"
        )
      }
    >
      <Text style={styles.buttonText}>
        Check In
      </Text>
    </TouchableOpacity>
  )}


  {item.status === "checked_in" && (
    <>
    <TouchableOpacity
      style={styles.completeButton}
      onPress={() =>
        updateStatus(
          item.booking_id,
          "completed"
        )
      }
    >
      <Text style={styles.buttonText}>
        Complete
      </Text>
    </TouchableOpacity>
    
  <TouchableOpacity
        style={styles.transferButton}
        onPress={() => {
          setSelectedPatient(item);
          setTransferVisible(true);
          loadDepartments();
        }}
      >
        <Text style={styles.buttonText}>
          Transfer
        </Text>
      </TouchableOpacity>
    </>
  )}

</View>
      
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
          Loading Department...
        </Text>
      </View>
    );
  }

  return (
    <>
    <FlatList
      data={
        dashboard?.queue || []
      }
      keyExtractor={(item) =>
        item.booking_id
      }
      renderItem={renderPatient}
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
      ListHeaderComponent={
        <View
          style={styles.header}
        >

          <Text
            style={styles.title}
          >
            {department_name}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Department Dashboard
          </Text>

          <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.statsScroll}
>

  <View style={styles.statCard}>
    <Text style={styles.statValue}>
      {dashboard?.statistics.waiting}
    </Text>
    <Text style={styles.statLabel}>Waiting</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={styles.statValue}>
      {dashboard?.statistics.called}
    </Text>
    <Text style={styles.statLabel}>Called</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={[styles.statValue,{color:"#9333EA"}]}>
      {dashboard?.statistics.consultation}
    </Text>
    <Text style={styles.statLabel}>Consultation</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={[styles.statValue,{color:"#16A34A"}]}>
      {dashboard?.statistics.admitted}
    </Text>
    <Text style={styles.statLabel}>Admitted</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={[styles.statValue,{color:"#2563EB"}]}>
      {dashboard?.statistics.discharged}
    </Text>
    <Text style={styles.statLabel}>Discharged</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={[styles.statValue,{color:"#EA580C"}]}>
      {dashboard?.statistics.transferred}
    </Text>
    <Text style={styles.statLabel}>Transferred</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={[styles.statValue,{color:"#7C3AED"}]}>
      {dashboard?.statistics.referred}
    </Text>
    <Text style={styles.statLabel}>Referred</Text>
  </View>

  <View style={styles.statCard}>
    <Text style={[styles.statValue,{color:"#059669"}]}>
      {dashboard?.statistics.completed}
    </Text>
    <Text style={styles.statLabel}>Completed</Text>
  </View>

</ScrollView>

        </View>
      }
    />
      <Modal
  visible={transferVisible}
  transparent
  animationType="slide"
>

<View style={styles.modalContainer}>

<View style={styles.modalBox}>


<Text style={styles.modalTitle}>
Transfer Patient
</Text>


<ScrollView
style={styles.departmentList}
showsVerticalScrollIndicator={false}
>

{
departments.map((dept)=>(
<TouchableOpacity

key={dept.id}

style={[
styles.departmentButton,

selectedDepartment === dept.id &&
{
backgroundColor:"#DBEAFE"
}

]}

onPress={()=>{

setSelectedDepartment(
dept.id
);

}}

>

<Text>
{dept.name}
</Text>

</TouchableOpacity>
))
}


</ScrollView>



<TextInput

placeholder="Transfer note"

style={styles.input}

value={transferNote}

onChangeText={
setTransferNote
}

/>



<TouchableOpacity

style={styles.confirmButton}

onPress={
transferPatient
}

>

<Text style={styles.buttonText}>
Confirm Transfer
</Text>

</TouchableOpacity>



</View>

</View>

</Modal>

  </>
);
    

}
  const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  header: {
    padding: 18,
    backgroundColor: "#F5F7FA",
  },
modalContainer:{
  flex:1,
  backgroundColor:"rgba(0,0,0,0.5)",
  justifyContent:"center",
  padding:20,
},

modalBox:{
  backgroundColor:"#FFFFFF",
  borderRadius:18,
  padding:20,
},

modalTitle:{
  fontSize:22,
  fontWeight:"700",
  marginBottom:20,
},

departmentButton:{
  backgroundColor:"#F3F4F6",
  padding:14,
  borderRadius:10,
  marginBottom:10,
},

input:{
  borderWidth:1,
  borderColor:"#D1D5DB",
  borderRadius:10,
  padding:12,
  marginTop:15,
},
statsScroll: {
  paddingRight: 20,
},

statCard: {
  width: 120,
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  paddingVertical: 18,
  paddingHorizontal: 12,
  marginRight: 14,
  alignItems: "center",

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 5,
  shadowOffset: {
    width: 0,
    height: 2,
  },
  elevation: 3,
},

statLabel: {
  marginTop: 8,
  fontSize: 14,
  fontWeight: "600",
  color: "#6B7280",
},

confirmButton:{
  backgroundColor:"#2563EB",
  padding:14,
  borderRadius:10,
  marginTop:15,
  alignItems:"center",
},
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 15,
    color: "#6B7280",
  },

  statsRow:{
 flexDirection:"row",
 flexWrap:"wrap",
 justifyContent:"space-between",
 marginBottom:10,
},

  
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 5,
  },

  patientCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  queueNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
  },

  priority: {
    color: "#DC2626",
    fontWeight: "700",
  },

  patientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  condition: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 10,
  },

  status: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 15,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
 departmentList:{
  maxHeight:250,
},

  callButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  checkInButton: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  currentCard:{
backgroundColor:"#FFFFFF",
marginHorizontal:16,
marginBottom:15,
padding:18,
borderRadius:16,
},

currentTitle:{
fontSize:16,
fontWeight:"700",
color:"#2563EB",
},

currentName:{
fontSize:20,
fontWeight:"700",
marginVertical:8,
},

transferButton:{
backgroundColor:"#EA580C",
paddingHorizontal:18,
paddingVertical:10,
borderRadius:10,
marginLeft:10,
},
  completeButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});