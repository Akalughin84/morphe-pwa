// /core/nutritionEngine.js
// v2.6.0 — Расчёт БЖУ от ТЕКУЩЕГО веса + интеграция курения, алкоголя, хронических заболеваний и анализов
// Сохранена полная совместимость с v2.5.0

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
   * Рассчитывает целевые калории с учётом цели, алкоголя и хронических заболеваний.
   */
  calculateTargetCalories() {
    const tdee = this.calculateTDEE();
    let adjustment;

    // Проверка на хронические заболевания для безопасности
    const hasDiabetes = Array.isArray(this.profile.chronicConditions) && 
                        this.profile.chronicConditions.includes('diabetes');
    const hasHeartDisease = Array.isArray(this.profile.chronicConditions) && 
                            this.profile.chronicConditions.includes('heart');

    switch (this.profile.goal) {
      case 'lose':
        if (hasDiabetes || hasHeartDisease) {
          // Мягкий дефицит для безопасности
          adjustment = Math.max(200, tdee * 0.1);
        } else {
          // Стандартный дефицит: 15–20%
          adjustment = Math.max(300, tdee * 0.15);
        }
        break;
      case 'gain':
        adjustment = tdee * 0.1;
        break;
      default: // maintain или health
        adjustment = 0;
    }

    // Коррекция на алкоголь (реалистичный буфер)
    if (this.profile.alcohol === 'frequent') {
      adjustment = Math.max(0, adjustment - 250);
    } else if (this.profile.alcohol === 'occasional') {
      adjustment = Math.max(0, adjustment - 150);
    }

    const target = tdee + (this.profile.goal === 'gain' ? adjustment : -adjustment);
    
    // Безопасные минимумы (сохранены для мужчин и женщин)
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
      proteinPerKg = 1.8; // Поддержание или здоровье
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
   * Генерирует персональный совет на основе цели, анализов, курения и алкоголя.
   */
  getAdvice() {
    const { goal } = this.profile;
    const macros = this.calculateMacros();
    let baseAdvice = "";

    // Базовый совет по цели
    if (goal === 'lose') {
      baseAdvice = `Вы хотите сбросить вес. Рекомендуется умеренный дефицит. Акцент на белке (${macros.protein} г) для сохранения мышц.`;
    } else if (goal === 'gain') {
      baseAdvice = `Цель — набор массы. Убедитесь, что питание стабильное. Ешьте каждые 3–4 часа, включая ${macros.carbs} г углеводов.`;
    } else if (goal === 'health') {
      baseAdvice = `Ваша цель — здоровье. Фокус на качество продуктов, разнообразие и регулярность.`;
    } else {
      baseAdvice = `Поддержание формы. Старайтесь держаться около ${macros.calories} ккал в день.`;
    }

    // Анализы — только если данные есть
    if (this.profile.hemoglobin !== null && this.profile.hemoglobin < 120) {
      baseAdvice += "\n\n🩸 Низкий гемоглобин. Ешьте больше: печени, говядины, шпината, граната.";
    }
    if (this.profile.vitaminD !== null && this.profile.vitaminD < 30) {
      baseAdvice += "\n\n☀️ Низкий витамин D. Увеличьте: жирную рыбу, яичные желтки, прогулки на солнце.";
    }

    // Курение
    if (this.profile.smoking && this.profile.smoking !== 'no') {
      baseAdvice += "\n\n🚭 Вы курите — это снижает усвоение витаминов C и D. Рекомендуем: цитрусовые, болгарский перец, жирную рыбу.";
    }

    // Алкоголь
    if (this.profile.alcohol && this.profile.alcohol !== 'none') {
      baseAdvice += "\n\n🍷 Алкоголь замедляет восстановление. Старайтесь не употреблять в дни тренировок.";
    }

    return baseAdvice;
  }

  // === СОХРАНЕННЫЕ МЕТОДЫ ДЛЯ АЛЛЕРГИЙ (без изменений) ===

  /**
   * Фильтрует список продуктов, исключая те, что содержат аллергены пользователя.
   * @param {Array} allFoods — полный список продуктов
   * @param {Array} userAllergies — массив аллергенов пользователя (например, ['dairy', 'nuts'])
   * @returns {Array} — отфильтрованный список
   */
  filterSafeFoods(allFoods, userAllergies = []) {
    if (!Array.isArray(userAllergies) || userAllergies.length === 0) {
      return allFoods;
    }

    return allFoods.filter(food => {
      if (!food.allergens || food.allergens.length === 0) {
        return true; // Без аллергенов — безопасен
      }
      return !food.allergens.some(allergen => 
        userAllergies.includes(allergen)
      );
    });
  }

  /**
   * Находит безопасную замену для аллергенного продукта.
   * @param {Object} food — исходный продукт
   * @param {Array} allFoods — полный список продуктов
   * @param {Array} userAllergies — аллергии пользователя
   * @returns {Object|null} — замена или null
   */
  getSubstitute(food, allFoods, userAllergies = []) {
    const safeFoods = this.filterSafeFoods(allFoods, userAllergies);
    
    // Ищем похожий по категории и белку
    const candidates = safeFoods.filter(f => 
      f.category === food.category &&
      Math.abs((f.protein || 0) - (food.protein || 0)) < 10 &&
      Math.abs((f.calories || 0) - (food.calories || 0)) < 100
    );

    return candidates.length > 0 ? candidates[0] : null;
  }
}