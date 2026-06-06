import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type FarmProfile = {
  id: number;
  farm_name: string;
  farm_type: string | null;
  region: string | null;
};

const uploadFile = async (
  uri: string,
  type: "image" | "video",
  onProgress?: (p: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", {
      uri,
      name: type === "image" ? "image.jpg" : "video.mp4",
      type: type === "image" ? "image/jpeg" : "video/mp4",
    } as any);

    xhr.open(
      "POST",
      "https://nasara-upload-server.onrender.com/upload"
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(
          Math.round((e.loaded / e.total) * 100)
        );
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);

        if (!data?.url) {
          reject("Upload failed");
          return;
        }

        resolve(data.url);
      } catch {
        reject("Upload failed");
      }
    };

    xhr.onerror = () => reject("Upload failed");

    xhr.send(formData);
  });
};

export default function LivestockSellScreen() {
  const router = useRouter();

  /* ================= FARM ================= */

  const [farms, setFarms] = useState<FarmProfile[]>([]);
  const [selectedFarmId, setSelectedFarmId] =
    useState<number | null>(null);

  /* ================= CATEGORY ================= */

  const animalTypes = [
    "Poultry",
    "Goat",
    "Sheep",
    "Cow",
  ];

  const poultryProducts = [
    "Bird",
    "Egg",
    "Day Old Chick",
    "Fertilized Egg",
    "Breeding Stock",
  ];

  const [animalType, setAnimalType] =
    useState("");

  const [productType, setProductType] =
    useState("Bird");

  const [breed, setBreed] = useState("");

  /* ================= DETAILS ================= */

  const [quantity, setQuantity] =
    useState("");

  const [unitType, setUnitType] =
    useState("Piece");

  const [age, setAge] = useState("");

  const [weight, setWeight] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [healthStatus, setHealthStatus] =
    useState("");

  const [vaccinated, setVaccinated] =
    useState(false);

  /* ================= PRICE ================= */

  const [price, setPrice] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [location, setLocation] =
    useState("");

  /* ================= DELIVERY ================= */

  const [
    deliveryAvailable,
    setDeliveryAvailable,
  ] = useState(false);

  const [
    pickupAvailable,
    setPickupAvailable,
  ] = useState(true);

  const [
    transportAvailable,
    setTransportAvailable,
  ] = useState(false);

  /* ================= IMAGES ================= */

  const [imageUris, setImageUris] =
    useState<string[]>([]);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  /* ================= LOAD FARMS ================= */

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } =
      await (supabase as any)
        .from("farm_profiles")
        .select(
          `
            id,
            farm_name,
            farm_type,
            region
          `
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (!error && data) {
      setFarms(data);

      if (data.length > 0) {
        setSelectedFarmId(
          data[0].id
        );
      }
    }
  };

  /* ================= PICK IMAGES ================= */

  const pickImages = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync(
        {
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection:
            true,
          quality: 0.7,
        }
      );

    if (!result.canceled) {
      const uris =
        result.assets.map(
          (a) => a.uri
        );

      setImageUris((prev) => [
        ...prev,
        ...uris,
      ]);
    }
  };
  /* ================= BREEDS ================= */

  const poultryBreeds = [
    "Chicken",
    "Turkey",
    "Duck",
    "Guinea Fowl",
  ];

  const goatBreeds = [
    "West African Dwarf",
    "Boer",
    "Sahel",
  ];

  const sheepBreeds = [
    "Djallonke",
    "Dorper",
    "Sahel",
  ];

  const cowBreeds = [
    "White Fulani",
    "Gudali",
    "Ndama",
  ];

  const getBreeds = () => {
    if (animalType === "Poultry")
      return poultryBreeds;

    if (animalType === "Goat")
      return goatBreeds;

    if (animalType === "Sheep")
      return sheepBreeds;

    if (animalType === "Cow")
      return cowBreeds;

    return [];
  };
  const submitListing = async () => {
  try {
    if (!selectedFarmId) {
      Alert.alert(
        "Select Farm"
      );
      return;
    }

    if (!animalType) {
      Alert.alert(
        "Select Animal Type"
      );
      return;
    }

    if (!breed) {
      Alert.alert(
        "Select Breed"
      );
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        "Login Required"
      );
      return;
    }

    let uploadedImages: string[] =
      [];

    for (const uri of imageUris) {
      const compressed =
        await ImageManipulator.manipulateAsync(
          uri,
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
              ImageManipulator
                .SaveFormat.JPEG,
          }
        );

      const imageUrl =
        await uploadFile(
          compressed.uri,
          "image",
          setUploadProgress
        );

      uploadedImages.push(
        imageUrl
      );
    }

    const { error } =
      await (
        supabase as any
      )
        .from(
          "livestock_listings"
        )
        .insert({
          user_id: user.id,

          farm_id:
            selectedFarmId,

          animal_type:
            animalType,

          product_type:
            productType,

          breed,

          quantity:
            Number(
              quantity || 0
            ),

          unit_type:
            unitType,

          age,

          weight:
            weight
              ? Number(
                  weight
                )
              : null,

          vaccinated,

          gender,

          health_status:
            healthStatus,

          price:
            Number(
              price || 0
            ),

          description,

          location,

          image_url:
            uploadedImages[0] ||
            null,

          image_urls:
            uploadedImages,

          delivery_available:
            deliveryAvailable,

          pickup_available:
            pickupAvailable,

          transport_available:
            transportAvailable,

          status:
            "active",
        });

    if (error)
      throw error;

    Alert.alert(
      "Success 🎉",
      "Livestock listed successfully"
    );

    router.replace(
      "/livestock"
    );
  } catch (err) {
    console.log(err);

    Alert.alert(
      "Error",
      "Failed to create listing"
    );
  } finally {
    setLoading(false);
  }
};

  /* ================= UI ================= */

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
        Sell Livestock
      </Text>

      {/* FARM */}

      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        Select Farm
      </Text>

      {farms.map((farm) => (
        <TouchableOpacity
          key={farm.id}
          onPress={() =>
            setSelectedFarmId(
              farm.id
            )
          }
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor:
              selectedFarmId ===
              farm.id
                ? "green"
                : "#ddd",
            borderRadius: 10,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
            }}
          >
            {farm.farm_name}
          </Text>
        </TouchableOpacity>
      ))}

      {/* ANIMAL TYPE */}

      <Text
        style={{
          fontWeight: "bold",
          marginTop: 10,
          marginBottom: 8,
        }}
      >
        Animal Type
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {animalTypes.map(
          (item) => (
            <TouchableOpacity
              key={item}
              onPress={() =>
                setAnimalType(
                  item
                )
              }
              style={{
                padding: 10,
                borderRadius: 20,
                marginRight: 10,
                marginBottom: 10,
                backgroundColor:
                  animalType ===
                  item
                    ? "green"
                    : "#eee",
              }}
            >
              <Text
                style={{
                  color:
                    animalType ===
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

      {/* PRODUCT TYPE */}

      {animalType ===
        "Poultry" && (
        <>
          <Text
            style={{
              fontWeight:
                "bold",
              marginTop: 10,
              marginBottom: 8,
            }}
          >
            Product Type
          </Text>

          <View
            style={{
              flexDirection:
                "row",
              flexWrap:
                "wrap",
            }}
          >
            {poultryProducts.map(
              (item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() =>
                    setProductType(
                      item
                    )
                  }
                  style={{
                    padding: 10,
                    borderRadius: 20,
                    marginRight: 10,
                    marginBottom: 10,
                    backgroundColor:
                      productType ===
                      item
                        ? "green"
                        : "#eee",
                  }}
                >
                  <Text
                    style={{
                      color:
                        productType ===
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

      {/* BREED */}

      <Text
        style={{
          fontWeight: "bold",
          marginTop: 10,
          marginBottom: 8,
        }}
      >
        Breed
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
      >
        {getBreeds().map(
          (item) => (
            <TouchableOpacity
              key={item}
              onPress={() =>
                setBreed(item)
              }
              style={{
                padding: 10,
                borderRadius: 20,
                marginRight: 10,
                backgroundColor:
                  breed ===
                  item
                    ? "green"
                    : "#eee",
              }}
            >
              <Text
                style={{
                  color:
                    breed ===
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
      </ScrollView>

      {/* QUANTITY */}

      <TextInput
        placeholder="Quantity"
        value={quantity}
        onChangeText={
          setQuantity
        }
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />

      {/* UNIT TYPE */}

      {productType ===
      "Egg" ? (
        <TextInput
          placeholder="Crate / Dozen / Single Egg"
          value={unitType}
          onChangeText={
            setUnitType
          }
          style={{
            borderWidth: 1,
            borderColor:
              "#ddd",
            padding: 12,
            marginTop: 15,
            borderRadius: 10,
          }}
        />
      ) : (
        <TextInput
          placeholder="Piece"
          value={unitType}
          onChangeText={
            setUnitType
          }
          style={{
            borderWidth: 1,
            borderColor:
              "#ddd",
            padding: 12,
            marginTop: 15,
            borderRadius: 10,
          }}
        />
      )}

      <TextInput
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />

      <TextInput
        placeholder="Weight"
        value={weight}
        onChangeText={
          setWeight
        }
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />

      <TextInput
        placeholder="Gender"
        value={gender}
        onChangeText={
          setGender
        }
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />

      <TextInput
        placeholder="Health Status"
        value={
          healthStatus
        }
        onChangeText={
          setHealthStatus
        }
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />
      {/* VACCINATED */}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 15,
        }}
      >
        <Switch
          value={vaccinated}
          onValueChange={
            setVaccinated
          }
        />

        <Text
          style={{
            marginLeft: 10,
          }}
        >
          Vaccinated
        </Text>
      </View>

      {/* PRICE */}

      <TextInput
        placeholder="Price (GH₵)"
        value={price}
        onChangeText={
          setPrice
        }
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />

      {/* LOCATION */}

      <TextInput
        placeholder="Location"
        value={location}
        onChangeText={
          setLocation
        }
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
        }}
      />

      {/* DESCRIPTION */}

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={
          setDescription
        }
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          marginTop: 15,
          borderRadius: 10,
          minHeight: 120,
        }}
      />

      {/* IMAGES */}

      <TouchableOpacity
        onPress={pickImages}
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
          Select Images
        </Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        style={{
          marginTop: 15,
        }}
      >
        {imageUris.map(
          (
            image,
            index
          ) => (
            <Image
              key={index}
              source={{
                uri: image,
              }}
              style={{
                width: 120,
                height: 120,
                borderRadius: 10,
                marginRight: 10,
              }}
            />
          )
        )}
      </ScrollView>

      {/* DELIVERY */}

      <View
        style={{
          marginTop: 20,
        }}
      >
        <View
          style={{
            flexDirection:
              "row",
            justifyContent:
              "space-between",
            marginBottom: 10,
          }}
        >
          <Text>
            Delivery Available
          </Text>

          <Switch
            value={
              deliveryAvailable
            }
            onValueChange={
              setDeliveryAvailable
            }
          />
        </View>

        <View
          style={{
            flexDirection:
              "row",
            justifyContent:
              "space-between",
            marginBottom: 10,
          }}
        >
          <Text>
            Pickup Available
          </Text>

          <Switch
            value={
              pickupAvailable
            }
            onValueChange={
              setPickupAvailable
            }
          />
        </View>

        <View
          style={{
            flexDirection:
              "row",
            justifyContent:
              "space-between",
          }}
        >
          <Text>
            Transport Available
          </Text>

          <Switch
            value={
              transportAvailable
            }
            onValueChange={
              setTransportAvailable
            }
          />
        </View>
      </View>

      {/* UPLOAD PROGRESS */}

      {loading && (
        <Text
          style={{
            marginTop: 20,
            textAlign:
              "center",
          }}
        >
          Uploading...
          {uploadProgress}%
        </Text>
      )}

      {/* SUBMIT */}

      <TouchableOpacity
        onPress={
          submitListing
        }
        disabled={loading}
        style={{
          backgroundColor:
            "green",
          padding: 16,
          borderRadius: 12,
          marginTop: 30,
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
            fontSize: 16,
          }}
        >
          {loading
            ? "Posting..."
            : "Post Livestock"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}