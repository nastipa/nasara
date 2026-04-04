import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";
const router = useRouter();
const dailyRate = 30; // GH₵ per day

/* ================= ALERT FIX ================= */
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* ================= ITEM CARD ================= */
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

  return (
    <TouchableOpacity
      onPress={() => router.push("/itemdetail/" + item.id)}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#eee",
      }}
    >
      {/* MEDIA */}
      {item.video_url ? (
        <VideoView
          player={player!}
          style={{
            width: 130,
            height: 130,
            alignSelf: "center",
            borderRadius: 10,
            backgroundColor: "black",
            marginTop: 10,
          }}
        />
      ) : item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={{
            width: 200,
            height: 200,
            alignSelf: "center",
            borderRadius: 20,
            backgroundColor: "#eee",
            marginTop: 20,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 200,
            height: 200,
            alignSelf: "center",
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#eee",
            marginTop: 20,
          }}
        >
          <Text>No Media</Text>
        </View>
      )}

      {/* BADGES */}
      {item.is_promoted && (
        <Text
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            backgroundColor: "gold",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: "bold",
          }}
        >
          ⭐ PROMOTED
        </Text>
      )}

      {/* TEXT */}
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
          {item.title}
        </Text>

        <Text style={{ fontWeight: "bold", marginTop: 4, fontSize: 15 }}>
          GH₵ {item.price}
        </Text>

        {/* ACTIONS */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 10,
          }}
        >
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
    </TouchableOpacity>
  );
}

/* ================= MAIN SCREEN ================= */
export default function My() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* PROMOTION DAYS */
  const [days, setDays] = useState("3");

  /* PAYMENT MODAL */
  const [payVisible, setPayVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  /* ✅ NASARA PAYMENT MOMO (TEMP FIX) */
  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  /* ================= FETCH ITEMS ================= */
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
    }, [])
  );
  /* ================= DELETE ================= */
  const runDelete = async (id: number) => {
    const { error } = await supabase.from("items_live").delete().eq("id", id);

    if (error) {
      showAlert("Error", error.message);
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const deleteItem = (id: number) => {
    if (Platform.OS === "web") {
      if (confirm("Delete item?")) runDelete(id);
      return;
    }

    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: () => runDelete(id) },
    ]);
  };

  /* ================= PROMOTE ================= */
  const promoteItem = (id: number) => {
    setSelectedItemId(id);
    setPayVisible(true);
  };

  /* ================= SEND PAYMENT ================= */
  const sendPayment = async () => {
    if (!selectedItemId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showAlert("Login Required", "Please login first");
      return;
    }

    const totalAmount = Number(days) * dailyRate;

    const expiryDate = new Date(
      Date.now() + Number(days) * 24 * 60 * 60 * 1000
    ).toISOString();

    /* ✅ UNIQUE PAYMENT CODE */
   const code = "PROMO-" + Date.now();

await (supabase as any).from("payments").insert({
  user_id: user.id,
  product_type: "promote",
  amount: totalAmount,
  code,
  status: "pending",
});

await (supabase as any).from("promoted").insert({
  seller_id: user.id,
  item_id: selectedItemId,
  type: "promote",
  status: "pending",
  promoted_until: expiryDate,
  payment_code: code,
});
    /* ✅ PAYMENT RECORD */
    const { error: payError } = await (supabase as any)
      .from("payments")
      .insert({
        user_id: user.id,
        product_type: "promote",
        amount: totalAmount,
        momo_name: momoName,
        momo_number: momoNumber,
        network: momoNetwork,
        code,
        status: "pending",
      });

    if (payError) {
      showAlert("Error", payError.message);
      return;
    }

    /* ✅ PROMOTION REQUEST */
    const { error: promoError } = await (supabase as any)
      .from("promoted")
      .insert({
        seller_id: user.id,
        item_id: selectedItemId,
        amount: totalAmount,
        status: "pending",
        promoted_until: expiryDate,
        payment_code: code,
      });

    if (promoError) {
      showAlert("Error", promoError.message);
      return;
    }

    showAlert(
      "Request Sent ✅",
      `Promotion Request Submitted!\n\nPay GH₵${totalAmount} to:\n${momoName}\n${momoNumber} (${momoNetwork})\n\nCode: ${code}`
    );

    setPayVisible(false);
    setSelectedItemId(null);
  };

  /* ================= UI ================= */
  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchMyItems} />
        }
        ListEmptyComponent={
          <Text style={{ padding: 20, textAlign: "center" }}>
            No items posted yet
          </Text>
        }
        renderItem={({ item }) => (
          <MyItemCard item={item} onDelete={deleteItem} onPromote={promoteItem} />
        )}
      />

      {/* PAYMENT MODAL */}
      <Modal transparent visible={payVisible}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: "white", padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Promotion Payment
            </Text>

            <Text style={{ marginTop: 10 }}>Pay To:</Text>
            <Text style={{ fontWeight: "bold" }}>
              {momoName} - {momoNumber}
            </Text>

            {/* DAYS */}
            <Text style={{ marginTop: 12 }}>Select Days</Text>

            <View style={{ flexDirection: "row", marginTop: 8 }}>
              {["3", "7", "14"].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDays(d)}
                  style={{
                    flex: 1,
                    padding: 10,
                    marginHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: days === d ? "#2563eb" : "#e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: days === d ? "white" : "black",
                      fontWeight: "600",
                    }}
                  >
                    {d} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TOTAL */}
            <Text style={{ marginTop: 12, fontWeight: "bold" }}>
              Total Amount: GH₵ {Number(days) * dailyRate}
            </Text>

            <TouchableOpacity
              onPress={sendPayment}
              style={{
                backgroundColor: "#2563eb",
                padding: 14,
                marginTop: 15,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Generate Payment Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPayVisible(false)}>
              <Text style={{ textAlign: "center", marginTop: 10, color: "red" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}