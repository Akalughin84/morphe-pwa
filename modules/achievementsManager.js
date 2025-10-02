// /modules/achievementsManager.js
// v1.8.1 — Менеджер достижений (улучшенная версия)

import { StorageManager } from '/utils/storage.js';

/**
 * AchievementsManager — управляет бейджами пользователя
 */
export class AchievementsManager {
  constructor(definitions = null) {
    this.storageKey = 'morphe-achievements';
    this.definitions = definitions || this.getDefaultDefinitions();
    this.achievements = this.load();
  }

  /**
   * Загрузка и миграция данных из хранилища
   */
  load() {
    let data = StorageManager.getItem(this.storageKey) || {};

    // 🔁 Миграция старого формата (progress_week_streak → week_streak.current)
    if (Object.keys(data).some(key => key.startsWith('progress_'))) {
      const migrated = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('progress_')) {
          const id = key.replace('progress_', '');
          // Сохраняем прогресс в объекте достижения
          migrated[id] = { current: value };
        } else {
          // Обычные достижения — копируем как есть
          migrated[key] = value;
        }
      }
      data = migrated;
      StorageManager.setItem(this.storageKey, data); // сохраняем в новом формате
    }

    return data;
  }

  save() {
    StorageManager.setItem(this.storageKey, this.achievements);
  }

  /**
   * Стандартные определения достижений
   */
  getDefaultDefinitions() {
    return [
      {
        id: 'first_profile',
        title: 'Начало пути',
        description: 'Заполнил профиль',
        icon: '👤',
        type: 'milestone',
        unlocked: false,
        secret: false
      },
      {
        id: 'first_workout',
        title: 'Первая тренировка',
        description: 'Завершил первую тренировку',
        icon: '💪',
        type: 'milestone',
        unlocked: false,
        secret: false
      },
      {
        id: 'week_streak',
        title: 'Неделя подряд',
        description: 'Тренировался 7 дней без перерыва',
        icon: '🔥',
        type: 'streak',
        target: 7,
        current: 0,
        unlocked: false,
        secret: false
      },
      {
        id: 'first_goal',
        title: 'Цель достигнута',
        description: 'Выполнил свою первую цель по силе',
        icon: '🎯',
        type: 'goal',
        unlocked: false,
        secret: false
      },
      {
        id: 'weight_progress',
        title: 'В движении',
        description: 'Зафиксировал снижение веса при цели "похудеть"',
        icon: '📉',
        type: 'progress',
        unlocked: false,
        secret: false
      },
      {
        id: 'month_streak',
        title: 'Месяц силы',
        description: '30 дней подряд без пропусков',
        icon: '🚀',
        type: 'streak',
        target: 30,
        current: 0,
        unlocked: false,
        secret: false
      },
      {
        id: 'silent_discipline',
        title: 'Тишина — сила',
        description: 'Никогда не открывал Pro-раздел',
        icon: '🧘‍♂️',
        type: 'ethics',
        unlocked: false,
        secret: true
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
   * Получить все достижения с их состоянием
   */
  getAllWithStatus() {
    return this.definitions.map(def => {
      const saved = this.achievements[def.id] || {};
      return {
        ...def,
        unlocked: !!saved.unlockedAt,
        notified: !!saved.notified,
        progress: saved.current != null ? saved.current : null
      };
    });
  }

  /**
   * Прогресс (для streak'ов и других типов с current/target)
   */
  getProgress(id) {
    return this.achievements[id]?.current || 0;
  }

  /**
   * Инкремент прогресса
   */
  incrementProgress(id, value = 1) {
    if (!this.hasDefinition(id)) {
      console.warn(`[AchievementsManager] Unknown achievement ID for progress: ${id}`);
      return 0;
    }

    const current = this.getProgress(id);
    const newProgress = current + value;

    this.achievements[id] = {
      ...this.achievements[id],
      current: newProgress
    };
    this.save();
    return newProgress;
  }

  /**
   * Сброс прогресса
   */
  resetProgress(id) {
    if (this.achievements[id]) {
      // Сохраняем только unlockedAt и notified, если уже разблокировано
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
   * Получить количество полученных достижений
   */
  getUnlockedCount() {
    return Object.values(this.achievements).filter(
      entry => entry.unlockedAt != null
    ).length;
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.achievements = {};
    StorageManager.removeItem(this.storageKey);
  }
}