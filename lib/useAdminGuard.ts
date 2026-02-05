import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useAdminGuard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/"); // not logged in
        return;
      }

      const { data } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.replace("/"); // not admin
        return;
      }

      setLoading(false); // admin allowed
    };

    checkAdmin();
  }, []);

  return { loading };
}