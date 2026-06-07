import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function EditFarmScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [farmName, setFarmName] =
    useState("");

  const [farmType, setFarmType] =
    useState("");

  const [region, setRegion] =
    useState("");

  const [district, setDistrict] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [farmLogo, setFarmLogo] =
    useState("");

  const [farmCover, setFarmCover] =
    useState("");

  const [logoUri, setLogoUri] =
    useState<string | null>(null);

  const [coverUri, setCoverUri] =
    useState<string | null>(null);

  useEffect(() => {
    loadFarm();
  }, []);

  const uploadFile = async (
    uri: string
  ): Promise<string> => {
    const formData =
      new FormData();

    if (
      Platform.OS === "web"
    ) {
      const response =
        await fetch(uri);

      const blob =
        await response.blob();

      formData.append(
        "file",
        blob,
        "farm-image.jpg"
      );
    } else {
      formData.append(
        "file",
        {
          uri,
          name:
            "farm-image.jpg",
          type:
            "image/jpeg",
        } as any
      );
    }

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

  const pickLogo =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          }
        );

      if (
        !result.canceled
      ) {
        setLogoUri(
          result.assets[0].uri
        );
      }
    };

  const pickCover =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          }
        );

      if (
        !result.canceled
      ) {
        setCoverUri(
          result.assets[0].uri
        );
      }
    };

  const loadFarm =
    async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { data } =
        await (supabase as any)
          .from(
            "farm_profiles"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .single();

      if (data) {
        setFarmId(data.id);

        setFarmName(
          data.farm_name ||
            ""
        );

        setFarmType(
          data.farm_type ||
            ""
        );

        setRegion(
          data.region || ""
        );

        setDistrict(
          data.district ||
            ""
        );

        setBio(
          data.bio || ""
        );

        setFarmLogo(
          (
            data.profile_photo ||
            data.farm_logo ||
            ""
          ) +
            "?t=" +
            Date.now()
        );

        setFarmCover(
          (
            data.cover_photo ||
            data.farm_cover ||
            ""
          ) +
            "?t=" +
            Date.now()
        );
      }

      setLoading(false);
    };

  const saveFarm = async () => {
  try {
    if (!farmId) return;

    setSaving(true);

    let logoUrl =
      farmLogo?.split("?")[0] || "";

    let coverUrl =
      farmCover?.split("?")[0] || "";

    if (logoUri) {
      logoUrl =
        await uploadFile(
          logoUri
        );
    }

    if (coverUri) {
      coverUrl =
        await uploadFile(
          coverUri
        );
    }

    const {
      data,
      error,
    } = await (supabase as any)
      .from("farm_profiles")
      .update({
        farm_name: farmName,
        farm_type: farmType,
        region,
        district,
        bio,

        profile_photo:
          logoUrl,

        farm_logo:
          logoUrl,

        cover_photo:
          coverUrl,

        farm_cover:
          coverUrl,
      })
      .eq("id", farmId)
      .select();

    console.log(
      "UPDATE DATA",
      data
    );

    console.log(
      "UPDATE ERROR",
      error
    );

    if (error) {
      Alert.alert(
        "Update Error",
        error.message
      );

      return;
    }

    Alert.alert(
      "Success",
      "Farm updated successfully"
    );

    router.back();
  } catch (e: any) {
    console.log(
      "SAVE FARM ERROR",
      e
    );

    Alert.alert(
      "Error",
      e?.message ||
        "Failed to update farm"
    );
  } finally {
    setSaving(false);
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
        Edit Farm
      </Text>

      <TouchableOpacity
        onPress={pickLogo}
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
            fontWeight:
              "bold",
          }}
        >
          Change Farm Logo
        </Text>
      </TouchableOpacity>

      {!!(
        logoUri ||
        farmLogo
      ) && (
        <Image
          source={{
            uri:
              logoUri ||
              farmLogo,
          }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            marginTop: 12,
            alignSelf:
              "center",
          }}
        />
      )}

      <TouchableOpacity
        onPress={pickCover}
        style={{
          backgroundColor:
            "#7c3aed",
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
          Change Farm Cover
        </Text>
      </TouchableOpacity>

      {!!(
        coverUri ||
        farmCover
      ) && (
        <Image
          source={{
            uri:
              coverUri ||
              farmCover,
          }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginTop: 12,
          }}
          contentFit="cover"
        />
      )}

      <TextInput
        placeholder="Farm Name"
        value={farmName}
        onChangeText={
          setFarmName
        }
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginTop: 20,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Farm Type"
        value={farmType}
        onChangeText={
          setFarmType
        }
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Region"
        value={region}
        onChangeText={
          setRegion
        }
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="District"
        value={district}
        onChangeText={
          setDistrict
        }
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Farm Bio"
        value={bio}
        onChangeText={
          setBio
        }
        multiline
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          minHeight: 120,
        }}
      />

      <TouchableOpacity
        onPress={saveFarm}
        disabled={saving}
        style={{
          backgroundColor:
            "green",
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
          marginBottom: 40,
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
            : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}