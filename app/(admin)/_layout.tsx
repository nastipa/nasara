import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession();

      const session = data.session;

      if (!session) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data: admin } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId);

      setIsAdmin(!!admin && admin.length > 0);
      setLoading(false);
    };

    checkAdmin();
  }, []);

  // ⏳ LOADING
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 🚫 NOT ADMIN
  if (!isAdmin) {
    return <Redirect href="/" />;
  }

  // 👑 ADMIN OK
  return <Stack screenOptions={{ headerShown: false }} />;
}