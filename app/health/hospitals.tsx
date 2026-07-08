import { Ionicons } from "@expo/vector-icons";
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
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function Hospitals() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);

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
    loadHospitals();
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

  async function loadHospitals() {
    setLoading(true);

    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .eq("is_active", true)
      .order("name");

    setLoading(false);

    if (error) {
      showMessage("Error", error.message);
      return;
    }

    setHospitals(data || []);
    setFiltered(data || []);
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