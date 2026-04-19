import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Offer = {
  id: string;
  item_id: number;
  buyer_id: string;
  seller_id: string;
  price: number;
  status: "pending" | "accepted" | "rejected" | "counter";
  counter_price: number | null;
  last_counter_by: "buyer" | "seller" | null;
  created_at: string;

  items_live?: {
    title: string;
    image_url: string | null;
  };
};

export default function OffersTab() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);

  const [mode, setMode] = useState<"buyer" | "seller">("buyer");

  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* ✅ Prevent popup repeating */
  const shownAlerts = useRef<{ [key: string]: boolean }>({});

  /* ============================
     LOAD USER
  ============================ */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;

      setUserId(uid);

      if (uid) detectMode(uid);
    };

    loadUser();
  }, []);

  /* ============================
     AUTO DETECT MODE
  ============================ */
  const detectMode = async (uid: string) => {
    const { data } = await supabase
      .from("offers")
      .select("id")
      .eq("seller_id", uid)
      .limit(1);

    if (data && data.length > 0) {
      setMode("seller");
    } else {
      setMode("buyer");
    }
  };

  /* ============================
     LOAD OFFERS
  ============================ */
  useEffect(() => {
    if (userId) loadOffers();
  }, [userId, mode]);

  const loadOffers = async () => {
    if (!userId) return;

    setLoading(true);

    const column = mode === "buyer" ? "buyer_id" : "seller_id";

    const { data, error } = await supabase
      .from("offers")
      .select(
        `
        *,
        items_live (
          title,
          image_url
        )
      `
      )
      .eq(column, userId)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error loading offers", error.message);
    } else {
      setOffers((data as Offer[]) || []);
    }

    setLoading(false);
  };

  /* ============================
     REALTIME REFRESH
  ============================ */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("offers-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        () => loadOffers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mode]);

  /* ============================
     ACCEPT / REJECT
  ============================ */
  const updateOfferStatus = async (
  offerId: string,
  newStatus: "accepted" | "rejected"
) => {
  setUpdatingId(offerId);

  const current = offers.find((o) => o.id === offerId);

  const updateData: any = {
    status: newStatus,
    last_counter_by: null,
  };

  // 🔥 FIX: apply counter price for BOTH accept and reject
  if (current?.counter_price) {
    updateData.price = current.counter_price;
  }

  // clear counter after decision
  updateData.counter_price = null;

  const { error } = await (supabase as any)
    .from("offers")
    .update(updateData)
    .eq("id", offerId);

  if (error) {
    Alert.alert("Update failed", error.message);
  }

  await loadOffers();
  setUpdatingId(null);
};
  /* ============================
     COUNTER OFFER
  ============================ */
  const sendCounterOffer = async (
    offerId: string,
    who: "buyer" | "seller"
  ) => {
    if (!counterPrice.trim()) {
      Alert.alert("Enter counter price");
      return;
    }

    setUpdatingId(offerId);

    const { error } = await (supabase as any)
      .from("offers")
      .update({
        status: "counter",
        counter_price: Number(counterPrice),
        last_counter_by: who,
      })
      .eq("id", offerId);

    if (error) {
      Alert.alert("Counter failed", error.message);
    }

    setCounterOfferId(null);
    setCounterPrice("");

    /* Reset popup so other user sees it */
    shownAlerts.current[offerId] = false;

    await loadOffers();
    setUpdatingId(null);
  };

  /* ============================
     POPUP ONLY WHEN IT'S YOUR TURN
  ============================ */
  useEffect(() => {
    offers.forEach((offer) => {
      if (offer.status !== "counter") return;

      const isSeller = mode === "seller";

      const myTurn =
        offer.last_counter_by !== (isSeller ? "seller" : "buyer");

      if (!myTurn) return;

      if (shownAlerts.current[offer.id]) return;

      shownAlerts.current[offer.id] = true;

      Alert.alert(
        "New Counter Offer",
        "You received a counter offer: GHS " + offer.counter_price
      );
    });
  }, [offers]);

  /* ============================
     LOADING
  ============================ */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: 60 }}>
      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 15,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={{
            backgroundColor: "black",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white" }}>Home</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          {mode === "buyer" ? "Offers Sent" : "Offers Received"}
        </Text>

        <TouchableOpacity
          onPress={() =>
            setMode((prev) => (prev === "buyer" ? "seller" : "buyer"))
          }
          style={{
            backgroundColor: "#2563eb",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white" }}>
            {mode === "buyer" ? "Seller" : "Buyer"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isSeller = mode === "seller";

          /* Turn system */
          const myTurn =
            item.status === "pending" ||
            (item.status === "counter" &&
              item.last_counter_by !== (isSeller ? "seller" : "buyer"));

          const disabled = updatingId === item.id;

          return (
            <View
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: "#f9fafb",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#eee",
              }}
            >
              {/* ITEM INFO */}
              <View style={{ flexDirection: "row", marginBottom: 10 }}>
                {item.items_live?.image_url ? (
                  <Image
                    source={{ uri: item.items_live.image_url }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      marginRight: 12,
                    }}
                  />
                ) : null}

                <View>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                    {item.items_live?.title || "Item"}
                  </Text>

                  <Text style={{ marginTop: 4 }}>
                    Offer Price: GHS{" "}
                    {item.status === "counter"
                      ? item.counter_price
                      : item.price}
                  </Text>

                  <Text style={{ marginTop: 4 }}>
                    Status:{" "}
                    <Text style={{ fontWeight: "bold" }}>{item.status}</Text>
                  </Text>
                </View>
              </View>

              {/* ACTIONS ONLY WHEN YOUR TURN */}
              {myTurn &&
                item.status !== "accepted" &&
                item.status !== "rejected" && (
                  <View style={{ marginTop: 10 }}>
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => updateOfferStatus(item.id, "accepted")}
                      style={{
                        backgroundColor: disabled ? "gray" : "green",
                        padding: 10,
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: "white", textAlign: "center" }}>
                        Accept
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => updateOfferStatus(item.id, "rejected")}
                      style={{
                        backgroundColor: disabled ? "gray" : "red",
                        padding: 10,
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: "white", textAlign: "center" }}>
                        Reject
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => setCounterOfferId(item.id)}
                      style={{
                        backgroundColor: disabled ? "gray" : "orange",
                        padding: 10,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: "white", textAlign: "center" }}>
                        Counter Offer
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* COUNTER INPUT */}
              {counterOfferId === item.id && (
                <View style={{ marginTop: 12 }}>
                  <TextInput
                    placeholder="Enter counter price"
                    keyboardType="numeric"
                    value={counterPrice}
                    onChangeText={setCounterPrice}
                    style={{
                      borderWidth: 1,
                      borderColor: "#ccc",
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />

                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() =>
                      sendCounterOffer(item.id, isSeller ? "seller" : "buyer")
                    }
                    style={{
                      backgroundColor: "#2563eb",
                      padding: 10,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: "white", textAlign: "center" }}>
                      Send Counter
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}