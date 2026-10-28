// ─── تغيير هذا الرقم عند كل تحديث يضمن تحديث الكاش تلقائياً ───
const CACHE = 'mytracker-v4';

const ASSETS = [
  '/my-tracker/',
  '/my-tracker/index.html',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Syne:wght@700;800&display=swap'
];

// تثبيت: خزّن الملفات في الكاش
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // تفعيل فوري بدون انتظار
  );
});

// تفعيل: احذف الكاشات القديمة فوراً
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // استلام جميع التبويبات فوراً
  );
});

// Fetch: الشبكة أولاً — وإن لم يتوفر نرجع للكاش (يضمن دائماً أحدث نسخة)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // حفظ النسخة الجديدة في الكاش
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // إن لم يتوفر إنترنت — استخدم الكاش
        return caches.match(e.request);
      })
  );
});

// ─── الإشعارات ───
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // ركّز على نافذة مفتوحة إن وُجدت
      for (const client of clientList) {
        if (client.url.includes('/my-tracker') && 'focus' in client) {
          return client.focus();
        }
      }
      // وإلا افتح التطبيق
      if (clients.openWindow) {
        return clients.openWindow('/my-tracker/');
      }
    })
  );
});

// استقبال رسائل من الصفحة لعرض إشعار
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
