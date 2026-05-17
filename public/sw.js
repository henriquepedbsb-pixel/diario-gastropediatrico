// Service Worker — Gastropediatria Diário Clínico
// Suporta: cache offline + push notifications

const CACHE_NAME = 'gastro-v1'

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch (cache-first para assets, network-first para API) ──────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Não fazer cache de requisições Supabase
  if (url.hostname.includes('supabase')) return
  // Network-first para navegação
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/') || fetch(event.request)
      )
    )
    return
  }
})

// ── Push Notification ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '📋 Novo registro no diário', body: 'O responsável adicionou um novo item.' }
  try {
    data = event.data.json()
  } catch (_) {}

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard' },
    actions: [
      { action: 'open', title: 'Ver diário' },
      { action: 'close', title: 'Fechar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma janela aberta, foca ela
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Senão, abre nova aba
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
