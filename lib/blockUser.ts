import { supabase } from "./supabase";

export const blockUser = async (blockedId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;

  if (!me) return { error: "Not logged in" };

  const { error } = await (supabase as any)
    .from("blocked_users")
    .insert({
      blocker_id: me,
      blocked_id: blockedId,
    });

  if (error) return { error: error.message };

  return { success: true };
};

export const unblockUser = async (blockedId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;

  if (!me) return { error: "Not logged in" };

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", me)
    .eq("blocked_id", blockedId);

  if (error) return { error: error.message };

  return { success: true };
};

export const isBlocked = async (blockedId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;

  if (!me) return false;

  const { data } = await supabase
    .from("blocked_users")
    .select("*")
    .eq("blocker_id", me)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  return !!data;
};