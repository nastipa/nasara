import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type AuctionRoom = {
  id: string;
  title: string;
  seller_id: string;
  status: string;
  duration_minutes?: number;
  created_at?: string;
  image_url?: string | null;
  video_url?: string | null;
};

type Bid = {
  id: string;
  auction_id: string;
  bidder_id: string;
  bid_amount: number;
  status: "pending" | "accepted" | "rejected";
  commission?: number;
};

export default function AuctionRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [room, setRoom] = useState<AuctionRoom | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [auctionEnded, setAuctionEnded] = useState(false);

  /* ================= SAFE VIDEO SOURCE ================= */

  const videoSource = room?.video_url
    ? { uri: room.video_url }
    : { uri: "" };

  const player = useVideoPlayer(videoSource);

  /* ================= LOAD USER ================= */

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    loadUser();
  }, []);

  /* ================= LOAD ROOM ================= */

  const loadRoom = async () => {
    if (!id || typeof id !== "string") return;

    const { data } = await (supabase as any)
      .from("auctions")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setRoom(data);

      if (data.created_at && data.duration_minutes) {
        const endTime =
          new Date(data.created_at).getTime() +
          data.duration_minutes * 60 * 1000;

        const remaining = Math.max(
          0,
          Math.floor((endTime - Date.now()) / 1000)
        );

        setTimeLeft(remaining);
        if (remaining <= 0) setAuctionEnded(true);
      }
    }
  };

  /* ================= COUNTDOWN ================= */

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAuctionEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  /* ================= LOAD BIDS ================= */

  const loadBids = async () => {
    if (!id || typeof id !== "string") return;

    const { data } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("auction_id", id)
      .order("bid_amount", { ascending: false });

    if (data) setBids(data);
  };

  const highestBid = bids.length > 0 ? bids[0].bid_amount : 0;

  /* ================= PLACE BID ================= */

  const placeBid = async () => {
    if (auctionEnded) {
      Alert.alert("Auction Ended");
      return;
    }

    const numericAmount = Number(bidAmount);

    if (!numericAmount || numericAmount <= highestBid) {
      Alert.alert(
        "Bid Too Low",
        `Bid must be higher than GH₵ ${highestBid}`
      );
      return;
    }

    const { error } = await (supabase as any).from("auction_bids").insert({
      auction_id: id,
      bidder_id: userId,
      bid_amount: numericAmount,
      status: "pending",
    });

    if (!error) {
      setBidAmount("");
      loadBids();
    }
  };

  /* ================= ACCEPT BID ================= */

  const acceptBid = async (bidId: string, amount: number) => {
    try {
      const commissionRate = 0.05;

      const commission = amount * commissionRate;
      const sellerEarning = amount - commission;

      const { error: bidError } = await (supabase as any)
        .from("auction_bids")
        .update({
          status: "accepted",
          commission: commission,
          seller_earning: sellerEarning,
        })
        .eq("id", bidId);

      if (bidError) throw bidError;

      const { error: auctionError } = await (supabase as any)
        .from("auctions")
        .update({ status: "ended" })
        .eq("id", room?.id);

      if (auctionError) throw auctionError;

      const { data: wallet } = await (supabase as any)
        .from("seller_wallets")
        .select("*")
        .eq("seller_id", room?.seller_id)
        .single();

      if (wallet) {
        await (supabase as any)
          .from("seller_wallets")
          .update({
            balance: Number(wallet.balance) + sellerEarning,
          })
          .eq("seller_id", room?.seller_id);
      } else {
        await (supabase as any).from("seller_wallets").insert({
          seller_id: room?.seller_id,
          balance: sellerEarning,
        });
      }

      setAuctionEnded(true);
      loadBids();

      Alert.alert(
        "Bid Accepted",
        `Commission: GH₵ ${commission}\nSeller Receives: GH₵ ${sellerEarning}`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  /* ================= REALTIME ================= */

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    loadRoom();
    loadBids();

    const channel = supabase
      .channel(`auction-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_bids",
          filter: `auction_id=eq.${id}`,
        },
        () => loadBids()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (!room) {
    return (
      <View style={{ padding: 30 }}>
        <Text>Loading Auction...</Text>
      </View>
    );
  }

  const isSeller = room.seller_id === userId;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <>
      <Stack.Screen options={{ title: room?.title || "Auction" }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: "white" }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      >
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          🔨 {room.title}
        </Text>

        {!auctionEnded && (
          <Text style={{ marginTop: 6, color: "red", fontWeight: "bold" }}>
            ⏳ {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </Text>
        )}

        {room.image_url && (
          <Image
            source={{ uri: room.image_url }}
            style={{
              width: "100%",
              height: 250,
              borderRadius: 12,
              marginTop: 15,
            }}
            resizeMode="cover"
          />
        )}

        {room.video_url ? (
          <VideoView
            player={player}
            style={{
              width: "100%",
              height: 250,
              borderRadius: 12,
              marginTop: 15,
            }}
            allowsFullscreen
          />
        ) : null}

        <Text style={{ marginTop: 10, fontWeight: "bold" }}>
          Highest Bid: GH₵ {highestBid}
        </Text>

        {!isSeller && !auctionEnded && (
          <View style={{ marginTop: 20 }}>
            <TextInput
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
              placeholder={`Higher than ${highestBid}`}
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                padding: 12,
                borderRadius: 10,
              }}
            />

            <TouchableOpacity
              onPress={placeBid}
              style={{
                backgroundColor: "black",
                padding: 14,
                borderRadius: 10,
                marginTop: 10,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Place Bid
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={{ marginTop: 25, fontWeight: "bold" }}>
          Live Bids
        </Text>

        <FlatList
          data={bids}
          keyExtractor={(b) => b.id}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <View
              style={{
                padding: 14,
                borderWidth: 2,
                borderColor: index === 0 ? "gold" : "#eee",
                borderRadius: 12,
                marginBottom: 10,
                backgroundColor: index === 0 ? "#fff8dc" : "white",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>
                GH₵ {item.bid_amount}
              </Text>

              <Text>Status: {item.status}</Text>

              {isSeller && index === 0 && !auctionEnded && (
                <TouchableOpacity
                  onPress={() =>
                    acceptBid(item.id, item.bid_amount)
                  }
                  style={{
                    backgroundColor: "green",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center" }}>
                    Accept Highest Bid
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        <TouchableOpacity
          onPress={() => router.replace("/browse")}
          style={{
            marginTop: 20,
            padding: 12,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
          }}
        >
          <Text style={{ textAlign: "center" }}>
            Back to Browse
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}