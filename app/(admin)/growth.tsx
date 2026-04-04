import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useAdmin } from "../../hooks/useAdmin";
import { supabase } from "../../lib/supabase";

const screenWidth = Dimensions.get("window").width;

export default function AdminGrowthScreen() {
  const isAdmin = useAdmin();
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);

  const loadGrowth = async () => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("created_at")
      .order("created_at", { ascending: true });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const grouped: Record<string, number> = {};

    data.forEach((user: any) => {
      const date = new Date(user.created_at)
        .toISOString()
        .split("T")[0];

      grouped[date] = (grouped[date] || 0) + 1;
    });

    const sortedDates = Object.keys(grouped).sort();

    setLabels(sortedDates.slice(-7)); // last 7 days
    setValues(sortedDates.slice(-7).map((d) => grouped[d]));

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadGrowth();
    else setLoading(false);
  }, [isAdmin]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return <Text style={{ margin: 20 }}>Not authorized</Text>;
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        📈 User Growth (Last 7 Days)
      </Text>

      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: values.length ? values : [0],
            },
          ],
        }}
        width={screenWidth - 32}
        height={260}
        chartConfig={{
          backgroundColor: "#111827",
          backgroundGradientFrom: "#111827",
          backgroundGradientTo: "#111827",
          decimalPlaces: 0,
          color: (opacity = 1) =>
            `rgba(34,197,94, ${opacity})`,
          labelColor: () => "#9CA3AF",
        }}
        bezier
        style={{
          borderRadius: 16,
        }}
      />
    </ScrollView>
  );
}