// /modules/notifications.js
// v1.5.1 — Исправлены поля добавок, восстановление таймеров, защита от дублей

import { StorageManager } from '/utils/storage.js';
// DateUtils не используется — но оставлен по вашей просьбе
import { DateUtils } from '/utils/dateUtils.js';

/**
 * NotificationManager — управляет уведомлениями:
 * - История советов ИИ
 * - Локальные push-напоминания
 * - Системные сообщения
 * - Типовые сценарии: утро, тренировка, вода, витамины
 */
export class NotificationManager {
  constructor() {
    this.storageKey = 'morphe-notifications';
    this.scheduledKey = 'morphe-scheduled-notifications';
    this.notifications = this.load();
    this.scheduled = this.loadScheduled();
    this.activeTimeouts = new Map();
    this._notificationPermission = null;
    // Восстанавливаем таймеры после перезагрузки
    this.resumeAll();
  }

  /**
   * Запланировать уведомления о приёме добавок
   */
  async scheduleSupplements(profile) {
    if (!profile) return;
    
    try {
      const { SupplementAdvisor } = await import('/modules/supplementAdvisor.js');
      const advisor = new SupplementAdvisor();
      const recs = await advisor.getPersonalizedRecommendations();
      
      const now = new Date();
      recs.forEach(sup => {
        let hour = 8; // утро по умолчанию
        if (sup.timing?.toLowerCase().includes('вечер')) hour = 21;
        if (sup.timing?.toLowerCase().includes('сон')) hour = 22;
        if (sup.timing?.toLowerCase().includes('после тренировки')) {
          const workoutHour = profile.preferredWorkoutTime 
            ? parseInt(profile.preferredWorkoutTime.split(':')[0]) 
            : 19;
          hour = Math.min(22, workoutHour + 1);
        }

        const target = new Date(now);
        target.setHours(hour, 0, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);

        this.schedule({
          title: `💊 Время ${sup.name}!`,
          // 🔧 ИСПРАВЛЕНО: sup.dose → sup.dosage, sup.effect → sup.description
          message: `Примите ${sup.dosage}. ${sup.description}`,
          triggerAt: target,
          type: 'supplement'
        });
      });
    } catch (e) {
      console.warn('Не удалось запланировать добавки:', e);
    }
  }

  // === Вспомогательные методы ===

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _cleanupOldNotifications(maxAgeDays = 30) {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(notif => {
      const ts = new Date(notif.timestamp).getTime();
      return ts >= cutoff;
    });
    if (this.notifications.length !== initialLength) {
      this.save();
    }
  }

  // === Основные уведомления ===

  load() {
    const data = StorageManager.getItem(this.storageKey) || [];
    this.notifications = data;
    this._cleanupOldNotifications();
    return this.notifications;
  }

  save() {
    StorageManager.setItem(this.storageKey, this.notifications);
  }

  add(notification) {
    const item = {
      id: this._generateId(),
      read: false,
      timestamp: new Date().toISOString(),
      ...notification
    };
    this.notifications.unshift(item);
    this.save();
    return item;
  }

  getAll() {
    return [...this.notifications];
  }

  markAsRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  clear() {
    this.notifications = [];
    StorageManager.removeItem(this.storageKey);
  }

  // === Запланированные напоминания ===

  loadScheduled() {
    return StorageManager.getItem(this.scheduledKey) || [];
  }

  saveScheduled() {
    StorageManager.setItem(this.scheduledKey, this.scheduled);
  }

  schedule(reminder) {
    const triggerAt = reminder.triggerAt instanceof Date
      ? reminder.triggerAt.toISOString()
      : reminder.triggerAt;

    const item = {
      id: this._generateId(),
      ...reminder,
      triggerAt,
      scheduledAt: new Date().toISOString(),
      triggered: false
    };

    this.scheduled.push(item);
    this.saveScheduled();
    this._setTimer(item);
    return item;
  }

  cancel(id) {
    const index = this.scheduled.findIndex(r => r.id === id);
    if (index === -1) return false;

    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
    }

    this.scheduled.splice(index, 1);
    this.saveScheduled();
    return true;
  }

  _setTimer(reminder) {
    if (reminder.triggered) return;

    const now = Date.now();
    const triggerTime = new Date(reminder.triggerAt).getTime();
    const delay = Math.max(0, triggerTime - now);

    if (delay === 0 && triggerTime < now) return;

    const timeout = setTimeout(() => {
      this._triggerNotification(reminder);
    }, delay);

    this.activeTimeouts.set(reminder.id, timeout);
  }

  async _triggerNotification(reminder) {
    if (this._notificationPermission === null) {
      this._notificationPermission = 'Notification' in window
        ? await Notification.requestPermission()
        : 'denied';
    }

    if (this._notificationPermission === 'granted' && 'Notification' in window) {
      new Notification(reminder.title, {
        body: reminder.message,
        icon: '/assets/icons/icon-192.png',
        tag: `morphe-${reminder.id}`
      });
    }

    this.add({
      type: 'reminder',
      title: reminder.title,
      message: reminder.message,
      triggeredAt: new Date().toISOString(),
      from: reminder.type
    });

    const item = this.scheduled.find(r => r.id === reminder.id);
    if (item) {
      item.triggered = true;
      this.saveScheduled();
    }

    this.activeTimeouts.delete(reminder.id);
  }

  getScheduled() {
    return [...this.scheduled];
  }

  getUpcoming() {
    const now = new Date().toISOString();
    return this.scheduled.filter(r => !r.triggered && r.triggerAt > now);
  }

  getMissed() {
    const now = new Date().toISOString();
    return this.scheduled.filter(r => !r.triggered && r.triggerAt <= now);
  }

  resumeAll() {
    this.clearActiveTimers();
    this.scheduled
      .filter(r => !r.triggered)
      .forEach(r => this._setTimer(r));
  }

  clearActiveTimers() {
    for (const timeout of this.activeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
  }

  // === СТАТИЧЕСКИЕ МЕТОДЫ ===

  static async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // === НОВЫЕ МЕТОДЫ: ТИПОВЫЕ СЦЕНАРИИ С ЗАЩИТОЙ ОТ ДУБЛЕЙ ===

  _isScheduledToday(type) {
    const today = new Date().toISOString().split('T')[0];
    return this.scheduled.some(r =>
      r.type === type && r.triggerAt.startsWith(today)
    );
  }

  /**
   * Запланировать утренний ритуал
   * @param {string} timeStr — "07:00"
   */
  scheduleMorningRoutine(timeStr = '07:00') {
    if (this._isScheduledToday('morning-routine')) return;
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    this.schedule({
      title: 'Доброе утро! 🌞',
      message: 'Не забудь: вода, витамины, завтрак.',
      triggerAt: target,
      type: 'morning-routine'
    });
  }

  /**
   * Запланировать напоминание за 2 часа до тренировки
   * @param {string} workoutTime — "19:00"
   */
  schedulePreWorkout(workoutTime) {
    if (!workoutTime) return;
    if (this._isScheduledToday('pre-workout')) return;
    const [h, m] = workoutTime.split(':').map(Number);
    const now = new Date();
    const workout = new Date(now);
    workout.setHours(h, m, 0, 0);
    if (workout <= now) return;

    const twoHoursBefore = new Date(workout.getTime() - 2 * 60 * 60 * 1000);
    this.schedule({
      title: 'Тренировка через 2 часа! 💪',
      message: 'Покушай, выпей воды, примите витамины.',
      triggerAt: twoHoursBefore,
      type: 'pre-workout'
    });
  }

  /**
   * Запланировать напоминания о воде
   */
  scheduleHydration() {
    if (this._isScheduledToday('hydration')) return;
    const now = new Date();
    const times = [
      { hour: 10, minute: 0 },
      { hour: 15, minute: 0 },
      { hour: 18, minute: 0 }
    ];

    times.forEach(({ hour, minute }) => {
      const target = new Date(now);
      target.setHours(hour, minute, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      this.schedule({
        title: '💧 Выпей воды!',
        message: 'Поддерживай гидратацию в течение дня.',
        triggerAt: target,
        type: 'hydration'
      });
    });
  }

  /**
   * Запланировать напоминание о витаминах
   */
  scheduleVitamins() {
    if (this._isScheduledToday('vitamins')) return;
    const now = new Date();
    const target = new Date(now);
    target.setHours(12, 0, 0, 0); // полдень
    if (target <= now) target.setDate(target.getDate() + 1);

    this.schedule({
      title: '💊 Время витаминов!',
      message: 'Не забудь принять добавки.',
      triggerAt: target,
      type: 'vitamins'
    });
  }

  /**
   * Запустить все типовые напоминания на сегодня
   * @param {Object} profile — данные пользователя
   */
  scheduleAllTypical(profile) {
    this.scheduleMorningRoutine('07:00');
    if (profile?.preferredWorkoutTime) {
      this.schedulePreWorkout(profile.preferredWorkoutTime);
    }
    this.scheduleHydration();
    this.scheduleVitamins();
  }
}