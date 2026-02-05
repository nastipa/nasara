import { supabase } from "./supabase";

/** Get logged-in user id */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Email + password login */
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Register */
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

/** Logout */
export async function signOut() {
  return supabase.auth.signOut();
}
