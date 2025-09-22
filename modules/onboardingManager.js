// /modules/onboardingManager.js
// v1.6.0 — Управление онбордингом

import { StorageManager } from '/utils/storage.js';

/**
 * OnboardingManager — контролирует показ онбординга
 * Показывает только один раз
 */
export class OnboardingManager {
  constructor() {
    this.storageKey = 'morphe-onboarding-completed';
    this.completed = this.isCompleted();
  }

  /**
   * Проверяет, прошёл ли пользователь онбординг
   */
  isCompleted() {
    return StorageManager.getItem(this.storageKey) === true;
  }

  /**
   * Отмечает онбординг как завершённый
   */
  complete() {
    StorageManager.setItem(this.storageKey, true);
    this.completed = true;
  }

  /**
   * Должен ли показываться онбординг?
   */
  shouldShow() {
    return !this.completed;
  }

  /**
   * Перезапуск (для тестов)
   */
  reset() {
    StorageManager.removeItem(this.storageKey);
    this.completed = false;
  }
}