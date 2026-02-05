import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      setIsAdmin(!!data);
    };

    check();
  }, []);

  return isAdmin;
}