import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const SERVER_URL = "https://nasara-upload-server.onrender.com";

type RestaurantStatus =
  | "active"
  | "suspended"
  | "closed";

type OwnerStatus =
  | "active"
  | "inactive"
  | "suspended";

type RestaurantOwner = {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  status: OwnerStatus;
};

type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  opening_time: string | null;
  closing_time: string | null;
  is_open: boolean;
  status: RestaurantStatus;
  momo_provider: string | null;
  momo_number: string | null;
  momo_account_name: string | null;
  accepts_momo: boolean;
  accepts_cash: boolean;
  accepts_card: boolean;
};

function showMessage(
  title: string,
  message?: string
): void {
  if (Platform.OS === "web") {
    window.alert(
      message
        ? `${title}\n\n${message}`
        : title
    );
  } else {
    console.log(title, message);
  }
}

async function compressImage(
  uri: string,
  width: number = 1200
): Promise<string> {
  try {
    const result =
      await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width,
            },
          },
        ],
        {
          compress: 0.7,
          format:
            ImageManipulator.SaveFormat.JPEG,
        }
      );

    return result.uri;
  } catch (error) {
    console.error(
      "Image compression error:",
      error
    );

    return uri;
  }
}

async function uploadImageToRender(
  uri: string,
  fileName: string
): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(
        "Unable to read selected image."
      );
    }

    const blob = await response.blob();

    formData.append(
      "file",
      blob,
      fileName
    );
  } else {
    formData.append(
      "file",
      {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as any
    );
  }

  const uploadResponse = await fetch(
    `${SERVER_URL}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const errorText =
      await uploadResponse.text();

    throw new Error(
      `Image upload failed: ${uploadResponse.status} ${errorText}`
    );
  }

  const data: {
    url?: string;
  } = await uploadResponse.json();

  if (!data.url) {
    throw new Error(
      "Upload server did not return an image URL."
    );
  }

  return data.url;
}

export default function CreateRestaurantScreen() {
  const [loading, setLoading] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [ownerRecord, setOwnerRecord] =
    useState<RestaurantOwner | null>(null);

  const [restaurantId, setRestaurantId] =
    useState<string | null>(null);

  const [restaurantExists, setRestaurantExists] =
    useState<boolean>(false);

  const [name, setName] =
    useState<string>("");

  const [description, setDescription] =
    useState<string>("");

  const [phone, setPhone] =
    useState<string>("");

  const [address, setAddress] =
    useState<string>("");

  const [latitude, setLatitude] =
    useState<string>("");

  const [longitude, setLongitude] =
    useState<string>("");

  const [capturingLocation, setCapturingLocation] =
    useState<boolean>(false);

  const [openingTime, setOpeningTime] =
    useState<string>("");

  const [closingTime, setClosingTime] =
    useState<string>("");

  const [momoProvider, setMomoProvider] =
    useState<string>("");

  const [momoNumber, setMomoNumber] =
    useState<string>("");

  const [momoAccountName, setMomoAccountName] =
    useState<string>("");

  const [acceptsMomo, setAcceptsMomo] =
    useState<boolean>(true);

  const [acceptsCash, setAcceptsCash] =
    useState<boolean>(false);

  const [acceptsCard, setAcceptsCard] =
    useState<boolean>(false);

  /*
   * IMPORTANT:
   *
   * There is NO pending status.
   *
   * The Super Admin already grants the
   * restaurant owner access.
   *
   * Therefore a newly created restaurant
   * is immediately approved/active.
   */
  const [status, setStatus] =
    useState<RestaurantStatus>("active");

  const [logoUri, setLogoUri] =
    useState<string | null>(null);

  const [logoUrl, setLogoUrl] =
    useState<string | null>(null);

  const [coverUri, setCoverUri] =
    useState<string | null>(null);

  const [coverImageUrl, setCoverImageUrl] =
    useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] =
    useState<boolean>(false);

  const [uploadingCover, setUploadingCover] =
    useState<boolean>(false);

  useEffect(() => {
    loadOwner();
  }, []);

  async function loadOwner(): Promise<void> {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await (supabase as any).auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        showMessage(
          "Login Required",
          "Please log in again."
        );

        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const {
        data: owner,
        error: ownerError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .select(
          "id, user_id, restaurant_id, status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerError) {
        throw ownerError;
      }

      if (!owner) {
        showMessage(
          "Access Unavailable",
          "You do not have restaurant owner access."
        );

        return;
      }

      setOwnerRecord(owner);

      if (owner.status !== "active") {
        showMessage(
          "Access Unavailable",
          `Your restaurant owner access is ${owner.status}.`
        );

        return;
      }

      let linkedRestaurantId:
        | string
        | null =
        owner.restaurant_id;

      /*
       * If the owner record does not yet contain
       * restaurant_id, check restaurants.owner_id.
       *
       * This prevents duplicate restaurants.
       */
      if (!linkedRestaurantId) {
        const {
          data: existingRestaurant,
          error,
        } = await (supabase as any)
          .from("restaurants")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (existingRestaurant?.id) {
          linkedRestaurantId =
            existingRestaurant.id;

          /*
           * Repair owner → restaurant relationship.
           */
          const {
            error: repairError,
          } = await (supabase as any)
            .from("restaurant_owners")
            .update({
              restaurant_id:
                existingRestaurant.id,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", owner.id)
            .eq("user_id", user.id);

          if (repairError) {
            console.error(
              "Could not repair restaurant owner link:",
              repairError
            );
          }
        }
      }

      /*
       * No restaurant yet.
       */
      if (!linkedRestaurantId) {
        setRestaurantExists(false);
        setRestaurantId(null);

        /*
         * New restaurant is approved immediately.
         */
        setStatus("active");

        return;
      }

      /*
       * Existing restaurant.
       */
      const {
        data: restaurant,
        error: restaurantError,
      } = await (supabase as any)
        .from("restaurants")
        .select(
          `
          id,
          owner_id,
          name,
          description,
          phone,
          address,
          latitude,
          longitude,
          logo_url,
          cover_image_url,
          opening_time,
          closing_time,
          is_open,
          status,
          momo_provider,
          momo_number,
          momo_account_name,
          accepts_momo,
          accepts_cash,
          accepts_card
        `
        )
        .eq("id", linkedRestaurantId)
        .maybeSingle();

      if (restaurantError) {
        throw restaurantError;
      }

      if (!restaurant) {
        showMessage(
          "Restaurant Not Found",
          "Your restaurant link exists, but the restaurant record could not be found."
        );

        return;
      }

      setRestaurantExists(true);
      setRestaurantId(restaurant.id);

      setName(
        restaurant.name || ""
      );

      setDescription(
        restaurant.description || ""
      );

      setPhone(
        restaurant.phone || ""
      );

      setAddress(
        restaurant.address || ""
      );

      setLatitude(
        restaurant.latitude !== null &&
          restaurant.latitude !== undefined
          ? String(restaurant.latitude)
          : ""
      );

      setLongitude(
        restaurant.longitude !== null &&
          restaurant.longitude !== undefined
          ? String(restaurant.longitude)
          : ""
      );

      setOpeningTime(
        restaurant.opening_time || ""
      );

      setClosingTime(
        restaurant.closing_time || ""
      );

      setMomoProvider(
        restaurant.momo_provider || ""
      );

      setMomoNumber(
        restaurant.momo_number || ""
      );

      setMomoAccountName(
        restaurant.momo_account_name || ""
      );

      setAcceptsMomo(
        restaurant.accepts_momo ?? true
      );

      setAcceptsCash(
        restaurant.accepts_cash ?? false
      );

      setAcceptsCard(
        restaurant.accepts_card ?? false
      );

      /*
       * Existing restaurant status.
       *
       * No pending or rejected status is supported.
       */
      if (
        restaurant.status === "approved" ||
        restaurant.status === "suspended" ||
        restaurant.status === "closed"
      ) {
        setStatus(
          restaurant.status
        );
      } else {
        /*
         * If an old database record somehow still
         * contains pending/rejected, treat it as
         * approved instead of showing pending.
         */
        setStatus("active");
      }

      setLogoUrl(
        restaurant.logo_url || null
      );

      setCoverImageUrl(
        restaurant.cover_image_url || null
      );
    } catch (error: any) {
      console.error(
        "Load restaurant error:",
        error
      );

      showMessage(
        "Error",
        error?.message ||
          "Unable to load your restaurant."
      );
    } finally {
      setLoading(false);
    }
  }

  async function pickLogo(): Promise<void> {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission Required",
          "Please allow access to your photos to select a restaurant logo."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [1, 1],
          }
        );

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      setLogoUri(
        result.assets[0].uri
      );
    } catch (error) {
      console.error(
        "Logo picker error:",
        error
      );

      showMessage(
        "Error",
        "Unable to select the restaurant logo."
      );
    }
  }

  async function pickCover(): Promise<void> {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission Required",
          "Please allow access to your photos to select a cover photo."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [16, 9],
          }
        );

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      setCoverUri(
        result.assets[0].uri
      );
    } catch (error) {
      console.error(
        "Cover picker error:",
        error
      );

      showMessage(
        "Error",
        "Unable to select the restaurant cover photo."
      );
    }
  }

  async function captureCurrentLocation(): Promise<void> {
    try {
      setCapturingLocation(true);

      const {
        status: permissionStatus,
      } =
        await Location.requestForegroundPermissionsAsync();

      if (
        permissionStatus !== "granted"
      ) {
        showMessage(
          "Location Permission Required",
          "Please allow location access so Nasara can capture your restaurant GPS coordinates."
        );

        return;
      }

      const location =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.High,
          }
        );

      const capturedLatitude: number =
        location.coords.latitude;

      const capturedLongitude: number =
        location.coords.longitude;

      setLatitude(
        capturedLatitude.toString()
      );

      setLongitude(
        capturedLongitude.toString()
      );

      showMessage(
        "Location Captured",
        `Latitude: ${capturedLatitude}\nLongitude: ${capturedLongitude}`
      );
    } catch (error: any) {
      console.error(
        "Capture GPS location error:",
        error
      );

      showMessage(
        "Location Error",
        error?.message ||
          "Unable to capture your current GPS location."
      );
    } finally {
      setCapturingLocation(false);
    }
  }

  async function uploadLogoIfNeeded(): Promise<
    string | null
  > {
    if (!logoUri) {
      return logoUrl;
    }

    try {
      setUploadingLogo(true);

      const compressedUri: string =
        await compressImage(
          logoUri,
          1200
        );

      const uploadedUrl: string =
        await uploadImageToRender(
          compressedUri,
          "restaurant-logo.jpg"
        );

      setLogoUrl(uploadedUrl);

      return uploadedUrl;
    } finally {
      setUploadingLogo(false);
    }
  }

  async function uploadCoverIfNeeded(): Promise<
    string | null
  > {
    if (!coverUri) {
      return coverImageUrl;
    }

    try {
      setUploadingCover(true);

      const compressedUri: string =
        await compressImage(
          coverUri,
          1600
        );

      const uploadedUrl: string =
        await uploadImageToRender(
          compressedUri,
          "restaurant-cover.jpg"
        );

      setCoverImageUrl(uploadedUrl);

      return uploadedUrl;
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveRestaurant(): Promise<void> {
    if (saving) {
      return;
    }

    if (!userId) {
      showMessage(
        "Error",
        "Your account could not be identified."
      );

      return;
    }

    const cleanName: string =
      name.trim();

    const cleanDescription: string =
      description.trim();

    const cleanPhone: string =
      phone.trim();

    const cleanAddress: string =
      address.trim();

    if (!cleanName) {
      showMessage(
        "Restaurant Name Required",
        "Enter your restaurant name."
      );

      return;
    }

    if (!cleanPhone) {
      showMessage(
        "Phone Required",
        "Enter the restaurant phone number."
      );

      return;
    }

    if (!cleanAddress) {
      showMessage(
        "Address Required",
        "Enter the restaurant address."
      );

      return;
    }

    try {
      setSaving(true);

      /*
       * Re-check owner access before saving.
       */
      const {
        data: latestOwner,
        error: latestOwnerError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .select(
          "id, user_id, restaurant_id, status"
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (latestOwnerError) {
        throw latestOwnerError;
      }

      if (!latestOwner) {
        throw new Error(
          "You do not have restaurant owner access."
        );
      }

      if (
        latestOwner.status !==
        "active"
      ) {
        throw new Error(
          `Your restaurant owner access is ${latestOwner.status}.`
        );
      }

      /*
       * If the owner already has a linked
       * restaurant, never create another one.
       */
      if (
        latestOwner.restaurant_id &&
        latestOwner.restaurant_id !==
          restaurantId
      ) {
        setRestaurantId(
          latestOwner.restaurant_id
        );

        setRestaurantExists(true);

        showMessage(
          "Restaurant Already Exists",
          "You already have a restaurant. Opening your restaurant dashboard."
        );

        router.replace(
          "/(restaurant-owner)/dashboard"
        );

        return;
      }

      /*
       * Direct duplicate protection using
       * restaurants.owner_id.
       */
      const {
        data: existingRestaurants,
        error: existingError,
      } = await (supabase as any)
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .limit(2);

      if (existingError) {
        throw existingError;
      }

      if (
        existingRestaurants &&
        existingRestaurants.length > 0
      ) {
        const existingId: string =
          existingRestaurants[0].id;

        if (!restaurantId) {
          setRestaurantId(
            existingId
          );

          setRestaurantExists(true);

          /*
           * Repair owner link.
           */
          const {
            error: linkError,
          } = await (supabase as any)
            .from("restaurant_owners")
            .update({
              restaurant_id:
                existingId,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", latestOwner.id)
            .eq("user_id", userId);

          if (linkError) {
            console.error(
              "Restaurant owner link repair failed:",
              linkError
            );
          }

          showMessage(
            "Restaurant Already Exists",
            "You already have a restaurant. Opening your restaurant dashboard."
          );

          router.replace(
            "/(restaurant-owner)/dashboard"
          );

          return;
        }

        if (
          existingId !==
          restaurantId
        ) {
          throw new Error(
            "Multiple restaurant records were detected for this owner. Please contact the administrator."
          );
        }
      }

      /*
       * Upload images through Render → Cloudflare.
       */
      const uploadedLogoUrl:
        | string
        | null =
        await uploadLogoIfNeeded();

      const uploadedCoverUrl:
        | string
        | null =
        await uploadCoverIfNeeded();

      const parsedLatitude:
        | number
        | null =
        latitude.trim() !== ""
          ? Number(latitude.trim())
          : null;

      const parsedLongitude:
        | number
        | null =
        longitude.trim() !== ""
          ? Number(
              longitude.trim()
            )
          : null;

      if (
        parsedLatitude !== null &&
        (!Number.isFinite(
          parsedLatitude
        ) ||
          parsedLatitude < -90 ||
          parsedLatitude > 90)
      ) {
        throw new Error(
          "Latitude must be between -90 and 90."
        );
      }

      if (
        parsedLongitude !== null &&
        (!Number.isFinite(
          parsedLongitude
        ) ||
          parsedLongitude < -180 ||
          parsedLongitude > 180)
      ) {
        throw new Error(
          "Longitude must be between -180 and 180."
        );
      }

      const restaurantPayload = {
        owner_id: userId,

        name: cleanName,

        description:
          cleanDescription || null,

        phone: cleanPhone,

        address: cleanAddress,

        latitude:
          parsedLatitude,

        longitude:
          parsedLongitude,

        logo_url:
          uploadedLogoUrl,

        cover_image_url:
          uploadedCoverUrl,

        opening_time:
          openingTime.trim() ||
          null,

        closing_time:
          closingTime.trim() ||
          null,

        momo_provider:
          momoProvider.trim() ||
          null,

        momo_number:
          momoNumber.trim() ||
          null,

        momo_account_name:
          momoAccountName.trim() ||
          null,

        accepts_momo:
          acceptsMomo,

        accepts_cash:
          acceptsCash,

        accepts_card:
          acceptsCard,
      };

      let savedRestaurantId:
        | string
        | null =
        restaurantId;

      if (restaurantId) {
        /*
         * EXISTING RESTAURANT
         *
         * Update only.
         */
        const {
          data: updatedRestaurant,
          error: updateError,
        } = await (supabase as any)
          .from("restaurants")
          .update({
            ...restaurantPayload,

            /*
             * Never turn an existing restaurant
             * into pending.
             *
             * Existing status is preserved by
             * the database update because status
             * is not included here.
             */
          })
          .eq("id", restaurantId)
          .eq("owner_id", userId)
          .select(
            `
            id,
            owner_id,
            name,
            description,
            phone,
            address,
            latitude,
            longitude,
            logo_url,
            cover_image_url,
            opening_time,
            closing_time,
            is_open,
            status,
            momo_provider,
            momo_number,
            momo_account_name,
            accepts_momo,
            accepts_cash,
            accepts_card
          `
          )
          .single();

        if (updateError) {
          throw updateError;
        }

        savedRestaurantId =
          updatedRestaurant.id;

        if (
          updatedRestaurant.status ===
            "active" ||
          updatedRestaurant.status ===
            "suspended" ||
          updatedRestaurant.status ===
            "closed"
        ) {
          setStatus(
            updatedRestaurant.status
          );
        } else {
          setStatus("active");
        }
      } else {
        /*
         * NEW RESTAURANT
         *
         * IMPORTANT:
         * There is NO pending approval.
         *
         * The Super Admin already created/granted
         * the restaurant owner account.
         *
         * Therefore the restaurant is immediately
         * approved and active.
         */
        const {
          data: newRestaurant,
          error: insertError,
        } = await (supabase as any)
          .from("restaurants")
          .insert({
            ...restaurantPayload,

            /*
             * THIS IS THE IMPORTANT CORRECTION.
             */
            status: "approved",

            is_open: true,
          })
          .select(
            `
            id,
            owner_id,
            name,
            description,
            phone,
            address,
            latitude,
            longitude,
            logo_url,
            cover_image_url,
            opening_time,
            closing_time,
            is_open,
            status,
            momo_provider,
            momo_number,
            momo_account_name,
            accepts_momo,
            accepts_cash,
            accepts_card
          `
          )
          .single();

        if (insertError) {
          /*
           * PostgreSQL unique violation.
           */
          if (
            insertError.code ===
            "23505"
          ) {
            showMessage(
              "Restaurant Already Exists",
              "This account already has a restaurant. Opening your dashboard."
            );

            await loadOwner();

            router.replace(
              "/(restaurant-owner)/dashboard"
            );

            return;
          }

          throw insertError;
        }

        savedRestaurantId =
          newRestaurant.id;

        setRestaurantId(
          newRestaurant.id
        );

        setRestaurantExists(true);

        /*
         * New restaurant is always approved.
         */
        setStatus("active");
      }

      if (!savedRestaurantId) {
        throw new Error(
          "Restaurant ID was not returned after saving."
        );
      }

      /*
       * Link restaurant to restaurant_owners.
       */
      const {
        error: ownerLinkError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .update({
          restaurant_id:
            savedRestaurantId,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", latestOwner.id)
        .eq("user_id", userId);

      if (ownerLinkError) {
        throw ownerLinkError;
      }

      /*
       * Verify the owner → restaurant relationship.
       */
      const {
        data: verifiedOwner,
        error: verifyError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .select("restaurant_id")
        .eq("id", latestOwner.id)
        .eq("user_id", userId)
        .single();

      if (verifyError) {
        throw verifyError;
      }

      if (
        verifiedOwner.restaurant_id !==
        savedRestaurantId
      ) {
        throw new Error(
          "Restaurant was saved, but the restaurant owner link could not be verified."
        );
      }

      setRestaurantId(
        savedRestaurantId
      );

      setRestaurantExists(true);

      showMessage(
        restaurantId
          ? "Restaurant Updated"
          : "Restaurant Created",
        restaurantId
          ? "Your restaurant information has been updated."
          : "Your restaurant is now active on Nasara."
      );

      router.replace(
        "/(restaurant-owner)/dashboard"
      );
    } catch (error: any) {
      console.error(
        "Save restaurant error:",
        error
      );

      showMessage(
        "Unable to Save Restaurant",
        error?.message ||
          "Something went wrong while saving the restaurant."
      );
    } finally {
      setSaving(false);
    }
  }

  function goToDashboard(): void {
    router.replace(
      "/(restaurant-owner)/dashboard"
    );
  }

  /*
   * Display-friendly status.
   *
   * Database:
   * approved
   *
   * User interface:
   * ACTIVE
   */
  function getStatusLabel(
    restaurantStatus: RestaurantStatus
  ): string {
    if (
      restaurantStatus ===
      "active"
    ) {
      return "ACTIVE";
    }

    if (
      restaurantStatus ===
      "suspended"
    ) {
      return "SUSPENDED";
    }

    return "CLOSED";
  }

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#16A34A"
        />

        <Text
          style={styles.loadingText}
        >
          Loading restaurant
          information...
        </Text>
      </View>
    );
  }

  if (!ownerRecord) {
    return (
      <View
        style={
          styles.accessContainer
        }
      >
        <View
          style={styles.accessIcon}
        >
          <Text
            style={
              styles.accessIconText
            }
          >
            !
          </Text>
        </View>

        <Text
          style={styles.accessTitle}
        >
          Restaurant Access Required
        </Text>

        <Text
          style={styles.accessText}
        >
          Your account does not
          currently have restaurant
          owner access.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={goToDashboard}
          activeOpacity={0.85}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToDashboard}
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.headerTitleContainer
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              {restaurantExists
                ? "Restaurant Information"
                : "Create Restaurant"}
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {restaurantExists
                ? "Manage your restaurant"
                : "Set up your restaurant"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {restaurantExists && (
          <View
            style={
              styles.existingBanner
            }
          >
            <View
              style={
                styles.existingBannerIcon
              }
            >
              <Text
                style={
                  styles.existingBannerIconText
                }
              >
                ✓
              </Text>
            </View>

            <View
              style={
                styles.existingBannerTextContainer
              }
            >
              <Text
                style={
                  styles.existingBannerTitle
                }
              >
                Restaurant Already Created
              </Text>

              <Text
                style={
                  styles.existingBannerText
                }
              >
                You can update this
                restaurant, but you
                cannot create another
                restaurant with this
                account.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            Restaurant Images
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            Your logo and cover photo
            are uploaded through the
            Nasara Render server and
            stored in Cloudflare.
          </Text>

          <View
            style={styles.imageCard}
          >
            <Text
              style={styles.inputLabel}
            >
              Restaurant Logo
            </Text>

            <TouchableOpacity
              style={
                styles.logoPreviewContainer
              }
              onPress={pickLogo}
              activeOpacity={0.85}
            >
              {logoUri ||
              logoUrl ? (
                <Image
                  source={{
                    uri:
                      logoUri ||
                      logoUrl ||
                      undefined,
                  }}
                  style={
                    styles.logoPreview
                  }
                />
              ) : (
                <View
                  style={
                    styles.logoPlaceholder
                  }
                >
                  <Text
                    style={
                      styles.logoPlaceholderIcon
                    }
                  >
                    +
                  </Text>

                  <Text
                    style={
                      styles.logoPlaceholderText
                    }
                  >
                    Add Logo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.secondaryButton
              }
              onPress={pickLogo}
              disabled={
                uploadingLogo
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                {logoUri ||
                logoUrl
                  ? "Change Logo"
                  : "Select Logo"}
              </Text>
            </TouchableOpacity>

            {uploadingLogo && (
              <View
                style={
                  styles.uploadStatus
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#16A34A"
                />

                <Text
                  style={
                    styles.uploadStatusText
                  }
                >
                  Uploading logo...
                </Text>
              </View>
            )}
          </View>

          <View
            style={styles.imageCard}
          >
            <Text
              style={styles.inputLabel}
            >
              Cover Photo
            </Text>

            <TouchableOpacity
              style={
                styles.coverPreviewContainer
              }
              onPress={pickCover}
              activeOpacity={0.85}
            >
              {coverUri ||
              coverImageUrl ? (
                <Image
                  source={{
                    uri:
                      coverUri ||
                      coverImageUrl ||
                      undefined,
                  }}
                  style={
                    styles.coverPreview
                  }
                />
              ) : (
                <View
                  style={
                    styles.coverPlaceholder
                  }
                >
                  <Text
                    style={
                      styles.coverPlaceholderIcon
                    }
                  >
                    +
                  </Text>

                  <Text
                    style={
                      styles.coverPlaceholderText
                    }
                  >
                    Add Cover Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.secondaryButton
              }
              onPress={pickCover}
              disabled={
                uploadingCover
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                {coverUri ||
                coverImageUrl
                  ? "Change Cover Photo"
                  : "Select Cover Photo"}
              </Text>
            </TouchableOpacity>

            {uploadingCover && (
              <View
                style={
                  styles.uploadStatus
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#16A34A"
                />

                <Text
                  style={
                    styles.uploadStatusText
                  }
                >
                  Uploading cover
                  photo...
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            Basic Information
          </Text>

          <Text
            style={styles.inputLabel}
          >
            Restaurant Name *
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter restaurant name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text
            style={styles.inputLabel}
          >
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Describe your restaurant"
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              styles.textArea,
            ]}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text
            style={styles.inputLabel}
          >
            Phone Number *
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Restaurant phone number"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text
            style={styles.inputLabel}
          >
            Address *
          </Text>

          <TextInput
            value={address}
            onChangeText={
              setAddress
            }
            placeholder="Restaurant address"
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              styles.textAreaSmall,
            ]}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            Restaurant GPS Location
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            Capture the restaurant's
            current GPS coordinates.
            These coordinates will be
            saved with the restaurant.
          </Text>

          <View
            style={styles.locationRow}
          >
            <View
              style={
                styles.locationInputContainer
              }
            >
              <Text
                style={
                  styles.inputLabel
                }
              >
                Latitude
              </Text>

              <TextInput
                value={latitude}
                onChangeText={
                  setLatitude
                }
                placeholder="Latitude"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType="decimal-pad"
              />
            </View>

            <View
              style={
                styles.locationInputContainer
              }
            >
              <Text
                style={
                  styles.inputLabel
                }
              >
                Longitude
              </Text>

              <TextInput
                value={longitude}
                onChangeText={
                  setLongitude
                }
                placeholder="Longitude"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.locationButton,
              capturingLocation &&
                styles.locationButtonDisabled,
            ]}
            onPress={
              captureCurrentLocation
            }
            disabled={
              capturingLocation
            }
            activeOpacity={0.85}
          >
            {capturingLocation ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                />

                <Text
                  style={
                    styles.locationButtonText
                  }
                >
                  Capturing GPS...
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={
                    styles.locationButtonIcon
                  }
                >
                  ⌖
                </Text>

                <Text
                  style={
                    styles.locationButtonText
                  }
                >
                  Capture Current GPS
                  Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          {latitude &&
            longitude && (
              <View
                style={
                  styles.coordinatesCard
                }
              >
                <Text
                  style={
                    styles.coordinatesTitle
                  }
                >
                  GPS Coordinates
                  Captured
                </Text>

                <Text
                  style={
                    styles.coordinatesText
                  }
                >
                  Latitude:{" "}
                  {latitude}
                </Text>

                <Text
                  style={
                    styles.coordinatesText
                  }
                >
                  Longitude:{" "}
                  {longitude}
                </Text>
              </View>
            )}
        </View>

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            Opening Hours
          </Text>

          <Text
            style={styles.inputLabel}
          >
            Opening Time
          </Text>

          <TextInput
            value={openingTime}
            onChangeText={
              setOpeningTime
            }
            placeholder="e.g. 08:00:00"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text
            style={styles.inputLabel}
          >
            Closing Time
          </Text>

          <TextInput
            value={closingTime}
            onChangeText={
              setClosingTime
            }
            placeholder="e.g. 22:00:00"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            Payment Information
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            Customers pay the
            restaurant directly. They
            can use the payment methods
            you enable below.
          </Text>

          <Text
            style={styles.inputLabel}
          >
            MoMo Network
          </Text>

          <TextInput
            value={momoProvider}
            onChangeText={
              setMomoProvider
            }
            placeholder="MTN, Telecel, AirtelTigo"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text
            style={styles.inputLabel}
          >
            MoMo Number
          </Text>

          <TextInput
            value={momoNumber}
            onChangeText={
              setMomoNumber
            }
            placeholder="MoMo number"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text
            style={styles.inputLabel}
          >
            MoMo Account Name
          </Text>

          <TextInput
            value={momoAccountName}
            onChangeText={
              setMomoAccountName
            }
            placeholder="Account name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text
            style={styles.paymentLabel}
          >
            Accepted Payment Methods
          </Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              acceptsMomo &&
                styles.paymentOptionActive,
            ]}
            onPress={() =>
              setAcceptsMomo(
                !acceptsMomo
              )
            }
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                acceptsMomo &&
                  styles.checkboxActive,
              ]}
            >
              {acceptsMomo && (
                <Text
                  style={
                    styles.checkboxText
                  }
                >
                  ✓
                </Text>
              )}
            </View>

            <View
              style={
                styles.paymentOptionTextContainer
              }
            >
              <Text
                style={
                  styles.paymentOptionTitle
                }
              >
                Mobile Money
              </Text>

              <Text
                style={
                  styles.paymentOptionDescription
                }
              >
                Customer pays your
                restaurant MoMo.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              acceptsCash &&
                styles.paymentOptionActive,
            ]}
            onPress={() =>
              setAcceptsCash(
                !acceptsCash
              )
            }
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                acceptsCash &&
                  styles.checkboxActive,
              ]}
            >
              {acceptsCash && (
                <Text
                  style={
                    styles.checkboxText
                  }
                >
                  ✓
                </Text>
              )}
            </View>

            <View
              style={
                styles.paymentOptionTextContainer
              }
            >
              <Text
                style={
                  styles.paymentOptionTitle
                }
              >
                Cash
              </Text>

              <Text
                style={
                  styles.paymentOptionDescription
                }
              >
                Customer pays cash
                directly at the
                restaurant.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              acceptsCard &&
                styles.paymentOptionActive,
            ]}
            onPress={() =>
              setAcceptsCard(
                !acceptsCard
              )
            }
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                acceptsCard &&
                  styles.checkboxActive,
              ]}
            >
              {acceptsCard && (
                <Text
                  style={
                    styles.checkboxText
                  }
                >
                  ✓
                </Text>
              )}
            </View>

            <View
              style={
                styles.paymentOptionTextContainer
              }
            >
              <Text
                style={
                  styles.paymentOptionTitle
                }
              >
                Card
              </Text>

              <Text
                style={
                  styles.paymentOptionDescription
                }
              >
                Accept card payments.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {restaurantExists && (
          <View
            style={styles.statusCard}
          >
            <View
              style={
                styles.statusCardHeader
              }
            >
              <Text
                style={
                  styles.statusCardTitle
                }
              >
                Restaurant Status
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  status ===
                    "active" &&
                    styles.statusApproved,
                  status ===
                    "suspended" &&
                    styles.statusSuspended,
                  status === "closed" &&
                    styles.statusClosed,
                ]}
              >
                 <Text
                  style={[
                    styles.statusBadgeText,
                    status ===
                      "active" &&
                      styles.statusApprovedText,
                    status ===
                      "suspended" &&
                      styles.statusSuspendedText,
                    status ===
                      "closed" &&
                      styles.statusClosedText,
                  ]}
                >
                  {getStatusLabel(
                    status
                  )}
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.statusDescription
              }
            >
              Your restaurant is
              already active because
              Nasara has already granted
              you restaurant owner
              access.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving ||
              uploadingLogo ||
              uploadingCover) &&
              styles.saveButtonDisabled,
          ]}
          onPress={
            saveRestaurant
          }
          disabled={
            saving ||
            uploadingLogo ||
            uploadingCover
          }
          activeOpacity={0.85}
        >
          {saving ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            <Text
                style={
                  styles.saveButtonText
                }
              >
                {restaurantExists
                  ? "Updating..."
                  : "Creating..."}
              </Text>
            </>
          ) : (
            <Text
              style={
                styles.saveButtonText
              }
            >
              {restaurantExists
                ? "Update Restaurant"
                : "Create Restaurant"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.dashboardButton
          }
          onPress={
            goToDashboard
          }
          activeOpacity={0.85}
        >
          <Text
            style={
              styles.dashboardButtonText
            }
          >
            Back to Restaurant
            Dashboard
          </Text>
        </TouchableOpacity>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F6",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F6",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
  },

  accessContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F5F7F6",
  },

  accessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  accessIconText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#16A34A",
  },

  accessTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },

  accessText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop:
      Platform.OS === "ios"
        ? 54
        : 24,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backButtonText: {
    fontSize: 32,
    lineHeight: 36,
    color: "#15803D",
    fontWeight: "500",
    marginTop: -3,
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },

  scrollView: {
    flex: 1,
  },

  content: {
    padding: 18,
  },

  existingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
  },

  existingBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  existingBannerIconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  existingBannerTextContainer: {
    flex: 1,
  },

  existingBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 3,
  },

  existingBannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#15803D",
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 5,
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
    marginBottom: 16,
  },

  imageCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  logoPreviewContainer: {
    alignSelf: "center",
    width: 150,
    height: 150,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 12,
  },

  logoPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  logoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoPlaceholderIcon: {
    fontSize: 38,
    fontWeight: "300",
    color: "#16A34A",
  },

  logoPlaceholderText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },

  coverPreviewContainer: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 12,
  },

  coverPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  coverPlaceholderIcon: {
    fontSize: 42,
    fontWeight: "300",
    color: "#16A34A",
  },

  coverPlaceholderText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },

  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  secondaryButtonText: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "800",
  },

  uploadStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  uploadStatusText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#15803D",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 13,
  },

  textAreaSmall: {
    minHeight: 90,
    paddingTop: 13,
  },

  locationRow: {
    flexDirection: "row",
    gap: 10,
  },

  locationInputContainer: {
    flex: 1,
  },

  locationButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  locationButtonDisabled: {
    opacity: 0.65,
  },

  locationButtonIcon: {
    fontSize: 21,
    color: "#2563EB",
    marginRight: 8,
  },

  locationButtonText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },

  coordinatesCard: {
    marginTop: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 13,
  },

  coordinatesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 6,
  },

  coordinatesText: {
    fontSize: 13,
    color: "#15803D",
    marginTop: 2,
  },

  paymentLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    marginTop: 3,
  },

  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  paymentOptionActive: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  checkboxActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  checkboxText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  paymentOptionTextContainer: {
    flex: 1,
  },

  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  paymentOptionDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusApproved: {
    backgroundColor: "#DCFCE7",
  },

  statusSuspended: {
    backgroundColor: "#FEF3C7",
  },

  statusClosed: {
    backgroundColor: "#F3F4F6",
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  statusApprovedText: {
    color: "#166534",
  },

  statusSuspendedText: {
    color: "#92400E",
  },

  statusClosedText: {
    color: "#374151",
  },

  statusDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
    marginTop: 10,
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
    shadowColor: "#16A34A",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },

  dashboardButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  dashboardButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "800",
  },

  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 40,
  },
});