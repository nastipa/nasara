import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Terms() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.date}>Effective Date: April 2026</Text>

      <Text style={styles.paragraph}>
        By using Nasara, you agree to these Terms of Service.
      </Text>

      <View style={styles.section}>
        <Text style={styles.heading}>1. Acceptable Use</Text>
        <Text style={styles.text}>
          You agree not to:
          {"\n"}• Post illegal or harmful content
          {"\n"}• Harass or abuse other users
          {"\n"}• Violate intellectual property rights
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>2. Accounts</Text>
        <Text style={styles.text}>
          You are responsible for maintaining your account and keeping your login details secure.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>3. Content Ownership</Text>
        <Text style={styles.text}>
          You retain ownership of your content but grant us permission to display and distribute it within the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>4. Content Moderation</Text>
        <Text style={styles.text}>
          We reserve the right to remove content or suspend accounts that violate our policies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>5. Termination</Text>
        <Text style={styles.text}>
          Accounts may be suspended or terminated if terms are violated.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>6. Disclaimer</Text>
        <Text style={styles.text}>
          The app is provided “as is” without warranties of any kind.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>7. Changes</Text>
        <Text style={styles.text}>
          We may update these terms at any time. Continued use means you accept the changes.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>8. Contact</Text>
        <Text style={styles.text}>
          Email: dinnanitipa@gmail.com
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