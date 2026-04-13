import { supabase } from "./supabase";

/* ================= CACHE ================= */
let cachedUser: any = null;
let lastFetch = 0;
let inFlight: Promise<any> | null = null;

/* ================= SIGN UP ================= */
export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });
};

/* ================= SIGN IN ================= */
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });
};

/* ================= SAFE USER FETCH (LOCK FIX) ================= */
export const getUserSafe = async () => {
  const now = Date.now();

  // 1. return cache (fast path)
  if (cachedUser && now - lastFetch < 60000) {
    return cachedUser;
  }

  // 2. prevent multiple simultaneous calls (CRITICAL FIX)
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      cachedUser = null;
      lastFetch = now;
      inFlight = null;
      return null;
    }

    cachedUser = data?.user ?? null;
    lastFetch = now;
    inFlight = null;

    return cachedUser;
  })();

  return inFlight;
};

/* ================= REFRESH USER ================= */
export const refreshUser = async () => {
  cachedUser = null;
  lastFetch = 0;
  return await getUserSafe();
};

/* ================= SIGN OUT ================= */
export const signOut = async () => {
  cachedUser = null;
  lastFetch = 0;
  inFlight = null;

  return await supabase.auth.signOut();
};