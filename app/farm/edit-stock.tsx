import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Switch,
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
  const isWeb =
    Platform.OS === "web";

  if (isWeb) {
    const res =
      await fetch(uri);

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

  const res =
    await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

  const data =
    await res.json();

  return data.url;
};

export default function EditStockScreen() {
  const { id } =
    useLocalSearchParams();

  const router =
    useRouter();

  const [loading, setLoading] =
    useState(true);
    const [isSold, setIsSold] =
  useState(false);

  const [saving, setSaving] =
    useState(false);

  const [category, setCategory] =
    useState("");

  const [
    productName,
    setProductName,
  ] = useState("");

  const [quantity, setQuantity] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [images, setImages] =
    useState<string[]>([]);
    const [videoUrl, setVideoUrl] =
  useState("");
    const uploadedVideo = videoUrl;

  useEffect(() => {
    loadStock();
  }, [id]);

  const loadStock =
    async () => {
      const {
        data,
        error,
      } =
        await (supabase as any)
          .from(
            "farm_stocks"
          )
          .select("*")
          .eq("id", id)
          .single();

      if (error) {
        console.log(error);
        return;
      }

      const parsedImages =
        typeof data.images ===
        "string"
          ? JSON.parse(
              data.images
            )
          : data.images ||
            [];

      setCategory(
        data.category || ""
      );

      setProductName(
        data.product_name ||
          ""
      );

      setQuantity(
        String(
          data.quantity ||
            ""
        )
      );

      setUnit(
        data.unit || ""
      );

      setPrice(
        String(
          data.price || ""
        )
      );

      setImages(
        parsedImages
      );
       video_url: uploadedVideo;
      setIsSold(
  data.is_sold || false
);
      setLoading(false);
    };

  const pickImages =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            allowsMultipleSelection:
              true,

            quality: 0.7,
          }
        );

      if (
        !result.canceled
      ) {
        setImages(
          result.assets.map(
            (x) => x.uri
          )
        );
      }
    };

  const saveStock =
    async () => {
      try {
        setSaving(true);

        const uploaded =
          await Promise.all(
            images.map(
              (img) =>
                img.startsWith(
                  "http"
                )
                  ? Promise.resolve(
                      img
                    )
                  : uploadFile(
                      img
                    )
            )
          );

        const {
          error,
        } =
          await (
            supabase as any
          )
            .from(
              "farm_stocks"
            )
            .update({
              category,
              product_name:
                productName,
              quantity:
                Number(
                  quantity
                ),
              unit,
              price:
                Number(
                  price ||
                    0
                ),

              image_url:
                uploaded[0] ||
                null,

              images:
                uploaded,
                is_sold: isSold,
            })
            .eq("id", id);

        if (error)
          throw error;

        if (
          Platform.OS ===
          "web"
        ) {
          window.alert(
            "Product updated successfully"
          );
        } else {
          Alert.alert(
            "Success",
            "Product updated successfully"
          );
        }

        router.back();
      } catch (e) {
        console.log(e);

        if (
          Platform.OS ===
          "web"
        ) {
          window.alert(
            "Failed to update product"
          );
        } else {
          Alert.alert(
            "Error",
            "Failed to update product"
          );
        }
      }

      setSaving(false);
    };

  const deleteStock =
    async () => {
      const confirmed =
        Platform.OS ===
        "web"
          ? window.confirm(
              "Delete this product?"
            )
          : true;

      if (!confirmed)
        return;

      const {
        error,
      } =
        await (supabase as any)
          .from(
            "farm_stocks"
          )
          .delete()
          .eq("id", id);

      if (!error) {
        router.back();
      }
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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight:
            "bold",
          marginBottom: 20,
        }}
      >
        Edit Product
      </Text>

      <TouchableOpacity
        onPress={
          pickImages
        }
        style={{
          backgroundColor:
            "#2563eb",
          padding: 14,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign:
              "center",
          }}
        >
          Change Images
        </Text>
      </TouchableOpacity>

      <View
        style={{
          flexDirection:
            "row",
          flexWrap:
            "wrap",
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
                margin: 4,
                borderRadius: 10,
              }}
            />
          )
        )}
      </View>

     <Text
  style={{
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 6,
  }}
>
  Quantity
</Text>

<TextInput
  value={quantity}
  onChangeText={setQuantity}
  placeholder="Enter quantity"
  style={{
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  }}
/>

      <Text
  style={{
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 6,
  }}
>
  Price (GH₵)
</Text>

<TextInput
  value={price}
  onChangeText={setPrice}
  placeholder="Enter price"
  keyboardType="numeric"
  style={{
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  }}
/>
     <View
  style={{
    marginTop: 20,
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 12,
  }}
>
  <Text
    style={{
      fontWeight: "bold",
      fontSize: 16,
      marginBottom: 10,
    }}
  >
    Product Status
  </Text>

  <View
    style={{
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontWeight: "bold",
      }}
    >
      Mark as Sold
    </Text>

    <Switch
      value={isSold}
      onValueChange={
        setIsSold
      }
    />
  </View>
</View>

      <TouchableOpacity
        onPress={
          saveStock
        }
        disabled={
          saving
        }
        style={{
          backgroundColor:
            "green",
          padding: 16,
          borderRadius: 12,
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
          {saving
            ? "Saving..."
            : "Update Product"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={
          deleteStock
        }
        style={{
          backgroundColor:
            "#dc2626",
          padding: 16,
          borderRadius: 12,
          marginTop: 12,
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
          Delete Product
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}