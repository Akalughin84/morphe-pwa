// sw.js
// v2.1.3 — Умный Service Worker для Morphe PWA

const CORE_CACHE = 'morphe-core-v2.1.3';
const DATA_CACHE = 'morphe-data-v2.1.3';
const ASSETS_CACHE = 'morphe-assets-v2.1.3';

// === КРИТИЧЕСКИЕ РЕСУРСЫ (для первого запуска и offline) ===
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/pages/offline.html',
  '/favicon.ico',
  '/styles/base/reset.css',
  '/styles/base/theme.css',
  '/styles/base/typography.css',
  '/styles/layout/header.css',
  '/styles/layout/footer.css',
  '/styles/pages/home.css',
  '/styles/pages/offline.css',
  '/styles/pages/onboarding.css',
  '/core/aiAssistant.js',
  '/core/analytics.js',
  '/core/themeManager.js',
  '/core/HeaderController.js',
  '/core/HomeDashboard.js',
  '/modules/onboardingManager.js',
  '/modules/profile.js',
  '/services/userService.js',
  '/utils/storage.js',
  '/utils/dom.js',
  '/partials/header.html',
  '/partials/footer.html',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/bg/hero-silhouette.svg'
];

// === ДАННЫЕ (обновляются редко, но могут меняться) ===
const DATA_FILES = [
  '/data/exercises.json',
  '/data/foods.json',
  '/data/programs.json',
  '/data/supplements.json'
];

// === ОСТАЛЬНЫЕ СТАТИЧЕСКИЕ АССЕТЫ ===
const STATIC_ASSETS = [
  // Стили
  '/styles/components/buttons.css',
  '/styles/components/cards.css',
  '/styles/components/forms.css',
  '/styles/components/mobile-menu.css',
  '/styles/components/tabs.css',
  '/styles/layout/scroll-top.css',
  '/styles/pages/achievements.css',
  '/styles/pages/backup.css',
  '/styles/pages/feedback.css',
  '/styles/pages/goals.css',
  '/styles/pages/notifications.css',
  '/styles/pages/nutrition.css',
  '/styles/pages/privacy.css',
  '/styles/pages/pro.css',  
  '/styles/pages/profile.css',
  '/styles/pages/progress.css',
  '/styles/pages/supplements.css',
  '/styles/pages/terms.css',
  '/styles/pages/workout-session.css',
  '/styles/pages/workouts.css',

  // JS
  '/js/profile.js',
  '/js/header.js',

  // Ядро
  '/core/achievementEngine.js',
  '/core/exerciseRecommender.js',
  '/core/goalTracker.js',
  '/core/menuGenerator.js',
  '/core/nutritionEngine.js', 
  '/core/strengthGoalTracker.js',
  '/core/strengthProgress.js',
  '/core/workoutBalancer.js',
  '/core/workoutPlanner.js',
  '/core/workoutSession.js',  

  // Модули
  '/modules/achievementsManager.js',
  '/modules/adaptiveEngine.js',
  '/modules/aiAssistant.js',
  '/modules/healthConnect.js',
  '/modules/notifications.js',
  '/modules/nutritionTracker.js',
  '/modules/premiumManager.js',
  '/modules/progressCalendar.js',
  '/modules/progressHub.js',
  '/modules/progressTracker.js',
  '/modules/workoutTracker.js',
  '/modules/scrollToTop.js',
  '/modules/strengthGoalTracker.js',
  '/modules/supplementAdvisor.js',
  '/modules/timer.js',
  '/modules/userProfile.js',

  // Сервисы и утилиты
  '/services/dataService.js',
  '/services/syncService.js',
  '/utils/dateUtils.js',
  '/utils/logger.js',
  '/utils/validators.js',
  '/config/userConfig.js',

  // Страницы (без персональных)
  '/pages/achievements.html',
  '/pages/backup.html',
  '/pages/feedback.html',
  '/pages/goals.html',
  '/pages/notifications.html',
  '/pages/nutrition.html',
  '/pages/onboarding.html',
  '/pages/premium.html',
  '/pages/privacy.html',
  '/pages/terms.html',
  '/pages/workouts.html',
  '/pages/workout-session.html',

  // Ассеты
  '/sitemap.xml',
  '/assets/icons/icon-16.png',
  '/assets/icons/icon-32.png',
  '/assets/icons/icon-180.png',  
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/bg/hero-silhouette.svg',
  '/assets/gifs/arnold-press-dumbbell.gif',
  '/assets/gifs/battle-ropes.gif',
  '/assets/gifs/bird-dog-with-resistance-band.gif',
  '/assets/gifs/donkey-calf-raise-machine.gif',
  '/assets/gifs/dumbbell-bulgarian-split-squat.gif',
  '/assets/gifs/face-pull-machine.gif',
  '/assets/gifs/hip-thrust.gif',
  '/assets/gifs/incline-chest-press-machine.gif',
  '/assets/gifs/isometric-hold-squat.gif',
  '/assets/gifs/kettlebell-swing.gif',
  '/assets/gifs/leg-curl-machine.gif',
  '/assets/gifs/leg-press.gif',
  '/assets/posters/abdominal-crunch-machine.jpeg',
  '/assets/posters/arch-hold.jpeg',
  '/assets/posters/band-pull-aparts.jpeg',
  '/assets/posters/banded-lateral-walk.png',
  '/assets/posters/bear-crawl.jpeg',
  '/assets/posters/bench-press.jpeg',
  '/assets/posters/bicep-curl-machine.jpeg',
  '/assets/posters/bird-dog.jpeg',
  '/assets/posters/bosu-squat.png',
  '/assets/posters/box-jump.png',
  '/assets/posters/burpees.jpeg',
  '/assets/posters/butt-kicks.png',
  '/assets/posters/cable-rows.jpeg',
  '/assets/posters/calf-raises.jpeg',
  '/assets/posters/chest-press-machine.jpeg',
  '/assets/posters/copenhagen-plank.jpeg',
  '/assets/posters/crab-walk.jpeg',
  '/assets/posters/curl-barbell.jpeg',
  '/assets/posters/dead-bug.jpeg',
  '/assets/posters/deadlift.jpeg',
  '/assets/posters/deficit-deadlift.jpeg',
  '/assets/posters/downward-dog.jpeg',
  '/assets/posters/dumbbell-press.jpeg',
  '/assets/posters/external-rotation-band.jpeg',
  '/assets/posters/face-pulls.jpeg',
  '/assets/posters/farmer-walk.jpeg',
  '/assets/posters/front-squat.jpeg',
  '/assets/posters/glute-bridge.jpeg',
  '/assets/posters/goblet-squat.jpeg',
  '/assets/posters/hammer-curl.jpeg',
  '/assets/posters/handstand-push-up.jpeg',
  '/assets/posters/high-knees.jpeg',
  '/assets/posters/hip-abduction-machine.jpeg',
  '/assets/posters/incline-chest-press-machine.jpeg',
  '/assets/posters/inverted-rows.jpeg',
  '/assets/posters/jump-rope.jpeg',
  '/assets/posters/jumping-jacks.jpeg',
  '/assets/posters/l-sit.jpeg',
  '/assets/posters/landmine-press.jpeg',
  '/assets/posters/lat-pulldown-machine-wide.jpeg',
  '/assets/posters/lat-pulldown.jpeg',
  '/assets/posters/lateral-raises.jpeg',
  '/assets/posters/leg-extension-machine.jpeg',
  '/assets/posters/lunges.jpeg',
  '/assets/posters/mountain-climbers.jpeg',
  '/assets/posters/nordic-hamstring-curl.jpeg',
  '/assets/posters/overhead-press.png',
  '/assets/posters/pallof-press.jpeg',
  '/assets/posters/pec-deck-machine.jpeg',
  '/assets/posters/pistol-squat.png',
  '/assets/posters/plank.jpeg',
  '/assets/posters/prone-cobra.jpeg',
  '/assets/posters/pull-ups.jpeg',
  '/assets/posters/Pvc Overhead Squat.jpeg',
  '/assets/posters/rear-delt-machine-fly.jpeg',
  '/assets/posters/reverse-pec-deck.jpeg',
  '/assets/posters/reverse-wrist-curl.jpeg',
  '/assets/posters/romanian-deadlift.jpeg',
  '/assets/posters/running.png',
  '/assets/posters/russian-twists.jpeg',
  '/assets/posters/seated-cable-row.jpeg',
  '/assets/posters/seated-low-row.jpeg',
  '/assets/posters/shoulder-press-machine.jpeg',
  '/assets/posters/side-lying-clam.jpeg',
  '/assets/posters/side-plank.jpeg',
  '/assets/posters/single-arm-kettlebell-snatch.jpeg',
  '/assets/posters/single-leg-glute-bridge.jpeg',
  '/assets/posters/single-leg-romanian-deadlift.png',
  '/assets/posters/sissy-squat.jpeg',
  '/assets/posters/skater-jumps.png',
  '/assets/posters/ski-erg.jpeg',
  '/assets/posters/sled-push.jpeg',
  '/assets/posters/squat-barbell.jpeg',
  '/assets/posters/squat-bodyweight.jpeg',
  '/assets/posters/triceps-extension-machine.jpeg',
  '/assets/posters/triceps-pushdown.jpeg',
  '/assets/posters/trx-rows.png',
  '/assets/posters/turkish-get-up.jpeg',
  '/assets/posters/vacuum-exercise.jpeg',
  '/assets/posters/wall-sit.jpeg',
  '/assets/posters/weighted-dip.png',
  '/assets/posters/windmill-kettlebell.jpeg',
  '/assets/posters/worlds-greatest-stretch.png',
  '/assets/posters/wrist-curl.png',
  '/assets/posters/z-press.png',
];

// Убираем дубликаты и объединяем
const ALL_STATIC = [...new Set([...STATIC_ASSETS])];

// Страницы с персональными данными — НЕ КЭШИРУЕМ
const PERSONAL_PAGES = [
  '/pages/profile.html',
  '/pages/progress.html',
  '/pages/supplements.html' // если содержит личные данные
];

self.addEventListener('install', (event) => {
  console.log('🔄 SW: Начало установки...');
  event.waitUntil(
    (async () => {
      const coreCache = await caches.open(CORE_CACHE);
      const assetsCache = await caches.open(ASSETS_CACHE);

      const cacheGroup = async (urls, cache, name) => {
        const failed = [];
        for (const url of urls) {
          try {
            console.log(`🛠️ SW: Кэширую (${name}): ${url}`);
            const response = await fetch(url, { credentials: 'omit' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(url, response);
          } catch (err) {
            failed.push({ url, error: err.message });
            console.error(`❌ SW: Ошибка кэширования (${name}): ${url}`, err);
          }
        }
        return failed;
      };

      const failedCore = await cacheGroup(CORE_ASSETS, coreCache, 'core');
      const failedAssets = await cacheGroup(ALL_STATIC, assetsCache, 'assets');

      const totalFailed = [...failedCore, ...failedAssets];
      if (totalFailed.length > 0) {
        console.warn(`⚠️ SW: Не удалось закэшировать ${totalFailed.length} файлов`, totalFailed);
        // Опционально: отправить в analytics
      }

      // Кэшируем данные отдельно (без await — не блокируем установку)
      caches.open(DATA_CACHE).then(cache => {
        DATA_FILES.forEach(url => {
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(err => console.warn('SW: Не удалось кэшировать данные', url, err));
        });
      });

      console.log('✅ SW: Установка завершена');
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);

  // Игнорируем не наши ресурсы и API
  if (requestURL.origin !== self.location.origin) return;

  // НЕ кэшируем персональные страницы
  if (PERSONAL_PAGES.some(page => requestURL.pathname === page)) {
    return;
  }

  // Навигация: offline-страница при ошибке
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/pages/offline.html'))
    );
    return;
  }

  // Данные: stale-while-revalidate
  if (DATA_FILES.some(path => requestURL.pathname === path)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DATA_CACHE);
        const cachedResponse = await cache.match(event.request);
        const networkFetch = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })()
    );
    return;
  }

  // Статика: сначала кэш, потом сеть
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Fallback на offline для не-данных
        if (event.request.destination === 'document') {
          return caches.match('/pages/offline.html');
        }
        return caches.match(event.request); // или null
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (![CORE_CACHE, DATA_CACHE, ASSETS_CACHE].includes(key)) {
            console.log('🗑️ SW: Удаляю старый кэш:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      self.clients.claim();
      console.log('✅ SW: Активирован. Контролирую клиентов.');
    })
  );
});