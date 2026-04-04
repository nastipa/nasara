import { supabase } from "./supabase";

export async function getItem(itemId: string) {

  const { data, error } = await (supabase as any)
    .from("items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    console.log(error);
    return null;
  }

  return data;
}