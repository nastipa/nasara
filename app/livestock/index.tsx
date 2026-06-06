import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function LivestockMarketplace() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [animals, setAnimals] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  const [animalType, setAnimalType] =
    useState("all");

  const [
    poultryType,
    setPoultryType,
  ] = useState("all");

  const [
    verifiedOnly,
    setVerifiedOnly,
  ] = useState(false);

  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals =
    async () => {
      setLoading(true);

      const { data } =
        await (supabase as any)
          .from(
            "livestock_listings"
          )
          .select(`
            *,
            farm_profiles (
              id,
              farm_name,
              is_verified,
              rating
            )
          `)
          .eq(
            "status",
            "active"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      setAnimals(data || []);

      setLoading(false);
    };

  const filtered =
    useMemo(() => {
      let list = [
        ...animals,
      ];

      if (
        animalType !== "all"
      ) {
        list = list.filter(
          (x) =>
            x.animal_type ===
            animalType
        );
      }

      if (
        animalType ===
          "poultry" &&
        poultryType !==
          "all"
      ) {
        list = list.filter(
          (x) =>
            x.breed
              ?.toLowerCase()
              .includes(
                poultryType.toLowerCase()
              )
        );
      }

      if (
        verifiedOnly
      ) {
        list = list.filter(
          (x) =>
            x
              ?.farm_profiles
              ?.is_verified ===
            true
        );
      }

      if (search) {
        const q =
          search.toLowerCase();

        list = list.filter(
          (x) =>
            x.breed
              ?.toLowerCase()
              .includes(q) ||
            x.location
              ?.toLowerCase()
              .includes(q)
        );
      }

      return list;
    }, [
      animals,
      search,
      animalType,
      poultryType,
      verifiedOnly,
    ]);

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
    <FlatList
      data={filtered}
      keyExtractor={(x) =>
        String(x.id)
      }
      numColumns={2}
      contentContainerStyle={{
        padding: 12,
      }}
      ListHeaderComponent={
        <>
          <Text
            style={{
              fontSize: 26,
              fontWeight:
                "bold",
              marginBottom: 12,
            }}
          >
            Livestock Market
          </Text>

          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            placeholder="Search livestock..."
            style={{
              borderWidth: 1,
              borderColor:
                "#ddd",
              padding: 12,
              borderRadius: 10,
              marginBottom: 12,
            }}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
          >
            {[
              "all",
              "poultry",
              "goat",
              "sheep",
              "cow",
            ].map((x) => (
              <TouchableOpacity
                key={x}
                onPress={() =>
                  setAnimalType(
                    x
                  )
                }
                style={{
                  backgroundColor:
                    animalType ===
                    x
                      ? "#16a34a"
                      : "#eee",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                }}
              >
                <Text>
                  {x}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {animalType ===
            "poultry" && (
            <ScrollView
              horizontal
              style={{
                marginTop: 10,
              }}
            >
              {[
                "all",
                "chicken",
                "turkey",
                "duck",
                "guinea",
              ].map(
                (x) => (
                  <TouchableOpacity
                    key={x}
                    onPress={() =>
                      setPoultryType(
                        x
                      )
                    }
                    style={{
                      backgroundColor:
                        poultryType ===
                        x
                          ? "#2563eb"
                          : "#eee",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                    }}
                  >
                    <Text>
                      {x}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={() =>
              setVerifiedOnly(
                !verifiedOnly
              )
            }
            style={{
              marginTop: 12,
              backgroundColor:
                verifiedOnly
                  ? "#22c55e"
                  : "#ddd",
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text>
              Verified Farms
              Only
            </Text>
          </TouchableOpacity>
        </>
      }
      renderItem={({
        item,
      }) => (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname:
                "/livestock/[id]",
              params: {
                id: item.id,
              },
            })
          }
          style={{
            width: "48%",
            margin: "1%",
            backgroundColor:
              "#fff",
            borderRadius: 12,
            overflow:
              "hidden",
          }}
        >
          <Image
            source={{
              uri:
                item.image_url,
            }}
            style={{
              width: "100%",
              height: 150,
            }}
          />

          <View
            style={{
              padding: 10,
            }}
          >
            <Text
              numberOfLines={
                1
              }
              style={{
                fontWeight:
                  "bold",
              }}
            >
              {item.breed}
            </Text>

            <Text>
              GH₵
              {item.price}
            </Text>

            <Text>
              {item.location}
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname:
                    "/farm/[id]",
                  params: {
                    id:
                      item.farm_id,
                  },
                })
              }
            >
              <Text
                style={{
                  color:
                    "#2563eb",
                  marginTop: 5,
                }}
              >
                View Farm
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}