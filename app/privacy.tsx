import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Privacy() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.date}>Effective Date: April 2026</Text>

      <Text style={styles.paragraph}>
        Nasara (“we”, “our”, “us”) operates the Nasara platform. This Privacy Policy explains how we collect, use, and protect your information.
      </Text>

      <View style={styles.section}>
        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.text}>
          • Account information (email, user ID){"\n"}
          • User content (videos, captions){"\n"}
          • Device and usage data{"\n"}
          • Camera, microphone, storage (only when used)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.text}>
          • Provide and improve the platform{"\n"}
          • Enable video uploads and sharing{"\n"}
          • Personalize user experience{"\n"}
          • Maintain safety and prevent abuse
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>3. User Content</Text>
        <Text style={styles.text}>
          Content you upload may be publicly visible to other users.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>4. Third-Party Services</Text>
        <Text style={styles.text}>
          We use services such as Supabase and cloud hosting providers to run the platform.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>5. Data Sharing</Text>
        <Text style={styles.text}>
          We do not sell your personal data. Data may be shared only to operate the service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>6. Account Deletion</Text>
        <Text style={styles.text}>
          You can delete your account at any time from settings.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>7. Security</Text>
        <Text style={styles.text}>
          We take reasonable steps to protect your data, but no system is 100% secure.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>8. Children</Text>
        <Text style={styles.text}>
          This app is not intended for users under 13 years old.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>9. Contact</Text>
        <Text style={styles.text}>
          Email: ajars0702@gmail.com
        </Text>
      </View>

      <Text style={styles.footer}>© 2026 Nasara</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  date: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 15,
    color: "#ccc",
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00c853",
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    color: "#ddd",
    lineHeight: 20,
  },
  footer: {
    textAlign: "center",
    color: "#666",
    marginTop: 30,
    fontSize: 12,
  },
});