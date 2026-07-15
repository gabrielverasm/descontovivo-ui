self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      if (self.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (_) {
      // Ignora falhas de limpeza de cache.
    }

    try {
      await self.registration.unregister();
    } catch (_) {
      // Ignora falhas de unregister.
    }

    try {
      const clientsList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if (client.url) {
          client.navigate(client.url);
        }
      }
    } catch (_) {
      // Ignora falhas ao atualizar clientes.
    }
  })());
});
