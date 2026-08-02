import { useAudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
const showConfirm = (
  title:string,
  message:string,
  onConfirm:()=>void
) => {

  if (Platform.OS === "web") {

    const confirmed =
      window.confirm(
        `${title}\n\n${message}`
      );

    if (confirmed) {
      onConfirm();
    }

  } else {

    Alert.alert(
      title,
      message,
      [
        {
          text:"Cancel",
          style:"cancel",
        },
        {
          text:"Call",
          onPress:onConfirm,
        },
      ]
    );

  }

};
type Booking = {
  id: string;
  queue_number: string;
  booking_code: string;
  status: string;
  condition: string;
  checked_in: boolean;

  priority:
    | "emergency"
    | "urgent"
    | "normal"
    | "low"
    | "infant"
    | "elderly"
    | "disabled"
    | "pregnant"
    | "referral";

  priority_level: number;
  triage_note?: string | null;

  hospital_departments: {
    id: string;
    name: string;
  };
};
export default function HospitalQueue() {
  const player = useAudioPlayer();
  const [queue, setQueue] =
    useState<Booking[]>([]);
    const [suggestions, setSuggestions] =
  useState<Record<string, string>>({});
    const [updating,setUpdating] =
useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);
    const currentPatient =
  queue.find(
    item => item.status === "called"
  );


  const loadQueue =
    useCallback(async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          showMessage(
            "Login Required",
            "Please login again."
          );
          return;
        }

        const response =
          await fetch(
            `${API_URL}/hospital/queue`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ||
              "Unable to load queue."
          );
        }

       const sortedQueue =
  (json.queue || []).sort(
    (a: Booking, b: Booking) =>
      (a.priority_level || 3) -
      (b.priority_level || 3)
  );


setQueue(sortedQueue);
      } catch (err: any) {
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
    loadQueue();

    const interval =
      setInterval(() => {
        loadQueue();
      }, 10000);

    return () =>
      clearInterval(interval);
  }, [loadQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };
  const canCallPatient = (
  bookingId: string
) => {

  const emergencyWaiting =
    queue.some(
      item =>
        item.id !== bookingId &&
        item.status === "waiting" &&
        item.priority_level === 1
    );


  const urgentWaiting =
    queue.some(
      item =>
        item.id !== bookingId &&
        item.status === "waiting" &&
        item.priority_level === 2
    );


  const selectedPatient =
    queue.find(
      item =>
        item.id === bookingId
    );


  if (
    selectedPatient?.priority_level === 3 &&
    emergencyWaiting
  ) {

    return false;

  }


  if (
    selectedPatient?.priority_level === 3 &&
    urgentWaiting
  ) {

    return false;

  }


  return true;

};
const playAnnouncement = async (
  announcement:any
)=>{

try{

if(!announcement){
return;
}


const queueNumber =
announcement.queue_number || "001";


const department =
announcement.department || "";


// Speak queue number + assigned department
const departmentName =
  announcement.department_name || "assigned department";


await new Promise<void>((resolve) => {

  Speech.speak(
   ` ${queueNumber}, please proceed to ${departmentName}`,
    {
      language:"en-US",
      rate:0.75,
      pitch:1,

      onDone:()=>resolve(),
      onError:()=>resolve(),
    }
  );

});


// Play recorded languages

if(
announcement.voices &&
announcement.voices.length
){

for(
const voice of announcement.voices
){

if(voice.audio_url){

player.replace({
uri:voice.audio_url
});

player.play();


await new Promise(resolve =>
setTimeout(resolve,5000)
);


}

}

}


}
catch(error){

console.log(
"VOICE PLAY ERROR",
error
);

}

};
const updateStatus = async (
  bookingId: string,
  status:
  | "waiting"
  | "called"
  | "in_consultation"
  | "admitted"
  |  "discharged"
  | "transferred"
  | "referred"
  | "cancelled"
  | "no_show"
) => {

  if (updating === bookingId) {
    return;
  }

  setUpdating(bookingId);

  try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        showMessage(
          "Login Required",
          "Please login again."
        );
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
    json.error ||
      "Unable to update booking."
  );
}

// Play voice immediately after calling patient
if(
status === "called" &&
json.voiceAnnouncement
){

playAnnouncement(
json.voiceAnnouncement
);

}
if (!response.ok) {
  throw new Error(
    json.error ||
      "Unable to update booking."
  );
}

loadQueue();
setUpdating(null);
    } catch (err: any) {
      setUpdating(null);
      showMessage(
        "Error",
        err.message
      );
    }
  };
  const updatePriority = async (
  bookingId: string,
  priority: string
) => {
  try {

    const {
      data: { session },
    } =
      await supabase.auth.getSession();


    if (!session?.access_token) {
      showMessage(
        "Login Required",
        "Please login again."
      );
      return;
    }


    const response =
      await fetch(
        `${API_URL}/hospital/update-priority`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            booking_id: bookingId,
            priority,
          }),
        }
      );


    const json =
      await response.json();


    if (!response.ok) {
      throw new Error(
        json.error ||
        "Unable to update priority"
      );
    }


    loadQueue();


  } catch (err:any) {

    showMessage(
      "Error",
      err.message
    );

  }
};
const getPrioritySuggestion = async (
  bookingId: string,
  condition: string
) => {

  try {

    const {
      data:{session},
    } =
      await supabase.auth.getSession();


    if(!session?.access_token){
      return;
    }


    const response =
      await fetch(
        `${API_URL}/hospital/suggest-priority`,
        {
          method:"POST",

          headers:{
            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",
          },

          body:JSON.stringify({
            condition,
          }),
        }
      );


    const json =
      await response.json();


    if(!response.ok){
      throw new Error(
        json.error ||
        "Suggestion failed"
      );
    }


    setSuggestions(prev => ({
      ...prev,

      [bookingId]:
        json.suggestion.priority

    }));


  } catch(err:any){

    showMessage(
      "Error",
      err.message
    );

  }

};

 const renderItem = ({
  item,
}: {
  item: Booking;
}) => (
  <View
  style={[
    styles.card,

    item.priority === "emergency" &&
    styles.emergencyCard,

    item.priority === "urgent" &&
    styles.urgentCard,
  ]}
>
    <View style={styles.cardHeader}>
     <View>

<Text style={styles.queueNumber}>
  {item.queue_number}
</Text>


{item.priority === "emergency" && (
<Text style={styles.emergencyLabel}>
🚨 EMERGENCY
</Text>
)}


{item.priority === "urgent" && (
<Text style={styles.urgentLabel}>
⚠️ URGENT
</Text>
)}

</View>

      <View
        style={[
          styles.statusBadge,
          item.status === "waiting"
            ? styles.waiting
            : item.status === "called"
            ? styles.called
            :item.status === "in_consultation"
  ? styles.consultation
            : styles.completed,
        ]}
      >
        <Text style={styles.statusText}>
          {item.status
            .replace(/_/g, " ")
            .toUpperCase()}
        </Text>
      </View>
    </View>

    <Text style={styles.department}>
      {item.hospital_departments?.name}
    </Text>

    {!!item.condition && (
      <Text style={styles.condition}>
        {item.condition}
      </Text>
    )}
    <Text style={styles.cardTitle}>
Triage Assessment
</Text>
    <TouchableOpacity
  style={styles.suggestButton}
  onPress={() =>
    getPrioritySuggestion(
      item.id,
      item.condition
    )
  }
>

<Text style={styles.buttonText}>
Suggest Priority
</Text>

</TouchableOpacity>
{suggestions[item.id] && (

<View style={styles.suggestionBox}>

<Text style={styles.suggestionText}>
Suggested:
{" "}
{suggestions[item.id].toUpperCase()}
</Text>


<TouchableOpacity
style={styles.applyButton}
onPress={() =>
 updatePriority(
   item.id,
   suggestions[item.id]
 )
}
>

<Text style={styles.buttonText}>
Apply Suggestion
</Text>

</TouchableOpacity>


</View>

)}

<View
  style={[
    styles.priorityBadge,

    item.priority === "emergency"
      ? styles.emergency

      : item.priority === "urgent"
      ? styles.urgent

      : item.priority === "infant"
      ? styles.infant

      : item.priority === "elderly"
      ? styles.elderly

      : item.priority === "disabled"
      ? styles.disabled

      : item.priority === "pregnant"
      ? styles.pregnant

      : item.priority === "referral"
      ? styles.referral

      : item.priority === "low"
      ? styles.low

      : styles.normal
  ]}
>

<Text style={styles.priorityText}>
  {item.priority.toUpperCase()}
</Text>

</View>
    <Text style={styles.bookingCode}>
      Booking Code: {item.booking_code}
    </Text>
<View style={styles.priorityActions}>

<TouchableOpacity
  style={styles.emergencyButton}
  onPress={() =>
    updatePriority(
      item.id,
      "emergency"
    )
  }
>
<Text style={styles.buttonText}>
Emergency
</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.urgentButton}
  onPress={() =>
    updatePriority(
      item.id,
      "urgent"
    )
  }
>
<Text style={styles.buttonText}>
Urgent
</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.normalButton}
  onPress={() =>
    updatePriority(
      item.id,
      "normal"
    )
  }
>
<Text style={styles.buttonText}>
Normal
</Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.elderlyButton}
  onPress={() =>
    updatePriority(
      item.id,
      "elderly"
    )
  }
>
<Text style={styles.buttonText}>
👴 Elderly
</Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.infantButton}
  onPress={() =>
    updatePriority(
      item.id,
      "infant"
    )
  }
>
<Text style={styles.buttonText}>
👶 Infant
</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.disabledButton}
  onPress={() =>
    updatePriority(
      item.id,
      "disabled"
    )
  }
>
<Text style={styles.buttonText}>
♿ Disabled
</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.pregnantButton}
  onPress={() =>
    updatePriority(
      item.id,
      "pregnant"
    )
  }
>
<Text style={styles.buttonText}>
🤰 Pregnant
</Text>
</TouchableOpacity>


<TouchableOpacity
  style={styles.referralButton}
  onPress={() =>
    updatePriority(
      item.id,
      "referral"
    )
  }
>
<Text style={styles.buttonText}>
🏥 Referral
</Text>
</TouchableOpacity>
</View>
    <View style={styles.actions}>
      {item.status === "waiting" && (
       <TouchableOpacity
  style={styles.callButton}
  onPress={() => {

    const allowed =
      canCallPatient(item.id);


    if (!allowed) {

      Alert.alert(
        "Priority Patient Waiting",
        "An emergency or urgent patient is waiting. Do you want to continue anyway?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Continue",
            onPress: () =>
              updateStatus(
                item.id,
                "called"
              ),
          },
        ]
      );

      return;
    }


    showConfirm(
  "Call Patient",
  `Call ${item.queue_number}?`,
  () =>
    updateStatus(
      item.id,
      "called"
    )
);

  }}
>
  <Text style={styles.buttonText}>
    Call Patient
  </Text>
</TouchableOpacity>
      )}

      {item.status === "called" && (
  <TouchableOpacity
    style={styles.consultationButton}
    onPress={() =>
      updateStatus(
        item.id,
        "in_consultation"
      )
    }
  >
    <Text style={styles.buttonText}>
      Start Consultation
    </Text>
  </TouchableOpacity>
)}

      {item.status === "in_consultation" && (

 <View style={styles.consultationActions}>

  <TouchableOpacity
    style={styles.admitButton}
    onPress={() =>
      updateStatus(
        item.id,
        "admitted"
      )
    }
  >
    <Text style={styles.buttonText}>
      Admit
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.dischargeButton}
    onPress={() =>
      updateStatus(
        item.id,
        "discharged"
      )
    }
  >
    <Text style={styles.buttonText}>
      Discharge
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.transferButton}
    onPress={() =>
      updateStatus(
        item.id,
        "transferred"
      )
    }
  >
    <Text style={styles.buttonText}>
      Transfer
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.referralButton}
    onPress={() =>
      updateStatus(
        item.id,
        "referred"
      )
    }
  >
    <Text style={styles.buttonText}>
      Refer
    </Text>
  </TouchableOpacity>

</View>
)}
    </View>
  </View>
);

const waitingPatients =
  queue.filter(
    item => item.status === "waiting"
  );

const consultationPatients =
  queue.filter(
    item => item.status === "in_consultation"
  );

// MAIN SCREEN RENDER
return (
  <View
    style={{
      flex: 1,
      backgroundColor: "#F5F7FA",
    }}
  >
    {loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading queue...
        </Text>
      </View>

    ) : queue.length === 0 ? (

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          No Queue Today
        </Text>

        <Text style={styles.emptyText}>
          No patients have joined today's queue.
        </Text>
      </View>

    ) : (

  <>
  <View style={styles.statsRow}>

<View>
<Text>Waiting</Text>
<Text>{waitingPatients.length}</Text>
</View>

<View>
<Text>Consultation</Text>
<Text>{consultationPatients.length}</Text>
</View>

<View>
<Text>Serving</Text>
<Text>
{currentPatient ? 1 : 0}
</Text>
</View>

</View>
    <View style={styles.currentCard}>

      <Text style={styles.currentTitle}>
        NOW SERVING
      </Text>

      <Text style={styles.currentNumber}>
        {currentPatient?.queue_number || "None"}
      </Text>

      <Text>
        {currentPatient?.hospital_departments?.name || ""}
      </Text>

    </View>
    


    <FlatList
      data={queue}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{
        padding: 16,
      }}
    />

  </>

)}
  </View>
);
}
  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

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
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },
  cardTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#111827",
  marginBottom: 10,
},
dischargeButton: {
  backgroundColor: "#10B981",
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 12,
},

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  queueNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A7CFF",
  },
infantButton:{
  backgroundColor:"#EC4899",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  waiting: {
    backgroundColor: "#F59E0B",
  },

  called: {
    backgroundColor: "#2563EB",
  },

  consultation: {
  backgroundColor: "#16A34A",
},
  completed: {
    backgroundColor: "#6B7280",
  },

  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  department: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  condition: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 10,
    lineHeight: 22,
  },

  bookingCode: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  callButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

 consultationButton: {
  backgroundColor: "#16A34A",
  borderRadius: 10,
  paddingHorizontal: 18,
  paddingVertical: 12,
},
  completeButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  statsRow: {
  flexDirection: "row",
  justifyContent: "space-around",
  margin: 16,
},

statBox: {
  backgroundColor: "#FFFFFF",
  padding: 15,
  borderRadius: 12,
  alignItems: "center",
  flex: 1,
  marginHorizontal: 5,
},

statLabel: {
  fontSize: 13,
  color: "#6B7280",
},

statNumber: {
  fontSize: 24,
  fontWeight: "700",
  color: "#111827",
},
currentCard: {
  backgroundColor: "#FFFFFF",
  marginHorizontal: 16,
  marginTop: 16,
  marginBottom: 10,
  padding: 20,
  borderRadius: 16,
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 3,
  },
  elevation: 3,
},

currentTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: "#6B7280",
},

currentNumber: {
  fontSize: 36,
  fontWeight: "800",
  color: "#2563EB",
  marginVertical: 8,
},
priorityBadge:{
  alignSelf:"flex-start",
  paddingHorizontal:12,
  paddingVertical:6,
  borderRadius:20,
  marginBottom:12,
},

priorityText:{
  color:"#fff",
  fontWeight:"700",
  fontSize:12,
},
emergencyLabel:{
  color:"#DC2626",
  fontWeight:"800",
  marginTop:4,
},


urgentLabel:{
  color:"#F59E0B",
  fontWeight:"800",
  marginTop:4,
},
elderlyButton:{
  backgroundColor:"#92400E",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},


disabledButton:{
  backgroundColor:"#0891B2",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},


pregnantButton:{
  backgroundColor:"#DB2777",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},


referralButton:{
  backgroundColor:"#7C3AED",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},

emergency:{
  backgroundColor:"#DC2626",
},

urgent:{
  backgroundColor:"#F59E0B",
},

normal:{
  backgroundColor:"#2563EB",
},
infant:{
  backgroundColor:"#EC4899",
},

elderly:{
  backgroundColor:"#92400E",
},

disabled:{
  backgroundColor:"#0891B2",
},

pregnant:{
  backgroundColor:"#DB2777",
},

referral:{
  backgroundColor:"#7C3AED",
},
low:{
  backgroundColor:"#6B7280",
},


priorityActions:{
  flexDirection:"row",
  gap:8,
  marginBottom:12,
},


emergencyButton:{
  backgroundColor:"#DC2626",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},


urgentButton:{
  backgroundColor:"#F59E0B",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},


normalButton:{
  backgroundColor:"#2563EB",
  borderRadius:10,
  paddingHorizontal:10,
  paddingVertical:8,
},
suggestButton:{
  backgroundColor:"#7C3AED",
  borderRadius:10,
  paddingHorizontal:14,
  paddingVertical:10,
  marginBottom:12,
},


suggestionBox:{
  backgroundColor:"#EEF2FF",
  borderRadius:12,
  padding:12,
  marginBottom:12,
},


suggestionText:{
  fontSize:15,
  fontWeight:"700",
  color:"#3730A3",
  marginBottom:10,
},
emergencyCard:{
  borderWidth:2,
  borderColor:"#DC2626",
},


urgentCard:{
  borderWidth:2,
  borderColor:"#F59E0B",
},
consultationActions: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
},

admitButton: {
  backgroundColor: "#059669",
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 12,
},

transferButton: {
  backgroundColor: "#EA580C",
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 12,
},

applyButton:{
  backgroundColor:"#16A34A",
  borderRadius:10,
  paddingHorizontal:14,
  paddingVertical:10,
},
});