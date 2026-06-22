import { useRouter } from "expo-router";
import {
  ScrollView,
  Text,
  TouchableOpacity
} from "react-native";

export default function ServiceType() {
  const router = useRouter();

  const Card = ({
    title,
    description,
    onPress,
  }: {
    title: string;
    description: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#ddd",
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 6,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: "#666",
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f5f5f5" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          marginBottom: 10,
        }}
      >
        Utility Services
      </Text>

      <Text
        style={{
          color: "#666",
          marginBottom: 25,
        }}
      >
        Select the utility service you want to apply for.
      </Text>

      <Card
        title="New Service"
        description="Apply for a new electricity service."
        onPress={() =>
          router.push({
            pathname: "/services/apply",
            params: {
              account: "nasara",
              service: "new_service",
            },
          })
        }
      />

      <Card
        title="Separate/Domestic"
        description="Apply for a separate or domestic electricity meter."
        onPress={() =>
          router.push({
            pathname: "/services/apply",
            params: {
              account: "nasara",
              service: "separate_domestic",
            },
          })
        }
      />

      <Card
        title="Commercial Meter"
        description="Apply for a commercial electricity meter."
        onPress={() =>
          router.push({
            pathname: "/services/apply",
            params: {
              account: "nasara",
              service: "commercial_meter",
            },
          })
        }
      />

      <Card
        title="Transfer Meter"
        description="Transfer an existing electricity meter."
        onPress={() =>
          router.push({
            pathname: "/services/apply",
            params: {
              account: "nasara",
              service: "transfer_meter",
            },
          })
        }
      />
    </ScrollView>
  );
}