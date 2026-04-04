import { serve } from "https://deno.land/std/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk";

serve(async (req) => {
  try {
    const { roomId, identity, role } = await req.json();

    // ✅ LiveKit credentials (put in Supabase Secrets)
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")!;
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;

    // Permissions
    const canPublish = role === "seller";

    // Generate token
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
    });

    token.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
    });

    return new Response(
      JSON.stringify({ token: token.toJwt() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 }
    );
  }
});