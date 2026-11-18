// ─── رفع الرقم عند كل تحديث لضمان تحديث الكاش ───
const CACHE = 'mytracker-v6-offline';

// ملفات محلية فقط — بدون أي طلب إنترنت
const ASSETS = [
  '/my-tracker/',
  '/my-tracker/index.html',
  '/my-tracker/manifest.json',
  '/my-tracker/icon.png',
  '/my-tracker/icon.svg',
  '/my-tracker/apple-touch-icon.png',
  '/my-tracker/sw.js'
];

// تثبيت: خزّن كل الملفات محلياً
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// تفعيل: احذف الكاشات القديمة
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: الكاش أولاً (أسرع وبدون إنترنت) — وإن لم يوجد نحاول الشبكة مرة واحدة فقط
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // تجاهل طلبات خارج نطاق التطبيق
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    e.respondWith(new Response('', { status: 204 }));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // احتياطي: جرّب الشبكة ثم خزّن النتيجة (إن وُجد اتصال)
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // بدون كاش وبدون شبكة
        if (e.request.mode === 'navigate') {
          return caches.match('/my-tracker/index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// ─── الإشعارات (محلية — لا تحتاج إنترنت) ───
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/my-tracker') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/my-tracker/');
      }
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title || 'Coach Anis', {
      body: body || '',
      icon: '/my-tracker/icon.png',
      badge: '/my-tracker/icon.png',
      tag: tag || 'coach-anis-reminder',
      renotify: true,
      vibrate: [100, 50, 100],
      data: { url: '/my-tracker/' }
    });
  }
});
