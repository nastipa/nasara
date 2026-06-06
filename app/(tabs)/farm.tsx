import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function FarmTab() {
  const router = useRouter();

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        🌾 Farm Center
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/farm/create")}
        style={{
          backgroundColor: "#16a34a",
          padding: 18,
          borderRadius: 14,
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          ➕ Create Farm
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/farm/my")}
        style={{
          backgroundColor: "#2563eb",
          padding: 18,
          borderRadius: 14,
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          🏡 My Farm
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/farm/add-stock")}
        style={{
          backgroundColor: "#7c3aed",
          padding: 18,
          borderRadius: 14,
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          📦 Add Farm Stock
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/farm")}
        style={{
          backgroundColor: "#ea580c",
          padding: 18,
          borderRadius: 14,
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          🌍 Browse Farms
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/farm/edit")}
        style={{
          backgroundColor: "#0891b2",
          padding: 18,
          borderRadius: 14,
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          ✏️ Edit Farm
        </Text>
      </TouchableOpacity>

      <View
        style={{
          marginTop: 20,
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 14,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Farm Stock Categories
        </Text>

        <Text>🐔 Poultry</Text>
        <Text>🐄 Livestock</Text>
        <Text>🥬 Vegetables</Text>
        <Text>🌽 Maize</Text>
        <Text>🍚 Rice</Text>
        <Text>🐟 Fish Farming</Text>
        <Text>🌱 Cassava</Text>
        <Text>🥔 Yam</Text>
        <Text>🍫 Cocoa</Text>
        <Text>🚜 Mixed Farm</Text>
        <Text>📦 Other</Text>
      </View>
    </ScrollView>
  );
}