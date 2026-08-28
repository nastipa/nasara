import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

/* =====================================================
   MESSAGE
===================================================== */

const showMessage = (
  title: string,
  message?: string
) => {
  if (Platform.OS === "web") {
    window.alert(
      message
        ? `${title}\n\n${message}`
        : title
    );
  } else {
    Alert.alert(
      title,
      message
    );
  }
};

/* =====================================================
   TYPES
===================================================== */

type RequestType =
  | "delivery"
  | "rider";

/* =====================================================
   MAIN
===================================================== */

export default function RequestDelivery() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  /* =====================================================
     REQUEST TYPE
  ===================================================== */

  const [requestType, setRequestType] =
    useState<RequestType>("delivery");

  const [showRequestDropdown, setShowRequestDropdown] =
    useState(false);

  /* =====================================================
     DELIVERY INFORMATION
  ===================================================== */

  const [itemName, setItemName] =
    useState("");

  const [receiverPhone, setReceiverPhone] =
    useState("");

  /* =====================================================
     PICKUP PERSON PHONE
  ===================================================== */

  const [pickupPhone, setPickupPhone] =
    useState("");

  /* =====================================================
     PICKUP
  ===================================================== */

  const [pickupAddress, setPickupAddress] =
    useState("");

  const [pickupLat, setPickupLat] =
    useState<number | null>(null);

  const [pickupLng, setPickupLng] =
    useState<number | null>(null);

  const [pickupAccuracy, setPickupAccuracy] =
    useState<number | null>(null);

  /* =====================================================
     DESTINATION
  ===================================================== */

  const [dropoffAddress, setDropoffAddress] =
    useState("");

  const [dropoffLatText, setDropoffLatText] =
    useState("");

  const [dropoffLngText, setDropoffLngText] =
    useState("");

  const [dropoffLat, setDropoffLat] =
    useState<number | null>(null);

  const [dropoffLng, setDropoffLng] =
    useState<number | null>(null);

  /* =====================================================
     DISTANCE
  ===================================================== */

  const [distanceKm, setDistanceKm] =
    useState<number | null>(null);

  /* =====================================================
     OTP
  ===================================================== */

  const [generatedOtp, setGeneratedOtp] =
    useState<string | null>(null);

  /* =====================================================
     PRICING
  ===================================================== */

  const BASE_FARE = 10;
  const PRICE_PER_KM = 5;

  /* =====================================================
     HAVERSINE DISTANCE
  ===================================================== */

  function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) {
    const R = 6371;

    const dLat =
      ((lat2 - lat1) * Math.PI) /
      180;

    const dLng =
      ((lng2 - lng1) * Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) / 180
      ) *
        Math.cos(
          (lat2 * Math.PI) / 180
        ) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  /* =====================================================
     CALCULATE CURRENT DISTANCE
  ===================================================== */

  function calculateCurrentDistance(
    newPickupLat: number | null,
    newPickupLng: number | null,
    newDropoffLat: number | null,
    newDropoffLng: number | null
  ) {
    if (
      newPickupLat === null ||
      newPickupLng === null ||
      newDropoffLat === null ||
      newDropoffLng === null
    ) {
      setDistanceKm(null);
      return;
    }

    const distance =
      calculateDistance(
        newPickupLat,
        newPickupLng,
        newDropoffLat,
        newDropoffLng
      );

    setDistanceKm(distance);
  }

  /* =====================================================
     OPEN GOOGLE MAPS
     
     Opens Google Maps EXTERNALLY.
     
     The user searches the destination in Google Maps,
     copies the latitude and longitude, then enters
     them into the fields below.
  ===================================================== */

  async function openGoogleMaps() {
    try {
      const googleMapsUrl =
        "https://www.google.com/maps";

      const supported =
        await Linking.canOpenURL(
          googleMapsUrl
        );

      if (supported) {
        await Linking.openURL(
          googleMapsUrl
        );
      } else {
        showMessage(
          "Google Maps",
          "Unable to open Google Maps."
        );
      }
    } catch (error) {
      console.log(
        "Google Maps error:",
        error
      );

      showMessage(
        "Google Maps",
        "Unable to open Google Maps."
      );
    }
  }

  /* =====================================================
     PICKUP LOCATION
  ===================================================== */

  async function getPickupLocation() {
    try {
      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showMessage(
          "Location Permission",
          "Please allow location access so we can capture your pickup location."
        );

        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Highest,
        });

      const lat =
        location.coords.latitude;

      const lng =
        location.coords.longitude;

      setPickupLat(lat);
      setPickupLng(lng);

      setPickupAccuracy(
        location.coords.accuracy ?? null
      );

      /* =================================================
         REVERSE GEOCODE PICKUP
      ================================================= */

      try {
        const reverse =
          await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

        const place =
          reverse[0];

        const readable =
          [
            place?.name,
            place?.street,
            place?.district,
            place?.city,
            place?.region,
          ]
            .filter(Boolean)
            .join(", ");

        if (readable) {
          setPickupAddress(
            readable
          );
        }
      } catch (error) {
        console.log(
          "Pickup reverse geocode error:",
          error
        );
      }

      calculateCurrentDistance(
        lat,
        lng,
        dropoffLat,
        dropoffLng
      );

      showMessage(
        "Pickup Captured",
        "Your current pickup location has been captured."
      );
    } catch (error) {
      console.log(
        "Pickup location error:",
        error
      );

      showMessage(
        "Location Error",
        "Unable to capture your current location."
      );
    }
  }

  /* =====================================================
     SET DESTINATION COORDINATES
  ===================================================== */

  function applyDestinationCoordinates() {
    const latitude =
      Number(
        dropoffLatText.trim()
      );

    const longitude =
      Number(
        dropoffLngText.trim()
      );

    /* =================================================
       VALIDATE LATITUDE
    ================================================= */

    if (
      !dropoffLatText.trim() ||
      Number.isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      showMessage(
        "Invalid Latitude",
        "Please enter a valid latitude between -90 and 90."
      );

      return;
    }

    /* =================================================
       VALIDATE LONGITUDE
    ================================================= */

    if (
      !dropoffLngText.trim() ||
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      showMessage(
        "Invalid Longitude",
        "Please enter a valid longitude between -180 and 180."
      );

      return;
    }

    setDropoffLat(latitude);
    setDropoffLng(longitude);

    calculateCurrentDistance(
      pickupLat,
      pickupLng,
      latitude,
      longitude
    );

    showMessage(
      "Destination Added",
      `Latitude: ${latitude.toFixed(
        6
      )}\nLongitude: ${longitude.toFixed(
        6
      )}\n\nDistance will be calculated from your pickup location.`
    );
  }

  /* =====================================================
     DESTINATION LATITUDE CHANGE
  ===================================================== */

  function handleLatitudeChange(
    value: string
  ) {
    setDropoffLatText(
      value
    );

    const latitude =
      Number(
        value.trim()
      );

    if (
      value.trim() &&
      !Number.isNaN(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      dropoffLng !== null
    ) {
      setDropoffLat(
        latitude
      );

      calculateCurrentDistance(
        pickupLat,
        pickupLng,
        latitude,
        dropoffLng
      );
    }
  }

  /* =====================================================
     DESTINATION LONGITUDE CHANGE
  ===================================================== */

  function handleLongitudeChange(
    value: string
  ) {
    setDropoffLngText(
      value
    );

    const longitude =
      Number(
        value.trim()
      );

    if (
      value.trim() &&
      !Number.isNaN(longitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      dropoffLat !== null
    ) {
      setDropoffLng(
        longitude
      );

      calculateCurrentDistance(
        pickupLat,
        pickupLng,
        dropoffLat,
        longitude
      );
    }
  }

  /* =====================================================
     PRICE
  ===================================================== */

  function getPrice() {
    if (
      distanceKm === null
    ) {
      return 0;
    }

    return (
      BASE_FARE +
      distanceKm *
        PRICE_PER_KM
    );
  }

  /* =====================================================
     CREATE REQUEST
  ===================================================== */

  async function createRequest() {
    /* =================================================
       PICKUP LOCATION
    ================================================= */

    if (
      pickupLat === null ||
      pickupLng === null
    ) {
      showMessage(
        "Pickup Required",
        "Please capture your current pickup location."
      );

      return;
    }

    /* =================================================
       PICKUP PHONE
    ================================================= */

    if (
      !pickupPhone.trim()
    ) {
      showMessage(
        "Pickup Phone Required",
        "Please enter the phone number of the person requesting the ride or delivery."
      );

      return;
    }

    /* =================================================
       DESTINATION ADDRESS
    ================================================= */

    if (
      !dropoffAddress.trim()
    ) {
      showMessage(
        "Destination Address Required",
        "Please enter the destination address."
      );

      return;
    }

    /* =================================================
       DESTINATION COORDINATES
    ================================================= */

    if (
      dropoffLat === null ||
      dropoffLng === null
    ) {
      showMessage(
        "Destination Coordinates Required",
        "Open Google Maps, search for the destination, copy the coordinates and enter the latitude and longitude in the app."
      );

      return;
    }

    /* =================================================
       DELIVERY VALIDATION
    ================================================= */

    if (
      requestType ===
      "delivery"
    ) {
      if (
        !itemName.trim()
      ) {
        showMessage(
          "Missing Item",
          "Please enter the item or package name."
        );

        return;
      }

      if (
        !receiverPhone.trim()
      ) {
        showMessage(
          "Missing Receiver Phone",
          "Please enter the receiver's phone number."
        );

        return;
      }
    }

    /* =================================================
       DISTANCE
    ================================================= */

    if (
      distanceKm === null
    ) {
      showMessage(
        "Distance Error",
        "Unable to calculate the distance. Please check the pickup and destination coordinates."
      );

      return;
    }

    try {
      setLoading(true);

      /* =================================================
         USER
      ================================================= */

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {
        showMessage(
          "Login Required",
          "Please login first."
        );

        return;
      }

      /* =================================================
         GENERATE OTP
         
         IMPORTANT:
         
         This OTP belongs to the CUSTOMER / PERSON
         REQUESTING THE RIDE OR DELIVERY.
         
         The requester gives this OTP to the rider
         when the rider arrives / completes the service.
      ================================================= */

      const otp =
        Math.floor(
          1000 +
            Math.random() *
              9000
        ).toString();

      setGeneratedOtp(
        otp
      );

      /* =================================================
         PRICE
      ================================================= */

      const amount =
        getPrice();

      /* =================================================
         ITEM
      ================================================= */

      const finalItemName =
        requestType ===
        "delivery"
          ? itemName.trim()
          : "Rider Request";

      /* =================================================
         INSERT DELIVERY
      ================================================= */

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .insert({
            sender_id:
              user.id,

            customer_id:
              user.id,

            rider_id:
              null,

            item_name:
              finalItemName,

            pickup_address:
              pickupAddress ||
              "Current Location",

            dropoff_address:
              dropoffAddress.trim(),

            receiver_phone:
              requestType ===
              "delivery"
                ? receiverPhone.trim()
                : null,

            /*
             * Phone number of the person
             * requesting the ride/delivery.
             */
            pickup_phone:
              pickupPhone.trim(),

            pickup_lat:
              pickupLat,

            pickup_lng:
              pickupLng,

            dropoff_lat:
              dropoffLat,

            dropoff_lng:
              dropoffLng,

            amount:
              Number(
                amount.toFixed(2)
              ),

            /*
             * IMPORTANT:
             *
             * Store the OTP in the delivery.
             *
             * This OTP belongs to the requester.
             */
            otp_code:
              otp,

            payment_status:
              "pending",

            /*
             * Keep request hidden from
             * riders until admin approves
             * the payment.
             */
            status:
              "pending_payment",

            auto_assigned:
              false,
          });

      if (error) {
        console.log(
          "Delivery insert error:",
          error
        );

        setGeneratedOtp(
          null
        );

        showMessage(
          "Request Error",
          error.message
        );

        return;
      }

      /* =================================================
         SUCCESS MESSAGE
         
         IMPORTANT:
         
         DO NOT router.back() immediately.
         
         The OTP must remain visible to the
         requester.
      ================================================= */

      const typeText =
        requestType ===
        "delivery"
          ? "Delivery"
          : "Rider";

      const message =
        `${typeText} request created successfully.\n\n` +

        `📍 PICKUP\n` +
        `${pickupAddress || "Current Location"}\n` +
        `Phone: ${pickupPhone.trim()}\n\n` +

        `🏁 DESTINATION\n` +
        `${dropoffAddress.trim()}\n\n` +

        `📍 DESTINATION COORDINATES\n` +
        `Latitude: ${dropoffLat.toFixed(6)}\n` +
        `Longitude: ${dropoffLng.toFixed(6)}\n\n` +

        `📏 DISTANCE\n` +
        `${distanceKm.toFixed(2)} km\n\n` +

        `💰 AMOUNT\n` +
        `GH₵${amount.toFixed(2)}\n\n` +

        `💳 PAYMENT\n` +
        `Tipagya Nasara Enterprise\n` +
        `MTN MoMo: 0539703374\n\n` +

        `Please make payment.\n\n` +

        `After payment, an admin will verify the payment. ` +
        `Only after approval will the request become available to riders.\n\n` +

        `🔐 YOUR DRIVER OTP\n` +
        `${otp}\n\n` +

        `IMPORTANT: This OTP belongs to you, the person requesting the ride/delivery. ` +
        `Keep it safe and provide it to the rider/driver when required to confirm the completed service.`;

      showMessage(
        `${typeText} Requested`,
        message
      );

      /* =================================================
         RESET FORM
         
         We intentionally DO NOT navigate back.
         
         This ensures the requester can still see
         the OTP and request information after pressing
         Request Delivery / Request Rider.
      ================================================= */

      setItemName("");
      setReceiverPhone("");
      setPickupPhone("");

      setPickupAddress("");
      setPickupLat(null);
      setPickupLng(null);
      setPickupAccuracy(null);

      setDropoffAddress("");
      setDropoffLatText("");
      setDropoffLngText("");

      setDropoffLat(null);
      setDropoffLng(null);

      setDistanceKm(null);

      /*
       * Do NOT clear generatedOtp here.
       *
       * It remains available in the screen.
       */
    } catch (error: any) {
      console.log(
        "Create request error:",
        error
      );

      showMessage(
        "Error",
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     PRICE
  ===================================================== */

  const price =
    getPrice();

  /* =====================================================
     UI
  ===================================================== */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "#f5f5f5",
      }}
    >
      <ScrollView
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 50,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <Text
          style={{
            fontSize: 30,
            fontWeight: "900",
            color: "#111827",
          }}
        >
          🚚 Nasara Transport
        </Text>

        <Text
          style={{
            color: "#6b7280",
            marginTop: 6,
            marginBottom: 25,
          }}
        >
          Request a delivery or a rider.
        </Text>

        {/* =================================================
            REQUEST TYPE
        ================================================= */}

        <Text
          style={{
            fontWeight: "900",
            fontSize: 16,
            marginBottom: 8,
          }}
        >
          Request Type
        </Text>

        <TouchableOpacity
          onPress={() =>
            setShowRequestDropdown(
              !showRequestDropdown
            )
          }
          style={{
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor:
              "#d1d5db",
            borderRadius: 14,
            padding: 17,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            {requestType ===
            "delivery"
              ? "🚚 Request Delivery"
              : "🏍️ Request Rider"}
          </Text>

          <Text
            style={{
              position:
                "absolute",
              right: 17,
              top: 17,
            }}
          >
            {showRequestDropdown
              ? "▲"
              : "▼"}
          </Text>
        </TouchableOpacity>

        {showRequestDropdown && (
          <View
            style={{
              backgroundColor:
                "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor:
                "#e5e7eb",
              marginBottom: 20,
              overflow:
                "hidden",
            }}
          >
            {/* DELIVERY */}

            <TouchableOpacity
              onPress={() => {
                setRequestType(
                  "delivery"
                );

                setShowRequestDropdown(
                  false
                );
              }}
              style={{
                padding: 17,
                borderBottomWidth: 1,
                borderBottomColor:
                  "#eee",
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "900",
                  fontSize: 16,
                }}
              >
                🚚 Request Delivery
              </Text>

              <Text
                style={{
                  color:
                    "#6b7280",
                  marginTop: 5,
                }}
              >
                Send an item to another
                location.
              </Text>
            </TouchableOpacity>

            {/* RIDER */}

            <TouchableOpacity
              onPress={() => {
                setRequestType(
                  "rider"
                );

                setShowRequestDropdown(
                  false
                );
              }}
              style={{
                padding: 17,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "900",
                  fontSize: 16,
                }}
              >
                🏍️ Request Rider
              </Text>

              <Text
                style={{
                  color:
                    "#6b7280",
                  marginTop: 5,
                }}
              >
                Request a rider to take
                you to your destination.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =================================================
            DELIVERY DETAILS
        ================================================= */}

        {requestType ===
          "delivery" && (
          <>
            <Text
              style={{
                fontWeight:
                  "800",
                marginBottom:
                  7,
              }}
            >
              📦 Item / Package
            </Text>

            <TextInput
              value={itemName}
              onChangeText={
                setItemName
              }
              placeholder="What are you sending?"
              style={{
                backgroundColor:
                  "#fff",
                borderWidth: 1,
                borderColor:
                  "#d1d5db",
                borderRadius: 14,
                padding: 15,
                marginBottom: 20,
              }}
            />

            <Text
              style={{
                fontWeight:
                  "800",
                marginBottom:
                  7,
              }}
            >
              📞 Receiver Phone
            </Text>

            <TextInput
              value={
                receiverPhone
              }
              onChangeText={
                setReceiverPhone
              }
              keyboardType="phone-pad"
              placeholder="Receiver phone number"
              style={{
                backgroundColor:
                  "#fff",
                borderWidth: 1,
                borderColor:
                  "#d1d5db",
                borderRadius: 14,
                padding: 15,
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* =================================================
            PICKUP PHONE
        ================================================= */}

        <Text
          style={{
            fontWeight:
              "900",
            fontSize:
              17,
            marginBottom:
              8,
          }}
        >
          📞 Pickup / Requester Phone
        </Text>

        <Text
          style={{
            color:
              "#6b7280",
            marginBottom:
              8,
          }}
        >
          Enter the phone number of the person
          requesting the ride or delivery.
        </Text>

        <TextInput
          value={
            pickupPhone
          }
          onChangeText={
            setPickupPhone
          }
          keyboardType="phone-pad"
          placeholder="Your phone number"
          style={{
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor:
              "#d1d5db",
            borderRadius: 14,
            padding: 15,
            marginBottom: 22,
          }}
        />

        {/* =================================================
            PICKUP
        ================================================= */}

        <Text
          style={{
            fontWeight: "900",
            fontSize: 17,
            marginBottom: 8,
          }}
        >
          📍 Pickup Location
        </Text>

        <View
          style={{
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor:
              "#d1d5db",
            borderRadius: 14,
            padding: 15,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontWeight:
                "800",
            }}
          >
            {pickupAddress ||
              "Your current location"}
          </Text>

          {pickupLat !==
            null &&
            pickupLng !==
              null && (
              <>
                <Text
                  style={{
                    marginTop:
                      8,
                    color:
                      "#166534",
                  }}
                >
                  ✓ Coordinates captured
                </Text>

                <Text
                  style={{
                    fontSize:
                      12,
                    marginTop:
                      4,
                  }}
                >
                  {pickupLat.toFixed(
                    6
                  )}
                  ,{" "}
                  {pickupLng.toFixed(
                    6
                  )}
                </Text>

                {pickupAccuracy !==
                  null && (
                  <Text
                    style={{
                      fontSize:
                        12,
                      color:
                        "#6b7280",
                      marginTop:
                        3,
                    }}
                  >
                    Accuracy:{" "}
                    {pickupAccuracy.toFixed(
                      1
                    )}
                    m
                  </Text>
                )}
              </>
            )}
        </View>

        <TouchableOpacity
          onPress={
            getPickupLocation
          }
          style={{
            backgroundColor:
              "#2563eb",
            padding: 16,
            borderRadius: 14,
            marginBottom: 25,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign:
                "center",
              fontWeight:
                "900",
            }}
          >
            📍 Use My Current Location
          </Text>
        </TouchableOpacity>

        {/* =================================================
            DESTINATION
        ================================================= */}

        <Text
          style={{
            fontWeight: "900",
            fontSize: 17,
            marginBottom: 8,
          }}
        >
          🏁 Destination
        </Text>

        <Text
          style={{
            color:
              "#6b7280",
            lineHeight:
              20,
            marginBottom:
              12,
          }}
        >
          1. Click Google Maps below.
          {"\n"}
          2. Search for the destination.
          {"\n"}
          3. Copy the destination coordinates.
          {"\n"}
          4. Enter the latitude and longitude here.
        </Text>

        {/* =================================================
            GOOGLE MAPS BUTTON
        ================================================= */}

        <TouchableOpacity
          onPress={
            openGoogleMaps
          }
          style={{
            backgroundColor:
              "#4285F4",
            padding: 17,
            borderRadius: 14,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color:
                "#fff",
              textAlign:
                "center",
              fontWeight:
                "900",
              fontSize:
                16,
            }}
          >
            🌐 Open Google Maps
          </Text>
        </TouchableOpacity>

        {/* =================================================
            DESTINATION ADDRESS
        ================================================= */}

        <Text
          style={{
            fontWeight:
              "800",
            marginBottom:
              7,
          }}
        >
          🏠 Destination Address
        </Text>

        <TextInput
          value={
            dropoffAddress
          }
          onChangeText={
            setDropoffAddress
          }
          placeholder="Enter destination address"
          multiline
          style={{
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor:
              "#d1d5db",
            borderRadius: 14,
            padding: 15,
            minHeight:
              55,
            marginBottom:
              18,
            textAlignVertical:
              "top",
          }}
        />

        {/* =================================================
            DESTINATION LATITUDE
        ================================================= */}

        <Text
          style={{
            fontWeight:
              "800",
            marginBottom:
              7,
          }}
        >
          📍 Destination Latitude
        </Text>

        <TextInput
          value={
            dropoffLatText
          }
          onChangeText={
            handleLatitudeChange
          }
          keyboardType="numbers-and-punctuation"
          placeholder="Example: 5.603717"
          style={{
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor:
              "#d1d5db",
            borderRadius: 14,
            padding: 15,
            marginBottom:
              15,
          }}
        />

        {/* =================================================
            DESTINATION LONGITUDE
        ================================================= */}

        <Text
          style={{
            fontWeight:
              "800",
            marginBottom:
              7,
          }}
        >
          📍 Destination Longitude
        </Text>

        <TextInput
          value={
            dropoffLngText
          }
          onChangeText={
            handleLongitudeChange
          }
          keyboardType="numbers-and-punctuation"
          placeholder="Example: -0.187000"
          style={{
            backgroundColor:
              "#fff",
            borderWidth: 1,
            borderColor:
              "#d1d5db",
            borderRadius: 14,
            padding: 15,
            marginBottom:
              15,
          }}
        />

        {/* =================================================
            APPLY COORDINATES
        ================================================= */}

        <TouchableOpacity
          onPress={
            applyDestinationCoordinates
          }
          style={{
            backgroundColor:
              "#111827",
            padding: 16,
            borderRadius: 14,
            marginBottom:
              20,
          }}
        >
          <Text
            style={{
              color:
                "#fff",
              textAlign:
                "center",
              fontWeight:
                "900",
            }}
          >
            📍 Use These Coordinates
          </Text>
        </TouchableOpacity>

        {/* =================================================
            DESTINATION CONFIRMED
        ================================================= */}

        {dropoffLat !==
          null &&
          dropoffLng !==
            null && (
            <View
              style={{
                backgroundColor:
                  "#dcfce7",
                padding: 16,
                borderRadius: 15,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color:
                    "#166534",
                  fontWeight:
                    "900",
                  fontSize:
                    16,
                }}
              >
                ✓ Destination Coordinates Added
              </Text>

              <Text
                style={{
                  marginTop:
                    8,
                  fontWeight:
                    "800",
                }}
              >
                {dropoffAddress ||
                  "Destination"}
              </Text>

              <Text
                style={{
                  marginTop:
                    8,
                  fontSize:
                    12,
                }}
              >
                Latitude:{" "}
                {dropoffLat.toFixed(
                  6
                )}
              </Text>

              <Text
                style={{
                  fontSize:
                    12,
                }}
              >
                Longitude:{" "}
                {dropoffLng.toFixed(
                  6
                )}
              </Text>
            </View>
          )}

        {/* =================================================
            DISTANCE & PRICE
        ================================================= */}

        {distanceKm !==
          null && (
          <View
            style={{
              backgroundColor:
                "#eff6ff",
              borderRadius:
                18,
              padding:
                20,
              marginBottom:
                20,
            }}
          >
            <Text
              style={{
                color:
                  "#2563eb",
                fontWeight:
                  "900",
                fontSize:
                  13,
              }}
            >
              DISTANCE
            </Text>

            <Text
              style={{
                fontSize:
                  32,
                fontWeight:
                  "900",
                marginTop:
                  4,
              }}
            >
              {distanceKm.toFixed(
                2
              )} km
            </Text>

            <Text
              style={{
                color:
                  "#6b7280",
                marginTop:
                  10,
              }}
            >
              Estimated Price
            </Text>

            <Text
              style={{
                fontSize:
                  28,
                fontWeight:
                  "900",
                color:
                  "#16a34a",
                marginTop:
                  3,
              }}
            >
              GH₵{" "}
              {price.toFixed(
                2
              )}
            </Text>
          </View>
        )}

        {/* =================================================
            OTP DISPLAY
        ================================================= */}

        {generatedOtp !==
          null && (
          <View
            style={{
              backgroundColor:
                "#fef3c7",
              borderWidth:
                2,
              borderColor:
                "#f59e0b",
              borderRadius:
                18,
              padding:
                20,
              marginBottom:
                20,
            }}
          >
            <Text
              style={{
                fontSize:
                  20,
                fontWeight:
                  "900",
                color:
                  "#92400e",
              }}
            >
              🔐 YOUR DRIVER OTP
            </Text>

            <Text
              style={{
                fontSize:
                  38,
                fontWeight:
                  "900",
                letterSpacing:
                  8,
                color:
                  "#111827",
                marginTop:
                  12,
              }}
            >
              {generatedOtp}
            </Text>

            <Text
              style={{
                color:
                  "#92400e",
                marginTop:
                  10,
                lineHeight:
                  21,
                fontWeight:
                  "700",
              }}
            >
              This OTP belongs to you, the
              person requesting the ride or
              delivery. Keep it safe and give
              it to the rider/driver when
              required to confirm the completed
              service.
            </Text>
          </View>
        )}

        {/* =================================================
            PAYMENT
        ================================================= */}

        {distanceKm !==
          null && (
          <View
            style={{
              backgroundColor:
                "#fff7ed",
              borderWidth:
                1,
              borderColor:
                "#fed7aa",
              borderRadius:
                18,
              padding:
                18,
              marginBottom:
                20,
            }}
          >
            <Text
              style={{
                fontSize:
                  19,
                fontWeight:
                  "900",
                color:
                  "#9a3412",
              }}
            >
              💳 Payment
            </Text>

            <Text
              style={{
                fontWeight:
                  "900",
                marginTop:
                  12,
              }}
            >
              Tipagya Nasara Enterprise
            </Text>

            <Text
              style={{
                marginTop:
                  5,
              }}
            >
              Network: MTN
            </Text>

            <Text
              style={{
                fontSize:
                  20,
                fontWeight:
                  "900",
                marginTop:
                  5,
              }}
            >
              MoMo: 0539703374
            </Text>

            <Text
              style={{
                marginTop:
                  12,
                fontWeight:
                  "900",
                color:
                  "#16a34a",
              }}
            >
              Amount: GH₵
              {price.toFixed(
                2
              )}
            </Text>

            <Text
              style={{
                color:
                  "#6b7280",
                marginTop:
                  10,
                lineHeight:
                  20,
              }}
            >
              Make payment to the MoMo
              number above. Your request
              will remain hidden from riders
              until the payment is approved
              by an administrator.
            </Text>
          </View>
        )}

        {/* =================================================
            REQUEST BUTTON
        ================================================= */}

        <TouchableOpacity
          disabled={
            loading
          }
          onPress={
            createRequest
          }
          style={{
            backgroundColor:
              requestType ===
              "delivery"
                ? "#16a34a"
                : "#2563eb",
            padding:
              19,
            borderRadius:
              15,
            marginTop:
              5,
          }}
        >
          {loading ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <Text
              style={{
                color:
                  "#fff",
                textAlign:
                  "center",
                fontWeight:
                  "900",
                fontSize:
                  17,
              }}
            >
              {requestType ===
              "delivery"
                ? "🚚 Request Delivery"
                : "🏍️ Request Rider"}
            </Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            textAlign:
              "center",
            color:
              "#6b7280",
            fontSize:
              12,
            marginTop:
              12,
          }}
        >
          Payment must be verified by admin
          before a rider can accept your
          request.
        </Text>
      </ScrollView>
    </View>
  );
}