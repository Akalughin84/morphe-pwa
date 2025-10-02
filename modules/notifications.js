// /modules/notifications.js
// v1.4.1 — Расширенный менеджер уведомлений с локальными напоминаниями

import { StorageManager } from '/utils/storage.js';
import { DateUtils } from '/utils/dateUtils.js';

/**
 * NotificationManager — управляет уведомлениями:
 * - История советов ИИ
 * - Локальные push-напоминания
 * - Системные сообщения
 */
export class NotificationManager {
  constructor() {
    this.storageKey = 'morphe-notifications';
    this.scheduledKey = 'morphe-scheduled-notifications';
    this.notifications = this.load();
    this.scheduled = this.loadScheduled();
    this.activeTimeouts = new Map();
    this._notificationPermission = null;
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
    // Очистка при загрузке (раз в сессию)
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

  /**
   * Добавить напоминание
   * @param {Object} reminder { title, message, triggerAt (ISO string или Date), type, data }
   */
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

  /**
   * Отменить напоминание
   */
  cancel(id) {
    const index = this.scheduled.findIndex(r => r.id === id);
    if (index === -1) return false;

    // Очистка таймера
    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
    }

    // Удаление из списка
    this.scheduled.splice(index, 1);
    this.saveScheduled();
    return true;
  }

  _setTimer(reminder) {
    if (reminder.triggered) return;

    const now = Date.now();
    const triggerTime = new Date(reminder.triggerAt).getTime();
    const delay = Math.max(0, triggerTime - now);

    // Если уже прошло — не ставим таймер
    if (delay === 0 && triggerTime < now) return;

    const timeout = setTimeout(() => {
      this._triggerNotification(reminder);
    }, delay);

    this.activeTimeouts.set(reminder.id, timeout);
  }

  async _triggerNotification(reminder) {
    // Проверка разрешения (с кэшированием)
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

    // Сохраняем в историю
    this.add({
      type: 'reminder',
      title: reminder.title,
      message: reminder.message,
      triggeredAt: new Date().toISOString(),
      from: reminder.type
    });

    // Отмечаем как сработавшее
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

  // === Статические методы ===

  static async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}