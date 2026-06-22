import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AssignMeter() {
  const { applicationId } =
    useLocalSearchParams();

  const router = useRouter();

  const [meter, setMeter] = useState("");
  const [meterType, setMeterType] =
    useState("Prepaid");

  const [loading, setLoading] =
    useState(false);

  const assign = async () => {
    if (!meter) {
      Alert.alert(
        "Enter meter number"
      );
      return;
    }

    try {
      setLoading(true);

      const { error } =
        await (supabase as any)
          .from(
            "utility_applications"
          )
          .update({
            meter_number: meter,
            meter_type: meterType,
            status: "Completed",
            completion_date:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            applicationId
          );

      if (error) throw error;

      Alert.alert(
        "Success",
        "Meter assigned successfully."
      );

      router.replace(
        "/(utilities-admin)/applications"
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
      contentContainerStyle={{
        padding: 20,
      }}
    >
      <View
        style={{
          backgroundColor: "#2563eb",
          padding: 22,
          borderRadius: 20,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 26,
            fontWeight: "800",
          }}
        >
          Assign Meter
        </Text>

        <Text
          style={{
            color: "#dbeafe",
            marginTop: 5,
          }}
        >
          Complete customer installation
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          padding: 18,
          borderRadius: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Meter Number
        </Text>

        <TextInput
          placeholder="Enter meter number"
          value={meter}
          onChangeText={setMeter}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 12,
            padding: 14,
          }}
        />
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          padding: 18,
          borderRadius: 18,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Meter Type
        </Text>

        <TouchableOpacity
          onPress={() =>
            setMeterType(
              "Prepaid"
            )
          }
          style={{
            backgroundColor:
              meterType ===
              "Prepaid"
                ? "#16a34a"
                : "#e5e7eb",
            padding: 14,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "700",
              color:
                meterType ===
                "Prepaid"
                  ? "#fff"
                  : "#111827",
            }}
          >
            Prepaid Meter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setMeterType(
              "Postpaid"
            )
          }
          style={{
            backgroundColor:
              meterType ===
              "Postpaid"
                ? "#16a34a"
                : "#e5e7eb",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "700",
              color:
                meterType ===
                "Postpaid"
                  ? "#fff"
                  : "#111827",
            }}
          >
            Postpaid Meter
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={assign}
        disabled={loading}
        style={{
          backgroundColor: "#16a34a",
          padding: 18,
          borderRadius: 16,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "800",
            fontSize: 16,
          }}
        >
          {loading
            ? "Assigning..."
            : "Assign Meter & Complete"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}