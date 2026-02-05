import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      setIsAdmin(!!data);
    };

    checkAdmin();
  }, []);

  return isAdmin;
}