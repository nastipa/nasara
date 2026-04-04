import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Seller = {
  id: string;
  full_name: string;
  momo_name: string;
  momo_number: string;
  momo_network: string;
};

export default function MomoPayouts() {
  const [sellers, setSellers] = useState<Seller[]>([]);

  const loadSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,momo_name,momo_number,momo_network")
      .not("momo_number", "is", null);

    if (data) setSellers(data);
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const payout = async (seller: Seller) => {
    Alert.alert(
      "Confirm Payout",
      `Send MoMo payment to ${seller.full_name}?`,
      [
        { text: "Cancel" },
        {
          text: "Paid",
          onPress: async () => {
            await (supabase as any).from("payouts").insert({
              seller_id: seller.id,
              momo_number: seller.momo_number,
              momo_name: seller.momo_name,
              network: seller.momo_network,
              status: "paid",
            });

            Alert.alert("Success", "Payout recorded");
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 20 }}>
        MoMo Payouts
      </Text>

      <FlatList
        data={sellers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderColor: "#ddd",
            }}
          >
            <Text style={{ fontWeight: "600" }}>
              {item.full_name}
            </Text>

            <Text>{item.momo_network}</Text>
            <Text>{item.momo_number}</Text>

            <TouchableOpacity
              onPress={() => payout(item)}
              style={{
                marginTop: 8,
                backgroundColor: "#10b981",
                padding: 10,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white" }}>Mark Paid</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}