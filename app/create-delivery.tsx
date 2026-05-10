import { useRouter } from "expo-router";
import { useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { supabase } from "../lib/supabase";

export default function CreateDelivery() {

  const router = useRouter();

  const [pickupAddress, setPickupAddress] =
    useState("");

  const [dropoffAddress, setDropoffAddress] =
    useState("");

  const [receiverPhone, setReceiverPhone] =
    useState("");

  const [itemName, setItemName] =
    useState("");

  const [itemNote, setItemNote] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [packageImage, setPackageImage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* ================= PICK IMAGE ================= */

  async function pickPackageImage() {

    const perm =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {

      Alert.alert(
        "Permission Required"
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,

        quality: 0.8,
      });

    if (!result.canceled) {

      setPackageImage(
        result.assets[0].uri
      );
    }
  }

  /* ================= UPLOAD IMAGE ================= */

  async function uploadPackageImage(
    uri: string
  ) {

    const formData =
      new FormData();

    formData.append("file", {

      uri,

      name: "package.jpg",

      type: "image/jpeg",

    } as any);

    return new Promise<string>(
      (resolve, reject) => {

        const xhr =
          new XMLHttpRequest();

        xhr.open(
          "POST",
          "https://nasara-upload-server.onrender.com/upload"
        );

        xhr.onload = () => {

          try {

            const data =
              JSON.parse(
                xhr.responseText
              );

            if (!data?.url) {

              reject(
                "Upload failed"
              );

              return;
            }

            resolve(data.url);

          } catch {

            reject(
              "Invalid response"
            );
          }
        };

        xhr.onerror = () =>
          reject(
            "Network error"
          );

        xhr.send(formData);
      }
    );
  }

  /* ================= CREATE DELIVERY ================= */

  async function createDelivery() {

    if (loading) return;

    if (
      !pickupAddress ||
      !dropoffAddress ||
      !receiverPhone ||
      !itemName ||
      !amount
    ) {

      Alert.alert(
        "Missing Fields",
        "Please fill all required fields"
      );

      return;
    }

    try {

      setLoading(true);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        Alert.alert(
          "Login Required"
        );

        setLoading(false);

        return;
      }

      /* ================= OTP ================= */

      const otp =
        Math.floor(
          1000 +
          Math.random() * 9000
        ).toString();

      /* ================= IMAGE ================= */

      let uploadedImage = "";

      if (packageImage) {

        try {

          uploadedImage =
            await uploadPackageImage(
              packageImage
            );

        } catch (e) {

          console.log(
            "Upload error:",
            e
          );
        }
      }

      /* ================= INSERT ================= */

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .insert({

            sender_id:
              user.id,

            pickup_address:
              pickupAddress,

            dropoff_address:
              dropoffAddress,

            receiver_phone:
              receiverPhone,

            item_name:
              itemName,

            item_note:
              itemNote,

            amount:
              Number(amount),

            otp_code:
              otp,

            package_image:
              uploadedImage,

            payment_status:
              "pending",

            status:
              "pending",
          });

      if (error) {

        Alert.alert(
          "Error",
          error.message
        );

        setLoading(false);

        return;
      }

      Alert.alert(
        "Delivery Created",
        `Receiver OTP: ${otp}`
      );

      /* ================= RESET ================= */

      setPickupAddress("");

      setDropoffAddress("");

      setReceiverPhone("");

      setItemName("");

      setItemNote("");

      setAmount("");

      setPackageImage("");

      router.back();

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message ||
          "Something went wrong"
      );
    }

    setLoading(false);
  }

  return (

    <ScrollView
      contentContainerStyle={{
        padding: 20,
      }}
    >

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        🚚 Create Delivery
      </Text>

      {/* ================= PICKUP ================= */}

      <TextInput
        placeholder="Pickup Address"
        value={pickupAddress}
        onChangeText={
          setPickupAddress
        }
        style={styles.input}
      />

      {/* ================= DROPOFF ================= */}

      <TextInput
        placeholder="Dropoff Address"
        value={dropoffAddress}
        onChangeText={
          setDropoffAddress
        }
        style={styles.input}
      />

      {/* ================= PHONE ================= */}

      <TextInput
        placeholder="Receiver Phone"
        value={receiverPhone}
        onChangeText={
          setReceiverPhone
        }
        keyboardType="phone-pad"
        style={styles.input}
      />

      {/* ================= ITEM ================= */}

      <TextInput
        placeholder="Item Name"
        value={itemName}
        onChangeText={
          setItemName
        }
        style={styles.input}
      />

      {/* ================= NOTE ================= */}

      <TextInput
        placeholder="Item Note"
        value={itemNote}
        onChangeText={
          setItemNote
        }
        multiline
        style={[
          styles.input,
          {
            height: 100,
            textAlignVertical:
              "top",
          },
        ]}
      />

      {/* ================= IMAGE BUTTON ================= */}

      <TouchableOpacity
        onPress={
          pickPackageImage
        }
        style={{
          backgroundColor:
            "#2563eb",

          padding: 12,

          borderRadius: 10,

          marginTop: 15,
        }}
      >

        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Upload Package Image
        </Text>

      </TouchableOpacity>

      {/* ================= IMAGE PREVIEW ================= */}

      {packageImage ? (

        <Image
          source={{
            uri: packageImage,
          }}
          style={{
            width: "100%",
            height: 220,
            borderRadius: 12,
            marginTop: 15,
          }}
        />

      ) : null}

      {/* ================= AMOUNT ================= */}

      <TextInput
        placeholder="Delivery Fee"
        value={amount}
        onChangeText={
          setAmount
        }
        keyboardType="numeric"
        style={styles.input}
      />

      {/* ================= BUTTON ================= */}

      <TouchableOpacity
        disabled={loading}
        onPress={
          createDelivery
        }
        style={{
          backgroundColor:
            loading
              ? "gray"
              : "#16a34a",

          padding: 15,

          borderRadius: 10,

          marginTop: 20,
        }}
      >

        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Creating..."
            : "Create Delivery"}
        </Text>

      </TouchableOpacity>

      {/* ================= LOADING ================= */}

      {loading && (

        <ActivityIndicator
          size="large"
          style={{
            marginTop: 20,
          }}
        />

      )}

    </ScrollView>
  );
}

const styles = {

  input: {

    borderWidth: 1,

    borderColor: "#ddd",

    borderRadius: 10,

    padding: 12,

    marginTop: 12,
  },
};