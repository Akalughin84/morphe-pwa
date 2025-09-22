// /modules/achievementsManager.js
// v1.8.0 — Менеджер достижений

import { StorageManager } from '/utils/storage.js';

/**
 * AchievementsManager — управляет бейджами пользователя
 */
export class AchievementsManager {
  constructor() {
    this.storageKey = 'morphe-achievements';
    this.achievements = this.load();
    this.definitions = this.getDefinitions();
  }

  load() {
    return StorageManager.getItem(this.storageKey) || {};
  }

  save() {
    StorageManager.setItem(this.storageKey, this.achievements);
  }

  /**
   * Получить все определения достижений
   */
  getDefinitions() {
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
   * Проверяет, получено ли достижение
   */
  isUnlocked(id) {
    return !!this.achievements[id];
  }

  /**
   * Выдача достижения
   */
  unlock(id) {
    if (this.isUnlocked(id)) return false;

    this.achievements[id] = {
      unlockedAt: new Date().toISOString(),
      notified: false
    };
    this.save();
    return true;
  }

  /**
   * Получить все достижения с их состоянием
   */
  getAllWithStatus() {
    return this.definitions.map(def => ({
      ...def,
      unlocked: this.isUnlocked(def.id),
      progress: this.getProgress(def.id)
    }));
  }

  /**
   * Прогресс (для streak'ов)
   */
  getProgress(id) {
    if (id === 'week_streak') return this.achievements[id]?.current || 0;
    if (id === 'month_streak') return this.achievements[id]?.current || 0;
    return null;
  }

  /**
   * Инкремент прогресса
   */
  incrementProgress(id, value = 1) {
    const key = `progress_${id}`;
    const current = this.achievements[key] || 0;
    this.achievements[key] = current + value;
    this.save();
    return this.achievements[key];
  }

  /**
   * Сброс прогресса
   */
  resetProgress(id) {
    delete this.achievements[`progress_${id}`];
    this.save();
  }

  /**
   * Получить количество полученных
   */
  getUnlockedCount() {
    return Object.keys(this.achievements).filter(k => !k.startsWith('progress_')).length;
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.achievements = {};
    StorageManager.removeItem(this.storageKey);
  }
}