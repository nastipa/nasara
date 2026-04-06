import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { Database } from "./database.types";

/* ================= ENV ================= */
const extra = Constants.expoConfig?.extra;

const supabaseUrl = extra?.supabaseUrl;
const supabaseAnonKey = extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing");
}

/* ================= SAFE STORAGE ================= */
const isWeb = Platform.OS === "web";

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null; // ✅ SSR SAFE
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return; // ✅ SSR SAFE
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return; // ✅ SSR SAFE
    localStorage.removeItem(key);
  },
};

/* ================= CLIENT ================= */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: isWeb ? webStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);