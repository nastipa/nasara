import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
  counter_price: number | null;
  status: "pending" | "accepted" | "rejected" | "counter";
  last_counter_by: "buyer" | "seller" | null;
  created_at: string;
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState("");

  /* ===== AUTH ===== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user.id ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ===== LOAD OFFERS (BUYER + SELLER) ===== */
  const loadOffers = async () => {
    if (!userId) return;

    setLoading(true);

    const filter =
      "buyer_id.eq." + userId + ",seller_id.eq." + userId;

    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false });

    if (!error) {
      setOffers((data as Offer[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (userId) loadOffers();
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadOffers();
    }, [userId])
  );

  /* ===== REALTIME ===== */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("offers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        (payload) => {
          const updated = payload.new as Offer;

          if (
            updated.buyer_id === userId ||
            updated.seller_id === userId
          ) {
            if (Platform.OS !== "web") {
              if (
                payload.eventType === "INSERT" &&
                updated.seller_id === userId
              ) {
                Alert.alert("New Offer", "You received a new offer");
              }

              if (
                payload.eventType === "UPDATE" &&
                updated.status === "counter"
              ) {
                Alert.alert("Counter Offer", "A counter offer was sent");
              }

              if (
                payload.eventType === "UPDATE" &&
                updated.status === "accepted"
              ) {
                Alert.alert("Offer Accepted 🎉");
              }

              if (
                payload.eventType === "UPDATE" &&
                updated.status === "rejected"
              ) {
                Alert.alert("Offer Rejected");
              }
            }

            loadOffers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* ===== UPDATE STATUS ===== */
  const updateStatus = async (
    offer: Offer,
    action: "accepted" | "rejected" | "counter"
  ) => {
    if (!userId) return;

    const isSeller = offer.seller_id === userId;

    let updateData: any = {};

    if (action === "accepted") {
      updateData = {
        status: "accepted",
        price: offer.counter_price ?? offer.price,
        counter_price: null,
        last_counter_by: null,
      };
    }

    if (action === "rejected") {
      updateData = {
        status: "rejected",
        counter_price: null,
        last_counter_by: null,
      };
    }

    if (action === "counter") {
      updateData = {
        status: "counter",
        counter_price: Number(counterPrice),
        last_counter_by: isSeller ? "seller" : "buyer",
      };
    }

    const { error } = await (supabase as any)
      .from("offers")
      .update(updateData)
      .eq("id", offer.id);

    if (!error) {
      setActiveCounterId(null);
      setCounterPrice("");
      loadOffers();
    }
  };

  /* ===== UI STATES ===== */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 50 }}>
        <Text>Please login</Text>
      </View>
    );
  }

  if (offers.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 50 }}>
        <Text>No offers yet</Text>
      </View>
    );
  }

  /* ===== LIST ===== */
  return (
    <FlatList
      data={offers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const isSeller = item.seller_id === userId;

        const waitingForMe =
          item.status === "pending" ||
          (item.status === "counter" &&
            item.last_counter_by !== (isSeller ? "seller" : "buyer"));

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
            <Text style={{ fontWeight: "bold" }}>
              Offer Price: ₵ {item.price}
            </Text>

            <Text style={{ marginTop: 4 }}>
              Status: <Text style={{ fontWeight: "bold" }}>{item.status}</Text>
            </Text>

            {item.counter_price !== null && (
              <Text style={{ marginTop: 6, color: "orange" }}>
                Counter Price: ₵ {item.counter_price}
              </Text>
            )}

            {waitingForMe && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", marginBottom: 10 }}>
                  <TouchableOpacity
                    onPress={() => updateStatus(item, "accepted")}
                    style={{
                      backgroundColor: "#10b981",
                      padding: 10,
                      borderRadius: 6,
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ color: "white" }}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => updateStatus(item, "rejected")}
                    style={{
                      backgroundColor: "#ef4444",
                      padding: 10,
                      borderRadius: 6,
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ color: "white" }}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveCounterId(item.id)}
                    style={{
                      backgroundColor: "#f59e0b",
                      padding: 10,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: "white" }}>Counter</Text>
                  </TouchableOpacity>
                </View>

                {activeCounterId === item.id && (
                  <View>
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
                      onPress={() => updateStatus(item, "counter")}
                      style={{
                        backgroundColor: "#2563eb",
                        padding: 10,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: "white" }}>
                        Send Counter
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}