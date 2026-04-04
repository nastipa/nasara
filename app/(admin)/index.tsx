import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAdminGuard } from "../../hooks/useAdminGuard";

export default function AdminDashboard() {
  const router = useRouter();
  const { loading } = useAdminGuard();

  if (loading) return null;

  const Tile = ({ label, route }: any) => (
    <TouchableOpacity
      style={styles.tile}
      onPress={() => router.push(route)}
    >
      <Text style={styles.tileText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>

      <Text style={styles.section}>Moderation</Text>
      <Tile label="Approve Ads" route="/(admin)/ads" />
      <Tile label="Approve Banner" route="/(admin)/banner" />
      <Tile label="Approve Promotion" route="/(admin)/promoted" />
      <Tile label="Approve Boost" route="/(admin)/boost" />
      <Tile label="Approve Battle" route="/(admin)/battle" />

      <Text style={styles.section}>Users</Text>
      <Tile label="View Users" route="/(admin)/users" />
      <Tile label="Ban / Unban User" route="/(admin)/users" />

      <Text style={styles.section}>Marketplace</Text>
      <Tile label="Delete Listings" route="/(admin)/delete-listings" />
      <Tile label="Remove Fake Items" route="/(admin)/remove-fake-items" />

      <Text style={styles.section}>Live System</Text>
      <Tile label="Stop Live Stream" route="/(admin)/stop-live-stream" />
      <Tile label="End Auction" route="/(admin)/end-auction" />

      <Text style={styles.section}>Finance</Text>
      <Tile label="MoMo Payouts" route="/(admin)/momo-payouts" />
      <Tile label="Revenue" route="/(admin)/revenue" />

      <Text style={styles.section}>Analytics</Text>
      <Tile label="Platform Stats" route="/(admin)/analytics" />

      <TouchableOpacity
        style={styles.home}
        onPress={() => router.replace("/browse")}
      >
        <Text style={{ color: "white" }}>Back to Home</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20 },

  title:{
    fontSize:26,
    fontWeight:"bold",
    marginBottom:20
  },

  section:{
    marginTop:20,
    fontWeight:"700",
    fontSize:16
  },

  tile:{
    backgroundColor:"#111827",
    padding:16,
    borderRadius:10,
    marginTop:8
  },

  tileText:{
    color:"white",
    fontWeight:"600"
  },

  home:{
    marginTop:40,
    backgroundColor:"#2563eb",
    padding:16,
    borderRadius:10,
    alignItems:"center"
  }
});