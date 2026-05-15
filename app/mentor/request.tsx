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

  const [whatsapp, setWhatsapp] =
    useState("");

  const [email, setEmail] =
    useState("");

  const requestMentor =
    async () => {
      try {
        if (!fullName || !field) {
          Alert.alert(
            "Missing Info",
            "Full name and field are required"
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

              whatsapp,

              email,
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
    >
      <Text style={styles.title}>
        Request a Mentor
      </Text>

      <TextInput
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />

      <TextInput
        placeholder="Field Needed (e.g. Tech)"
        value={field}
        onChangeText={setField}
        style={styles.input}
      />

      <TextInput
        placeholder="What help do you need?"
        value={goals}
        onChangeText={setGoals}
        multiline
        style={[
          styles.input,
          {
            height: 120,
          },
        ]}
      />

      <TextInput
        placeholder="WhatsApp Number"
        value={whatsapp}
        onChangeText={setWhatsapp}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />

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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 25,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",

    borderRadius: 10,

    padding: 14,

    marginBottom: 15,

    fontSize: 16,
  },

  button: {
    backgroundColor: "#16a34a",

    padding: 16,

    borderRadius: 10,

    alignItems: "center",

    marginTop: 10,
  },

  btnText: {
    color: "#fff",

    fontWeight: "bold",

    fontSize: 16,
  },
});