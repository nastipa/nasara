import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* =====================================================
   TYPES
===================================================== */

type SellerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  city: string | null;
  location: string | null;
};

type LiveSession = {
  id: number;
  seller_id: string;
  title: string | null;
  created_at: string | null;
  seller: SellerProfile | null;
};

type LiveItem = {
  id: number;
  live_session_id: number;
  title: string;
  price: number;
  image_url: string | null;
  video_url: string | null;
  is_boosted?: boolean;
};

/* =====================================================
   SAFE ALERT - APP + WEB
===================================================== */

const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* =====================================================
   SELLER DISPLAY HELPERS
===================================================== */

const getSellerName = (seller: SellerProfile | null) => {
  if (!seller) return "Nasara Seller";

  return (
    seller.business_name ||
    seller.full_name ||
    seller.username ||
    "Nasara Seller"
  );
};

const getSellerLocation = (seller: SellerProfile | null) => {
  if (!seller) return "";

  return seller.city || seller.location || "";
};

/* =====================================================
   VIDEO COMPONENT
===================================================== */

function LiveItemVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={{
        height: 200,
        width: "100%",
        marginTop: 8,
        borderRadius: 8,
      }}
      player={player}
      nativeControls
      contentFit="contain"
    />
  );
}

/* =====================================================
   LIVE ITEM CARD
===================================================== */

function LiveItemCard({
  item,
  onBuy,
}: {
  item: LiveItem;
  onBuy: (item: LiveItem) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginVertical: 8,
        borderRadius: 12,
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 16,
          color: "#111827",
        }}
      >
        {item.title}
      </Text>

      {item.is_boosted && (
        <Text
          style={{
            color: "#16865B",
            fontWeight: "bold",
            marginTop: 5,
          }}
        >
          BOOSTED
        </Text>
      )}

      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          marginTop: 8,
          color: "#14213D",
        }}
      >
        GH₵ {Number(item.price).toFixed(2)}
      </Text>
{item.image_url && (
  <Image
    source={{ uri: item.image_url }}
    resizeMode="contain"
    style={{
      width: "100%",
      height: 240,
      marginTop: 8,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
    }}
  />
)}

      {item.video_url && <LiveItemVideo uri={item.video_url} />}

      <TouchableOpacity
        onPress={() => onBuy(item)}
        style={{
          backgroundColor: "#14213D",
          padding: 13,
          marginTop: 12,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          Buy
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =====================================================
   MAIN LIVE SCREEN
===================================================== */

export default function LiveScreen() {
  const router = useRouter();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<LiveSession | null>(null);

  const [items, setItems] = useState<LiveItem[]>([]);

  const [loadingSellers, setLoadingSellers] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  /* =====================================================
     LOAD ONLY SELLERS WHO ARE ACTUALLY LIVE

     - Reads from live_sessions.
     - Requires is_live = true.
     - Shows only the newest active session per seller.
     - Requires a matching seller profile.
     - Does not delete or modify any existing records.
  ===================================================== */

  const loadLiveSellers = async () => {
    try {
      const { data: sessionData, error: sessionError } =
        await (supabase as any)
          .from("live_sessions")
          .select("id,seller_id,title,created_at")
          .eq("is_live", true)
          .order("created_at", { ascending: false });

      if (sessionError) {
        console.log("Live sessions error:", sessionError.message);
        return;
      }

      const allSessions = sessionData || [];

      // Keep only the newest active session per seller.
      const latestBySeller = new Map<string, any>();

      for (const session of allSessions) {
        if (!session.seller_id) continue;

        if (!latestBySeller.has(session.seller_id)) {
          latestBySeller.set(session.seller_id, session);
        }
      }

      const latestSessions = Array.from(latestBySeller.values());

      if (latestSessions.length === 0) {
        setSessions([]);
        setSelectedSession(null);
        setItems([]);
        return;
      }

      // Get profiles only for sellers with active live sessions.
      const sellerIds = [
        ...new Set(
          latestSessions.map((session: any) => session.seller_id)
        ),
      ];

      const { data: profileData, error: profileError } =
        await (supabase as any)
          .from("profiles")
          .select(
            "id,username,full_name,business_name,avatar_url,city,location"
          )
          .in("id", sellerIds);

      if (profileError) {
        console.log("Seller profiles error:", profileError.message);
      }

      const profileMap = new Map<string, SellerProfile>();

      for (const profile of profileData || []) {
        profileMap.set(profile.id, profile);
      }

      // Only display sessions belonging to an existing seller profile.
      const formattedSessions: LiveSession[] = latestSessions
        .filter((session: any) => profileMap.has(session.seller_id))
        .map((session: any) => ({
          id: session.id,
          seller_id: session.seller_id,
          title: session.title,
          created_at: session.created_at,
          seller: profileMap.get(session.seller_id) || null,
        }));

      setSessions(formattedSessions);

      // Keep the selected seller if that seller is still live.
      setSelectedSession((current) => {
        if (current) {
          const stillLive = formattedSessions.find(
            (session) => session.id === current.id
          );

          if (stillLive) return stillLive;
        }

        return formattedSessions[0] || null;
      });

      if (formattedSessions.length === 0) {
        setItems([]);
      }
    } catch (error: any) {
      console.log("Load live sellers error:", error?.message || error);
    } finally {
      setLoadingSellers(false);
    }
  };

  /* =====================================================
     LOAD PRODUCTS FOR SELECTED SELLER
  ===================================================== */

  const loadItems = async (sessionId: number) => {
    setLoadingItems(true);

    try {
      const { data, error } = await (supabase as any)
        .from("live_items")
        .select(
          "id,live_session_id,title,price,image_url,video_url,is_boosted"
        )
        .eq("live_session_id", sessionId)
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Live items error:", error.message);
        return;
      }

      setItems(data || []);
    } catch (error: any) {
      console.log("Load items error:", error?.message || error);
    } finally {
      setLoadingItems(false);
    }
  };

  /* =====================================================
     SELECT A SELLER
  ===================================================== */

  const selectSeller = (session: LiveSession) => {
    setSelectedSession(session);
    setItems([]);
  };

  /* =====================================================
     BUY ITEM - FETCH MOMO FIRST

     Important:
     Interest recording must NOT prevent the buyer
     from seeing the seller's MoMo payment details.

     The MoMo account is fetched directly from
     live_sessions using the item's live_session_id.
  ===================================================== */

  const buyItem = async (item: LiveItem) => {
    try {
      // 1. Check buyer login.
      const auth = await supabase.auth.getUser();

      if (auth.error || !auth.data.user) {
        showAlert("Login required", "Please log in before buying.");
        return;
      }

      const user = auth.data.user;

      // 2. Get the seller's live session directly.
      // This avoids relying on a nested relationship query.
      const { data: liveSession, error: sessionError } =
        await (supabase as any)
          .from("live_sessions")
          .select("id,seller_id,is_live,momo_name,momo_number")
          .eq("id", item.live_session_id)
          .maybeSingle();

      if (sessionError) {
        console.log("Seller MoMo lookup error:", sessionError.message);

        showAlert(
          "Payment details unavailable",
          "We could not retrieve the seller's payment details. Please try again."
        );
        return;
      }

      if (!liveSession) {
        showAlert(
          "Seller not found",
          "This seller's live session could not be found."
        );
        return;
      }

      if (!liveSession.is_live) {
        showAlert(
          "Live session ended",
          "This seller is no longer live. Please refresh the Live dashboard."
        );
        return;
      }

      // 3. Check that the seller has MoMo details.
      if (!liveSession.momo_name || !liveSession.momo_number) {
        showAlert(
          "MoMo account unavailable",
          "This seller has not added a MoMo account to their live session."
        );
        return;
      }

      // 4. Record buyer interest separately.
      // An interest-table error must not block the MoMo popup.
      try {
        const { error: interestError } = await (supabase as any)
          .from("item_interest")
          .insert({
            live_item_id: item.id,
            buyer_id: user.id,
          });

        if (interestError) {
          console.log(
            "Item interest could not be recorded:",
            interestError.message
          );
        }
      } catch (interestException: any) {
        console.log(
          "Interest recording exception:",
          interestException?.message || interestException
        );
      }

      // 5. Copy the seller's MoMo number if possible.
      let copiedMessage = "";

      try {
        await Clipboard.setStringAsync(
          String(liveSession.momo_number)
        );

        copiedMessage = "\n\nMoMo number copied to clipboard.";
      } catch (clipboardError) {
        console.log("Clipboard error:", clipboardError);
      }

      // 6. Always show the payment details once fetched successfully.
      showAlert(
        "Pay via MoMo",
        "Name: " +
          liveSession.momo_name +
          "\nNumber: " +
          liveSession.momo_number +
          "\nAmount: GH₵ " +
          Number(item.price).toFixed(2) +
          copiedMessage
      );
    } catch (error: any) {
      console.log("Buy item error:", error?.message || error);

      showAlert(
        "Error",
        "Something went wrong while retrieving the seller's payment details. Please try again."
      );
    }
  };

  /* =====================================================
     POLL LIVE SELLERS
  ===================================================== */

  useEffect(() => {
    loadLiveSellers();

    const interval = setInterval(() => {
      loadLiveSellers();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  /* =====================================================
     LOAD SELECTED SELLER'S PRODUCTS
  ===================================================== */

  useEffect(() => {
    if (!selectedSession) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const refreshItems = async () => {
      if (cancelled) return;

      await loadItems(selectedSession.id);
    };

    refreshItems();

    const interval = setInterval(refreshItems, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedSession?.id]);

  /* =====================================================
     SELLER CARD
  ===================================================== */

  const renderSeller = (session: LiveSession) => {
    const seller = session.seller;
    const selected = selectedSession?.id === session.id;

    return (
      <TouchableOpacity
        key={session.id.toString()}
        onPress={() => selectSeller(session)}
        style={{
          width: 125,
          padding: 10,
          marginRight: 10,
          borderRadius: 12,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? "#D6A84F" : "#E5E7EB",
          backgroundColor: selected ? "#F8EFD9" : "#FFFFFF",
          alignItems: "center",
        }}
      >
        {seller?.avatar_url ? (
          <Image
            source={{ uri: seller.avatar_url }}
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: "#E5E7EB",
            }}
          />
        ) : (
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: "#14213D",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 23,
                fontWeight: "700",
              }}
            >
              {getSellerName(seller).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text
          numberOfLines={1}
          style={{
            marginTop: 8,
            fontWeight: "700",
            color: "#14213D",
            textAlign: "center",
            width: "100%",
          }}
        >
          {getSellerName(seller)}
        </Text>

        {!!getSellerLocation(seller) && (
          <Text
            numberOfLines={1}
            style={{
              color: "#7C8799",
              fontSize: 11,
              marginTop: 3,
              textAlign: "center",
              width: "100%",
            }}
          >
            {getSellerLocation(seller)}
          </Text>
        )}

        <Text
          style={{
            color: "#16865B",
            fontWeight: "700",
            fontSize: 11,
            marginTop: 6,
          }}
        >
          ● LIVE NOW
        </Text>
      </TouchableOpacity>
    );
  };

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F5F6FA",
        paddingTop: 16,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 25,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 23,
                fontWeight: "800",
                color: "#14213D",
              }}
            >
              🔴 Nasara Live
            </Text>

            <Text
              style={{
                color: "#7C8799",
                marginTop: 4,
              }}
            >
              Shop from sellers who are live now
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#EAF7F0",
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                color: "#16865B",
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {sessions.length} LIVE
            </Text>
          </View>
        </View>

        {/* LIVE SELLERS */}

        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: "#14213D",
            marginBottom: 10,
          }}
        >
          Live Sellers
        </Text>

        {loadingSellers && sessions.length === 0 ? (
          <View style={{ padding: 25, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#14213D" />
            <Text style={{ marginTop: 8, color: "#7C8799" }}>
              Finding live sellers...
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              padding: 20,
              borderRadius: 12,
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#14213D",
              }}
            >
              No seller live
            </Text>

            <Text
              style={{
                color: "#7C8799",
                marginTop: 5,
                textAlign: "center",
              }}
            >
              Sellers will appear here when they start a live session.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {sessions.map(renderSeller)}
          </ScrollView>
        )}

        {/* SELECTED SELLER */}

        {selectedSession && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E5E9F0",
            }}
          >
            <Text
              style={{
                color: "#7C8799",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              SHOPPING FROM
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#14213D",
                marginTop: 4,
              }}
            >
              {getSellerName(selectedSession.seller)}
            </Text>

            {!!selectedSession.title && (
              <Text
                style={{
                  color: "#7C8799",
                  marginTop: 4,
                }}
              >
                {selectedSession.title}
              </Text>
            )}
          </View>
        )}

        {/* LIVE PRODUCTS */}

        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: "#14213D",
            marginBottom: 5,
          }}
        >
          Live Items
        </Text>

        {!selectedSession ? (
          <Text
            style={{
              color: "#7C8799",
              marginTop: 10,
            }}
          >
            No seller is currently live.
          </Text>
        ) : loadingItems && items.length === 0 ? (
          <View style={{ padding: 25, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#14213D" />
            <Text style={{ marginTop: 8, color: "#7C8799" }}>
              Loading seller's items...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              padding: 20,
              borderRadius: 12,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#14213D",
                fontWeight: "700",
              }}
            >
              No products yet
            </Text>

            <Text
              style={{
                color: "#7C8799",
                marginTop: 5,
                textAlign: "center",
              }}
            >
              This seller has not added any items to this live session yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <LiveItemCard item={item} onBuy={buyItem} />
            )}
            scrollEnabled={false}
          />
        )}

        {/* BACK TO HOME */}

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/browse")}
          style={{
            padding: 14,
            backgroundColor: "#E5E7EB",
            marginTop: 18,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "700",
              color: "#14213D",
            }}
          >
            Back to Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}