
// =====================================================
// 1. RECEIVE PUSH NOTIFICATIONS
// =====================================================

self.addEventListener("push", (event) => {
  let data = {
    title: "Nasara",
    body: "You have a new notification.",
    url: "/",
  };

  if (event.data) {
    try {
      data = {
        ...data,
        ...event.data.json(),
      };
    } catch {
      data.body = event.data.text();
    }
  }

  const title = data.title || "Nasara";

  const options = {
    body: data.body || "You have a new notification.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
    tag: data.tag || "nasara-notification",
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// =====================================================
// 2. OPEN NASARA WHEN A NOTIFICATION IS TAPPED
// =====================================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            await client.focus();

            if ("navigate" in client) {
              await client.navigate(targetUrl);
            }

            return;
          }
        }

        return clients.openWindow(targetUrl);
      })
  );
});