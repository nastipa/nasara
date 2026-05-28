import { supabase } from "./supabase";

export const sendUtilityNotification =
  async ({
    user_type,
    user_id,
    guest_id,
    title,
    message,
    type,
  }: any) => {
    await (supabase as any)
      .from(
        "utility_notifications"
      )
      .insert({
        user_type,
        user_id,
        guest_id,
        title,
        message,
        type,
      });
  };