import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { recordItemView } from "../lib/itemViewTracking";
import { supabase } from "../lib/supabase";

const dailyRate = 30;
const PAGE_SIZE = 1000;

const COLORS = {
  navy: "#101C35",
  gold: "#D6A52C",
  background: "#F4F6FA",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#718096",
  border: "#E5E7EB",
  green: "#16A34A",
  red: "#DC2626",
  blue: "#2563EB",
};

/* =====================================================
   FETCH ALL ROWS IN PAGES

   Prevents Supabase's default row limit from
   silently reducing the listing results.
===================================================== */

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{
    data: T[] | null;
    error: any;
  }>
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error(error.message || "Unable to fetch records.");
    }

    const page = data || [];
    allRows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRows;
}

/* =====================================================
   ALERT
===================================================== */

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* =====================================================
   FORMAT NUMBER
===================================================== */

const formatNumber = (value: number) => {
  return Number(value || 0).toLocaleString();
};

/* =====================================================
   VIDEO PREVIEW
===================================================== */

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });

  if (Platform.OS === "web") {
    return (
      <video
        src={uri}
        autoPlay
        muted
        loop
        playsInline
        controls
        style={{
          width: 180,
          height: 180,
          alignSelf: "center",
          borderRadius: 12,
          backgroundColor: "black",
          marginTop: 12,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <VideoView
      player={player}
      style={{
        width: 180,
        height: 180,
        alignSelf: "center",
        borderRadius: 12,
        backgroundColor: "black",
        marginTop: 12,
      }}
      contentFit="cover"
      nativeControls
    />
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "46%",
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: color + "18",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 19 }}>{icon}</Text>
      </View>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 12,
          marginTop: 12,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 25,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {formatNumber(value)}
      </Text>
    </View>
  );
}

/* =====================================================
   PRODUCT CARD
===================================================== */

function MyItemCard({
  item,
  onDelete,
  onPromote,
}: {
  item: any;
  onDelete: (item: any) => void;
  onPromote: (id: number) => void;
}) {
  const router = useRouter();

  const postId = Number(item.original_id || item.id);

  const promoted =
    item.is_promoted === true ||
    item.is_boosted === true ||
    item.is_featured === true;

  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 15,
        overflow: "hidden",
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/itemdetail/" + postId)}
      >
        {item.video_url ? (
          <VideoPreview uri={item.video_url} />
        ) : item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{
              width: 200,
              height: 200,
              alignSelf: "center",
              borderRadius: 15,
              backgroundColor: "#EEEEEE",
              marginTop: 15,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 200,
              height: 200,
              alignSelf: "center",
              borderRadius: 15,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#EEEEEE",
              marginTop: 15,
            }}
          >
            <Text style={{ color: COLORS.muted }}>
              No Media
            </Text>
          </View>
        )}

        {item.image_index !== null &&
          item.image_index !== undefined && (
            <Text
              style={{
                position: "absolute",
                top: 23,
                right: 15,
                backgroundColor: "#000000CC",
                color: "white",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 7,
                fontSize: 11,
                fontWeight: "bold",
              }}
            >
              Image {item.image_index + 1}
            </Text>
          )}

        {promoted && (
          <Text
            style={{
              position: "absolute",
              top: 23,
              left: 15,
              backgroundColor: COLORS.gold,
              color: "#172033",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 7,
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            ⭐ PROMOTED
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ padding: 15 }}>
        <Text
          numberOfLines={1}
          style={{
            fontWeight: "800",
            fontSize: 16,
            color: COLORS.text,
          }}
        >
          {item.title}
        </Text>

        <Text
          style={{
            fontWeight: "900",
            marginTop: 5,
            fontSize: 17,
            color: COLORS.navy,
          }}
        >
          GH₵ {Number(item.price || 0).toLocaleString()}
        </Text>

        {item.location ? (
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 12,
              marginTop: 5,
            }}
          >
            📍 {item.location}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: COLORS.muted }}>
            👁️ {formatNumber(Number(item.views_count || 0))}
          </Text>

          <Text style={{ fontSize: 12, color: COLORS.muted }}>
            💬 {formatNumber(Number(item.chats_count || 0))}
          </Text>

          <Text style={{ fontSize: 12, color: COLORS.muted }}>
            ❤️ {formatNumber(Number(item.favorites_count || 0))}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 15,
          }}
        >
          <View style={{ flex: 1, minWidth: 75 }}>
            <Button
              title="Edit"
              onPress={() =>
                router.push({
                  pathname: "/itemedit/[id]",
                  params: {
                    id: String(postId),
                    image: String(item.image_index ?? 0),
                  },
                })
              }
            />
          </View>

          <View style={{ flex: 1, minWidth: 75 }}>
            <Button
              title="Delete"
              color="red"
              onPress={() => onDelete(item)}
            />
          </View>

          {!promoted && (
            <View style={{ flex: 1, minWidth: 75 }}>
              <Button
                title="Promote"
                color="#D69E2E"
                onPress={() => onPromote(postId)}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* =====================================================
   MAIN BUSINESS DASHBOARD
===================================================== */

export default function My() {
  const [items, setItems] = useState<any[]>([]);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [days, setDays] = useState("3");
  const [payVisible, setPayVisible] = useState(false);

  const [selectedItemId, setSelectedItemId] =
    useState<number | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);

  /* ===================================================
     NASARA MOMO ACCOUNT

     PRESERVED
  =================================================== */

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  /* ===================================================
     FETCH SELLER PRODUCTS AND ACTUAL METRICS
  =================================================== */

  const fetchMyItems = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setItems([]);
        setListingCount(0);

        showAlert(
          "Login Required",
          "Please log in to view your dashboard."
        );

        return;
      }

      /* -----------------------------------------------
         EXACT LISTING COUNT
      ----------------------------------------------- */

      const {
        count: exactListingCount,
        error: countError,
      } = await supabase
        .from("items_live")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (countError) {
        throw new Error(
          "Unable to count listings: " + countError.message
        );
      }

      /* -----------------------------------------------
         FETCH ALL SELLER LISTINGS
      ----------------------------------------------- */

      const sellerItems = await fetchAllPages<any>(
        async (from, to) => {
          return await supabase
            .from("items_live")
            .select("*")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to);
        }
      );

      setListingCount(exactListingCount || 0);

      if (sellerItems.length === 0) {
        setItems([]);
        return;
      }

      /* -----------------------------------------------
         FETCH ACTUAL ITEMDETAIL COUNTS

         Views:
         Uses the existing record_item_view RPC through
         lib/itemViewTracking.ts.

         Favourites:
         Uses the same exact count query as ItemDetail.

         These are read for each seller product.
      ----------------------------------------------- */

      const enrichedItems = await Promise.all(
        sellerItems.map(async (item) => {
          const itemId = Number(item.id);

          /* GET ACTUAL VIEW COUNT */

          let actualViews = 0;

          try {
            const viewCount = await recordItemView(itemId);

            if (viewCount !== null && Number.isFinite(Number(viewCount))) {
              actualViews = Number(viewCount);
            } else {
              console.warn(
                "VIEW COUNT COULD NOT BE FETCHED:",
                itemId
              );
            }
          } catch (viewError) {
            console.error(
              "ITEM VIEW COUNT ERROR:",
              itemId,
              viewError
            );
          }

         /* GET ACTUAL FAVOURITE COUNT */

let actualFavourites = 0;

const {
  data: favouriteCount,
  error: favouriteError,
} = await (supabase as any).rpc("get_item_favorite_count", {
  p_item_id: Number(item.id),
});

if (favouriteError) {
  console.error(
    "FAVOURITE COUNT ERROR:",
    item.id,
    favouriteError.message
  );
} else {
  actualFavourites = Number(favouriteCount || 0);
}

return {
  ...item,
  views_count: actualViews,
  favorites_count: actualFavourites,
  chats_count: Number(item.chats_count || 0),
};
})
);

setItems(enrichedItems);
} catch (error: any) {
  console.error("BUSINESS DASHBOARD ERROR:", error);

  showAlert(
    "Loading Error",
    error?.message || "Unable to load your business dashboard."
  );
} finally {
  setLoading(false);
}
}, []);

useFocusEffect(
  useCallback(() => {
    fetchMyItems();
  }, [fetchMyItems])
);
  /* ===================================================
     DASHBOARD STATISTICS
  =================================================== */

  const stats = useMemo(() => {
    const totalViews = items.reduce(
      (sum, item) => sum + Number(item.views_count || 0),
      0
    );

    const totalEnquiries = items.reduce(
      (sum, item) => sum + Number(item.chats_count || 0),
      0
    );

    const totalFavourites = items.reduce(
      (sum, item) => sum + Number(item.favorites_count || 0),
      0
    );

    return {
      views: totalViews,
      enquiries: totalEnquiries,
      listings: listingCount,
      favourites: totalFavourites,
    };
  }, [items, listingCount]);

  /* ===================================================
     SEPARATE PRODUCT IMAGES FOR DISPLAY
  =================================================== */

  const displayItems = useMemo(() => {
    return items.flatMap((item: any) => {
      const images =
        Array.isArray(item.image_urls) &&
        item.image_urls.length > 0
          ? item.image_urls
          : item.image_url
          ? [item.image_url]
          : [];

      if (item.video_url) {
        return [
          {
            ...item,
            original_id: item.id,
            image_index: null,
            card_id: String(item.id) + "-video",
          },
        ];
      }

      if (images.length === 0) {
        return [
          {
            ...item,
            original_id: item.id,
            image_url: null,
            image_index: null,
            card_id: String(item.id) + "-empty",
          },
        ];
      }

      return images.map((img: string, index: number) => ({
        ...item,
        original_id: item.id,
        image_url: img,
        image_index: index,
        card_id: String(item.id) + "-" + index,
      }));
    });
  }, [items]);

  /* ===================================================
     DELETE IMAGE OR COMPLETE LISTING
  =================================================== */

  const runDelete = async (item: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Login Required", "Please login first.");
        return;
      }

      const postId = Number(item.original_id || item.id);

      const { data: post, error } = await (supabase as any)
        .from("items_live")
        .select("id,user_id,image_urls,image_url,video_url")
        .eq("id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !post) {
        showAlert(
          "Error",
          "Product not found or you do not have permission to edit it."
        );
        return;
      }

      const images = Array.isArray(post.image_urls)
        ? [...post.image_urls]
        : post.image_url
        ? [post.image_url]
        : [];

      /* VIDEO OR PRODUCT WITH NO IMAGES:
         DELETE THE COMPLETE LISTING. */

      if (post.video_url || images.length === 0) {
        const { error: deleteError } = await supabase
          .from("items_live")
          .delete()
          .eq("id", postId)
          .eq("user_id", user.id);

        if (deleteError) {
          showAlert("Delete Error", deleteError.message);
          return;
        }

        await fetchMyItems();
        return;
      }

      /* REMOVE ONLY THE SELECTED IMAGE */

      const updated = images.filter(
        (img: string, index: number) => {
          if (
            item.image_index !== null &&
            item.image_index !== undefined
          ) {
            return index !== Number(item.image_index);
          }

          return img !== item.image_url;
        }
      );

      /* IF NO IMAGES REMAIN, DELETE LISTING */

      if (updated.length === 0) {
        const { error: deleteError } = await supabase
          .from("items_live")
          .delete()
          .eq("id", postId)
          .eq("user_id", user.id);

        if (deleteError) {
          showAlert("Delete Error", deleteError.message);
          return;
        }
      } else {
        const { error: updateError } = await (supabase as any)
          .from("items_live")
          .update({
            image_urls: updated,
            image_url: updated[0],
          })
          .eq("id", postId)
          .eq("user_id", user.id);

        if (updateError) {
          showAlert("Update Error", updateError.message);
          return;
        }
      }

      await fetchMyItems();
    } catch (error: any) {
      showAlert(
        "Error",
        error?.message || "Delete failed."
      );
    }
  };

  const deleteItem = (item: any) => {
    const isLastImage =
      !item.video_url &&
      item.image_index === 0 &&
      (!Array.isArray(item.image_urls) ||
        item.image_urls.length <= 1);

    const message = isLastImage
      ? "This is the last image. Deleting it will remove the complete listing. Continue?"
      : item.video_url
      ? "Are you sure you want to delete this complete listing?"
      : "Are you sure you want to remove this image?";

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        runDelete(item);
      }
      return;
    }

    Alert.alert(
      "Confirm Delete",
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => runDelete(item),
        },
      ]
    );
  };

  /* ===================================================
     PROMOTION
  =================================================== */

  const promoteItem = (id: number) => {
    setSelectedItemId(id);
    setDays("3");
    setPayVisible(true);
  };

  /* ===================================================
     SEND PROMOTION PAYMENT REQUEST

     Existing Nasara MoMo instructions preserved.
     Creates ONE payment and ONE promotion record.
  =================================================== */

  const sendPayment = async () => {
    if (!selectedItemId || paymentLoading) {
      return;
    }

    setPaymentLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showAlert(
          "Login Required",
          "Please login first."
        );
        return;
      }

      /* VERIFY PRODUCT OWNERSHIP */

      const { data: product, error: productError } =
        await supabase
          .from("items_live")
          .select("id")
          .eq("id", selectedItemId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (productError || !product) {
        showAlert(
          "Error",
          "This product does not belong to your account."
        );
        return;
      }

      const selectedDays = Number(days);

      if (![3, 7, 14].includes(selectedDays)) {
        showAlert(
          "Invalid Selection",
          "Please select 3, 7 or 14 days."
        );
        return;
      }

      const totalAmount = selectedDays * dailyRate;

      const expiryDate = new Date(
        Date.now() +
          selectedDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const code = "PROMO-" + Date.now();

      /* CREATE ONE PAYMENT RECORD */

      const { error: payError } = await (
        supabase as any
      )
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
        showAlert("Payment Error", payError.message);
        return;
      }

      /* CREATE ONE PROMOTION RECORD */

      const { error: promoError } = await (
        supabase as any
      )
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
        /* CLEAN UP PAYMENT IF PROMOTION INSERT FAILS */

        await (supabase as any)
          .from("payments")
          .delete()
          .eq("user_id", user.id)
          .eq("code", code);

        showAlert("Promotion Error", promoError.message);
        return;
      }

      showAlert(
        "Request Sent ✅",
        `Promotion Request Submitted!\n\nPay GH₵${totalAmount} to:\n${momoName}\n${momoNumber} (${momoNetwork})\n\nCode: ${code}`
      );

      setPayVisible(false);
      setSelectedItemId(null);

      await fetchMyItems();
    } catch (error: any) {
      showAlert(
        "Payment Error",
        error?.message || "Unable to submit promotion request."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ===================================================
     DASHBOARD HEADER
  =================================================== */

  const DashboardHeader = () => (
    <View style={{ paddingHorizontal: 15, paddingTop: 15 }}>
      <View
        style={{
          backgroundColor: COLORS.navy,
          borderRadius: 18,
          padding: 20,
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            color: COLORS.gold,
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 1.5,
          }}
        >
          NASARA SELLER CENTRE
        </Text>

        <Text
          style={{
            color: COLORS.white,
            fontSize: 25,
            fontWeight: "900",
            marginTop: 8,
          }}
        >
          Business Dashboard
        </Text>

        <Text
          style={{
            color: "#D7DFED",
            fontSize: 13,
            marginTop: 7,
            lineHeight: 20,
          }}
        >
          Manage your products, monitor performance and promote your business on Nasara.
        </Text>

        <View
          style={{
            height: 3,
            width: 55,
            backgroundColor: COLORS.gold,
            marginTop: 15,
            borderRadius: 5,
          }}
        />
      </View>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 18,
          fontWeight: "900",
          marginBottom: 12,
        }}
      >
        Business Overview
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <StatCard
          title="Product Views"
          value={stats.views}
          icon="👁️"
          color="#2563EB"
        />

        <StatCard
          title="Enquiries"
          value={stats.enquiries}
          icon="💬"
          color="#16A34A"
        />

        <StatCard
          title="My Listings"
          value={stats.listings}
          icon="📦"
          color="#D69E2E"
        />

        <StatCard
          title="Favourites"
          value={stats.favourites}
          icon="❤️"
          color="#DB2777"
        />
      </View>

      <View
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 15,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "900",
            fontSize: 16,
            color: COLORS.navy,
          }}
        >
          Your Business Activity
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
            marginTop: 5,
            marginBottom: 13,
          }}
        >
          Performance totals across your listings.
        </Text>

        {[
          {
            label: "Total Product Views",
            value: stats.views,
            icon: "👁️",
          },
          {
            label: "Total Enquiries",
            value: stats.enquiries,
            icon: "💬",
          },
          {
            label: "Total Favourites",
            value: stats.favourites,
            icon: "❤️",
          },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 9,
              borderTopWidth: 1,
              borderTopColor: "#F1F3F5",
            }}
          >
            <Text style={{ fontSize: 17 }}>{stat.icon}</Text>

            <Text
              style={{
                flex: 1,
                marginLeft: 10,
                color: COLORS.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {stat.label}
            </Text>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              {formatNumber(stat.value)}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: COLORS.navy,
            fontSize: 19,
            fontWeight: "900",
          }}
        >
          My Products
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
          }}
        >
          {formatNumber(listingCount)} listings
        </Text>
      </View>
    </View>
  );

  /* ===================================================
     EMPTY STATE
  =================================================== */

  const EmptyProducts = () => (
    <View
      style={{
        alignItems: "center",
        padding: 35,
        backgroundColor: COLORS.white,
        marginHorizontal: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Text style={{ fontSize: 42 }}>🛍️</Text>

      <Text
        style={{
          color: COLORS.navy,
          fontSize: 17,
          fontWeight: "900",
          marginTop: 12,
        }}
      >
        No Products Yet
      </Text>

      <Text
        style={{
          color: COLORS.muted,
          fontSize: 13,
          textAlign: "center",
          marginTop: 7,
          lineHeight: 20,
        }}
      >
        Products you post on Nasara will appear here. You can edit, manage and promote them from your Business Dashboard.
      </Text>
    </View>
  );

  /* ===================================================
     MAIN UI
  =================================================== */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
      }}
    >
      <FlatList
        data={displayItems}
        keyExtractor={(item) => String(item.card_id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 15 }}>
            <MyItemCard
              item={item}
              onDelete={deleteItem}
              onPromote={promoteItem}
            />
          </View>
        )}
        ListHeaderComponent={<DashboardHeader />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.gold}
              style={{ marginTop: 30 }}
            />
          ) : (
            <EmptyProducts />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchMyItems}
            tintColor={COLORS.gold}
          />
        }
        contentContainerStyle={{
          paddingBottom: 35,
          flexGrow: 1,
        }}
      />

      {/* =================================================
          NASARA MOMO PROMOTION PAYMENT MODAL
          PRESERVED
      ================================================= */}

      <Modal
        transparent
        visible={payVisible}
        animationType="fade"
        onRequestClose={() => setPayVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "white",
                padding: 20,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: "900",
                  color: COLORS.navy,
                }}
              >
                Promotion Payment
              </Text>

              <Text style={{ marginTop: 12 }}>
                Pay To:
              </Text>

              <Text
                style={{
                  fontWeight: "900",
                  fontSize: 16,
                  marginTop: 5,
                  color: COLORS.navy,
                }}
              >
                {momoName} - {momoNumber}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {momoNetwork} Mobile Money
              </Text>

              {/* DAYS */}

              <Text
                style={{
                  marginTop: 18,
                  fontWeight: "700",
                }}
              >
                Select Days
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                }}
              >
                {["3", "7", "14"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDays(d)}
                    style={{
                      flex: 1,
                      padding: 12,
                      marginHorizontal: 4,
                      borderRadius: 8,
                      backgroundColor:
                        days === d
                          ? COLORS.blue
                          : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color:
                          days === d ? "white" : "black",
                        fontWeight: "700",
                      }}
                    >
                      {d} Days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* TOTAL */}

              <Text
                style={{
                  marginTop: 17,
                  fontWeight: "900",
                  fontSize: 16,
                  color: COLORS.navy,
                }}
              >
                Total Amount: GH₵{" "}
                {Number(days) * dailyRate}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginTop: 5,
                }}
              >
                GH₵30 per day
              </Text>

              {/* PAYMENT BUTTON */}

              <TouchableOpacity
                disabled={paymentLoading}
                onPress={sendPayment}
                style={{
                  backgroundColor: COLORS.blue,
                  padding: 15,
                  marginTop: 20,
                  borderRadius: 9,
                  opacity: paymentLoading ? 0.6 : 1,
                }}
              >
                {paymentLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "900",
                    }}
                  >
                    Generate Payment Code
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={paymentLoading}
                onPress={() => {
                  setPayVisible(false);
                  setSelectedItemId(null);
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 15,
                    color: "red",
                    fontWeight: "700",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}