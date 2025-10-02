// /modules/onboardingManager.js
// v1.6.1 — Управление онбордингом (улучшенная версия)

import { StorageManager } from '/utils/storage.js';

/**
 * OnboardingManager — контролирует показ онбординга
 * Показывает только один раз (если не используется версионирование)
 */
export class OnboardingManager {
  constructor(options = {}) {
    this.storageKey = 'morphe-onboarding-completed';
    this.versionKey = 'morphe-onboarding-version';
    this.appVersion = options.appVersion || '1.0.0'; // можно передать версию приложения
    this.completed = this.isCompleted();
  }

  /**
   * Проверяет, прошёл ли пользователь онбординг
   * @returns {boolean}
   */
  isCompleted() {
    // localStorage сохраняет всё как строки, поэтому проверяем "truthy"
    const value = StorageManager.getItem(this.storageKey);
    return value === true || value === 'true';
  }

  /**
   * Отмечает онбординг как завершённый
   */
  complete() {
    StorageManager.setItem(this.storageKey, true);
    StorageManager.setItem(this.versionKey, this.appVersion);
    this.completed = true;
  }

  /**
   * Возвращает версию приложения, в которой был пройден онбординг
   */
  getCompletedVersion() {
    return StorageManager.getItem(this.versionKey) || null;
  }

  /**
   * Должен ли показываться онбординг?
   * @returns {boolean}
   */
  shouldShow() {
    return !this.completed;
  }

  /**
   * Перезапуск (для тестов или отладки)
   */
  reset() {
    StorageManager.removeItem(this.storageKey);
    StorageManager.removeItem(this.versionKey);
    this.completed = false;
  }

  /**
   * Принудительно показать онбординг (например, при мажорном обновлении)
   * @param {string} minVersion — минимальная версия, после которой нужно перепройти онбординг
   * @returns {boolean} true, если онбординг устарел и должен быть показан
   */
  isOutdated(minVersion) {
    if (!minVersion) return false;
    const completedVer = this.getCompletedVersion();
    if (!completedVer) return true;

    // Простое сравнение версий (для продвинутого — использовать semver)
    const toParts = (v) => v.split('.').map(Number);
    const completedParts = toParts(completedVer);
    const minParts = toParts(minVersion);

    for (let i = 0; i < 3; i++) {
      const c = completedParts[i] || 0;
      const m = minParts[i] || 0;
      if (c < m) return true;
      if (c > m) return false;
    }
    return false;
  }
}