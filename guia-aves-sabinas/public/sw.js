// Este es el motor que le dice al celular que somos una App real
self.addEventListener('install', (event) => {
    console.log('[Service Worker] App instalada correctamente');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] App activada');
});

// Por ahora, dejamos que el internet fluya normalmente
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});