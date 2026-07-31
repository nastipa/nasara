import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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


type Department = {
  id: string;
  name: string;
};


export default function CreateDepartmentStaff() {

  const router = useRouter();

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loadingDepartments, setLoadingDepartments] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [departmentId, setDepartmentId] =
    useState("");

  const [role, setRole] =
    useState("");


  const roles = [
    "Doctor",
    "Nurse",
    "Reception",
    "Laboratory Staff",
    "Pharmacist",
    "Billing Officer",
    "Other",
  ];


  useEffect(() => {
    loadDepartments();
  }, []);


  const loadDepartments = async () => {

    try {

      const {
        data:{
          session
        }
      } =
      await supabase.auth.getSession();


      if(!session?.access_token){
        return;
      }


      const response =
      await fetch(
        `${API_URL}/hospital/departments`,
        {
          headers:{
            Authorization:
            `Bearer ${session.access_token}`
          }
        }
      );


      const json =
      await response.json();


      if(response.ok){

        setDepartments(
          json.departments || []
        );

      }


    } catch(error:any){

      showMessage(
        "Error",
        error.message
      );

    } finally {

      setLoadingDepartments(false);

    }

  };



  const createStaff = async()=>{


    if(
      !fullName ||
      !email ||
      !password ||
      !departmentId ||
      !role
    ){

      showMessage(
        "Missing Information",
        "Please complete all fields."
      );

      return;

    }


    try{


      setSaving(true);


      const {
        data:{
          session
        }
      } =
      await supabase.auth.getSession();


      if(!session?.access_token){

        showMessage(
          "Login Required"
        );

        return;

      }


      const response =
      await fetch(
        `${API_URL}/hospital/create-department-staff`,
        {
          method:"POST",

          headers:{
            Authorization:
           ` Bearer ${session.access_token}`,

            "Content-Type":
            "application/json",
          },


          body:JSON.stringify({

            email:
            email.trim(),

            password,

            full_name:
            fullName.trim(),

            department_id:
            departmentId,

            role,

          }),

        }
      );


      const json =
      await response.json();


      if(!response.ok){

        throw new Error(
          json.error ||
          "Unable to create staff."
        );

      }


      showMessage(
        "Success",
        json.message
      );


      setFullName("");
      setEmail("");
      setPassword("");
      setDepartmentId("");
      setRole("");


    }catch(error:any){

      showMessage(
        "Error",
        error.message
      );

    }finally{

      setSaving(false);

    }

  };



  if(loadingDepartments){

    return(
      <View style={styles.loading}>
        <ActivityIndicator size="large"/>
        <Text>
          Loading departments...
        </Text>
      </View>
    );

  }



  return(

    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom:40
      }}
    >


      <View style={styles.header}>

        <Ionicons
          name="person-add"
          size={45}
          color="#2563EB"
        />


        <Text style={styles.title}>
          Create Department Staff
        </Text>


        <Text style={styles.subtitle}>
          Add staff members to hospital departments.
          Existing Nasara users will be linked automatically.
        </Text>

      </View>



      <View style={styles.card}>


        <Text style={styles.sectionTitle}>
          Staff Information
        </Text>


        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />


        <TextInput
          style={styles.input}
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />


        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

      </View>




      <View style={styles.card}>


        <Text style={styles.sectionTitle}>
          Assign Department
        </Text>



        {
          departments.map((dept)=>(
            
            <TouchableOpacity
              key={dept.id}
              style={[
                styles.option,

                departmentId === dept.id &&
                styles.selectedOption
              ]}

              onPress={()=>
                setDepartmentId(dept.id)
              }
            >

              <Text
                style={[
                  styles.optionText,

                  departmentId === dept.id &&
                  styles.selectedText
                ]}
              >
                {dept.name}
              </Text>


            </TouchableOpacity>

          ))
        }


      </View>




      <View style={styles.card}>


        <Text style={styles.sectionTitle}>
          Staff Role
        </Text>



        {
          roles.map((item)=>(

            <TouchableOpacity

              key={item}

              style={[
                styles.option,

                role === item &&
                styles.selectedOption
              ]}


              onPress={()=>
                setRole(item)
              }

            >

              <Text
                style={[
                  styles.optionText,

                  role === item &&
                  styles.selectedText
                ]}
              >
                {item}
              </Text>


            </TouchableOpacity>

          ))
        }


      </View>




      <TouchableOpacity

        style={styles.button}

        disabled={saving}

        onPress={createStaff}

      >

        {
          saving ?

          <ActivityIndicator color="#fff"/>

          :

          <Text style={styles.buttonText}>
            Create Staff Account
          </Text>

        }


      </TouchableOpacity>



    </ScrollView>

  );

}



const styles = StyleSheet.create({

container:{
 flex:1,
 backgroundColor:"#F5F7FA",
 padding:16,
},


loading:{
 flex:1,
 justifyContent:"center",
 alignItems:"center",
},


header:{
alignItems:"center",
marginBottom:25,
},


title:{
fontSize:28,
fontWeight:"800",
color:"#111827",
marginTop:10,
},


subtitle:{
fontSize:15,
color:"#6B7280",
textAlign:"center",
marginTop:8,
lineHeight:22,
},


card:{
backgroundColor:"#fff",
borderRadius:18,
padding:18,
marginBottom:18,
elevation:3,
},


sectionTitle:{
fontSize:18,
fontWeight:"700",
marginBottom:15,
color:"#111827",
},


input:{
backgroundColor:"#F9FAFB",
borderWidth:1,
borderColor:"#E5E7EB",
borderRadius:12,
padding:15,
marginBottom:12,
fontSize:16,
},


option:{
padding:14,
borderRadius:12,
backgroundColor:"#F3F4F6",
marginBottom:10,
},


selectedOption:{
backgroundColor:"#2563EB",
},


optionText:{
fontSize:15,
fontWeight:"600",
color:"#374151",
},


selectedText:{
color:"#fff",
},


button:{
backgroundColor:"#2563EB",
padding:18,
borderRadius:16,
alignItems:"center",
},


buttonText:{
color:"#fff",
fontSize:17,
fontWeight:"700",
},

});