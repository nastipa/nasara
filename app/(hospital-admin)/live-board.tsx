import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    }, []);

  useEffect(() => {

    loadBoard();

    const interval =
      setInterval(
        loadBoard,
        5000
      );

    return () =>
      clearInterval(interval);

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

  return (

    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >

      <Text style={styles.title}>
        {hospital}
      </Text>

      <Text style={styles.subtitle}>
        LIVE DEPARTMENT BOARD
      </Text>
      {departments.map((dept) => (

  <View
    key={dept.department_id}
    style={styles.card}
  >

    <Text style={styles.departmentName}>
      {dept.department_name}
    </Text>

    <View style={styles.servingBox}>

      <Text style={styles.servingLabel}>
        NOW SERVING
      </Text>

      <Text style={styles.servingNumber}>
        {dept.current_serving ?? "--"}
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

    <View style={styles.nextRow}>

      {dept.next_numbers.length > 0 ? (

        dept.next_numbers.map(
          number => (

            <View
              key={number}
              style={styles.badge}
            >

              <Text
                style={styles.badgeText}
              >
                {number}
              </Text>

            </View>

          )
        )

      ) : (

        <Text style={styles.empty}>
          No waiting patients
        </Text>

      )}

    </View>

  </View>

))}

</ScrollView>

);

}

const styles =
StyleSheet.create({

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

servingNumber:{
fontSize:42,
fontWeight:"900",
color:"#2563EB",
marginTop:5,
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