import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HealthHome() {
  const router = useRouter();

  const Card = ({
    icon,
    color,
    title,
    subtitle,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>

      <View style={styles.textArea}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={22}
        color="#999"
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.header}>
        ❤️ Nasara Health
      </Text>

      <Text style={styles.description}>
        Access healthcare services, join hospital queues,
        receive AI health guidance and maternal care support.
      </Text>

      <Card
        icon="medical"
        color="#2563eb"
        title="Smart Hospital Queue"
        subtitle="Book a queue before leaving home."
        onPress={() => router.push("/health/hospitals")}
      />
      <Card
  icon="medkit"
  color="#dc2626"
  title="Emergency Hospitals"
  subtitle="Find the nearest emergency hospitals using GPS."
  onPress={() =>
    router.push("/health/emergency-hospitals")
  }
/>
      <Card
  icon="stats-chart"
  color="#10b981"
  title="Live Queue Board"
  subtitle="See the current queue progress for every hospital."
  onPress={() => router.push("/health/live-queue")}
/>


      <Card
        icon="time"
        color="#f59e0b"
        title="My Hospital Queue"
        subtitle="View your queue number and QR check-in."
        onPress={() => router.push("/health/my-queue")}
      />
      <Card
  icon="document-text"
  color="#7c3aed"
  title="Visit History"
  subtitle="View all your previous hospital visits."
  onPress={() => router.push("/health/visit-history")}
/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },

  header: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 25,
    marginHorizontal: 20,
    color: "#111827",
  },

  description: {
    fontSize: 15,
    color: "#666",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 25,
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  textArea: {
    flex: 1,
    marginLeft: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
});