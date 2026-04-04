import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Reel = {
  id: string;
  media_url: string;
  user_id: string;
  caption?: string;
  views?: number;
  local_uri?: string
};

export default function useReels() {
  const [reels, setReels] = useState<Reel[]>([]);

  async function loadReels() {
    const { data, error } = await (supabase as any)
      .from("posts")
      .select("id, media_url, user_id, caption, views, media_type")
      .eq("media_type", "video")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("loadReels error:", error);
      return;
    }

    setReels(data || []);
  }

  useEffect(() => {
    loadReels();
  }, []);

  useEffect(() => {
  const channel = supabase
    .channel("reels-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      (payload: any) => {
        if (!payload.new) return;

        setReels(prev => {
          const exists = prev.find(r => r.id === payload.new.id);
          if (exists) return prev.map(r => r.id === payload.new.id ? payload.new : r);
          return [payload.new, ...prev];
        });
      }
    )
    .subscribe();

  return () => {
    // wrap async inside non-async function
    (async () => {
      await supabase.removeChannel(channel);
    })();
  };
}, []);
  return { reels, setReels, loadReels };
}