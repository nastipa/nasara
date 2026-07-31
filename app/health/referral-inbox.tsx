import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";


type Referral = {
  id: string;
  booking_id: string | null;
  reason: string | null;
  status: string;
  referred_at: string;

  patient_records?: {
    id: string;
    full_name: string;
    gender: string;
    phone: string;
  };

  hospitals?: {
    id: string;
    name: string;
  };
};


export default function ReferralInbox() {

const [referrals,setReferrals] =
useState<Referral[]>([]);

const [loading,setLoading] =
useState(true);

const [refreshing,setRefreshing] =
useState(false);


const [selectedReferral,setSelectedReferral] =
useState<Referral | null>(null);


const [departmentId,setDepartmentId] =
useState("");

const [rejectReason,setRejectReason] =
useState("");

const [showReject,setShowReject] =
useState(false);


const loadReferrals =
useCallback(async()=>{

try{

const {
data:{session}
} =
await supabase.auth.getSession();


if(!session?.access_token){
return;
}


const response =
await fetch(
`${API_URL}/hospital/referrals`,
{
headers:{
Authorization:
`Bearer ${session.access_token}`,
},
}
);


const json =
await response.json();


if(!response.ok){

throw new Error(
json.error ||
"Unable to load referrals"
);

}


setReferrals(
json.referrals || []
);


}catch(err:any){

Alert.alert(
"Error",
err.message
);


}finally{

setLoading(false);
setRefreshing(false);

}


},[]);



useEffect(()=>{

loadReferrals();

},[]);



const acceptReferral =
async()=>{


if(!selectedReferral){
return;
}


if(!departmentId){

Alert.alert(
"Department Required",
"Enter receiving department ID"
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
`${API_URL}/hospital/accept-referral`,
{

method:"POST",

headers:{
Authorization:
`Bearer ${session?.access_token}`,

"Content-Type":
"application/json",
},

body:JSON.stringify({

referral_id:
selectedReferral.id,

department_id:
departmentId,

}),

}
);



const json =
await response.json();


if(!response.ok){

throw new Error(
json.error
);

}


Alert.alert(
"Success",
"Referral accepted and added to queue"
);


setSelectedReferral(null);

setDepartmentId("");

loadReferrals();


}catch(err:any){

Alert.alert(
"Error",
err.message
);

}

};



const rejectReferral =
async()=>{


if(!selectedReferral){
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
`${API_URL}/hospital/reject-referral`,
{

method:"POST",

headers:{
Authorization:
`Bearer ${session?.access_token}`,

"Content-Type":
"application/json",
},

body:JSON.stringify({

referral_id:
selectedReferral.id,

reason:
rejectReason,

}),

}
);



const json =
await response.json();


if(!response.ok){

throw new Error(
json.error
);

}



Alert.alert(
"Rejected",
"Referral rejected successfully"
);


setShowReject(false);

setRejectReason("");

setSelectedReferral(null);


loadReferrals();


}catch(err:any){

Alert.alert(
"Error",
err.message
);

}


};



const renderItem =
({item}:{item:Referral})=>(


<View style={styles.card}>


<View style={styles.header}>


<View>

<Text style={styles.patientName}>
{item.patient_records?.full_name ||
"Unknown Patient"}
</Text>


<Text style={styles.from}>
From:
{" "}
{item.hospitals?.name ||
"Unknown Hospital"}
</Text>


</View>


<View style={styles.badge}>

<Text style={styles.badgeText}>
{item.status.toUpperCase()}
</Text>

</View>


</View>



<Text style={styles.label}>
Gender
</Text>

<Text>
{item.patient_records?.gender || "-"}
</Text>


<Text style={styles.label}>
Phone
</Text>

<Text>
{item.patient_records?.phone || "-"}
</Text>


<Text style={styles.label}>
Referral Reason
</Text>

<Text style={styles.reason}>
{item.reason || "No reason provided"}
</Text>



<View style={styles.actions}>


<TouchableOpacity
style={styles.accept}
onPress={()=>{

setSelectedReferral(item);

}}
>

<Text style={styles.buttonText}>
Accept
</Text>

</TouchableOpacity>



<TouchableOpacity
style={styles.reject}
onPress={()=>{

setSelectedReferral(item);

setShowReject(true);

}}
>

<Text style={styles.buttonText}>
Reject
</Text>

</TouchableOpacity>


</View>



</View>


);



return (

<View style={styles.container}>


{loading ? (

<View style={styles.loading}>

<ActivityIndicator size="large"/>

<Text>
Loading referrals...
</Text>

</View>


):(


<FlatList

data={referrals}

keyExtractor={
item=>item.id
}

renderItem={renderItem}

refreshControl={

<RefreshControl

refreshing={refreshing}

onRefresh={()=>{

setRefreshing(true);

loadReferrals();

}}

/>

}


ListEmptyComponent={

<View style={styles.empty}>

<Ionicons
name="mail-open"
size={50}
color="#9CA3AF"
/>

<Text>
No referral requests
</Text>

</View>

}

/>


)}



<Modal
visible={
!!selectedReferral &&
!showReject
}

transparent

animationType="slide"

>


<View style={styles.modalOverlay}>


<View style={styles.modal}>


<Text style={styles.modalTitle}>
Accept Referral
</Text>


<TextInput

placeholder="Receiving department ID"

value={departmentId}

onChangeText={setDepartmentId}

style={styles.input}

/>



<TouchableOpacity

style={styles.accept}

onPress={acceptReferral}

>

<Text style={styles.buttonText}>
Confirm Accept
</Text>

</TouchableOpacity>



</View>

</View>


</Modal>




<Modal

visible={showReject}

transparent

animationType="slide"

>


<View style={styles.modalOverlay}>


<View style={styles.modal}>


<Text style={styles.modalTitle}>
Reject Referral
</Text>



<TextInput

placeholder="Reason for rejection"

value={rejectReason}

onChangeText={setRejectReason}

style={styles.input}

/>



<TouchableOpacity

style={styles.reject}

onPress={rejectReferral}

>

<Text style={styles.buttonText}>
Confirm Reject
</Text>

</TouchableOpacity>



</View>

</View>


</Modal>


</View>

);

}


const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F5F7FA",
},

loading:{
flex:1,
justifyContent:"center",
alignItems:"center",
},

card:{
backgroundColor:"#fff",
margin:16,
padding:18,
borderRadius:18,
elevation:3,
},

header:{
flexDirection:"row",
justifyContent:"space-between",
},

patientName:{
fontSize:20,
fontWeight:"800",
},

from:{
marginTop:5,
color:"#6B7280",
},

badge:{
backgroundColor:"#F59E0B",
paddingHorizontal:10,
paddingVertical:5,
borderRadius:20,
},

badgeText:{
color:"#fff",
fontWeight:"700",
fontSize:12,
},

label:{
fontWeight:"700",
marginTop:12,
color:"#374151",
},

reason:{
color:"#374151",
},

actions:{
flexDirection:"row",
gap:10,
marginTop:20,
},

accept:{
backgroundColor:"#16A34A",
padding:12,
borderRadius:10,
flex:1,
alignItems:"center",
},

reject:{
backgroundColor:"#DC2626",
padding:12,
borderRadius:10,
flex:1,
alignItems:"center",
},

buttonText:{
color:"#fff",
fontWeight:"700",
},

empty:{
alignItems:"center",
marginTop:100,
},

modalOverlay:{
flex:1,
backgroundColor:"rgba(0,0,0,0.4)",
justifyContent:"center",
padding:20,
},

modal:{
backgroundColor:"#fff",
borderRadius:20,
padding:20,
},

modalTitle:{
fontSize:20,
fontWeight:"800",
marginBottom:15,
},

input:{
borderWidth:1,
borderColor:"#D1D5DB",
borderRadius:10,
padding:12,
marginBottom:15,
},

});