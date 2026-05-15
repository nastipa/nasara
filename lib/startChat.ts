import { supabase } from "./supabase";

export async function startChat(
  otherUserId: string
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const myId = user.id;

    /* FIND EXISTING DM ROOM */

    const {
      data: myRooms,
      error: roomError,
    } = await (supabase as any)
      .from("chat_participants")
      .select("room_id")
      .eq("user_id", myId);

    if (roomError) {
      console.log(roomError);
      return null;
    }

    const roomIds =
      (myRooms || []).map(
        (r: any) => r.room_id
      );

    if (roomIds.length > 0) {
      const {
        data: otherRooms,
      } = await (supabase as any)
        .from("chat_participants")
        .select("room_id")
        .eq("user_id", otherUserId)
        .in("room_id", roomIds);

      if (
        otherRooms &&
        otherRooms.length > 0
      ) {
        return otherRooms[0].room_id;
      }
    }

    /* CREATE ROOM */

    const {
      data: newRoom,
      error: createError,
    } = await (supabase as any)
      .from("chat_rooms")
      .insert({
        buyer_id: myId,
        seller_id: otherUserId,
        item_id: null,
      })
      .select("id")
      .single();

    if (createError) {
      console.log(createError);
      return null;
    }

    /* ADD PARTICIPANTS */

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
    console.log(
      "startChat error:",
      e
    );

    return null;
  }
}