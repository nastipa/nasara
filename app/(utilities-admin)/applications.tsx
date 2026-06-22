import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ApplicationsAdmin() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("utility_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setApps(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredApps = apps.filter((a) => {
    const matchStatus =
      filter === "all"
        ? true
        : (a.status || "").toLowerCase() ===
          filter.toLowerCase();

    const q = search.toLowerCase();

    const matchSearch =
      (a.full_name || "")
        .toLowerCase()
        .includes(q) ||
      (a.phone || "")
        .toLowerCase()
        .includes(q) ||
      (a.area || "")
        .toLowerCase()
        .includes(q) ||
      (a.station || "")
        .toLowerCase()
        .includes(q) ||
      (a.service_type || "")
        .toLowerCase()
        .includes(q);

    return matchStatus && matchSearch;
  });

 if (loading) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "#111827",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        Loading Applications...
      </Text>

      <Text
        style={{
          color: "#6b7280",
          marginTop: 6,
        }}
      >
        Fetching latest utility data
      </Text>
    </View>
  );
}

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
        padding: 16,
      }}
    >
     <View
  style={{
    backgroundColor: "#2563eb",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#2563eb",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 6,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontSize: 28,
      fontWeight: "800",
    }}
  >
    Utility Applications
  </Text>

  <Text
    style={{
      color: "#dbeafe",
      marginTop: 6,
      fontSize: 15,
    }}
  >
    Review, approve and manage customer applications.
  </Text>

  <View
    style={{
      flexDirection: "row",
      marginTop: 18,
      justifyContent: "space-between",
    }}
  >
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 16,
        padding: 14,
        flex: 1,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          color: "#dbeafe",
          fontSize: 13,
        }}
      >
        Total Applications
      </Text>

      <Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "800",
          marginTop: 4,
        }}
      >
        {apps.length}
      </Text>
    </View>

    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 16,
        padding: 14,
        flex: 1,
        marginLeft: 8,
      }}
    >
      <Text
        style={{
          color: "#dbeafe",
          fontSize: 13,
        }}
      >
        Showing
      </Text>

      <Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "800",
          marginTop: 4,
        }}
      >
        {filteredApps.length}
      </Text>
    </View>
  </View>
</View>

      <View
  style={{
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  }}
>
  <TextInput
    placeholder="🔍 Search applicant, phone, area, station..."
    placeholderTextColor="#9ca3af"
    value={search}
    onChangeText={setSearch}
    style={{
      fontSize: 16,
      color: "#111827",
      paddingVertical: 14,
    }}
  />
</View>

      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 10,
  }}
>
  {[
    "all",
  "Pending",
  "Under Review",
  "Approved",
  "Awaiting Payment",
  "Payment Confirmed",
  "Meter Assigned",
  "Completed",
  "Rejected",
  ].map((f) => (
    <TouchableOpacity
      key={f}
      onPress={() => setFilter(f)}
      style={{
        backgroundColor:
          filter === f ? "#111827" : "#e5e7eb",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 30,
        marginRight: 10,
        shadowColor: filter === f ? "#111827" : "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: filter === f ? 4 : 1,
      }}
    >
      <Text
        style={{
          color: filter === f ? "#fff" : "#111",
          fontWeight: "700",
          fontSize: 13,
        }}
      >
        {f}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
  style={{
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  }}
>
  {/* TOP ROW */}
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontWeight: "800",
        fontSize: 16,
        color: "#111827",
      }}
    >
      {item.application_no}
    </Text>

    {/* STATUS BADGE */}
    <View
      style={{
        backgroundColor:
  item.status === "Approved"
    ? "#dcfce7"
    : item.status === "Rejected"
    ? "#fee2e2"
    : item.status === "Completed"
    ? "#dbeafe"
    : item.status === "Awaiting Payment"
    ? "#fef3c7"
    : item.status === "Payment Confirmed"
    ? "#ede9fe"
    : item.status === "Meter Assigned"
    ? "#cffafe"
    : "#f3f4f6",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color:
  item.status === "Approved"
    ? "#166534"
    : item.status === "Rejected"
    ? "#991b1b"
    : item.status === "Completed"
    ? "#1d4ed8"
    : item.status === "Awaiting Payment"
    ? "#92400e"
    : item.status === "Payment Confirmed"
    ? "#6d28d9"
    : item.status === "Meter Assigned"
    ? "#0e7490"
    : "#374151",
        }}
      >
        {item.status}
      </Text>
    </View>
  </View>

  {/* SERVICE */}
  <Text
    style={{
      marginTop: 8,
      fontSize: 14,
      color: "#374151",
      fontWeight: "600",
    }}
  >
    ⚡ {item.service_type}
  </Text>

  {/* LOCATION */}
  <Text
    style={{
      marginTop: 6,
      color: "#6b7280",
      fontSize: 13,
    }}
  >
    📍 {item.area} • {item.station}
  </Text>

  {/* PHONE */}
  <Text
    style={{
      marginTop: 4,
      color: "#6b7280",
      fontSize: 13,
    }}
  >
    📞 {item.phone}
  </Text>

  {/* FOOTER */}
  <Text
    style={{
      marginTop: 10,
      fontSize: 12,
      color: "#9ca3af",
    }}
  >
    Applied:{" "}
    {new Date(item.created_at).toLocaleDateString()}
  </Text>

  {/* BUTTON */}
  <TouchableOpacity
    onPress={() =>
      router.push({
  pathname:
    "/(utilities-admin)/application-details",
  params: {
    id: item.id,
  },
})
    }
    style={{
      backgroundColor: "#111827",
      padding: 12,
      borderRadius: 12,
      marginTop: 12,
    }}
  >
    <Text
      style={{
        color: "#fff",
        textAlign: "center",
        fontWeight: "700",
      }}
    >
      View Details
    </Text>
  </TouchableOpacity>
</View>
        )}
        ListEmptyComponent={
  <View
    style={{
      marginTop: 80,
      alignItems: "center",
      padding: 20,
    }}
  >
    <View
      style={{
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#e0e7ff",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 40 }}>📭</Text>
    </View>

    <Text
      style={{
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
      }}
    >
      No Applications Found
    </Text>

    <Text
      style={{
        color: "#6b7280",
        marginTop: 6,
        textAlign: "center",
        fontSize: 14,
      }}
    >
      No utility applications match your filter or search.
    </Text>

    <TouchableOpacity
      onPress={load}
      style={{
        marginTop: 16,
        backgroundColor: "#111827",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "700",
        }}
      >
        Refresh
      </Text>
    </TouchableOpacity>
  </View>
        }
      />
    </View>
  );
}