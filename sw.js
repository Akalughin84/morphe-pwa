// sw.js
const APP_VERSION = 'v4.1.1'; // Увеличено после добавления новых файлов
const CACHE_NAME = `morphe-${APP_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/styles-form.css',
  '/manifest.json',
  '/sw.js',
  
  // Pages
  '/pages/profile.html',
  '/pages/workouts.html',
  '/pages/nutrition.html',
  '/pages/progress.html',
  '/pages/supplements.html', // ✅ Добавлено
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
  '/core/supplementAdvisor.js', // ✅ Добавлено

  // Data
  '/data/foods.json',
  '/data/supplements.json', // ✅ Добавлено

  // Assets
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/bg/hero-silhouette.svg'
];

self.addEventListener('install', event => {
  console.log(`📥 SW: Устанавливаю кэш ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

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
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );

  // Принудительная проверка обновления
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(event.request).then(res => {
        return cache.put(event.request, res.clone());
      }).catch(() => {});
    })
  );
});