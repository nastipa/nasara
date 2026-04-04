import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://lpggpajigsckaevqipar.supabase.co",
  "sb_publishable_yfCDUz4E616SWQi3mVZQ7Q_yVOkvTqG",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);