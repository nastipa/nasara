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

  const {
    hospital_id,
    department_id,
    department_name,
  } =
  useLocalSearchParams<{
    hospital_id:string;
    department_id:string;
    department_name:string;
  }>();


  console.log("QUEUE PARAMS",{
    hospital_id,
    department_id,
    department_name
  });


  const [condition,setCondition] =
  useState("");

  const [loading,setLoading] =
  useState(false);



  const showMessage = (
    title:string,
    message?:string
  ) => {

    if(Platform.OS==="web"){

      window.alert(
        message
        ? `${title}\n\n${message}`
        : title
      );

    }else{

      Alert.alert(
        title,
        message
      );

    }

  };



  async function joinQueue(){

    if(!hospital_id || !department_id){

      showMessage(
        "Error",
        "Hospital or department missing"
      );

      return;

    }


    try{

      setLoading(true);


      const {
        data:{
          session
        }
      } =
      await supabase.auth.getSession();



      if(!session?.access_token){

        showMessage(
          "Login Required",
          "Please login again"
        );

        return;

      }



      const response =
      await fetch(
        `${API_URL}/hospital/online-join-queue`,
        {

          method:"POST",

          headers:{

            "Content-Type":
            "application/json",

            Authorization:
           ` Bearer ${session.access_token}`

          },


          body:
          JSON.stringify({

            hospital_id,

            department_id,

            condition:
            condition || null

          })

        }
      );



      const json =
      await response.json();



      console.log(
        "JOIN QUEUE RESPONSE",
        json
      );



      if(!response.ok){

        throw new Error(
          json.error ||
          "Unable to join queue"
        );

      }



      const booking =
      json.booking;



      showMessage(

        "Queue Joined",

        `Queue Number: ${booking.queue_number}

Booking Code: ${booking.booking_code}

Estimated Wait: ${booking.estimated_wait_minutes || 0} minutes`

      );
      router.replace(
        "/health/my-queue"
      );



    }catch(error:any){

      showMessage(
        "Error",
        error.message
      );


    }finally{

      setLoading(false);

    }

  }



  return (

    <ScrollView

      contentContainerStyle={
        styles.container
      }

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
          Reason for Visit
        </Text>


        <TextInput

          multiline

          numberOfLines={5}

          placeholder=
          "Example: Severe headache and fever"

          value={condition}

          onChangeText={
            setCondition
          }

          style={
            styles.textArea
          }

        />


      </View>



      <TouchableOpacity

        style={
          styles.button
        }

        onPress={
          joinQueue
        }

        disabled={
          loading
        }

      >

        <Text style={styles.buttonText}>

          {
            loading
            ?
            "Joining..."
            :
            "Join Queue"
          }

        </Text>


      </TouchableOpacity>



      {
        loading &&

        <ActivityIndicator
          style={{
            marginTop:20
          }}
        />

      }
      </ScrollView>

  );

}



const styles = StyleSheet.create({

  container: {

    padding:20,

    backgroundColor:"#f4f6fb",

    flexGrow:1,

  },


  header: {

    fontSize:26,

    fontWeight:"bold",

    marginBottom:20,

  },


  card: {

    backgroundColor:"#fff",

    padding:16,

    borderRadius:14,

    marginBottom:20,

  },


  label: {

    fontWeight:"700",

    marginBottom:8,

    fontSize:16,

  },


  value: {

    fontSize:18,

    color:"#2563eb",

    fontWeight:"bold",

  },


  textArea: {

    backgroundColor:"#fff",

    borderRadius:12,

    borderWidth:1,

    borderColor:"#ddd",

    padding:14,

    height:140,

    textAlignVertical:"top",

    marginTop:10,

  },


  button: {

    backgroundColor:"#16a34a",

    padding:18,

    borderRadius:14,

    alignItems:"center",

    marginTop:10,

  },


  buttonText: {

    color:"#fff",

    fontSize:18,

    fontWeight:"bold",

  },


});