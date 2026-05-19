import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import * as Location from "expo-location";

import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

export default function NearbyScreen() {
  const router = useRouter();

  const [users, setUsers] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadNearby();
  }, []);

  const distanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (v: number) =>
      (v * Math.PI) / 180;

    const R = 6371;

    const dLat = toRad(lat2 - lat1);

    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  };

  const requestLocation =
    async () => {
      try {
        // WEB
        if (
          Platform.OS === "web"
        ) {
          console.log(
            "Running on web browser"
          );
        }

        // Check existing permission
        const existing =
          await Location.getForegroundPermissionsAsync();

        console.log(
          "Existing permission:",
          existing
        );

        let status =
          existing.status;

        // Request permission
        if (
          status !== "granted"
        ) {
          const request =
            await Location.requestForegroundPermissionsAsync();

          status =
            request.status;

          console.log(
            "Requested permission:",
            request
          );
        }

        // Permission denied
        if (
          status !== "granted"
        ) {
          Alert.alert(
            "Location Disabled",
            Platform.OS ===
              "web"
              ? "Please allow location permission in your browser."
              : "Please enable location permission in phone settings."
          );

          return null;
        }

        // Get current location
        const location =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.Highest,
            }
          );

        return location.coords;
      } catch (e) {
        console.log(
          "Location Error:",
          e
        );

        return null;
      }
    };

  const loadNearby =
    async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setLoading(false);

          return;
        }

        // Get device/browser location
        const coords =
          await requestLocation();

        if (!coords) {
          setLoading(false);

          return;
        }

        const latitude =
          coords.latitude;

        const longitude =
          coords.longitude;

        console.log(
          "My coords:",
          latitude,
          longitude
        );

        // Save location to profile
        await (supabase as any)
          .from("profiles")
          .update({
            latitude,
            longitude,
          })
          .eq("id", user.id);

        // Fetch users
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, latitude, longitude"
          )
          .neq("id", user.id)
          .not(
            "latitude",
            "is",
            null
          )
          .not(
            "longitude",
            "is",
            null
          );

        if (error) {
          console.log(error);

          setLoading(false);

          return;
        }

        // Calculate distances
        const nearby =
          (data || [])
            .map((u: any) => ({
              ...u,

              distance:
                distanceKm(
                  latitude,
                  longitude,
                  Number(
                    u.latitude
                  ),
                  Number(
                    u.longitude
                  )
                ),
            }))
            .sort(
              (a, b) =>
                a.distance -
                b.distance
            );

        setUsers(nearby);
      } catch (e) {
        console.log(
          "Nearby Error:",
          e
        );
      }

      setLoading(false);
    };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,

          justifyContent:
            "center",

          alignItems:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,

        padding: 15,

        backgroundColor:
          "#fff",
      }}
    >
      <FlatList
        data={users}
        keyExtractor={(i) =>
          i.id
        }
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <Text
            style={{
              textAlign:
                "center",

              marginTop: 50,

              color: "gray",

              fontSize: 16,
            }}
          >
            No nearby users
          </Text>
        }
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/profile/${item.id}`
              )
            }
            style={{
              flexDirection:
                "row",

              alignItems:
                "center",

              paddingVertical: 12,

              borderBottomWidth: 1,

              borderColor:
                "#eee",
            }}
          >
            <Image
              source={{
                uri:
                  item.avatar_url ||
                  "https://ui-avatars.com/api/?name=User",
              }}
              style={{
                width: 55,

                height: 55,

                borderRadius: 28,

                marginRight: 12,
              }}
            />

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",

                  fontSize: 16,
                }}
              >
                {item.full_name ||
                  "User"}
              </Text>

              <Text
                style={{
                  color:
                    "gray",

                  marginTop: 3,
                }}
              >
                {item.distance.toFixed(
                  1
                )}{" "}
                km away
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}