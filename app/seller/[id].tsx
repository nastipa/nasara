import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Seller header */}
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        Seller {id}
      </Text>

      {/* View seller items (YOUR EXISTING CODE) */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/itemdetail/[id]",
            params: { id },
          })
        }
        style={{ marginTop: 20 }}
      >
        <Text style={{ color: "blue" }}>
          View Seller Items
        </Text>
      </Pressable>

      {/* 🔴 NEW: View Seller Live (buyer entry) */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/live/[sellerId]",
            params: { sellerId: id },
          })
        }
        style={{ marginTop: 20 }}
      >
        <Text style={{ color: "red", fontWeight: "600" }}>
          View Live (if online)
        </Text>
      </Pressable>

      {/* 🔙 Back to home */}
      <Pressable
        onPress={() => router.replace("/browse")}
        style={{ marginTop: 30 }}
      >
        <Text style={{ color: "gray" }}>
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}