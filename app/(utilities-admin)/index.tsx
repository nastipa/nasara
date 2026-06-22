import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function UtilitiesAdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);
  const [admin, setAdmin] = useState<any>(null);
const [authorized, setAuthorized] = useState(false);

  const load = async () => {
  setLoading(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setLoading(false);
    return;
  }

  const { data: adminData } = await supabase
    .from("utility_admins")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!adminData) {
    setAuthorized(false);
    setLoading(false);
    return;
  }

  setAdmin(adminData);
  setAuthorized(true);

  const { data } = await supabase
    .from("utility_applications")
    .select("*")
    .order("created_at", { ascending: false });

  setApps(data || []);
  setLoading(false);
};
  useEffect(() => {
    load();
  }, []);

  const pending = apps.filter((a) => a.status === "submitted").length;
  const approved = apps.filter((a) => a.status === "approved").length;
  const completed = apps.filter((a) => a.status === "completed").length;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!authorized && !loading) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        Access Denied
      </Text>

      <Text
        style={{
          marginTop: 10,
          textAlign: "center",
        }}
      >
        You are not a registered
        Utility Admin.
      </Text>
    </View>
  );
}

  return (
   <View
  style={{
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  }}
>
      {/* HEADER */}
      <View
  style={{
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 18,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontSize: 26,
      fontWeight: "bold",
    }}
  >
    ⚡ Utilities Admin
  </Text>

  <Text
    style={{
      color: "#cbd5e1",
      marginTop: 5,
    }}
  >
    Welcome {admin?.full_name}
  </Text>

  <Text
    style={{
      color: "#94a3b8",
      marginTop: 2,
    }}
  >
    Role: {admin?.role}
  </Text>
</View>

      {/* STATS */}
      <View style={{ flexDirection: "row", marginTop: 20, gap: 10 }}>
        <StatCard title="Pending" value={pending} color="#f59e0b" />
        <StatCard title="Approved" value={approved} color="#2563eb" />
        <StatCard title="Completed" value={completed} color="#16a34a" />
      </View>

      {/* QUICK ACTIONS */}

<Text
  style={{
    marginTop: 22,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  }}
>
  Quick Actions
</Text>

<View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  }}
>
  <TouchableOpacity
    onPress={() =>
      router.push("/(utilities-admin)/applications")
    }
    style={{
      flex: 1,
      backgroundColor: "#2563eb",
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "700",
      }}
    >
      📋 View Apps
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      router.push("/(utilities-admin)/add-admin")
    }
    style={{
      flex: 1,
      backgroundColor: "#16a34a",
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "700",
      }}
    >
      ➕ Add Admin
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      router.push("/(utilities-admin)/remove-admin")
    }
    style={{
      flex: 1,
      backgroundColor: "#dc2626",
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "700",
      }}
    >
      🗑️ Remove Admin
    </Text>
  </TouchableOpacity>
</View>
      {/* LIST */}
      <Text style={{ marginTop: 20, fontWeight: "bold", fontSize: 18 }}>
        Recent Applications
      </Text>

      <FlatList
        data={apps.slice(0, 5)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/services/application-details",
                params: { id: item.id },
              })
            }
            style={{
              backgroundColor: "#fff",
              padding: 14,
              marginTop: 10,
              borderRadius: 10,
              elevation: 2,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>
              {item.service_type}
            </Text>

            <Text>Status: {item.status}</Text>
            <Text style={{ color: "#666" }}>
              {item.area} • {item.station}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* ================= STATS CARD ================= */

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color,
        padding: 14,
        borderRadius: 12,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "bold" }}>{title}</Text>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold" }}>
        {value}
      </Text>
    </View>
  );
}