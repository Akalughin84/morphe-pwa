// /core/nutritionEngine.js
// v2.5.0 — Расчёт БЖУ от ТЕКУЩЕГО веса (научно корректно)

export class NutritionEngine {
  constructor(profile) {
    if (!profile || !profile.isComplete || !profile.data) {
      throw new Error("Профиль не заполнен. Невозможно рассчитать нормы.");
    }
    this.profile = profile.data;
  }

  /**
   * Рассчитывает базовый метаболизм (BMR) по формуле Миффлина-Сан Жеора.
   * Используется ТОЛЬКО текущий вес (profile.weight).
   */
  calculateBMR() {
    const { weight, height, age, gender } = this.profile;

    // Гарантируем числовые значения
    const numWeight = parseFloat(weight);
    const numHeight = parseFloat(height);
    const numAge = parseFloat(age);

    if (isNaN(numWeight) || numWeight <= 0) throw new Error("Некорректный вес: " + weight);
    if (isNaN(numHeight) || numHeight <= 0) throw new Error("Некорректный рост: " + height);
    if (isNaN(numAge) || numAge <= 0) throw new Error("Некорректный возраст: " + age);

    // Формула Миффлина-Сан Жеора
    let bmr = gender === 'male'
      ? 10 * numWeight + 6.25 * numHeight - 5 * numAge + 5
      : 10 * numWeight + 6.25 * numHeight - 5 * numAge - 161;

    // Минимальный BMR для безопасности
    return Math.max(800, Math.round(bmr));
  }

  /**
   * Рассчитывает общие энергозатраты (TDEE) с учётом активности.
   */
  calculateTDEE() {
    const bmr = this.calculateBMR();
    const activityLevel = parseFloat(this.profile.activityLevel) || 1.375;
    const clampedActivity = Math.min(2.5, Math.max(1.2, activityLevel));
    return Math.round(bmr * clampedActivity);
  }

  /**
   * Рассчитывает целевые калории с учётом цели.
   */
  calculateTargetCalories() {
    const tdee = this.calculateTDEE();
    let adjustment;

    switch (this.profile.goal) {
      case 'lose':
        // Дефицит: 15–20% от TDEE, но не менее 300 ккал
        adjustment = Math.max(300, tdee * 0.15);
        break;
      case 'gain':
        // Профицит: 10% от TDEE
        adjustment = tdee * 0.1;
        break;
      default: // maintain
        adjustment = 0;
    }

    const target = tdee + (this.profile.goal === 'gain' ? adjustment : -adjustment);
    
    // Безопасные минимумы
    const minCalories = this.profile.gender === 'female' ? 1200 : 1500;
    return Math.round(Math.max(minCalories, target));
  }

  /**
   * Рассчитывает макронутриенты (БЖУ).
   * ВСЕГДА использует ТЕКУЩИЙ вес (profile.weight).
   */
  calculateMacros() {
    const calories = this.calculateTargetCalories();
    const currentWeight = parseFloat(this.profile.weight); // ← КЛЮЧЕВОЕ ИЗМЕНЕНИЕ

    if (isNaN(currentWeight) || currentWeight <= 0) {
      throw new Error("Некорректный текущий вес для расчёта БЖУ");
    }

    // Научно обоснованные нормы белка (г/кг от ТЕКУЩЕГО веса)
    let proteinPerKg;
    if (this.profile.goal === 'lose') {
      proteinPerKg = 2.4; // Сохранение мышц в дефиците
    } else if (this.profile.goal === 'gain') {
      proteinPerKg = 2.2; // Поддержка гипертрофии
    } else {
      proteinPerKg = 1.8; // Поддержание
    }

    const proteinGrams = Math.round(currentWeight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    // Жиры: 25% от общей калорийности
    const fatPercentage = 0.25;
    const fatCalories = calories * fatPercentage;
    const fatGrams = Math.round(fatCalories / 9);

    // Углеводы: остаток
    const carbsCalories = Math.max(0, calories - proteinCalories - fatCalories);
    const carbGrams = Math.round(carbsCalories / 4);

    return {
      calories,
      protein: proteinGrams,
      fats: fatGrams,
      carbs: carbGrams
    };
  }

  /**
   * Генерирует персональный совет на основе цели.
   */
  getAdvice() {
    const { goal } = this.profile;
    const macros = this.calculateMacros();
    const adviceMap = {
      lose: `Вы хотите сбросить вес. Рекомендуется умеренный дефицит. Акцент на белке (${macros.protein} г) для сохранения мышц.`,
      gain: `Цель — набор массы. Убедитесь, что питание стабильное. Ешьте каждые 3–4 часа, включая ${macros.carbs} г углеводов.`,
      maintain: `Поддержание формы. Старайтесь держаться около ${macros.calories} ккал в день.`
    };
    return adviceMap[goal] || "Следите за балансом и регулярностью приёмов пищи.";
  }
}