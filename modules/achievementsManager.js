// /modules/achievementsManager.js
// v1.8.2 — Полная поддержка группировки, прогресса, уровней и confetti

import { StorageManager } from '/utils/storage.js';

/**
 * AchievementsManager — управляет бейджами пользователя
 * Хранит:
 * - unlockedAt — когда получено
 * - notified — показано ли уведомление
 * - current — текущий прогресс (для streak'ов и др.)
 */
export class AchievementsManager {
  constructor(definitions = null) {
    this.storageKey = 'morphe-achievements';
    this.definitions = definitions || this.getDefaultDefinitions();
    this.achievements = this.load();
  }

  /**
   * Загрузка и миграция данных из хранилища
   * Поддерживает старый формат (progress_week_streak → week_streak.current)
   */
  load() {
    let data = StorageManager.getItem(this.storageKey) || {};

    // 🔁 Миграция старого формата
    if (Object.keys(data).some(key => key.startsWith('progress_'))) {
      const migrated = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('progress_')) {
          const id = key.replace('progress_', '');
          migrated[id] = { current: value };
        } else {
          migrated[key] = value;
        }
      }
      data = migrated;
      StorageManager.setItem(this.storageKey, data);
    }

    return data;
  }

  save() {
    StorageManager.setItem(this.storageKey, this.achievements);
  }

  /**
   * Стандартные определения достижений
   * Обязательные поля: id, title, description, type, icon, secret
   * Для streak'ов: target
   */
  getDefaultDefinitions() {
    return [
      {
        id: 'first_profile',
        title: 'Начало пути',
        description: 'Заполнил профиль',
        icon: '👤',
        type: 'profile',       // ← изменено с 'milestone' на 'profile' для группировки
        unlocked: false,
        secret: false,
        narrative: 'Ты определил свою цель. Это первый акт заботы о себе.'
      },
      {
        id: 'first_workout',
        title: 'Первая тренировка',
        description: 'Завершил первую тренировку',
        icon: '💪',
        type: 'workout',       // ← новая категория
        unlocked: false,
        secret: false,
        narrative: 'Это начало чего-то большого. Ты сделал шаг, который многие откладывают. Горжусь тобой.'
      },
      {
        id: 'three_day_streak',
        title: 'Три дня подряд',
        description: 'Тренировался 3 дня без перерыва',
        icon: '🔥',
        type: 'streak',
        target: 3,
        unlocked: false,
        secret: false,
        narrative: 'Ты нашёл ритм. Три дня подряд — это уже не случайность, а выбор.'
      },
      {
        id: 'week_streak',
        title: 'Неделя подряд',
        description: 'Тренировался 7 дней без перерыва',
        icon: '🔥',
        type: 'streak',
        target: 7,
        unlocked: false,
        secret: false,
        narrative: '7 дней без пропуска — это формирование привычки. Ты уже не «начинаешь», ты живёшь в ритме.'
      },
      {
        id: 'month_streak',
        title: 'Месяц силы',
        description: '30 дней подряд без пропусков',
        icon: '🚀',
        type: 'streak',
        target: 30,
        unlocked: false,
        secret: false,
        narrative: 'Целый месяц — это уже не усилие, это образ жизни. Ты стал сильнее не только телом, но и духом.'
      },
      {
        id: 'first_goal',
        title: 'Цель достигнута',
        description: 'Выполнил свою первую цель по силе',
        icon: '🎯',
        type: 'goal',
        unlocked: false,
        secret: false,
        narrative: 'Ты доказал себе, что можешь. Это только начало — впереди ещё больше побед.'
      },
      {
        id: 'weight_progress',
        title: 'В движении',
        description: 'Зафиксировал снижение веса при цели "похудеть"',
        icon: '📉',
        type: 'progress',
        unlocked: false,
        secret: false,
        narrative: 'Ты движешься в правильном направлении. Каждый килограмм — это шаг к лучшей версии себя.'
      },
      {
        id: 'silent_discipline',
        title: 'Тишина — сила',
        description: 'Никогда не открывал Pro-раздел',
        icon: '🧘‍♂️',
        type: 'ethics',
        unlocked: false,
        secret: true,
        hint: 'Иногда сила — в том, чтобы не брать то, что предлагают.',
        narrative: 'Ты выбрал путь без ярлыков. Твоя дисциплина — твоя награда.'
      },
      {
        id: 'ten_workouts',
        title: 'Десять тренировок',
        description: 'Завершил 10 тренировок',
        icon: '🏋️‍♂️',
        type: 'workout',
        target: 10,
        unlocked: false,
        secret: false,
        narrative: 'Ты прошёл первую «десятку» — это больше, чем 80% новичков. Продолжай в том же духе!'
      }
    ];
  }

  /**
   * Проверяет, существует ли достижение с таким ID
   */
  hasDefinition(id) {
    return this.definitions.some(def => def.id === id);
  }

  /**
   * Проверяет, получено ли достижение
   */
  isUnlocked(id) {
    return !!this.achievements[id]?.unlockedAt;
  }

  /**
   * Выдача достижения
   * @returns {boolean} true, если разблокировано впервые
   */
  unlock(id) {
    if (!this.hasDefinition(id)) {
      console.warn(`[AchievementsManager] Unknown achievement ID: ${id}`);
      return false;
    }

    if (this.isUnlocked(id)) return false;

    this.achievements[id] = {
      unlockedAt: new Date().toISOString(),
      notified: false
    };
    this.save();
    return true;
  }

  /**
   * Отметить достижение как уведомлённое
   */
  markAsNotified(id) {
    if (this.achievements[id]) {
      this.achievements[id].notified = true;
      this.save();
    }
  }

  /**
   * Получить все достижения с их состоянием для UI
   * Включает: unlocked, notified, progress, target, type, secret
   */
  getAllWithStatus() {
    return this.definitions.map(def => {
      const saved = this.achievements[def.id] || {};
      return {
        ...def,
        unlocked: !!saved.unlockedAt,
        notified: !!saved.notified,
        // Прогресс: из сохранённого current или 0
        progress: saved.current != null ? saved.current : 0,
        // Цель: из определения (для streak'ов)
        target: def.target || null
      };
    });
  }

  /**
   * Получить набор ID всех разблокированных достижений (для сравнения)
   * @returns {Set<string>}
   */
  getUnlocked() {
    const unlocked = new Set();
    for (const [id, data] of Object.entries(this.achievements)) {
      if (data.unlockedAt) unlocked.add(id);
    }
    return unlocked;
  }

  /**
   * Получить количество полученных достижений
   */
  getUnlockedCount() {
    return Object.values(this.achievements).filter(
      entry => entry.unlockedAt != null
    ).length;
  }

  /**
   * Получить текущий прогресс по ID
   */
  getProgress(id) {
    return this.achievements[id]?.current || 0;
  }

  /**
   * Установить прогресс (например, из AchievementEngine)
   * @param {string} id
   * @param {number} value
   * @returns {number} новый прогресс
   */
  setProgress(id, value) {
    if (!this.hasDefinition(id)) {
      console.warn(`[AchievementsManager] Unknown achievement ID for progress: ${id}`);
      return 0;
    }

    // Не перезаписываем unlockedAt и notified
    const existing = this.achievements[id] || {};
    this.achievements[id] = {
      ...existing,
      current: value
    };
    this.save();
    return value;
  }

  /**
   * Сброс прогресса (сохраняет разблокировку, если есть)
   */
  resetProgress(id) {
    if (this.achievements[id]) {
      const { unlockedAt, notified } = this.achievements[id];
      if (unlockedAt) {
        this.achievements[id] = { unlockedAt, notified };
      } else {
        delete this.achievements[id];
      }
      this.save();
    }
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.achievements = {};
    StorageManager.removeItem(this.storageKey);
  }
}