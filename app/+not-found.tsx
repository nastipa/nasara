import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  const goBackHome = () => {
    // If error happened inside admin section → go back to admin dashboard
    if (pathname.startsWith("/(admin)")) {
      router.replace("/(admin)");
    } else {
      // Normal users go to browse
      router.replace("/browse");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>404 😢</Text>
      <Text style={styles.text}>Page not found</Text>

      <TouchableOpacity style={styles.btn} onPress={goBackHome}>
        <Text style={styles.btnText}>⬅ Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    marginBottom: 30,
  },
  btn: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});