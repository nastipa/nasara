import { supabase } from "./supabase";

export const getOrCreateRoom = async (
  user1: string,
  user2: string
) => {
  if (!user1 || !user2) return null;

  // check existing room
  const { data: existing } = await (supabase as any)
    .from("chat_rooms_v2")
    .select("*")
    .or(
      `and(user1.eq.${user1},user2.eq.${user2}),and(user1.eq.${user2},user2.eq.${user1})`
    );

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // create new room
  const { data, error } = await (supabase as any)
    .from("chat_rooms_v2")
    .insert({
      user1,
      user2,
    })
    .select()
    .single();

  if (error) {
    console.log(error);
    return null;
  }

  return data.id;
};