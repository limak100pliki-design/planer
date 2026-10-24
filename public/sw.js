// Service Worker for Planer Posiłków PWA — v2 Persistent Offline Mode
const CACHE_NAME = 'planer-pwa-v2'
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests within same origin
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.origin) return

  // Next.js immutable static assets: Cache-First for instant PWA loading
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
      }),
    )
    return
  }

  // Navigation requests: Network-first with cached root fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => {
          return caches.match('/').then((cached) => cached || caches.match(event.request))
        }),
    )
    return
  }

  // Default same-origin GET: Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      }),
  )
})
