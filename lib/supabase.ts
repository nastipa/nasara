import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import Constants from "expo-constants";
import { Database } from "./database.types";

/* ================= EXPO EXTRA ENV ================= */
const extra = Constants.expoConfig?.extra;

const supabaseUrl = extra?.supabaseUrl;
const supabaseAnonKey = extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing");
}

/* ================= SUPABASE CLIENT ================= */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,        // ✅ Saves login session on device
      autoRefreshToken: true,       // ✅ Keeps token alive
      persistSession: true,         // ✅ Prevent logout on refresh
      detectSessionInUrl: false,    // ✅ Required for Expo
    },
  }
);