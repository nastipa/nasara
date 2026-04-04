import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAdmin } from "./useAdmin";

export function useAdminGuard() {
  const router = useRouter();
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/browse");
    }
  }, [loading, isAdmin]);

  return { isAdmin, loading };
}