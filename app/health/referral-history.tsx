import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
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

  patient_id: string | null;

  patient_record_id: string | null;

  status:
    | "pending"
    | "accepted"
    | "rejected";

  reason: string | null;

  rejection_reason: string | null;

  referred_at: string;

  accepted_at?: string | null;

  rejected_at?: string | null;

  booking?: {
    queue_number?: string;
  };

  patient_records?: {
    full_name: string;
    gender: string;
    phone: string;
  };

  from_hospital?: {
    id: string;
    name: string;
  };

  to_hospital?: {
    id: string;
    name: string;
  };
};

export default function ReferralHistory() {

  const [loading,setLoading] =
    useState(true);

  const [refreshing,setRefreshing] =
    useState(false);

  const [history,setHistory] =
    useState<Referral[]>([]);

  const [search,setSearch] =
    useState("");

  const [filter,setFilter] =
    useState<
      "all" |
      "pending" |
      "accepted" |
      "rejected"
    >("all");



  const loadHistory =
    useCallback(async()=>{

      try{

        const {
          data:{
            session
          }
        } =
        await supabase.auth.getSession();

        if(!session?.access_token){

          setLoading(false);

          return;

        }

        const response =
          await fetch(
            `${API_URL}/hospital/referral-history`,
            {

              headers:{
                Authorization:
                  `Bearer ${session.access_token}`,
              },

            }
          );

        const json =
          await response.json();

        if(response.ok){

          setHistory(
            json.referrals || []
          );

        }else{

          console.log(
            json.error
          );

        }

      }catch(err){

        console.log(err);

      }finally{

        setLoading(false);

        setRefreshing(false);

      }

    },[]);



  useEffect(()=>{

    loadHistory();

  },[]);



  const filteredHistory =
    useMemo(()=>{

      return history.filter(item=>{

        const patient =
          item.patient_records?.full_name
          ?.toLowerCase() || "";

        const hospital =
          item.to_hospital?.name
          ?.toLowerCase() || "";

        const keyword =
          search.toLowerCase();

        const matchSearch =

          patient.includes(keyword) ||

          hospital.includes(keyword);

        const matchFilter =

          filter==="all"

          ? true

          : item.status===filter;

        return (
          matchSearch &&
          matchFilter
        );

      });

    },[
      history,
      search,
      filter
    ]);
  const getStatusColor = (
    status: string
  ) => {

    switch (status) {

      case "accepted":
        return "#16A34A";

      case "rejected":
        return "#DC2626";

      default:
        return "#F59E0B";

    }

  };


  const renderItem = ({
    item,
  }: {
    item: Referral;
  }) => (

    <View style={styles.card}>

      <View style={styles.cardHeader}>

        <View style={{ flex: 1 }}>

          <Text style={styles.patientName}>
            {item.patient_records?.full_name ||
              "Unknown Patient"}
          </Text>

          <Text style={styles.hospitalText}>
            From:
            {" "}
            {item.from_hospital?.name ||
              "Unknown Hospital"}
          </Text>

          <Text style={styles.hospitalText}>
            To:
            {" "}
            {item.to_hospital?.name ||
              "Unknown Hospital"}
          </Text>

        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusColor(
                  item.status
                ),
            },
          ]}
        >

          <Text
            style={
              styles.statusText
            }
          >
            {item.status.toUpperCase()}
          </Text>

        </View>

      </View>

      {!!item.reason && (

        <>

          <Text style={styles.label}>
            Referral Reason
          </Text>

          <Text style={styles.value}>
            {item.reason}
          </Text>

        </>

      )}

      {item.status ===
        "accepted" && (

        <>

          <Text style={styles.label}>
            Queue Number
          </Text>

          <Text style={styles.value}>
            {item.booking
              ?.queue_number ||
              "-"}
          </Text>

          <Text style={styles.label}>
            Accepted
          </Text>

          <Text style={styles.value}>
            {item.accepted_at
              ? new Date(
                  item.accepted_at
                ).toLocaleString()
              : "-"}
          </Text>

        </>

      )}

      {item.status ===
        "rejected" && (

        <>

          <Text style={styles.label}>
            Rejection Reason
          </Text>

          <Text style={styles.value}>
            {item.rejection_reason ||
              "No reason provided"}
          </Text>

          <Text style={styles.label}>
            Rejected
          </Text>

          <Text style={styles.value}>
            {item.rejected_at
              ? new Date(
                  item.rejected_at
                ).toLocaleString()
              : "-"}
          </Text>

        </>

      )}

      <Text style={styles.label}>
        Referred
      </Text>

      <Text style={styles.value}>
        {new Date(
          item.referred_at
        ).toLocaleString()}
      </Text>

    </View>

  );


  if (loading) {

    return (

      <SafeAreaView
        style={
          styles.container
        }
      >

        <View
          style={
            styles.loadingContainer
          }
        >

          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading referral history...
          </Text>

        </View>

      </SafeAreaView>

    );

  }
  return (

    <SafeAreaView
      style={styles.container}
    >

      <View style={styles.header}>

        <Text style={styles.title}>
          Referral History
        </Text>

        <Text style={styles.subtitle}>
          Track all referrals sent by your hospital.
        </Text>

      </View>


      <TextInput
        style={styles.searchInput}
        placeholder="Search patient or hospital..."
        value={search}
        onChangeText={setSearch}
      />


      <View style={styles.filterRow}>

        {[
          "all",
          "pending",
          "accepted",
          "rejected",
        ].map((item) => (

          <TouchableOpacity
            key={item}
            style={[
              styles.filterButton,
              filter === item &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter(
                item as any
              )
            }
          >

            <Text
              style={[
                styles.filterText,
                filter === item &&
                  styles.filterTextActive,
              ]}
            >
              {item.toUpperCase()}
            </Text>

          </TouchableOpacity>

        ))}

      </View>


      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={

          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {

              setRefreshing(true);

              loadHistory();

            }}
          />

        }
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        ListEmptyComponent={

          <View
            style={styles.emptyContainer}
          >

            <Ionicons
              name="documents-outline"
              size={60}
              color="#9CA3AF"
            />

            <Text
              style={styles.emptyTitle}
            >
              No Referrals Found
            </Text>

            <Text
              style={styles.emptySubtitle}
            >
              There are no referrals matching your search.
            </Text>

          </View>

        }
      />

    </SafeAreaView>

  );

}
const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F5F7FA",
  },

  loadingContainer:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
  },

  loadingText:{
    marginTop:15,
    fontSize:16,
    color:"#6B7280",
    fontWeight:"600",
  },

  header:{
    paddingHorizontal:20,
    paddingTop:20,
    paddingBottom:10,
  },

  title:{
    fontSize:28,
    fontWeight:"800",
    color:"#111827",
  },

  subtitle:{
    marginTop:6,
    fontSize:15,
    color:"#6B7280",
  },

  searchInput:{
    backgroundColor:"#FFFFFF",
    marginHorizontal:20,
    marginBottom:15,
    borderRadius:14,
    paddingHorizontal:16,
    paddingVertical:14,
    fontSize:15,
    borderWidth:1,
    borderColor:"#E5E7EB",
  },

  filterRow:{
    flexDirection:"row",
    flexWrap:"wrap",
    paddingHorizontal:20,
    marginBottom:18,
  },

  filterButton:{
    backgroundColor:"#E5E7EB",
    paddingHorizontal:16,
    paddingVertical:10,
    borderRadius:20,
    marginRight:10,
    marginBottom:10,
  },

  filterButtonActive:{
    backgroundColor:"#2563EB",
  },

  filterText:{
    fontSize:13,
    fontWeight:"700",
    color:"#374151",
  },

  filterTextActive:{
    color:"#FFFFFF",
  },

  emptyContainer:{
    marginTop:80,
    justifyContent:"center",
    alignItems:"center",
    paddingHorizontal:30,
  },

  emptyTitle:{
    marginTop:20,
    fontSize:22,
    fontWeight:"800",
    color:"#111827",
  },

  emptySubtitle:{
    marginTop:8,
    textAlign:"center",
    color:"#6B7280",
    fontSize:15,
    lineHeight:22,
  },
  card:{
    backgroundColor:"#FFFFFF",
    marginHorizontal:20,
    marginBottom:16,
    borderRadius:18,
    padding:18,
    elevation:3,
    shadowColor:"#000",
    shadowOpacity:0.08,
    shadowRadius:6,
    shadowOffset:{
      width:0,
      height:3,
    },
  },

  cardHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"flex-start",
    marginBottom:16,
  },

  patientName:{
    fontSize:20,
    fontWeight:"800",
    color:"#111827",
    marginBottom:6,
  },

  hospitalText:{
    fontSize:14,
    color:"#4B5563",
    marginTop:3,
    lineHeight:20,
  },

  statusBadge:{
    paddingHorizontal:14,
    paddingVertical:8,
    borderRadius:20,
    alignSelf:"flex-start",
  },

  statusText:{
    color:"#FFFFFF",
    fontSize:12,
    fontWeight:"800",
  },

  label:{
    marginTop:12,
    marginBottom:4,
    fontSize:13,
    fontWeight:"700",
    color:"#6B7280",
    textTransform:"uppercase",
  },

  value:{
    fontSize:16,
    color:"#111827",
    lineHeight:24,
  },

});