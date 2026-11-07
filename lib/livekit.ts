// ==================================================
// 📦 IMPORTS
// ==================================================

import { supabase } from "./supabase";

// ==================================================
// 🌐 LIVEKIT SERVER
// ==================================================

const LIVEKIT_TOKEN_SERVER =
  "https://livekit-server-c0z9.onrender.com";

// ==================================================
// 🧾 LIVEKIT TOKEN RESPONSE
// ==================================================

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  role: "host" | "viewer";
  canPublish: boolean;
}

// ==================================================
// 🔐 FETCH SECURE LIVEKIT TOKEN
// ==================================================

export async function fetchLiveKitToken(
  streamId: string
): Promise<LiveKitTokenResponse> {
  if (!streamId) {
    throw new Error("A live stream ID is required.");
  }

  // Get the currently logged-in user's session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Please log in again to continue.");
  }

  // Request a secure token from the Render backend.
  const response = await fetch(
    `${LIVEKIT_TOKEN_SERVER}/token`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },

      body: JSON.stringify({
        streamId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error || "Unable to connect to the live stream."
    );
  }

  if (!data?.token || !data?.url || !data?.roomName) {
    throw new Error("The LiveKit server returned an invalid response.");
  }

  return {
    token: data.token,
    url: data.url,
    roomName: data.roomName,
    role: data.role,
    canPublish: data.canPublish,
  };
}