import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
export default function JoinQueue() {
  const router = useRouter();

  const params = useLocalSearchParams();

const {
  hospital_id,
  department_id,
  department_name,
} = useLocalSearchParams<{
  hospital_id: string;
  department_id: string;
  department_name: string;
}>();

const department = department_id;
console.log("QUEUE PARAMS:", {
  hospital_id,
  department_id,
  department_name,
});
  const [condition, setCondition] = useState("");
  const [nhia, setNhia] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] =
useState<"ghana_card" | "nhia" | "phone">("ghana_card");

const [searchValue, setSearchValue] =
useState("");

const [patientRecord, setPatientRecord] =
useState<any>(null);
const [form, setForm] = useState({
  full_name:"",
  phone:"",
  ghana_card_number:"",
  nhis_number:"",
  gender:"",
  date_of_birth:"",
  address:"",
});
const [showRegistration, setShowRegistration] =
useState(false);
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
const searchPatient = async () => {

 if(!searchValue.trim()){
   showMessage(
    "Required",
    "Enter Ghana Card, NHIA or Phone number"
   );
   return;
 }


 try {

 const {
  data:{
    session
  }
 } =
 await supabase.auth.getSession();


 const body:any={};


 if(searchType==="ghana_card"){
   body.ghana_card_number =
    searchValue;
 }


 if(searchType==="nhia"){
   body.nhis_number =
    searchValue;
 }


 if(searchType==="phone"){
   body.phone =
    searchValue;
 }


 const response =
 await fetch(
 `${API_URL}/hospital/search-patient`,
 {
 method:"POST",

 headers:{
 "Content-Type":"application/json",
 Authorization:
 `Bearer ${session?.access_token}`
 },

 body:
 JSON.stringify(body)

 });


 const json =
 await response.json();


 if(json.exists){

   setPatientRecord(
     json.patient
   );

   showMessage(
    "Patient Found",
    "You can join queue"
   );

 }else{

   setPatientRecord(null);

   setShowRegistration(true);

   showMessage(
    "Not Found",
    "Please complete registration"
   );

 }


 }catch(err:any){

 showMessage(
 "Error",
 err.message
 );

 }

};
const registerPatient = async () => {

if(!form.full_name.trim()){

showMessage(
"Required",
"Patient name is required"
);

return;

}


try{

setLoading(true);


const {
data:{
session
}
}
=
await supabase.auth.getSession();



const response =
await fetch(
`${API_URL}/hospital/register-patient`,
{

method:"POST",

headers:{
"Content-Type":"application/json",

Authorization:
`Bearer ${session?.access_token}`
},


body:
JSON.stringify(form)

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


// Patient is now available

setPatientRecord(
json.patient
);


setShowRegistration(false);


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
  async function joinQueue() {
    if (!condition.trim()) {
      showMessage(
        "Condition Required",
        "Please briefly describe your condition."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        showMessage("Login Required");
        return;
      }

      // Generate today's queue number
      const today = new Date().toISOString().split("T")[0];

      const { count } = await supabase
        .from("hospital_bookings")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      const queueNumber = (count || 0) + 1;

      const { data, error } = await (supabase as any)
        .from("hospital_bookings")
        .insert({
          hospital_id: hospital_id,
          department_id: department_id,
          department : department_name,
          condition: condition,
          nhia_number: nhia || null,
          queue_number: queueNumber,
          booking_code:
  "HB-" +
  Date.now().toString().slice(-8),
  
          status: "waiting",
         patient_id:
patientRecord?.user_id || user.id,
patient_record_id:
patientRecord?.id || null,
          booking_date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      setLoading(false);

      if (error) {
        showMessage("Error", error.message);
        return;
      }

      showMessage(
        "Queue Joined",
        `Your queue number is ${queueNumber}`
      );

      router.replace({
        pathname: "/health/my-queue",
        params: {
          booking_id: data.id,
        },
      });
    } catch (e: any) {
      setLoading(false);
      showMessage("Error", e.message);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.header}>
        Join Hospital Queue
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Department
        </Text>

        <Text style={styles.value}>
          {department_name}
        </Text>
      </View>
      <View style={styles.card}>

<Text style={styles.label}>
Search Patient First
</Text>


<View style={{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:15
}}>


<TouchableOpacity
style={{
padding:10,
backgroundColor:
searchType==="ghana_card"
?"#bfdbfe":"#fff",
borderRadius:10
}}
onPress={()=>
setSearchType("ghana_card")
}
>

<Text>
Ghana Card
</Text>

</TouchableOpacity>



<TouchableOpacity
style={{
padding:10,
backgroundColor:
searchType==="nhia"
?"#bfdbfe":"#fff",
borderRadius:10
}}
onPress={()=>
setSearchType("nhia")
}
>

<Text>
NHIA
</Text>

</TouchableOpacity>



<TouchableOpacity
style={{
padding:10,
backgroundColor:
searchType==="phone"
?"#bfdbfe":"#fff",
borderRadius:10
}}
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
?
"Enter Ghana Card Number"
:
searchType==="nhia"
?
"Enter NHIA Number"
:
"Enter Phone Number"
}
value={searchValue}
onChangeText={setSearchValue}
/>



<TouchableOpacity
style={styles.button}
onPress={searchPatient}
>

<Text style={styles.buttonText}>
Search Patient
</Text>

</TouchableOpacity>


</View>
{
patientRecord && (

<View style={styles.card}>

<Text style={styles.header}>
Patient Details
</Text>


<Text style={styles.label}>
Full Name
</Text>

<Text style={styles.value}>
{patientRecord.full_name}
</Text>



<Text style={styles.label}>
Phone Number
</Text>

<Text>
{patientRecord.phone || "-"}
</Text>



<Text style={styles.label}>
Ghana Card Number
</Text>

<Text>
{patientRecord.ghana_card_number || "-"}
</Text>



<Text style={styles.label}>
NHIA Number
</Text>

<Text>
{patientRecord.nhis_number || "-"}
</Text>



<Text style={styles.label}>
Gender
</Text>

<Text>
{patientRecord.gender || "-"}
</Text>



<Text style={styles.label}>
Date of Birth
</Text>

<Text>
{patientRecord.date_of_birth || "-"}
</Text>


</View>

)
}
{
showRegistration && (

<View style={styles.card}>

<Text style={styles.header}>
Register New Patient
</Text>


<Text style={styles.label}>
Full Name
</Text>

<TextInput
style={styles.input}
placeholder="Enter full name"
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
NHIA Number
</Text>

<TextInput
style={styles.input}
placeholder="Enter NHIA number"
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
placeholder="Enter gender"
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
placeholder="Example: 1995-05-20"
value={form.date_of_birth}
onChangeText={(text)=>
setForm({
...form,
date_of_birth:text
})
}
/>



<Text style={styles.label}>
Address
</Text>

<TextInput
style={styles.input}
placeholder="Enter address"
value={form.address}
onChangeText={(text)=>
setForm({
...form,
address:text
})
}
/>



<TouchableOpacity
style={styles.button}
onPress={registerPatient}
>

<Text style={styles.buttonText}>
Register Patient
</Text>

</TouchableOpacity>


</View>

)
}

      {
patientRecord && (

<>
<Text style={styles.label}>
Describe your symptoms
</Text>

      <TextInput
        multiline
        numberOfLines={5}
        placeholder="Example: I have had a severe headache and fever for two days."
        value={condition}
        onChangeText={setCondition}
        style={styles.textArea}
      />

      

      <TouchableOpacity
style={styles.button}
onPress={()=>{
if(!patientRecord){

showMessage(
"Search Required",
"Please search patient before joining queue."
);

return;

}

joinQueue();

}}
disabled={loading}
>
        <Text style={styles.buttonText}>
          {loading
            ? "Joining..."
            : "Join Queue"}
        </Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          style={{ marginTop: 20 }}
        />
      )}
      </>

)
}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f4f6fb",
    flexGrow: 1,
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  label: {
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 16,
  },

  value: {
    fontSize: 18,
    color: "#2563eb",
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },

  textArea: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    height: 140,
    marginBottom: 20,
    textAlignVertical: "top",
  },

  button: {
    backgroundColor: "#16a34a",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});