// Service worker de rolder: recibe Web Push y abre la app al tocar la
// notificación. El payload lo envían push-notify / push-reminders como
// JSON { title, body, url }.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    // payload vacío o no-JSON: notificación genérica
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'rolder', {
      body: data.body ?? '',
      icon: '/icon-1024.png',
      badge: '/icon-1024.png',
      data: { url: data.url ?? '/' },
    })
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
