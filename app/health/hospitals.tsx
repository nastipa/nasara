import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Hospitals() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [location, setLocation] =
  useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /* ================= MESSAGE ================= */

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

  /* ================= LOAD ================= */

  useEffect(() => {
  getLocationAndLoad();
}, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(hospitals);
      return;
    }

    const text = search.toLowerCase();

    setFiltered(
      hospitals.filter(
        (h) =>
          h.name?.toLowerCase().includes(text) ||
          h.region?.toLowerCase().includes(text) ||
          h.district?.toLowerCase().includes(text) ||
          h.town?.toLowerCase().includes(text)
      )
    );
  }, [search, hospitals]);
  async function getLocationAndLoad() {
  try {

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      loadHospitals();
      return;
    }

    const current =
      await Location.getCurrentPositionAsync({});

    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });

    loadHospitals(
      current.coords.latitude,
      current.coords.longitude
    );

  } catch (e) {

    loadHospitals();

  }
}

  async function loadHospitals(
  latitude?: number,
  longitude?: number
) {
    setLoading(true);

    let query = supabase
  .from("hospitals")
  .select("*")
  .eq("is_active", true);

const { data, error } =
  await query;

    setLoading(false);

    if (error) {
      showMessage("Error", error.message);
      return;
    }

   let hospitals: any[] = (data as any[]) || [];

if (
  latitude != null &&
  longitude != null
) {

  const toRadians = (v: number) =>
    v * Math.PI / 180;

  hospitals = hospitals
    .map((hospital) => {

      if (
        hospital.latitude == null ||
        hospital.longitude == null
      ) {
        return hospital;
      }

      const R = 6371;

      const dLat =
        toRadians(
          hospital.latitude - latitude
        );

      const dLng =
        toRadians(
          hospital.longitude - longitude
        );

      const a =
        Math.sin(dLat / 2) *
          Math.sin(dLat / 2) +
        Math.cos(
          toRadians(latitude)
        ) *
          Math.cos(
            toRadians(
              hospital.latitude
            )
          ) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        );

      return {
        ...(hospital as any),
        distance:
          Number((R * c).toFixed(2)),
      };

    })
    .sort((a, b) => {

      if (a.distance == null)
        return 1;

      if (b.distance == null)
        return -1;

      return a.distance - b.distance;

    });

}

setHospitals(hospitals);
setFiltered(hospitals);
  }

  /* ================= CARD ================= */

  const renderHospital = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/health/hospital-details",
          params: {
            id: item.id,
          },
        })
      }
    >
      <View style={styles.iconBox}>
        <Ionicons
          name="medical"
          size={30}
          color="#fff"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>
          {item.name}
        </Text>

        <Text style={styles.location}>
          {item.town}
          {item.region ? ` • ${item.region}` : ""}
        </Text>
        {item.distance != null && (
  <Text
    style={{
      color: "#2563eb",
      fontWeight: "600",
      marginTop: 4,
    }}
  >
    📍 {item.distance} km away
  </Text>
)}

        {item.phone ? (
          <Text style={styles.phone}>
            📞 {item.phone}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={22}
        color="#999"
      />
    </TouchableOpacity>
  );

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        🏥 Hospitals
      </Text>

      <TextInput
        placeholder="Search hospital, town or region..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {loading ? (
        <ActivityIndicator
          size="large"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderHospital}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No hospitals found.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    padding: 16,
  },

  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 18,
    color: "#111827",
  },

  search: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 18,
    fontSize: 16,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  location: {
    marginTop: 5,
    color: "#6b7280",
    fontSize: 14,
  },

  phone: {
    marginTop: 5,
    color: "#059669",
    fontWeight: "600",
  },

  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#777",
    fontSize: 16,
  },
});