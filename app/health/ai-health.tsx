import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AIHealthScreen() {
  const router = useRouter();

  const cards = [
  {
    title: "AI Symptom Checker",
    subtitle: "Describe your symptoms and receive AI guidance.",
    icon: "medkit-outline",
    color: "#2563EB",
    action: () => {
      router.push("/health/ai-chat");
    },
  },

  {
    title: "Emergency Assessment",
    subtitle: "Check whether your symptoms require urgent care.",
    icon: "alert-circle-outline",
    color: "#DC2626",
    action: () => {
      router.push("/health/emergency");
    },
  },

  {
    title: "Medicine Guide",
    subtitle: "Learn about common medicines and dosage guidance.",
    icon: "medical-outline",
    color: "#16A34A",
    action: () => {
      router.push("/health/medicine-guide");
    },
  },

  {
    title: "First Aid",
    subtitle: "Step-by-step first aid instructions.",
    icon: "bandage-outline",
    color: "#F97316",
    action: () => {
      router.push("/health/first-aid");
    },
  },

  {
    title: "Health Tips",
    subtitle: "Daily health tips powered by AI.",
    icon: "heart-outline",
    color: "#EC4899",
    action: () => {
      router.push("/health/tips");
    },
  },

  {
    title: "Nearby Hospitals",
    subtitle: "Find hospitals and join the digital queue.",
    icon: "business-outline",
    color: "#0EA5E9",
    action: () => {
      router.push("/health/hospitals");
    },
  },

  {
    title: "Book Hospital Queue",
    subtitle: "Reserve your place before arriving.",
    icon: "calendar-outline",
    color: "#8B5CF6",
    action: () => {
      router.push("/health/hospitals");
    },
  },

  {
    title: "My Hospital Queue",
    subtitle: "Track your queue number and waiting time.",
    icon: "time-outline",
    color: "#10B981",
    action: () => {
      router.push("/health/my-queue");
    },
  },
];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          AI Health Assistant
        </Text>

        <Text style={styles.subtitle}>
          Smart health guidance anytime,
          anywhere.
        </Text>
      </View>

      <View style={styles.warningCard}>
        <Ionicons
          name="warning"
          size={26}
          color="#DC2626"
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.warningTitle}>
            Important Notice
          </Text>

          <Text style={styles.warningText}>
            AI guidance is not a replacement for
            professional medical care. In an
            emergency, visit the nearest hospital
            immediately.
          </Text>
        </View>
      </View>

      {cards.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          onPress={item.action}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: item.color,
              },
            ]}
          >
            <Ionicons
              name={item.icon as any}
              size={30}
              color="#fff"
            />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              {item.title}
            </Text>

            <Text style={styles.cardSubtitle}>
              {item.subtitle}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={24}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  header: {
    padding: 20,
    paddingTop: 60,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: "#6B7280",
  },

  warningCard: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 22,
    alignItems: "flex-start",
    gap: 12,
  },

  warningTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#991B1B",
    marginBottom: 4,
  },

  warningText: {
    color: "#7F1D1D",
    lineHeight: 20,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    elevation: 2,
  },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: {
    flex: 1,
    marginLeft: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  cardSubtitle: {
    marginTop: 4,
    color: "#6B7280",
    lineHeight: 20,
  },
});