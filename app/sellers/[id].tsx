import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import SafeVideo from "../../components/SafeVideo";
import { supabase } from "../../lib/supabase";

export default function SellersShopScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [seller, setSeller] =
    useState<any>(null);

  const [items, setItems] =
    useState<any[]>([]);

  /* ================= LOAD SELLER PROFILE ================= */
  const loadSeller = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setSeller(data);
  };

  /* ================= LOAD SELLER ITEMS ================= */
  const loadSellerItems =
    async () => {
      const { data } = await supabase
        .from("items_live")
        .select("*")
        .eq("user_id", id)
        .eq("status", "active")
        .order("created_at", {
          ascending: false,
        });

      setItems(data || []);
    };

  useEffect(() => {
    loadSeller();
    loadSellerItems();
  }, []);

  if (!seller) {
    return (
      <View
        style={{
          padding: 20,
        }}
      >
        <Text>
          Loading Seller...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 15,
        backgroundColor:
          "#0f172a",
      }}
    >
      {/* ===== SELLER HEADER ===== */}
      <View
        style={{
          backgroundColor:
            "#fff",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      >
        <Image
          source={{
            uri:
              seller.avatar_url ??
              "https://ui-avatars.com/api/?background=ccc&size=200",
          }}
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            alignSelf:
              "center",
          }}
        />

        <Text
          style={{
            fontSize: 20,
            fontWeight:
              "bold",
            textAlign:
              "center",
            marginTop: 10,
          }}
        >
          {seller.full_name}
        </Text>

        {seller.location && (
          <Text
            style={{
              textAlign:
                "center",
              color: "gray",
            }}
          >
            📍 {seller.location}
          </Text>
        )}
      </View>

      {/* ===== ITEMS ===== */}
      <Text
        style={{
          fontWeight: "700",
          marginBottom: 10,
          color: "white",
        }}
      >
        Seller Items
      </Text>

      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) =>
          String(item.id)
        }
        columnWrapperStyle={{
          justifyContent:
            "space-between",
        }}
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(
                "/itemdetail/" +
                  item.id
              )
            }
            style={
              styles.card
            }
          >
            {/* MEDIA */}
            {item.video_url ? (
              <SafeVideo
                url={
                  item.video_url
                }
              />
            ) : item.image_url ? (
              <Image
                source={{
                  uri:
                    item.image_url,
                }}
                style={
                  styles.squareMedia
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  styles.noMedia
                }
              >
                <Text>
                  No Media
                </Text>
              </View>
            )}

            {/* DETAILS */}
            <View
              style={{
                padding: 8,
              }}
            >
              <Text
                numberOfLines={
                  1
                }
                style={{
                  fontWeight:
                    "bold",
                }}
              >
                {item.title}
              </Text>

              <Text
                style={{
                  fontWeight:
                    "bold",
                  marginTop: 2,
                }}
              >
                GH₵ {item.price}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      width: "48%",
      backgroundColor:
        "#fff",
      marginBottom: 12,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#eee",
    },

    squareMedia: {
      width: "100%",
      aspectRatio: 1,
    },

    noMedia: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor:
        "#eee",
      justifyContent:
        "center",
      alignItems:
        "center",
    },
  });