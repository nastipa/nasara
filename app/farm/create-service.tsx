import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const SERVICE_CATEGORIES = [
  "Tractor Rental",
  "Harvester Rental",
  "Sprayer Rental",
  "Water Pump Rental",
  "Plough Rental",
  "Generator Rental",

  "Tractor Ploughing",
  "Harvesting",
  "Crop Spraying",
  "Veterinary Service",
  "Animal Vaccination",
  "Artificial Insemination",
  "Transportation",
  "Farm Consultancy",
  "Irrigation Installation",
];

const uploadFile = async (
  uri: string
): Promise<string> => {
  const formData =
    new FormData();

  formData.append(
    "file",
    {
      uri,
      name: "service.jpg",
      type: "image/jpeg",
    } as any
  );

  const upload =
    await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

  const data =
    await upload.json();

  return data.url;
};

export default function CreateServiceScreen() {
  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState("");

  const [serviceName, setServiceName] =
    useState("");

  const [
    serviceCategory,
    setServiceCategory,
  ] = useState("");

  const [description, setDescription] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [images, setImages] =
    useState<string[]>([]);

  const [videoUri, setVideoUri] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data } =
      await (supabase as any)
        .from("farm_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (data) {
      setFarmId(data.id);
    }
  };

  const pickMedia = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.7,
      });

    if (result.canceled)
      return;

    const video =
      result.assets.find(
        (a) =>
          a.type === "video"
      );

    if (video) {
      setVideoUri(
        video.uri
      );

      setImages([]);

      return;
    }

    const newUris =
      result.assets.map(
        (a) => a.uri
      );

    setVideoUri("");

    setImages(newUris);
  };

  const saveService =
    async () => {
      try {
        if (!farmId) {
          Alert.alert(
            "Farm not found"
          );
          return;
        }

        if (
          !serviceCategory
        ) {
          Alert.alert(
            "Select service category"
          );
          return;
        }

        if (
          !serviceName.trim()
        ) {
          Alert.alert(
            "Enter service name"
          );
          return;
        }

        setSaving(true);

        let uploadedVideo =
          null;

        if (videoUri) {
          uploadedVideo =
            await uploadFile(
              videoUri
            );
        }

        const uploadedImages =
          await Promise.all(
            images.map(
              (img) =>
                uploadFile(img)
            )
          );

        const {
          error,
        } =
          await (supabase as any)
            .from(
              "farm_stocks"
            )
            .insert({
              farm_id: farmId,
              user_id: userId,

              listing_type:
                "service",

              category:
                serviceCategory,

              product_name:
                serviceName,

              description,

              quantity: 0,

              unit:
                "Service",

              price:
                Number(
                  price || 0
                ),

              image_url:
                uploadedImages[0] ||
                null,

              images:
                uploadedImages,

              video_url:
                uploadedVideo,
            });
if (error) {
  console.log(
    "SERVICE ERROR",
    error
  );

  Alert.alert(
    "Error",
    error.message
  );

  return;
}

        Alert.alert(
          "Success",
          "Service created successfully"
        );

        setServiceName("");
        setServiceCategory("");
        setDescription("");
        setPrice("");
        setImages([]);
        setVideoUri("");
      } catch (e: any) {
  console.log(
    "CREATE SERVICE ERROR",
    e
  );

  Alert.alert(
    "Error",
    e?.message ||
      "Failed to create service"
  );
}
      setSaving(false);
    };

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Create Farm Service
      </Text>

      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        Service Category
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {SERVICE_CATEGORIES.map(
          (item) => (
            <TouchableOpacity
              key={item}
              onPress={() =>
                setServiceCategory(
                  item
                )
              }
              style={{
                backgroundColor:
                  serviceCategory ===
                  item
                    ? "#16a34a"
                    : "#eee",

                paddingHorizontal: 12,
                paddingVertical: 10,

                borderRadius: 20,

                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text>
                {item}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <Text
  style={{
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 6,
    color: "#111827",
  }}
>
  Service Name
</Text>

<TextInput
  placeholder="Enter service name"
  value={serviceName}
  onChangeText={setServiceName}
  style={{
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  }}
/>

      <Text
  style={{
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 6,
    color: "#111827",
  }}
>
  Description
</Text>

<TextInput
  placeholder="Description"
  value={description}
  onChangeText={setDescription}
  style={{
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  }}
/>
      <Text
  style={{
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 6,
    color: "#111827",
  }}
>
  Price
</Text>

      <TextInput
        placeholder="Price"
        value={price}
        onChangeText={
          setPrice
        }
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginTop: 20,
        }}
      />

      <TouchableOpacity
        onPress={pickMedia}
        style={{
          backgroundColor:
            "#2563eb",
          padding: 14,
          borderRadius: 10,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign:
              "center",
            fontWeight:
              "bold",
          }}
        >
          Select Images / Video
        </Text>
      </TouchableOpacity>

      {videoUri ? (
        <Text
          style={{
            color: "#22c55e",
            marginTop: 10,
          }}
        >
          🎥 Video Selected
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        {images.map(
          (
            uri,
            index
          ) => (
            <Image
              key={index}
              source={{
                uri,
              }}
              style={{
                width: 100,
                height: 100,
                margin: 5,
                borderRadius: 10,
              }}
            />
          )
        )}
      </View>

      <TouchableOpacity
        onPress={saveService}
        disabled={saving}
        style={{
          backgroundColor:
            "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 25,
          marginBottom: 50,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign:
              "center",
            fontWeight:
              "bold",
          }}
        >
          {saving
            ? "Saving..."
            : "Create Service"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}