import {
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    useRouter,
} from "expo-router";

import { supabase } from "../lib/supabase";

export default function RiderGate() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [approved, setApproved] =
    useState(false);

  /* ================= CHECK RIDER ================= */

  const checkRider =
    async () => {
      try {
        const {
          data: authData,
        } =
          await supabase.auth.getUser();

        const user =
          authData?.user;

        if (!user) {
          setLoading(false);

          return;
        }

        const {
          data,
        } =
          await (supabase as any)
            .from("riders")
            .select("*")
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "approved",
              true
            )
            .single();

        if (data) {
          setApproved(true);

          router.replace(
            "/rider-dashboard"
          );

          return;
        }

        setApproved(false);
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    };

  useEffect(() => {
    checkRider();
  }, []);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
        size="large"
      />
    );
  }

  /* ================= NOT APPROVED ================= */

  return (
    <View
      style={{
        flex: 1,
        justifyContent:
          "center",

        alignItems:
          "center",

        backgroundColor:
          "#0f172a",

        padding: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        🚚 Rider Access
      </Text>

      <Text
        style={{
          color: "#cbd5e1",
          textAlign: "center",
          marginBottom: 30,
          fontSize: 16,
        }}
      >
        You are not yet an approved rider.
      </Text>

      <TouchableOpacity
        onPress={() =>
          router.push(
            "/become-rider"
          )
        }
        style={{
          backgroundColor:
            "#2563eb",

          paddingVertical: 15,

          paddingHorizontal: 25,

          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          Apply Now
        </Text>
      </TouchableOpacity>
    </View>
  );
}