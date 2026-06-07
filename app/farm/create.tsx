import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
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

const FARM_TYPES = [
  "Poultry",
  "Livestock",
  "Vegetables",
  "Cereals",
  "Tubers",
  "Mixed Farming",
  "Fish Farming",
  "Fruit Farming",
  "Cash Crops",
  "Other",
];

const SELLER_TYPES = [
  "Farmer",
  "Livestock Farmer",
  "Poultry Farmer",
  "Fertilizer Dealer",
  "Seed Dealer",
  "Implement Dealer",
  "Veterinary Supplier",
  "Farm Service Provider",
];
const uploadFile = async (
  uri: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();

    formData.append(
      "file",
      blob,
      "farm-image.jpg"
    );
  } else {
    formData.append("file", {
      uri,
      name: "farm-image.jpg",
      type: "image/jpeg",
    } as any);
  }

  const res = await fetch(
    "https://nasara-upload-server.onrender.com/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  return data.url;
};
export default function CreateFarmScreen() {
  const router = useRouter();

  const [farmName, setFarmName] =
    useState("");

  const [farmType, setFarmType] =
    useState("");
    const [sellerType, setSellerType] =
  useState("");

  const [region, setRegion] =
    useState("");

  const [district, setDistrict] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [logoUri, setLogoUri] =
    useState<string | null>(null);

  const [coverUri, setCoverUri] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const pickLogo = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

    if (!result.canceled) {
      setLogoUri(
        result.assets[0].uri
      );
    }
  };

  const pickCover = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

    if (!result.canceled) {
      setCoverUri(
        result.assets[0].uri
      );
    }
  };
  const createFarm = async () => {
    try {
      if (!farmName.trim()) {
        Alert.alert("Farm name required");
        return;
      }

      if (!farmType) {
        Alert.alert("Select farm type");
        return;
      }

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Login required");
        return;
      }

      const {
        data: existingFarm,
      } = await (supabase as any)
        .from("farm_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingFarm) {
        Alert.alert(
          "Farm Exists",
          "You can only create one farm."
        );
        return;
      }

      let logoUrl = null;
      let coverUrl = null;

      if (logoUri) {
        const compressed =
          await ImageManipulator.manipulateAsync(
            logoUri,
            [
              {
                resize: {
                  width: 1200,
                },
              },
            ],
            {
              compress: 0.7,
              format:
                ImageManipulator.SaveFormat.JPEG,
            }
          );

        logoUrl =
          await uploadFile(
            compressed.uri,
            setProgress
          );
      }

      if (coverUri) {
        const compressed =
          await ImageManipulator.manipulateAsync(
            coverUri,
            [
              {
                resize: {
                  width: 1200,
                },
              },
            ],
            {
              compress: 0.7,
              format:
                ImageManipulator.SaveFormat.JPEG,
            }
          );

        coverUrl =
          await uploadFile(
            compressed.uri,
            setProgress
          );
      }

      const { data, error } =
        await (supabase as any)
          .from("farm_profiles")
          .insert({
            user_id: user.id,

            farm_name: farmName,

            farm_type: farmType,

            seller_type: sellerType,

            region,

            district,

            bio,

            farm_logo: logoUrl,

            profile_photo: logoUrl,

            farm_cover: coverUrl,

            cover_photo: coverUrl,

            is_verified: false,

            verified_farm: false,

            rating: 0,

            reviews_count: 0,

            total_sales: 0,

            total_animals_sold: 0,

            poultry_count: 0,

            goat_count: 0,

            sheep_count: 0,

            cow_count: 0,
          })
          .select()
          .single();

      if (error) throw error;

      Alert.alert(
        "Success 🎉",
        "Farm created successfully"
      );

      router.push({
        pathname: "/farm/[id]",
        params: {
          id: data.id,
        },
      });
    } catch (err) {
      console.log(err);

      Alert.alert(
        "Error",
        "Could not create farm"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        backgroundColor: "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Create Farm
      </Text>

      <Text
  style={{
    fontWeight: "bold",
    marginBottom: 5,
  }}
>
  Farm Name
</Text>

<TextInput
  placeholder="Farm name"

        value={farmName}
        onChangeText={setFarmName}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        Farm Type
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {FARM_TYPES.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() =>
              setFarmType(item)
            }
            style={{
              backgroundColor:
                farmType === item
                  ? "#16a34a"
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
                  farmType === item
                    ? "#fff"
                    : "#000",
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
          
        ))}
        
      </View>
      <Text
  style={{
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  }}
>
  Seller Type
</Text>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
  }}
>
  {SELLER_TYPES.map((item) => (
    <TouchableOpacity
      key={item}
      onPress={() =>
        setSellerType(item)
      }
      style={{
        backgroundColor:
          sellerType === item
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
            sellerType === item
              ? "#fff"
              : "#000",
        }}
      >
        {item}
      </Text>
    </TouchableOpacity>
  ))}
</View>
      
      

      <Text
  style={{
    fontWeight: "bold",
    marginBottom: 5,
  }}
>
  Region
</Text>
<TextInput
  placeholder="Region"
        value={region}
        onChangeText={setRegion}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 12,
          marginTop: 15,
        }}
      />

      <Text
  style={{
    fontWeight: "bold",
    marginBottom: 5,
  }}
>
  District
</Text>

<TextInput
  placeholder="District"

        value={district}
        onChangeText={setDistrict}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 12,
          marginTop: 15,
        }}
      />

      <Text
  style={{
    fontWeight: "bold",
    marginBottom: 5,
  }}
>
  Farm Bio
</Text>

<TextInput
  placeholder=" Farm Bio"

        value={bio}
        onChangeText={setBio}
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 12,
          minHeight: 120,
          marginTop: 15,
        }}
      />

      <TouchableOpacity
        onPress={pickLogo}
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
          Select Farm Logo
        </Text>
      </TouchableOpacity>

      {!!logoUri && (
        <Image
          source={{ uri: logoUri }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            marginTop: 10,
            alignSelf: "center",
          }}
        />
      )}

      <TouchableOpacity
        onPress={pickCover}
        style={{
          backgroundColor: "#7c3aed",
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
          Select Farm Cover
        </Text>
      </TouchableOpacity>

      {!!coverUri && (
        <Image
          source={{ uri: coverUri }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginTop: 10,
          }}
        />
      )}

      {loading && (
        <Text
          style={{
            textAlign: "center",
            marginTop: 15,
          }}
        >
          Uploading... {progress}%
        </Text>
      )}

      <TouchableOpacity
        disabled={loading}
        onPress={createFarm}
        style={{
          backgroundColor: "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 30,
          marginBottom: 50,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Create Farm
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}