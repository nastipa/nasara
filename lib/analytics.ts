import { supabase } from "./supabase";
/* ================= PROFILE VIEW TRACKING ================= */
export const trackProfileView = async (
  viewerId: string,
  viewedId: string
) => {
  if (!viewerId || !viewedId || viewerId === viewedId) return;

  try {
    // optional: prevent duplicates (1 view per session/day logic can be added later)
    await (supabase as any).from("profile_views").insert({
      viewer_id: viewerId,
      viewed_id: viewedId,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log("trackProfileView error:", e);
  }
};

/* ================= SAFE INCREMENT ================= */
async function increment(
  userId: string,
  field: string
) {
  try {
    const { data } = await (supabase as any)
      .from("business_analytics")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      await (supabase as any)
        .from("business_analytics")
        .insert({
          user_id: userId,
          [field]: 1,
        });
      return;
    }

    await (supabase as any)
      .from("business_analytics")
      .update({
        [field]:
          (data[field] || 0) + 1,
      })
      .eq("user_id", userId);
  } catch (e) {
    console.log(
      "Analytics error:",
      e
    );
  }
}

/* ================= EXPORT TRACKERS ================= */

export const trackItemView = (
  userId: string
) =>
  increment(userId, "item_views");

export const trackChatClick = (
  userId: string
) =>
  increment(userId, "chat_clicks");

export const trackLiveView = (
  userId: string
) =>
  increment(userId, "live_views");

export const trackFollow = (
  userId: string
) =>
  increment(userId, "followers");