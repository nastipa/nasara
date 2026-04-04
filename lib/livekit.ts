export const LIVEKIT_URL = "wss://YOUR-LIVEKIT-SERVER";

export async function fetchLiveKitToken(
  roomName: string,
  userName: string
) {
  const res = await fetch(
    "https://YOUR-SUPABASE-PROJECT.functions.supabase.co/livekit-token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room: roomName,
        identity: userName,
      }),
    }
  );

  const data = await res.json();
  return data.token;
}