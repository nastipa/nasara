import { useEffect, useState } from "react";

import { supabase } from "./supabase";

export function useUnreadNotifications() {

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  /* ================= LOAD ================= */

  async function loadUnread() {

    try {

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user)
        return;

      const {
        count,
      } =
        await (supabase as any)

          .from(
            "notifications"
          )

          .select(
            "*",
            {
              count: "exact",
              head: true,
            }
          )

          .eq(
            "user_id",
            user.id
          )

          .eq(
            "is_read",
            false
          );

      setUnreadCount(
        count || 0
      );

    } catch (err) {

      console.log(err);
    }
  }

  /* ================= INITIAL ================= */

  useEffect(() => {

    loadUnread();

  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {

    let channel: any;

    async function startRealtime() {

      const {
        data,
      } =
        await supabase.auth.getUser();

      const user =
        data?.user;

      if (!user)
        return;

      channel =
        (supabase as any)

          .channel(
            "unread-count-" +
              user.id
          )

          .on(
            "postgres_changes",
            {
              event: "*",
              schema:
                "public",
              table:
                "notifications",
              filter: `user_id=eq.${user.id}`,
            },

            () => {

              loadUnread();
            }
          )

          .subscribe();
    }

    startRealtime();

    return () => {

      if (channel) {

        (supabase as any)
          .removeChannel(
            channel
          );
      }
    };

  }, []);

  return unreadCount;
}