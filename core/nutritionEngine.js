// /core/nutritionEngine.js
// v2.4.1 — Исправлено: принимает MorpheProfile, а не сырые данные

/**
 * NutritionEngine — расчёт норм калорий и БЖУ
 * На основе: Mifflin-St Jeor + коэффициент активности + цель
 */
export class NutritionEngine {
  constructor(profile) {
    // ✅ Проверяем, что передан MorpheProfile с данными
    if (!profile || !profile.isComplete || !profile.data) {
      throw new Error("Профиль не заполнен. Невозможно рассчитать нормы.");
    }
    this.profile = profile.data; // ← сохраняем только данные для расчётов
  }

  /**
   * Расчёт базового метаболизма (BMR)
   * Mifflin-St Jeor Equation
   */
  calculateBMR() {
    const { weight, height, age, gender } = this.profile;

    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    return Math.round(bmr);
  }

  /**
   * Общая суточная норма (TDEE)
   */
  calculateTDEE() {
    const bmr = this.calculateBMR();
    // ✅ Убедимся, что activityLevel существует и число
    const activityLevel = this.profile.activityLevel || 1.375;
    const tdee = bmr * activityLevel;
    return Math.round(tdee);
  }

  /**
   * Целевые калории в зависимости от цели
   */
  calculateTargetCalories() {
    const tdee = this.calculateTDEE();
    let target;

    switch (this.profile.goal) {
      case 'lose':
        target = tdee - 300;
        break;
      case 'gain':
        target = tdee + 300;
        break;
      default:
        target = tdee;
    }

    return Math.round(target);
  }

  /**
   * Распределение БЖУ (в граммах)
   */
  calculateMacros() {
    const calories = this.calculateTargetCalories();
    const { weight, goal } = this.profile;

    const proteinPerKg = goal === 'gain' ? 2.0 : 1.8;
    const proteinGrams = Math.round(weight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    const fatPercentage = 0.25;
    const fatCalories = calories * fatPercentage;
    const fatGrams = Math.round(fatCalories / 9);

    const carbsCalories = calories - proteinCalories - fatCalories;
    const carbGrams = Math.round(carbsCalories / 4);

    return {
      calories,
      protein: proteinGrams,
      fats: fatGrams,
      carbs: carbGrams
    };
  }

  /**
   * Человеко-понятные рекомендации
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