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

export default function ApplyMentorScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [field, setField] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [occupation, setOccupation] =
    useState("");

  const [
    yearsExperience,
    setYearsExperience,
  ] = useState("");

  const [
    availability,
    setAvailability,
  ] = useState("");

  const applyMentor = async () => {
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
          .from("mentors")
          .insert({
            user_id: user.id,

            full_name: fullName,

            field,

            bio,

            phone_number:
              phoneNumber,

            email,

            occupation,

            years_experience:
              yearsExperience,

            availability,
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
          "Mentor application submitted successfully"
        );
      } else {
        Alert.alert(
          "Success",
          "Application submitted successfully"
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
        Become a Mentor
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
          Field
        </Text>

        <TextInput
          placeholder="e.g. Business"
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
          placeholder="Your profession"
          placeholderTextColor="#9ca3af"
          value={occupation}
          onChangeText={setOccupation}
          style={styles.input}
        />
      </View>

      {/* BIO */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Short Bio
        </Text>

        <TextInput
          placeholder="Tell mentees about yourself"
          placeholderTextColor="#9ca3af"
          value={bio}
          onChangeText={setBio}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            {
              height: 110,
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

      {/* EXPERIENCE */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Years of Experience
        </Text>

        <TextInput
          placeholder="e.g. 5 years"
          placeholderTextColor="#9ca3af"
          value={yearsExperience}
          onChangeText={
            setYearsExperience
          }
          style={styles.input}
        />
      </View>

      {/* AVAILABILITY */}
      <View
        style={styles.fieldContainer}
      >
        <Text style={styles.label}>
          Availability
        </Text>

        <TextInput
          placeholder="e.g. Weekends"
          placeholderTextColor="#9ca3af"
          value={availability}
          onChangeText={
            setAvailability
          }
          style={styles.input}
        />
      </View>

      <Text style={styles.infoText}>
        After matching, mentees can
        contact you using your phone
        number or connect with you
        through Discover Users on
        Nasara.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={applyMentor}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.btnText}>
            Apply as Mentor
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
    backgroundColor: "#2563eb",

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