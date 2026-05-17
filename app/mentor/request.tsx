import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function RequestMentorScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [field, setField] =
    useState("");

  const [goals, setGoals] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [occupation, setOccupation] =
    useState("");

  const requestMentor =
    async () => {
      try {
        if (
          !fullName ||
          !field ||
          !phoneNumber ||
          !email
        ) {
          Alert.alert(
            "Missing Info",
            "Please fill all required fields"
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
            "Login Required",
            "Please login first"
          );

          setLoading(false);

          return;
        }

        const { error } =
          await (supabase as any)
            .from(
              "mentor_requests"
            )
            .insert({
              user_id: user.id,

              full_name:
                fullName,

              field,

              goals,

              phone_number:
                phoneNumber,

              email,

              occupation,
            });

        if (error) {
          console.log(error);

          Alert.alert(
            "Error",
            error.message
          );

          setLoading(false);

          return;
        }

        if (Platform.OS === "web") {
          window.alert(
            "Mentor request submitted successfully"
          );
        } else {
          Alert.alert(
            "Success",
            "Mentor request submitted successfully"
          );
        }

        router.back();

      } catch (e: any) {
        console.log(e);

        Alert.alert(
          "Error",
          e.message
        );
      }

      setLoading(false);
    };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Find a Mentor
      </Text>

      {/* FULL NAME */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Full Name
        </Text>

        <TextInput
          placeholder="Enter your full name"
          placeholderTextColor="#9ca3af"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
        />
      </View>

      {/* FIELD */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Field Needed
        </Text>

        <TextInput
          placeholder="e.g. Tech, Business"
          placeholderTextColor="#9ca3af"
          value={field}
          onChangeText={setField}
          style={styles.input}
        />
      </View>

      {/* OCCUPATION */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Occupation / Profession
        </Text>

        <TextInput
          placeholder="Your current profession"
          placeholderTextColor="#9ca3af"
          value={occupation}
          onChangeText={setOccupation}
          style={styles.input}
        />
      </View>

      {/* GOALS */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          What Help Do You Need?
        </Text>

        <TextInput
          placeholder="Describe your goals and what you want to learn"
          placeholderTextColor="#9ca3af"
          value={goals}
          onChangeText={setGoals}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            {
              height: 120,
              paddingTop: 14,
            },
          ]}
        />
      </View>

      {/* PHONE */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Phone Number
        </Text>

        <TextInput
          placeholder="Enter phone number"
          placeholderTextColor="#9ca3af"
          value={phoneNumber}
          onChangeText={
            setPhoneNumber
          }
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>

      {/* EMAIL */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Email Address
        </Text>

        <TextInput
          placeholder="Enter email"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>

      <Text style={styles.infoText}>
        After matching, you can
        contact your mentor using
        their phone number or
        connect through Discover
        Users on Nasara.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={requestMentor}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.btnText}>
            Request Mentor
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 25,
    color: "#111827",
  },

  fieldContainer: {
    marginBottom: 18,
  },

  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",

    borderRadius: 12,

    padding: 14,

    fontSize: 16,

    backgroundColor: "#fff",

    color: "#111827",
  },

  infoText: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 5,
  },

  button: {
    backgroundColor: "#16a34a",

    padding: 16,

    borderRadius: 12,

    alignItems: "center",

    marginTop: 10,
  },

  btnText: {
    color: "#fff",

    fontWeight: "bold",

    fontSize: 16,
  },
});