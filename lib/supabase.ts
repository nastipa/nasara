import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Database } from "./database.types";

const extra = Constants.expoConfig?.extra;

const supabaseUrl = extra?.supabaseUrl;
const supabaseAnonKey = extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing");
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);