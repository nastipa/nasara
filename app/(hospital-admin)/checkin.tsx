import { Camera, CameraView } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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

export default function HospitalCheckIn() {
  const [hasPermission, setHasPermission] =
  useState<boolean | null>(null);

useEffect(() => {
  (async () => {
    const { status } =
      await Camera.requestCameraPermissionsAsync();

    setHasPermission(status === "granted");
  })();

  loadCheckedPatients();

  const interval =
    setInterval(() => {
      loadCheckedPatients();
    }, 30000);

  return () =>
    clearInterval(interval);

}, []);

  const [bookingCode, setBookingCode] =
    useState("");
const scanningRef = useRef(false);
  const [loading, setLoading] =
    useState(false);
    const [checkingIn, setCheckingIn] =
  useState(false);

  const [scanned, setScanned] =
    useState(false);
    const [checkedPatients, setCheckedPatients] =
  useState<any[]>([]);

const [loadingPatients, setLoadingPatients] =
  useState(false);

  

  const checkIn = async (
    code: string
  ) => {

    if (checkingIn) return;

    try {
      setCheckingIn(true);
      setLoading(true);

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

      const response = await fetch(
        `${API_URL}/hospital/checkin`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            booking_code: code,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "Unable to check in patient."
        );
      }

      showMessage(
  "Success",
  "Patient checked in successfully."
);

loadCheckedPatients();
      setBookingCode("");
      setScanned(false);

    } catch (err: any) {
      showMessage(
        "Error",
        err.message
      );
    } finally {
  setLoading(false);
  setCheckingIn(false);
}
  };
  const loadCheckedPatients = async () => {
  try {
    setLoadingPatients(true);

    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    const response =
      await fetch(
        `${API_URL}/hospital/checkin-list`,
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
        "Unable to load checked patients."
      );
    }

    setCheckedPatients(
      json.patients || []
    );

  } catch (err: any) {
    showMessage(
      "Error",
      err.message
    );
  } finally {
    setLoadingPatients(false);
  }
};

  const onBarcodeScanned = ({ data }: { data: string }) => {
  if (scanningRef.current) return;

  scanningRef.current = true;

  checkIn(data);

};

  if (hasPermission === null) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
    </View>
  );
}

if (!hasPermission) {
    return (
      <View
        style={styles.permissionContainer}
      >
        <Text style={styles.permissionText}>
          Camera permission is required.
        </Text>

        <TouchableOpacity
          style={styles.permissionButton}
         onPress={async () => {
  const { status } =
    await Camera.requestCameraPermissionsAsync();

  setHasPermission(status === "granted");
}}
        >
          <Text style={styles.buttonText}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Hospital Check In
      </Text>

      <Text style={styles.subtitle}>
        Scan the patient's QR code or enter the
        booking code manually.
      </Text>

      <View style={styles.scannerContainer}>
        <CameraView
  style={styles.camera}
  barcodeScannerSettings={{
    barcodeTypes: ["qr"],
  }}
  onBarcodeScanned={
    scanningRef.current
      ? undefined
      : onBarcodeScanned
  }
/>
      </View>

      {scanned && (
  <TouchableOpacity
    style={styles.scanAgainButton}
    onPress={() => {
      scanningRef.current = false;
      setScanned(false);
    }}
  >
    <Text style={styles.buttonText}>
      Scan Again
    </Text>
  </TouchableOpacity>
)}

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <TextInput
        value={bookingCode}
        onChangeText={setBookingCode}
        placeholder="Enter Booking Code"
        autoCapitalize="characters"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.checkInButton}
        disabled={
          loading ||
          bookingCode.trim() === ""
        }
        onPress={() =>
          checkIn(
            bookingCode.trim().toUpperCase()
          )
        }
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Checking In..."
            : "Check In Patient"}
        </Text>
      </TouchableOpacity>
      <View style={{ marginTop: 30 }}>

<Text style={styles.sectionTitle}>
  Checked In Patients
</Text>

{loadingPatients ? (
  <ActivityIndicator />
) : checkedPatients.length === 0 ? (

  <Text style={styles.emptyText}>
    No patients checked in yet.
  </Text>

) : (

<FlatList
  data={checkedPatients}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View style={styles.patientCard}>

      <Text style={styles.patientQueue}>
        {item.queue_number}
      </Text>

      <Text>
        Department:{" "}
        {item.hospital_departments?.name}
      </Text>

      <Text>
        Booking Code: {item.booking_code}
      </Text>

      <Text>
        Status: {item.status}
      </Text>

    </View>
  )}
/>

)}

</View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },

  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F5F7FA",
  },

  permissionText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },

  permissionButton: {
    backgroundColor: "#0A7CFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },

  scannerContainer: {
    height: 320,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  scanAgainButton: {
    marginTop: 16,
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },

  orText: {
    marginHorizontal: 12,
    color: "#666",
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 18,
  },

  checkInButton: {
    backgroundColor: "#0A7CFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 12,
  color: "#111827",
},

emptyText: {
  color: "#666",
  fontSize: 15,
},

patientCard: {
  backgroundColor: "#FFFFFF",
  padding: 16,
  borderRadius: 14,
  marginBottom: 12,
},

patientQueue: {
  fontSize: 22,
  fontWeight: "700",
  color: "#0A7CFF",
  marginBottom: 8,
},
});