/* global self */
self.addEventListener('push', (event) => {
  let payload = { title: 'RefStack', body: '', url: '/dashboard/market-signals' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url || '/dashboard/market-signals' },
      icon: '/favicon.ico',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/market-signals'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const origin = self.location.origin
        const abs = url.startsWith('http')
          ? url
          : `${origin}${url.startsWith('/') ? '' : '/'}${url}`
        for (const client of clientList) {
          if (client.url.startsWith(origin) && 'focus' in client) return client.focus()
        }
        if (self.clients.openWindow) return self.clients.openWindow(abs)
      }),
  )
})
