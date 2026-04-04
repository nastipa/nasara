import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  price: number;
  created_at: string;
};

export default function Revenue() {

  const [listings, setListings] = useState<Listing[]>([]);
  const [revenue, setRevenue] = useState<number>(0);

  useEffect(() => {
    loadRevenue();
  }, []);

  async function loadRevenue() {

    const { data, error } = await supabase
      .from("listings")
      .select("id, price, created_at");

    if (error) {
      console.log(error);
      return;
    }

    const items: Listing[] = data || [];

    setListings(items);

    const total = items.reduce((sum: number, item: Listing) => {
      return sum + (item.price || 0);
    }, 0);

    setRevenue(total);
  }

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>Platform Revenue</Text>

      <View style={styles.card}>
        <Text style={styles.amount}>GH₵ {revenue}</Text>
        <Text>Total Revenue</Text>
      </View>

      <Text style={styles.subtitle}>Transactions</Text>

      {listings.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text>Listing ID</Text>
          <Text>{item.id}</Text>
          <Text>GH₵ {item.price}</Text>
        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },

  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 10
  },

  card: {
    padding: 20,
    backgroundColor: "#eee",
    borderRadius: 10,
    alignItems: "center"
  },

  amount: {
    fontSize: 32,
    fontWeight: "bold"
  },

  row: {
    padding: 15,
    backgroundColor: "#f7f7f7",
    marginBottom: 10,
    borderRadius: 8
  }
});