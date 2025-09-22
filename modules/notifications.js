// /modules/notifications.js
// v1.4.0 — Расширенный менеджер уведомлений с локальными напоминаниями

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
  }

  // === Основные уведомления (советы, статус) ===

  load() {
    return StorageManager.getItem(this.storageKey) || [];
  }

  save() {
    StorageManager.setItem(this.storageKey, this.notifications);
  }

  add(notification) {
    const item = {
      id: Date.now(),
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
    if (notif) notif.read = true;
    this.save();
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
   * @param {Object} reminder { title, message, triggerAt, type, data }
   */
  schedule(reminder) {
    const item = {
      id: Date.now(),
      ...reminder,
      scheduledAt: new Date().toISOString(),
      triggered: false,
      triggerAt: reminder.triggerAt // ISO string
    };

    this.scheduled.push(item);
    this.saveScheduled();

    // Устанавливаем таймер
    this._setTimer(item);

    return item;
  }

  /**
   * Установка таймера для напоминания
   */
  _setTimer(reminder) {
    const now = Date.now();
    const triggerTime = new Date(reminder.triggerAt).getTime();
    const delay = Math.max(0, triggerTime - now);

    const timeout = setTimeout(() => {
      this._triggerNotification(reminder);
    }, delay);

    this.activeTimeouts.set(reminder.id, timeout);
  }

  /**
   * Вызов уведомления
   */
  _triggerNotification(reminder) {
    // В браузере
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(reminder.title, {
          body: reminder.message,
          icon: '/assets/icons/icon-192.png',
          tag: `morphe-${reminder.id}`
        });
      }
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
    const index = this.scheduled.findIndex(r => r.id === reminder.id);
    if (index !== -1) {
      this.scheduled[index].triggered = true;
      this.saveScheduled();
    }

    // Удаляем из активных таймеров
    this.activeTimeouts.delete(reminder.id);
  }

  /**
   * Получить все запланированные
   */
  getScheduled() {
    return [...this.scheduled];
  }

  /**
   * Получить предстоящие
   */
  getUpcoming() {
    const now = new Date().toISOString();
    return this.scheduled.filter(r => !r.triggered && r.triggerAt > now);
  }

  /**
   * Получить прошедшие (не сработавшие)
   */
  getMissed() {
    const now = new Date().toISOString();
    return this.scheduled.filter(r => !r.triggered && r.triggerAt <= now);
  }

  /**
   * Перезапуск всех таймеров (например, после перезагрузки)
   */
  resumeAll() {
    this.clearActiveTimers();

    this.scheduled
      .filter(r => !r.triggered)
      .forEach(r => this._setTimer(r));
  }

  /**
   * Очистка активных таймеров
   */
  clearActiveTimers() {
    for (const [id, timeout] of this.activeTimeouts) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
    }
  }

  /**
   * Проверка прав доступа
   */
  static async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}