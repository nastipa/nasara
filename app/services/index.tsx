import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ServicesHome() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

useEffect(() => {
  checkUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    checkUser();
  });

  return () => subscription.unsubscribe();
}, []);

const checkUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  setLoggedIn(!!user);
};

  const ServiceBtn = ({
    title,
    service,
    color,
  }: any) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/services/apply",
          params: { service },
        })
      }
      style={{
        backgroundColor: color,
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 26,
          fontWeight: "bold",
        }}
      >
        ⚡ NEDCo Utility Services
      </Text>

      <Text
        style={{
          marginBottom: 20,
          color: "#666",
        }}
      >
        Apply for electricity services in Ghana
      </Text>

      <ServiceBtn
  title="Separate Meter (Domestic)"
  service="separate_domestic"
  color="#16a34a"
/>

<ServiceBtn
  title="New Service Meter"
  service="new_service"
  color="#2563eb"
/>

<ServiceBtn
  title="Commercial Meter"
  service="commercial_meter"
  color="#7c3aed"
/>

<ServiceBtn
  title="Transfer Meter"
  service="transfer_meter"
  color="#ea580c"
/>
      <View
  style={{
    marginTop: 30,
  }}
>
  {loggedIn ? (
    <>
      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 12,
          fontSize: 18,
        }}
      >
        My Account
      </Text>

      <TouchableOpacity
        onPress={() =>
          router.push("/services/my-applications")
        }
        style={{
          backgroundColor: "#16a34a",
          padding: 15,
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          📄 My Applications
        </Text>
      </TouchableOpacity>
    </>
  ) : (
    <>
      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 12,
          fontSize: 18,
        }}
      >
        Continue As
      </Text>

      <TouchableOpacity
        onPress={() =>
          router.push("/(auth)/login")
        }
        style={{
          backgroundColor: "#0f172a",
          padding: 15,
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Login with Nasara Account
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push("/services/guest-login")
        }
        style={{
          backgroundColor: "#2563eb",
          padding: 15,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Guest Account
        </Text>
      </TouchableOpacity>
    </>
  )}
</View>
    </ScrollView>
  );
}