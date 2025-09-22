// v2.1.2 — Service Worker для Morphe PWA (диагностическая версия)

const CACHE_NAME = 'morphe-v2.1.2'; // ← обновил версию

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',

  // Стили
  '/styles.css',
  '/styles-form.css',
  '/styles-home.css',
  '/styles-shared.css',

  // Ядро
  '/core/HeaderController.js',
  '/core/HomeDashboard.js',
  '/core/themeManager.js',
  '/core/analytics.js',
  '/core/workoutPlanner.js',
  '/core/menuGenerator.js',
  '/core/nutritionEngine.js',  // ← проверяем этот
  '/core/achievementEngine.js',
  '/core/exerciseRecommender.js',
  '/core/goalTracker.js',
  '/core/adaptiveEngine.js',

  // Модули
  '/modules/profile.js',
  '/modules/workoutTracker.js',
  '/modules/progressTracker.js',
  '/modules/nutritionTracker.js',
  '/modules/notifications.js',
  '/modules/achievementsManager.js',
  '/modules/onboardingManager.js',
  '/modules/supplementAdvisor.js',
  '/modules/strengthGoalTracker.js',
  '/modules/aiAssistant.js',
  '/modules/adaptiveEngine.js',
  '/modules/premiumManager.js',
  '/modules/timer.js',

  // Сервисы
  '/services/userService.js',
  '/services/dataService.js',
  '/services/syncService.js',

  // Утилиты
  '/utils/storage.js',
  '/utils/dom.js',
  '/utils/dateUtils.js',
  '/utils/validators.js',
  '/utils/logger.js',

  // Конфиг
  '/config/userConfig.js',

  // Частичные шаблоны
  '/partials/header.html',
  '/partials/footer.html',

  // Страницы
  '/pages/onboarding.html',
  '/pages/profile.html',
  '/pages/workouts.html',
  '/pages/nutrition.html',
  '/pages/progress.html',
  '/pages/supplements.html',
  '/pages/premium.html',
  '/pages/notifications.html',
  '/pages/goals.html',
  '/pages/backup.html',
  '/pages/achievements.html',
  '/pages/offline.html',

  // Данные
  '/data/foods.json',
  '/data/exercises.json',
  '/data/programs.json',
  '/data/supplements.json',

  // Ассеты
  '/assets/icons/icon-16.png',
  '/assets/icons/icon-32.png',
  '/assets/icons/icon-192.png',
  '/assets/bg/hero-silhouette.svg',
  
];

self.addEventListener('install', (event) => {
  console.log('🔄 SW: Начало установки...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const failed = [];
        const succeeded = [];

        for (const url of ASSETS_TO_CACHE) {
          try {
            console.log(`🛠️ SW: Попытка закэшировать: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status} для ${url}`);
            }
            const clone = response.clone();
            await cache.put(url, clone);
            succeeded.push(url);
            console.log(`✅ SW: Закэшировано: ${url}`);
          } catch (err) {
            failed.push({ url, error: err.message });
            console.error(`❌ SW: Ошибка при кэшировании ${url}:`, err);
          }
        }

        console.log(`📊 SW: Успешно: ${succeeded.length}, Неудачно: ${failed.length}`);
        if (failed.length > 0) {
          console.warn('⚠️ SW: Ошибки:', failed);
        }
      })
      .catch(err => {
        console.error('❌ SW: Критическая ошибка в install:', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log('🌐 SW: Нет интернета, загружаем offline.html');
        return caches.match('/pages/offline.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          console.log(`📦 SW: Используем из кэша: ${event.request.url}`);
          return cached;
        }
        return fetch(event.request).catch(() => {
          console.log(`🌐 SW: Сеть недоступна, пробуем из кэша: ${event.request.url}`);
          return caches.match(event.request);
        });
      })
      .catch(() => {
        console.warn('🚫 SW: Не найдено ни в кэше, ни в сети:', event.request.url);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ SW: Удаляем старый кэш:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
  console.log('✅ SW: Активирован и контролирует клиентов');
});