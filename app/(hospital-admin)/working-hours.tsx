import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const showMessage = (
  title: string,
  message?: string
) => {
  if (Platform.OS === "web") {
    window.alert(
      message ? `${title}\n\n${message}` : title
    );
  } else {
    Alert.alert(title, message);
  }
};

export default function WorkingHoursScreen() {
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [hours, setHours] =
    useState<any[]>([]);

  const loadHours =
    useCallback(async () => {
      try {

        setLoading(true);

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const response =
          await fetch(
           `${API_URL}/hospital/working-hours`,
            {
              headers: {
                Authorization:
                  `Bearer ${session?.access_token}`,
              },
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ||
              "Unable to load working hours."
          );
        }

        const list = DAYS.map(
          (day, index) => {

            const existing =
              json.working_hours?.find(
                (item: any) =>
                  item.day_of_week ===
                  index + 1
              );

            return (
              existing || {
                day_of_week:
                  index + 1,
                opening_time:
                  "08:00",
                closing_time:
                  "17:00",
                is_closed:
                  false,
                is_24_hours:
                  false,
              }
            );

          }
        );

        setHours(list);

      } catch (err: any) {

        showMessage(
          "Error",
          err.message
        );

      } finally {

        setLoading(false);

      }
    }, []);

  useEffect(() => {

    loadHours();

  }, [loadHours]);

  const updateField = (
    index: number,
    field: string,
    value: any
  ) => {

    const copy = [...hours];

    copy[index][field] = value;

    if (field === "is_closed" && value) {
      copy[index].is_24_hours = false;
    }

    if (field === "is_24_hours" && value) {
      copy[index].is_closed = false;
    }

    setHours(copy);

  };

  const saveHours =
    async () => {

      try {

        setSaving(true);

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const response =
          await fetch(
            `${API_URL}/hospital/working-hours`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session?.access_token}`,
              },

              body: JSON.stringify({
                working_hours: hours,
              }),
            }
          );

        const json =
          await response.json();

        if (!response.ok) {

          throw new Error(
            json.error ||
              "Unable to save."
          );

        }

        showMessage(
          "Success",
          "Working hours updated successfully."
        );

      } catch (err: any) {

        showMessage(
          "Error",
          err.message
        );

      } finally {

        setSaving(false);

      }

    };

  if (loading) {

    return (
      <View
        style={styles.loader}
      >
        <ActivityIndicator
          size="large"
          color="#0A7CFF"
        />
      </View>
    );

  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 40,
      }}
    >
      <Text style={styles.title}>
        Hospital Working Hours
      </Text>

      <Text style={styles.subtitle}>
        Configure your hospital opening days and hours.
      </Text>

      {hours.map(
        (item, index) => (

          <View
            key={index}
            style={styles.card}
          >
            <Text
              style={styles.day}
            >
              {
                DAYS[
                  item.day_of_week - 1
                ]
              }
            </Text>

            <View
              style={styles.row}
            >
              <Text>
                Closed
              </Text>

              <Switch
                value={
                  item.is_closed
                }
                onValueChange={(
                  value
                ) =>
                  updateField(
                    index,
                    "is_closed",
                    value
                  )
                }
              />
            </View>

            <View
              style={styles.row}
            >
              <Text>
                24 Hours
              </Text>

              <Switch
                value={
                  item.is_24_hours
                }
                onValueChange={(
                  value
                ) =>
                  updateField(
                    index,
                    "is_24_hours",
                    value
                  )
                }
              />
            </View>

            {!item.is_closed &&
              !item.is_24_hours && (
                <>
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Opening Time
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      item.opening_time
                    }
                    placeholder="08:00"
                    onChangeText={(
                      text
                    ) =>
                      updateField(
                        index,
                        "opening_time",
                        text
                      )
                    }
                  />

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Closing Time
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      item.closing_time
                    }
                    placeholder="17:00"
                    onChangeText={(
                      text
                    ) =>
                      updateField(
                        index,
                        "closing_time",
                        text
                      )
                    }
                  />
                </>
              )}
          </View>

        )
      )}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveHours}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <>
            <Ionicons
              name="save"
              size={22}
              color="#fff"
            />
            <Text
              style={
                styles.saveText
              }
            >
              Save Working Hours
            </Text>
          </>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 5,
    marginBottom: 20,
    color: "#6B7280",
    fontSize: 15,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  day: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  label: {
    marginTop: 8,
    marginBottom: 6,
    color: "#374151",
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: "#fff",
    marginBottom: 12,
  },

  saveButton: {
    marginTop: 12,
    backgroundColor: "#0A7CFF",
    borderRadius: 14,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 10,
  },

});