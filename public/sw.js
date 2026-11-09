// 🟣 =====================================================
// 🟣 NASARA BROWSER PUSH NOTIFICATIONS
// 🟣 WhatsApp-Style Chat Notifications
// 🟣 Profile Image • Message Preview • Direct Chat Navigation
// 🟣 =====================================================


// 🔵 =====================================================
// 🔵 1. RECEIVE PUSH NOTIFICATIONS
// 🔵 =====================================================

self.addEventListener("push", (event) => {

  // 🟡 DEFAULT NOTIFICATION
  let data = {
    title: "Nasara",
    body: "You have a new notification.",
    url: "/",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };

  // 🟢 READ BACKEND NOTIFICATION PAYLOAD
  if (event.data) {
    try {
      data = {
        ...data,
        ...event.data.json(),
      };
    } catch (error) {
      data.body = event.data.text();
    }
  }

  // 🟣 NOTIFICATION TITLE
  const title = data.title || "Nasara";

  // 🔵 NOTIFICATION OPTIONS
  const options = {
    body: data.body || "You have a new notification.",

    // 👤 SENDER PROFILE IMAGE
    icon: data.icon,

    // 🔔 SMALL NOTIFICATION BADGE
    badge: data.badge || "/favicon.ico",

    // 🖼️ OPTIONAL LARGE IMAGE
    ...(data.image ? {
      image: data.image,
    } : {}),

    // 💬 UNIQUE CHAT NOTIFICATION TAG
    tag: data.tag || "nasara-notification",

    // 🟢 KEEP CHAT ROOM DESTINATION
    data: {
      url: data.data?.url || data.url || "/",
      room_id: data.data?.room_id || data.room_id || null,
    },

    // 🔔 KEEP NOTIFICATIONS VISIBLE
   renotify: Boolean(data.data?.room_id || data.room_id),
  };

  // 🟢 DISPLAY NOTIFICATION
  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );

});


// 🟣 =====================================================
// 🟣 2. OPEN THE CORRECT CHAT WHEN NOTIFICATION IS TAPPED
// 🟣 =====================================================

self.addEventListener("notificationclick", (event) => {

  // 🔵 CLOSE NOTIFICATION
  event.notification.close();

  // 🟢 GET DESTINATION
  const notificationData =
    event.notification.data || {};

  const targetUrl = new URL(
    notificationData.url || "/",
    self.location.origin
  ).href;

  // 🟣 OPEN OR FOCUS NASARA
  event.waitUntil(

    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    })

    .then(async (windowClients) => {

      // 🔵 CHECK EXISTING NASARA WINDOWS
      for (const client of windowClients) {

        if (
          client.url.startsWith(
            self.location.origin
          )
        ) {

          // 🟢 FOCUS EXISTING WINDOW
          await client.focus();

          // 🟢 NAVIGATE TO CHAT ROOM
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }

          return;
        }
      }

      // 🟣 OPEN NEW NASARA WINDOW
      return clients.openWindow(targetUrl);

    })

  );

});