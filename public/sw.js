// Service worker de rolder: recibe Web Push y abre la app al tocar la
// notificación. El payload lo envían push-notify / push-reminders como
// JSON { title, body, url, tag? }. Con tag (mensajes de chat), los avisos
// seguidos del mismo chat se AGRUPAN en una sola notificación con contador
// (estilo WhatsApp) en vez de apilarse.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    // payload vacío o no-JSON: notificación genérica
  }
  event.waitUntil(
    (async () => {
      let count = 1;
      if (data.tag) {
        const existing = await self.registration.getNotifications({ tag: data.tag });
        if (existing.length > 0) count = (existing[0].data?.count ?? 1) + 1;
      }
      const body = data.body ?? '';
      await self.registration.showNotification(data.title ?? 'rolder', {
        body: count > 1 ? `${body}\n💬 ${count} mensajes nuevos` : body,
        icon: '/icon-1024.png',
        badge: '/icon-1024.png',
        tag: data.tag || undefined,
        // renotify: que la notificación agrupada vuelva a sonar/vibrar
        renotify: Boolean(data.tag),
        data: { url: data.url ?? '/', count },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
