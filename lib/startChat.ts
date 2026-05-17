import { supabase } from "./supabase";

export async function startChat(otherUserId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const myId = user.id;

    // FIND ALL MATCHING NORMAL CHATS
    const { data: rooms, error } = await (supabase as any)
      .from("chat_rooms")
      .select("id, created_at")
      .is("item_id", null)
      .or(
        `and(buyer_id.eq.${myId},seller_id.eq.${otherUserId}),and(buyer_id.eq.${otherUserId},seller_id.eq.${myId})
      `)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("find room error:", error);
    }

    // RETURN FIRST OLD ROOM
    if (rooms && rooms.length > 0) {
      return rooms[0].id;
    }

    // CREATE NEW ONLY IF NONE
    const { data: newRoom, error: createError } =
      await (supabase as any)
        .from("chat_rooms")
        .insert({
          buyer_id: myId,
          seller_id: otherUserId,
          item_id: null,
        })
        .select("id")
        .single();

    if (createError || !newRoom) {
      console.log("create room error:", createError);
      return null;
    }

    await (supabase as any)
      .from("chat_participants")
      .insert([
        {
          room_id: newRoom.id,
          user_id: myId,
        },
        {
          room_id: newRoom.id,
          user_id: otherUserId,
        },
      ]);

    return newRoom.id;
  } catch (e) {
    console.log("startChat error:", e);
    return null;
  }
}