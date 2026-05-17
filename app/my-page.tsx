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
const isWeb = Platform.OS === "web";

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

  const player = item.video_url
    ? useVideoPlayer(item.video_url, (p) => {
        p.muted = true;
        p.loop = true;
        p.play();
      })
    : null;

  return (
    <TouchableOpacity
      onPress={() =>
        router.push(
          "/itemdetail/" +
            (item.original_id || item.id)
        )
      }
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#eee",
      }}
    >
      {/* MEDIA FIX */}
      {item.video_url ? (
        isWeb ? (
          <video
            src={item.video_url}
            autoPlay
            muted
            loop
            playsInline
            controls
            style={{
              width: 130,
              height: 130,
              alignSelf: "center",
              borderRadius: 10,
              backgroundColor: "black",
              marginTop: 10,
              objectFit: "cover",
            }}
          />
        ) : (
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
        )
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

      {/* IMAGE NUMBER */}
      {item.image_index !== null &&
        item.image_index !== undefined && (
          <Text
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "black",
              color: "white",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            📸 Image {item.image_index + 1}
          </Text>
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
        <Text
          style={{
            fontWeight: "700",
            fontSize: 16,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Text
          style={{
            fontWeight: "bold",
            marginTop: 4,
            fontSize: 15,
          }}
        >
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
                params: {
                  id: String(
                    item.original_id ||
                      item.id
                  ),
                  image:
                    item.image_index ??
                    0,
                },
              })
            }
          />

          <Button
            title="Delete"
            color="red"
            onPress={() =>
              onDelete(item)
            }
          />

          {!item.is_promoted && (
            <Button
              title="Promote"
              color="#f59e0b"
              onPress={() =>
                onPromote(
                  item.original_id ||
                    item.id
                )
              }
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
  const [loading, setLoading] =
    useState(false);

  const router = useRouter();

  /* PROMOTION DAYS */
  const [days, setDays] =
    useState("3");

  /* PAYMENT MODAL */
  const [payVisible, setPayVisible] =
    useState(false);

  const [
    selectedItemId,
    setSelectedItemId,
  ] = useState<number | null>(null);

  /* PAYMENT */
  const momoName =
    "NASARA MARKET";

  const momoNumber =
    "0539703374";

  const momoNetwork = "MTN";

  /* ================= FETCH ITEMS ================= */
  const fetchMyItems =
    async () => {
      setLoading(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } =
        await supabase
          .from("items_live")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error || !data) {
        setItems([]);
        setLoading(false);
        return;
      }

      /* SEPARATE MULTIPLE IMAGES */
      const separated =
        data.flatMap(
          (item: any) => {
            const images =
              item.image_urls &&
              item.image_urls.length >
                0
                ? item.image_urls
                : item.image_url
                ? [item.image_url]
                : [];

            /* VIDEO */
            if (item.video_url) {
              return [
                {
                  ...item,
                  original_id:
                    item.id,
                  image_index:
                    null,
                },
              ];
            }

            /* MULTIPLE IMAGES */
            return images.map(
              (
                img: string,
                index: number
              ) => ({
                ...item,

                card_id:
                  item.id +
                  "-" +
                  index,

                original_id:
                  item.id,

                image_url: img,

                image_index:
                  index,
              })
            );
          }
        );

      setItems(separated);
      setLoading(false);
    };

  useFocusEffect(
    useCallback(() => {
      fetchMyItems();
    }, [])
  );

  /* ================= DELETE ================= */
  const runDelete =
    async (item: any) => {
      try {
        const postId =
          item.original_id ||
          item.id;

        const {
          data: post,
          error,
        } =
          await (
            supabase as any
          )
            .from("items_live")
            .select(
              "id,image_urls,image_url"
            )
            .eq("id", postId)
            .single();

        if (error || !post) {
          showAlert(
            "Error",
            "Post not found"
          );
          return;
        }

        const images =
          Array.isArray(
            post.image_urls
          )
            ? [...post.image_urls]
            : post.image_url
            ? [post.image_url]
            : [];

        /* REMOVE CURRENT IMAGE */
        const updated =
          images.filter(
            (img: string) =>
              img !==
              item.image_url
          );

        /* DELETE FULL POST */
        if (
          updated.length === 0
        ) {
          const {
            error:
              deleteErr,
          } =
            await supabase
              .from(
                "items_live"
              )
              .delete()
              .eq(
                "id",
                postId
              );

          if (deleteErr) {
            showAlert(
              "Error",
              deleteErr.message
            );
            return;
          }
        }

        /* UPDATE REMAINING */
        else {
          const {
            error:
              updateErr,
          } =
            await (
              supabase as any
            )
              .from(
                "items_live"
              )
              .update({
                image_urls:
                  updated,
                image_url:
                  updated[0],
              })
              .eq(
                "id",
                postId
              );

          if (updateErr) {
            showAlert(
              "Error",
              updateErr.message
            );
            return;
          }
        }

        fetchMyItems();
      } catch (e: any) {
        showAlert(
          "Error",
          e.message ||
            "Delete failed"
        );
      }
    };

  const deleteItem = (
    item: any
  ) => {
    if (Platform.OS === "web") {
      if (
        confirm(
          "Delete image?"
        )
      ) {
        runDelete(item);
      }

      return;
    }

    Alert.alert(
      "Delete Image",
      "Are you sure?",
      [
        {
          text: "Cancel",
        },
        {
          text: "Delete",
          style:
            "destructive",
          onPress: () =>
            runDelete(item),
        },
      ]
    );
  };

  /* ================= PROMOTE ================= */
  const promoteItem = (
    id: number
  ) => {
    setSelectedItemId(id);
    setPayVisible(true);
  };

  /* ================= SEND PAYMENT ================= */
  const sendPayment =
    async () => {
      if (!selectedItemId)
        return;

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        showAlert(
          "Login Required",
          "Please login first"
        );

        return;
      }

      const totalAmount =
        Number(days) *
        dailyRate;

      const expiryDate =
        new Date(
          Date.now() +
            Number(days) *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      const code =
        "PROMO-" +
        Date.now();

      await (
        supabase as any
      )
        .from("payments")
        .insert({
          user_id: user.id,
          product_type:
            "promote",
          amount:
            totalAmount,
          code,
          status:
            "pending",
        });

      await (
        supabase as any
      )
        .from("promoted")
        .insert({
          seller_id:
            user.id,
          item_id:
            selectedItemId,
          type: "promote",
          status:
            "pending",
          promoted_until:
            expiryDate,
          payment_code:
            code,
        });

      const {
        error: payError,
      } = await (
        supabase as any
      )
        .from("payments")
        .insert({
          user_id: user.id,
          product_type:
            "promote",
          amount:
            totalAmount,
          momo_name:
            momoName,
          momo_number:
            momoNumber,
          network:
            momoNetwork,
          code,
          status:
            "pending",
        });

      if (payError) {
        showAlert(
          "Error",
          payError.message
        );

        return;
      }

      const {
        error: promoError,
      } = await (
        supabase as any
      )
        .from("promoted")
        .insert({
          seller_id:
            user.id,
          item_id:
            selectedItemId,
          amount:
            totalAmount,
          status:
            "pending",
          promoted_until:
            expiryDate,
          payment_code:
            code,
        });

      if (promoError) {
        showAlert(
          "Error",
          promoError.message
        );

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
        keyExtractor={(i) =>
          String(
            i.card_id || i.id
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={
              loading
            }
            onRefresh={
              fetchMyItems
            }
          />
        }
        ListEmptyComponent={
          <Text
            style={{
              padding: 20,
              textAlign:
                "center",
            }}
          >
            No items posted yet
          </Text>
        }
        renderItem={({
          item,
        }) => (
          <MyItemCard
            item={item}
            onDelete={
              deleteItem
            }
            onPromote={
              promoteItem
            }
          />
        )}
      />

      {/* PAYMENT MODAL */}
      <Modal
        transparent
        visible={payVisible}
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              "#0007",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor:
                "white",
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight:
                  "bold",
              }}
            >
              Promotion Payment
            </Text>

            <Text
              style={{
                marginTop: 10,
              }}
            >
              Pay To:
            </Text>

            <Text
              style={{
                fontWeight:
                  "bold",
              }}
            >
              {momoName} -{" "}
              {momoNumber}
            </Text>

            {/* DAYS */}
            <Text
              style={{
                marginTop: 12,
              }}
            >
              Select Days
            </Text>

            <View
              style={{
                flexDirection:
                  "row",
                marginTop: 8,
              }}
            >
              {[
                "3",
                "7",
                "14",
              ].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() =>
                    setDays(
                      d
                    )
                  }
                  style={{
                    flex: 1,
                    padding: 10,
                    marginHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor:
                      days === d
                        ? "#2563eb"
                        : "#e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      textAlign:
                        "center",
                      color:
                        days ===
                        d
                          ? "white"
                          : "black",
                      fontWeight:
                        "600",
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
                marginTop: 12,
                fontWeight:
                  "bold",
              }}
            >
              Total Amount:
              GH₵{" "}
              {Number(days) *
                dailyRate}
            </Text>

            <TouchableOpacity
              onPress={
                sendPayment
              }
              style={{
                backgroundColor:
                  "#2563eb",
                padding: 14,
                marginTop: 15,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                  textAlign:
                    "center",
                }}
              >
                Generate Payment
                Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setPayVisible(
                  false
                )
              }
            >
              <Text
                style={{
                  textAlign:
                    "center",
                  marginTop: 10,
                  color: "red",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}