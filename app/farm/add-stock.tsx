import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const STOCK_CATEGORIES = [
  "Poultry",
  "Livestock",
  "Crops",
  "Fish Farming",
  "Mixed Farm",
];

const STOCK_PRODUCTS: any = {
  Poultry: [
    "Chicken",
    "Turkey",
    "Duck",
    "Guinea Fowl",
    "Egg Crates",
  ],

  Livestock: [
    "Goat",
    "Sheep",
    "Cow",
  ],

  Crops: [
    "Maize",
    "Rice",
    "Cassava",
    "Yam",
    "Cocoa",
    "Vegetables",
  ],

  "Fish Farming": [
    "Fish Farming",
  ],

  "Mixed Farm": [
    "Mixed Farm",
  ],
};

const STOCK_UNITS = [
  "Animals",
  "Bags",
  "Crates",
  "Kg",
  "Tonnes",
  "Ponds",
];

const uploadFile = async (
  uri: string
): Promise<string> => {
  if (Platform.OS === "web") {
    const res = await fetch(uri);

    const blob =
      await res.blob();

    const formData =
      new FormData();

    formData.append(
      "file",
      new File(
        [blob],
        "farm-stock.jpg",
        {
          type:
            "image/jpeg",
        }
      )
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
  }

  const formData =
    new FormData();

  formData.append(
    "file",
    {
      uri,
      name:
        "farm-stock.jpg",
      type:
        "image/jpeg",
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

export default function AddStockScreen() {
  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState<string>("");

  const [category, setCategory] =
    useState("");

  const [productName, setProductName] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [price, setPrice] =
    useState("");
    const [images, setImages] =
  useState<string[]>([]);
  

  const [saving, setSaving] =
    useState(false);
    const [videoUrl, setVideoUrl] =
  useState("");
  const [videoUri, setVideoUri] =
  useState("");
  const uploadedVideo = videoUrl;
    
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

  setImages(
    (prev) => [
      ...prev,
      ...newUris,
    ]
  );
};

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  const saveStock = async () => {
    try {
      if (!farmId) return;

      if (!category) {
        Alert.alert("Select category");
        return;
      }

      if (!productName) {
        Alert.alert("Select product");
        return;
      }

      if (!quantity) {
        Alert.alert("Enter quantity");
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
    images.map((img) =>
      uploadFile(img)
    )
  );

const { error } =
  await (supabase as any)
    .from("farm_stocks")
    .insert({
      farm_id: farmId,
      user_id: userId,
      category,
      product_name: productName,
      quantity: Number(quantity),
      unit,
      price: Number(price || 0),

      image_url:
        uploadedImages[0] || null,

      images:
       
          uploadedImages,
          video_url: uploadedVideo,
      
    });
      if (error) throw error;

      Alert.alert(
        "Success",
        "Stock added successfully"
      );

      setCategory("");
      setProductName("");
      setQuantity("");
      setUnit("");
      setPrice("");
    } catch (e) {
      console.log(e);

      Alert.alert(
        "Error",
        "Failed to save stock"
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
        Add Farm Stock
      </Text>

      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        Category
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {STOCK_CATEGORIES.map(
          (item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                setCategory(item);
                setProductName("");
              }}
              style={{
                backgroundColor:
                  category ===
                  item
                    ? "green"
                    : "#eee",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color:
                    category ===
                    item
                      ? "#fff"
                      : "#000",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {category !== "" && (
        <>
          <Text
            style={{
              fontWeight:
                "bold",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            Product
          </Text>

          <View
            style={{
              flexDirection:
                "row",
              flexWrap:
                "wrap",
            }}
          >
            {STOCK_PRODUCTS[
              category
            ]?.map(
              (
                item: string
              ) => (
                <TouchableOpacity
                  key={item}
                  onPress={() =>
                    setProductName(
                      item
                    )
                  }
                  style={{
                    backgroundColor:
                      productName ===
                      item
                        ? "#2563eb"
                        : "#eee",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        productName ===
                        item
                          ? "#fff"
                          : "#000",
                    }}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </>
      )}

      <TextInput
        placeholder="Quantity"
        value={quantity}
        onChangeText={
          setQuantity
        }
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginTop: 20,
        }}
      />

      <Text
        style={{
          fontWeight: "bold",
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Unit
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {STOCK_UNITS.map(
          (item) => (
            <TouchableOpacity
              key={item}
              onPress={() =>
                setUnit(item)
              }
              style={{
                backgroundColor:
                  unit === item
                    ? "#f97316"
                    : "#eee",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color:
                    unit === item
                      ? "#fff"
                      : "#000",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <TextInput
        placeholder="Price (optional)"
        value={price}
        onChangeText={setPrice}
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
    backgroundColor: "#2563eb",
    padding: 14,
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
    Select Images/ Video
  </Text>
</TouchableOpacity>
{videoUri ? (
  <Text
    style={{
      color: "#22c55e",
      marginTop: 10,
      fontWeight: "bold",
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
  {images.map((uri, index) => (
    <Image
      key={index}
      source={{ uri }}
      style={{
        width: 100,
        height: 100,
        margin: 5,
        borderRadius: 12,
      }}
    />
  ))}
</View>

      <TouchableOpacity
        onPress={saveStock}
        disabled={saving}
        style={{
          backgroundColor:
            "green",
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
            : "Add Stock"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}