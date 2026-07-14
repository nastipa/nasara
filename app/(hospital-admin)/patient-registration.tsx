import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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


export default function PatientRegistration() {

  const [searchType, setSearchType] =
    useState<
      "ghana_card" | "nhis" | "phone"
    >("ghana_card");


  const [searchValue, setSearchValue] =
    useState("");

const [queueReceipt,setQueueReceipt] =
useState<any>(null);
  const [loading, setLoading] =
    useState(false);
const [priorityCase, setPriorityCase] = useState("Normal");

  const [patient, setPatient] =
    useState<any>(null);
    const [joiningQueue, setJoiningQueue] =
  useState(false);
  const [departments, setDepartments] =
  useState<any[]>([]);

const [selectedDepartment, setSelectedDepartment] =
  useState<any>(null);
const [showRegister, setShowRegister] =
  useState(false);

const [form, setForm] = useState({
  full_name: "",
  phone: "",
  ghana_card_number: "",
  nhis_number: "",
  gender: "",
  date_of_birth: "",
  address: "",
});
useEffect(()=>{

  loadDepartments();

},[]);

  const searchPatient = async () => {

    if (!searchValue.trim()) {
      showMessage(
        "Required",
        "Enter search value"
      );
      return;
    }


    try {

      setLoading(true);


      const {
        data:{
          session
        }
      } =
      await supabase.auth.getSession();


      const body:any = {};


      if(searchType === "ghana_card"){
        body.ghana_card_number =
          searchValue.trim();
      }


      if(searchType === "nhis"){
        body.nhis_number =
          searchValue.trim();
      }


      if(searchType === "phone"){
        body.phone =
          searchValue.trim();
      }


      const response =
        await fetch(
          `${API_URL}/hospital/search-patient`,
          {
            method:"POST",

            headers:{
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session?.access_token}`,
            },

            body:
              JSON.stringify(body),
          }
        );


      const json =
        await response.json();


      if(!response.ok){

        throw new Error(
          json.error ||
          "Search failed"
        );

      }


      if(json.exists){

        setPatient(
          json.patient
        );

      }else{

        setPatient(null);

        setShowRegister(true);

showMessage(
  "Patient Not Found",
  "Please register this patient."
);
      }


    }catch(err:any){

      showMessage(
        "Error",
        err.message
      );

    }finally{

      setLoading(false);

    }

  };
const registerPatient = async () => {

  if (!form.full_name.trim()) {
    showMessage(
      "Required",
      "Patient name is required"
    );
    return;
  }


  try {

    setLoading(true);


    const {
      data:{
        session
      }
    } =
    await supabase.auth.getSession();


    const response =
      await fetch(
        `${API_URL}/hospital/register-patient`,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session?.access_token}`,
          },

          body: JSON.stringify({
  ...form,
  priority_case: priorityCase,
}),
        }
      );


    const json =
      await response.json();


    if(!response.ok){

      throw new Error(
        json.error ||
        "Registration failed"
      );

    }


    setPatient(json.patient);

setShowRegister(false);


// Automatically join OPD queue
await joinOPDQueueAfterRegistration(
  json.patient.id
);
    setForm({
  full_name:"",
  phone:"",
  ghana_card_number:"",
  nhis_number:"",
  gender:"",
  date_of_birth:"",
  address:"",
});


    showMessage(
      "Success",
      "Patient registered successfully"
    );


  }catch(err:any){

    showMessage(
      "Error",
      err.message
    );

  }finally{

    setLoading(false);

  }

};
const joinOPDQueueAfterRegistration = async (
  patientId:any
) => {

  try {

    const {
      data:{
        session
      }
    } =
    await supabase.auth.getSession();


    const response =
      await fetch(
        `${API_URL}/hospital/join-queue`,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session?.access_token}`,
          },

body: JSON.stringify({

  patient_record_id: patientId,

  condition:"OPD consultation",

  priority_case: priorityCase

})
        }
      );


    const json =
      await response.json();


    if(!response.ok){

      throw new Error(
        json.error ||
        "Queue creation failed"
      );

    }


    // Show receipt data
    setQueueReceipt(
      json.booking
    );


  }catch(err:any){

    showMessage(
      "Queue Error",
      err.message
    );

  }

};
const joinOPDQueue = async () => {

  if (!patient) {
    showMessage(
      "No Patient",
      "Please search or register patient first."
    );
    return;
  }


  try {

    setJoiningQueue(true);


    const {
      data:{
        session
      }
    } =
    await supabase.auth.getSession();


    const response =
      await fetch(
        `${API_URL}/hospital/join-queue`,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session?.access_token}`,
          },

          body: JSON.stringify({
   
  patient_record_id: patient.id,

  condition: "OPD consultation",
priority_case: priorityCase
}),    }
      );


    const json =
      await response.json();


    if(!response.ok){

      throw new Error(
        json.error ||
        "Unable to join queue"
      );

    }


   setQueueReceipt(json.booking);

showMessage(
  "Queue Created",
  `Queue Number: ${json.booking.queue_number}

Booking Code: ${json.booking.booking_code}

Estimated Wait: ${json.booking.estimated_wait_minutes} minutes`
);


  }catch(err:any){

    showMessage(
      "Error",
      err.message
    );

  }finally{

    setJoiningQueue(false);

  }

};
const loadDepartments = async () => {

  try {

    const {
      data:{
        session
      }
    } =
    await supabase.auth.getSession();


    const response =
      await fetch(
        `${API_URL}/hospital/departments`,
        {
          headers:{
            Authorization:
              `Bearer ${session?.access_token}`,
          },
        }
      );


    const json =
      await response.json();


    if(response.ok){

      setDepartments(
        json.departments || []
      );

      // Automatically select OPD
      const opd =
        json.departments?.find(
          (item:any)=>
          item.name
          .toLowerCase()
          ===
          "opd"
        );


      if(opd){
        setSelectedDepartment(opd);
      }

    }


  }catch(err){

    console.log(
      "Load departments:",
      err
    );
    

  }

};
  return (

    
<ScrollView
  style={styles.container}
  contentContainerStyle={styles.content}
>

      <Text style={styles.title}>
        Patient Registration
      </Text>


      <Text style={styles.subtitle}>
        Search patient before creating a new record
      </Text>



      <View style={styles.tabs}>


        <TouchableOpacity
          style={[
            styles.tab,
            searchType==="ghana_card" &&
            styles.activeTab
          ]}
          onPress={()=>
            setSearchType("ghana_card")
          }
        >
          <Text>
            Ghana Card
          </Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={[
            styles.tab,
            searchType==="nhis" &&
            styles.activeTab
          ]}
          onPress={()=>
            setSearchType("nhis")
          }
        >
          <Text>
            NHIS
          </Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={[
            styles.tab,
            searchType==="phone" &&
            styles.activeTab
          ]}
          onPress={()=>
            setSearchType("phone")
          }
        >
          <Text>
            Phone
          </Text>
        </TouchableOpacity>


      </View>



      <TextInput
        style={styles.input}
        placeholder={
          searchType==="ghana_card"
          ? "Enter Ghana Card Number"
          :
          searchType==="nhis"
          ? "Enter NHIS Number"
          :
          "Enter Phone Number"
        }
        value={searchValue}
        onChangeText={
          setSearchValue
        }
      />



      <TouchableOpacity
        style={styles.button}
        onPress={searchPatient}
      >

        {
          loading
          ?
          <ActivityIndicator
            color="#fff"
          />
          :
          <Text style={styles.buttonText}>
            Search Patient
          </Text>
        }

      </TouchableOpacity>



      {
        patient && (

          <View style={styles.card}>

            <Text style={styles.cardTitle}>
              Patient Found
            </Text>


            <Text>
              Name: {patient.full_name}
            </Text>


            <Text>
              Phone: {patient.phone || "-"}
            </Text>


            <Text>
              Ghana Card:
              {" "}
              {patient.ghana_card_number || "-"}
            </Text>


            <Text>
              NHIS:
              {" "}
              {patient.nhis_number || "-"}
            </Text>
            <View style={styles.card}>

<Text style={styles.cardTitle}>
Select Department
</Text>


{
departments.map((dept)=>(

<TouchableOpacity
key={dept.id}
style={[
styles.departmentButton,
selectedDepartment?.id === dept.id &&
styles.selectedDepartment
]}
onPress={()=>
setSelectedDepartment(dept)
}
>

<Text>
{dept.name}
</Text>

</TouchableOpacity>

))
}

</View>
            <TouchableOpacity
  style={styles.button}
  onPress={joinOPDQueue}
>

{
joiningQueue
?
<ActivityIndicator color="#fff" />
:
<Text style={styles.buttonText}>
Join OPD Queue
</Text>
}

</TouchableOpacity>
          </View>

        )
      }
     {
showRegister && (

<View style={styles.card}>

<Text style={styles.cardTitle}>
Register New Patient
</Text>


<Text style={styles.label}>
  Patient Full Name
</Text>

<TextInput
  style={styles.input}
  placeholder="Enter patient's full name"
  value={form.full_name}
  onChangeText={(text)=>
    setForm({
      ...form,
      full_name:text
    })
  }
/>


<Text style={styles.label}>
  Phone Number
</Text>

<TextInput
  style={styles.input}
  placeholder="Enter phone number"
  keyboardType="phone-pad"
  value={form.phone}
  onChangeText={(text)=>
    setForm({
      ...form,
      phone:text
    })
  }
/>


<Text style={styles.label}>
  Ghana Card Number
</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Ghana Card number"
  value={form.ghana_card_number}
  onChangeText={(text)=>
    setForm({
      ...form,
      ghana_card_number:text
    })
  }
/>


<Text style={styles.label}>
  NHIS Number
</Text>

<TextInput
  style={styles.input}
  placeholder="Enter NHIS membership number"
  value={form.nhis_number}
  onChangeText={(text)=>
    setForm({
      ...form,
      nhis_number:text
    })
  }
/>


<Text style={styles.label}>
  Gender
</Text>

<TextInput
  style={styles.input}
  placeholder="Male or Female"
  value={form.gender}
  onChangeText={(text)=>
    setForm({
      ...form,
      gender:text
    })
  }
/>


<Text style={styles.label}>
  Date of Birth
</Text>

<TextInput
  style={styles.input}
  placeholder="DD/MM/YYYY"
  value={form.date_of_birth}
  onChangeText={(text)=>
    setForm({
      ...form,
      date_of_birth:text
    })
  }
/>


<Text style={styles.label}>
  Residential Address
</Text>

<TextInput
  style={styles.input}
  placeholder="Enter patient's address"
  multiline
  value={form.address}
  onChangeText={(text)=>
    setForm({
      ...form,
      address:text
    })
  }
/>

<Text style={styles.label}>
Priority Case
</Text>

<View style={styles.priorityContainer}>

  {[
  "Normal",
  "Emergency",
  "Elderly",
  "Disability",
  "Pregnant",
  "Infant",
  "Referral",
].map((item) => (

    <TouchableOpacity
      key={item}
      style={[
        styles.priorityButton,
        priorityCase === item &&
          styles.prioritySelected,
      ]}
      onPress={() =>
        setPriorityCase(item)
      }
    >

      <Text
        style={{
          fontWeight: "600",
        }}
      >
        {item}
      </Text>

    </TouchableOpacity>

  ))}

</View>

<TouchableOpacity
style={styles.button}
onPress={registerPatient}
>

<Text style={styles.buttonText}>
Save Patient
</Text>

</TouchableOpacity>


</View>

)
}

{
queueReceipt && (

<View style={styles.card}>

<Text style={styles.cardTitle}>
✅ Queue Receipt
</Text>


<Text style={styles.receiptText}>
Patient Name:
{" "}
{patient?.full_name}
</Text>


<Text style={styles.receiptText}>
Phone:
{" "}
{patient?.phone || "-"}
</Text>


<Text style={styles.receiptText}>
Department:
{" "}
{selectedDepartment?.name || "OPD"}
</Text>


<Text style={styles.receiptText}>
Queue Number:
{" "}
{queueReceipt.queue_number}
</Text>


<Text style={styles.receiptText}>
Booking Code:
{" "}
{queueReceipt.booking_code}
</Text>


<Text style={styles.receiptText}>
Priority:
{" "}
{queueReceipt.priority?.toUpperCase() || priorityCase.toUpperCase()}
</Text>


<Text style={styles.receiptText}>
Estimated Wait:
{" "}
{queueReceipt.estimated_wait_minutes}
minutes
</Text>


<TouchableOpacity
style={styles.button}
onPress={()=>{
// print function later
}}
>

<Text style={styles.buttonText}>
🖨️ Print Receipt
</Text>

</TouchableOpacity>


</View>

)
}

   </ScrollView>

  );
}


const styles = StyleSheet.create({

container:{
 flex:1,
 backgroundColor:"#F5F7FA",
},
content:{
 padding:20,
},

title:{
 fontSize:28,
 fontWeight:"700",
 color:"#111827",
},


subtitle:{
 marginTop:8,
 color:"#6B7280",
 marginBottom:20,
},


tabs:{
 flexDirection:"row",
 justifyContent:"space-between",
 marginBottom:15,
},


tab:{
 backgroundColor:"#fff",
 padding:12,
 borderRadius:10,
 width:"31%",
 alignItems:"center",
},


activeTab:{
 backgroundColor:"#BFDBFE",
},

receiptText:{
  fontSize:16,
  marginBottom:8,
  color:"#374151",
},
input:{
 backgroundColor:"#fff",
 borderRadius:12,
 padding:15,
 fontSize:16,
 marginBottom:15,
},


button:{
 backgroundColor:"#0A7CFF",
 padding:16,
 borderRadius:12,
 alignItems:"center",
},


buttonText:{
 color:"#fff",
 fontWeight:"700",
},


card:{
 marginTop:25,
 backgroundColor:"#fff",
 padding:20,
 borderRadius:15,
},
priorityContainer:{
  flexDirection:"row",
  flexWrap:"wrap",
  marginBottom:20,
},

priorityButton:{
  backgroundColor:"#fff",
  borderWidth:1,
  borderColor:"#d1d5db",
  borderRadius:10,
  paddingVertical:10,
  paddingHorizontal:14,
  marginRight:10,
  marginBottom:10,
},

prioritySelected:{
  backgroundColor:"#BFDBFE",
  borderColor:"#0A7CFF",
},

cardTitle:{
 fontSize:18,
 fontWeight:"700",
 marginBottom:10,
},
departmentButton:{
 backgroundColor:"#fff",
 padding:14,
 borderRadius:10,
 marginBottom:8,
 borderWidth:1,
 borderColor:"#ddd",
},

selectedDepartment:{
 backgroundColor:"#BFDBFE",
 borderColor:"#0A7CFF",
},
label:{
fontSize:14,
fontWeight:"600",
color:"#374151",
marginBottom:6,
marginTop:10,
},

});