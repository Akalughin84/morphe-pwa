// /services/userService.js
// v2.4.2 — Исправлено: передаём profile, а не profile.data в NutritionEngine

import { MorpheProfile } from '/modules/profile.js';

/**
 * UserService — единая точка доступа к данным пользователя
 * Работает с MorpheProfile, обеспечивает целостность данных
 */
export class UserService {
  /**
   * Получить профиль, если он заполнен
   * @returns {MorpheProfile|null}
   */
  static getProfile() {
    const profile = new MorpheProfile();
    return profile.isComplete() ? profile : null;
  }

  /**
   * Получить план питания на основе профиля
   * @returns {Object|null} bmr, tdee, target, macros, advice
   */
  static async getNutritionPlan() {
    const profile = this.getProfile(); // ✅ Это MorpheProfile, а не сырые данные
    if (!profile) return null;

    try {
      const { NutritionEngine } = await import('../core/nutritionEngine.js');
      const engine = new NutritionEngine(profile); // ✅ Передаём profile, а не profile.data
      
      return {
        bmr: Math.round(engine.calculateBMR()),
        tdee: Math.round(engine.calculateTDEE()),
        target: Math.round(engine.calculateTargetCalories()),
        macros: engine.calculateMacros(),
        advice: engine.getAdvice()
      };
    } catch (err) {
      console.error('❌ Ошибка расчёта питания:', err);
      return null;
    }
  }

  /**
   * Проверить, заполнен ли профиль
   * @returns {boolean}
   */
  static isProfileComplete() {
    const profile = new MorpheProfile();
    return profile.isComplete();
  }

  /**
   * Получить сырые данные профиля
   * @returns {Object|null}
   */
  static getRawData() {
    const profile = new MorpheProfile();
    return profile.isComplete() ? profile.data : null;
  }
}