const APP_VERSION = 'v4.1.2';
const CACHE_NAME = `morphe-${APP_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/pages/offline.html',
  '/styles.css',
  '/styles-form.css',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',

  // Pages
  '/pages/profile.html',
  '/pages/workouts.html',
  '/pages/nutrition.html',
  '/pages/progress.html',
  '/pages/supplements.html',
  '/pages/premium.html',

  // Modules
  '/modules/profile.js',
  '/modules/progressTracker.js',
  '/modules/workoutTracker.js',

  // Core
  '/core/adaptiveEngine.js',
  '/core/workoutPlanner.js',
  '/core/nutritionEngine.js',
  '/core/goalTracker.js',
  '/core/analytics.js',
  '/core/strengthGoalTracker.js',
  '/core/supplementAdvisor.js',

  // Data
  '/data/foods.json',
  '/data/supplements.json',

  // Assets
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/bg/hero-silhouette.svg'
];

// INSTALL
self.addEventListener('install', event => {
  console.log(`📥 SW: Устанавливаю кэш ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        const cachePromises = urlsToCache.map(url => {
          return fetch(url)
            .then(res => {
              if (res.ok) return cache.put(url, res);
              console.warn(`⚠️ SW: Не удалось закэшировать ${url}:`, res.status);
            })
            .catch(err => {
              console.warn(`⚠️ SW: Ошибка при кэшировании ${url}:`, err.message);
            });
        });
        await Promise.all(cachePromises);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(oldName => {
          if (oldName !== CACHE_NAME) {
            console.log(`🗑 SW: Удаляю старый кэш: ${oldName}`);
            return caches.delete(oldName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {
  // Не кэшируем внешние домены
  if (event.request.url.startsWith('http') && !event.request.url.includes(self.location.hostname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/pages/offline.html');
          }
          return null;
        });
    })
  );
});
