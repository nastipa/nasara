import { supabase } from "./supabase";

export async function getSellerRating(seller_id: string) {
  const { data, error } = await supabase
    .from("seller_reviews")
    .select("rating")
    .eq("seller_id", seller_id);

  if (error || !data || data.length === 0) {
    return null;
  }

  const avg =
    data.reduce((sum, r) => sum + r.rating, 0) / data.length;

  return {
    average: avg.toFixed(1),
    count: data.length,
  };
}
