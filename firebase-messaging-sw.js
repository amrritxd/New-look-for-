// ═══════════════════════════════════════════════════════
//  Gaon Digital — Firebase Messaging Service Worker
//  Background SOS Emergency Alarm System
//  Place at ROOT: /firebase-messaging-sw.js
// ═══════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyDRoRxc7yPRXgr2UWfgCTAhC7TuxPxiSvI",
  authDomain: "all-projects-use.firebaseapp.com",
  databaseURL: "https://all-projects-use-default-rtdb.firebaseio.com",
  projectId: "all-projects-use",
  storageBucket: "all-projects-use.firebasestorage.app",
  messagingSenderId: "891525610267",
  appId: "1:891525610267:web:c2caea95110eabdeb731be"
});

const messaging = firebase.messaging();

// ── Background FCM Message Handler ──
// Jab app BAND ho tab yeh trigger hoga
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background FCM received:', payload);

  const type  = payload.data?.type || '';
  const title = payload.notification?.title || payload.data?.title || 'Gaon Digital';
  const body  = payload.notification?.body  || payload.data?.body  || 'नई सूचना';

  // SOS ke liye loud alarm notification options
  const isSOS = type === 'sos';

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: isSOS ? 'sos-alert' : 'gaon-notification',
    renotify: true,
    requireInteraction: isSOS,        // SOS notification tab tak dikhti rahe jab tak user dismiss na kare
    vibrate: isSOS
      ? [500, 200, 500, 200, 500, 200, 500]  // SOS: long vibration pattern
      : [200, 100, 200],
    data: { type, url: '/', ...payload.data },
    actions: isSOS
      ? [
          { action: 'open',  title: '🚨 App Kholo' },
          { action: 'call',  title: '📞 112 Call Karo' },
        ]
      : [
          { action: 'open', title: '📱 Dekho' },
        ],
  };

  // SOS notification sound ke liye SW se main window ko message bhejo
  if (isSOS) {
    // Saare open windows/tabs ko alarm signal bhejo
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SOS_ALARM', payload });
      });
    });
  }

  return self.registration.showNotification(title, options);
});

// ── Notification Click Handler ──
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notifData = event.notification.data || {};
  event.notification.close();

  if (action === 'call') {
    // 112 emergency call
    event.waitUntil(clients.openWindow('tel:112'));
    return;
  }

  // Default: app kholo
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Agar app already khula hai to focus karo
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Agar SOS tha to alarm bajao open window mein
          if (notifData.type === 'sos') {
            client.postMessage({ type: 'SOS_ALARM' });
          }
          return client.focus();
        }
      }
      // Nahi to naya tab kholo
      return clients.openWindow('/');
    })
  );
});

// ── Push Event (direct push, FCM ke alawa) ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const type = data.data?.type || '';
    if (type === 'sos') {
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'SOS_ALARM', data }));
      });
    }
  } catch (e) {
    console.log('[SW] Push parse error:', e);
  }
});

// ── Install + Activate (fast SW lifecycle) ──
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
