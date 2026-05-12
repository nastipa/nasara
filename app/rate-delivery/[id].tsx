import { useState } from "react";

import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import { supabase } from "../../lib/supabase";

export default function RateDelivery() {

  const { id } =
    useLocalSearchParams();

  const router =
    useRouter();

  const deliveryId =
    typeof id === "string"
      ? id
      : "";

  const [rating, setRating] =
    useState(5);

  const [review, setReview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* ================= SUBMIT ================= */

  async function submitRating() {

    try {

      setLoading(true);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) return;

      /* ================= GET DELIVERY ================= */

      const {
        data: delivery,
      } =
        await (supabase as any)
          .from("deliveries")
          .select("*")
          .eq(
            "id",
            deliveryId
          )
          .single();

      if (!delivery) {

        Alert.alert(
          "Delivery not found"
        );

        return;
      }

      /* ================= SAVE RATING ================= */

      await (supabase as any)
        .from(
          "delivery_ratings"
        )
        .insert({

          delivery_id:
            deliveryId,

          rider_id:
            delivery.rider_id,

          user_id:
            user.id,

          rating,

          review,
        });

      /* ================= UPDATE RIDER AVG ================= */

      const {
        data: ratings,
      } =
        await (supabase as any)
          .from(
            "delivery_ratings"
          )
          .select("rating")
          .eq(
            "rider_id",
            delivery.rider_id
          );

      const avg =
        ratings?.reduce(
          (
            acc: number,
            item: any
          ) =>
            acc +
            Number(
              item.rating
            ),
          0
        ) /
        (ratings?.length || 1);

      await (supabase as any)
        .from("riders")
        .update({

          rating:
            Number(
              avg
            ).toFixed(1),
        })
        .eq(
          "user_id",
          delivery.rider_id
        );

      Alert.alert(
        "Success",
        "Rating submitted"
      );

      router.back();

    } catch (err) {

      console.log(err);

    }

    setLoading(false);
  }

  /* ================= UI ================= */

  return (

    <View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor:
          "#fff",
      }}
    >

      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 25,
        }}
      >
        ⭐ Rate Delivery
      </Text>

      {/* STARS */}

      <View
        style={{
          flexDirection: "row",
          marginBottom: 25,
        }}
      >

        {[1,2,3,4,5].map(
          (star) => (

            <TouchableOpacity
              key={star}
              onPress={() =>
                setRating(
                  star
                )
              }
            >

              <Text
                style={{
                  fontSize: 40,

                  marginRight: 8,

                  color:
                    star <=
                    rating
                      ? "#facc15"
                      : "#ddd",
                }}
              >
                ★
              </Text>

            </TouchableOpacity>
          )
        )}

      </View>

      {/* REVIEW */}

      <TextInput
        placeholder="Write review..."
        multiline
        value={review}
        onChangeText={
          setReview
        }
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 15,
          height: 120,
          textAlignVertical:
            "top",
        }}
      />

      {/* SUBMIT */}

      <TouchableOpacity
        disabled={loading}
        onPress={
          submitRating
        }
        style={{
          backgroundColor:
            "#16a34a",

          padding: 16,

          borderRadius: 12,

          marginTop: 25,
        }}
      >

        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Rating"}
        </Text>

      </TouchableOpacity>

    </View>
  );
}