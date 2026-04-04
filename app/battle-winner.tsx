import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function WinnerScreen() {
  const { id } = useLocalSearchParams();
  const [winner, setWinner] = useState<any>(null);

  async function load() {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("battle_id", id)
      .order("votes", { ascending: false })
      .limit(1)
      .single();

    setWinner(data);
  }

  useEffect(() => {
    load();
  }, []);

  if (!winner) return null;

  return (
    <View style={{ padding: 30, alignItems: "center" }}>
      <Text style={{ fontSize: 26 }}>🏆 Winner</Text>
      <Text style={{ fontSize: 20 }}>{winner.name}</Text>
      <Text>{winner.votes} votes</Text>
    </View>
  );
}