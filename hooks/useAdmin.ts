import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: user } = await supabase.auth.getUser();

    if (!user?.user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.user.id)
      .maybeSingle();

    setIsAdmin(!!data);
    setLoading(false);
  };

  return { isAdmin, loading };
}