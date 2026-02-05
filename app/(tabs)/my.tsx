import { useFocusEffect, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* ================= ITEM CARD COMPONENT ================= */

function MyItemCard({
  item,
  onDelete,
  onPromote,
}: {
  item: any;
  onDelete: (id: number) => void;
  onPromote: (id: number) => void;
}) {
  const router = useRouter();

  const player = item.video_url
    ? useVideoPlayer(item.video_url, (p) => {
        p.muted = true;
        p.loop = true;
        p.play();
      })
    : null;

  const startDate =
    item.promoted_start_date
      ? new Date(item.promoted_start_date).toDateString()
      : null;

  const endDate =
    item.promoted_end_date
      ? new Date(item.promoted_end_date).toDateString()
      : null;

  return (
    <View style={{ padding: 12, borderBottomWidth: 1 }}>
      {/* MEDIA */}
      {item.video_url ? (
        <VideoView
          style={{
            height: 200,
            borderRadius: 8,
            backgroundColor: "black",
          }}
          player={player!}
        />
      ) : item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={{ height: 200, borderRadius: 8 }}
        />
      ) : (
        <View
          style={{
            height: 200,
            backgroundColor: "#eee",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>No Media</Text>
        </View>
      )}

      {/* PROMOTED BADGE */}
      {item.is_promoted && (
        <Text
          style={{
            backgroundColor: "#facc15",
            alignSelf: "flex-start",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: "bold",
            marginTop: 6,
          }}
        >
          ⭐ PROMOTED
        </Text>
      )}

      <Text style={{ fontWeight: "bold", fontSize: 16, marginTop: 6 }}>
        {item.title}
      </Text>

      <Text style={{ color: "green" }}>₵ {item.price}</Text>

      {/* ===== PROMOTION DETAILS (AFTER APPROVAL) ===== */}
      {item.is_promoted && (
        <View style={{ marginTop: 6 }}>
          {item.advertiser_name && (
            <Text>Promoted by: {item.advertiser_name}</Text>
          )}

          {item.paid_amount && (
            <Text>Amount Paid: GHS {item.paid_amount}</Text>
          )}

          {startDate && <Text>Start Date: {startDate}</Text>}
          {endDate && <Text>End Date: {endDate}</Text>}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <Button
          title="View"
          onPress={() => router.push("/itemdetail/" + item.id)}
        />

        <Button
          title="Edit"
          onPress={() =>
            router.push({
              pathname: "/itemedit/[id]",
              params: { id: String(item.id) },
            })
          }
        />

        <Button title="Delete" color="red" onPress={() => onDelete(item.id)} />

        {!item.is_promoted && (
          <Button
            title="Promote"
            color="#f59e0b"
            onPress={() => onPromote(item.id)}
          />
        )}
      </View>
    </View>
  );
}

/* ================= MAIN SCREEN ================= */

export default function My() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ================= FETCH =================
  const fetchMyItems = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("items_live")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setItems(data || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyItems();
      return () => {};
    }, [])
  );

  // ================= DELETE =================
  const runDelete = async (id: number) => {
    const { error } = await supabase.from("items_live").delete().eq("id", id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteItem = (id: number) => {
    if (Platform.OS === "web") {
      if (confirm("Delete this item?")) runDelete(id);
      return;
    }

    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => runDelete(id) },
    ]);
  };

  // ================= 🔥 PROMOTE ITEM =================

 const promoteItem = async (id: number) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await (supabase as any).from("promoted").insert({
      seller_id: data.user.id,
      type: "promote",
      item_id: id,
      amount: 20,
      status: "pending",
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

  const { data: admin } = await (supabase as any)
    .from("profiles")
    .select("momo_name, momo_number")
    .eq("is_admin", true)
    .single();

  showAlert(
    "Pay to Promote",
    "Name: " +
      admin.momo_name +
      "\nNumber: " +
      admin.momo_number +
      "\nAmount: 20 GHS\n\nYour item will be promoted after admin approval."
  );
};

  // ================= UI =================
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchMyItems} />
      }
      ListEmptyComponent={
        <Text style={{ padding: 20, textAlign: "center" }}>
          No items yet
        </Text>
      }
      renderItem={({ item }) => (
        <MyItemCard
          item={item}
          onDelete={deleteItem}
          onPromote={promoteItem}
        />
      )}
    />
  );
}