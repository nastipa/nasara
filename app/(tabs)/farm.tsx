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
      <TouchableOpacity
  onPress={() =>
    router.push(
      "/farm/create-service"
    )
  }
  style={{
    backgroundColor: "#f59e0b",
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
    🛠️ Create Farm Service
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
    Farm Marketplace Categories
  </Text>

  <Text>🌽 Crops</Text>
  <Text>🐄 Livestock</Text>
  <Text>🐔 Poultry</Text>
  <Text>🥚 Eggs</Text>
  <Text>🐟 Fish</Text>

  <Text>🌱 Seeds</Text>
  <Text>🧪 Fertilizer</Text>
  <Text>🛡️ Pesticides</Text>

  <Text>🔨 Farm Tools</Text>
  <Text>🚜 Farm Equipment</Text>

  <Text>🌾 Animal Feed</Text>
  <Text>💉 Veterinary Products</Text>

  <Text>👨‍🌾 Farm Services</Text>
</View>
    </ScrollView>
  );
}