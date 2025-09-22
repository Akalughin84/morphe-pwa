// /core/menuGenerator.js
// v0.6.0 — Генератор ежедневного меню

import { UserService } from '/services/userService.js';

/**
 * MenuGenerator — создаёт сбалансированное меню на день
 * Подбирает завтрак, обед, ужин под целевые калории и БЖУ
 */
export class MenuGenerator {
  constructor() {
    this.foods = [];
    this.profile = null;
    this.targetMacros = null;
  }

  /**
   * Загружает базу продуктов
   */
  async loadFoods() {
    try {
      const response = await fetch('/data/foods.json');
      this.foods = await response.json();
      return this.foods;
    } catch (err) {
      console.error('❌ Не удалось загрузить базу продуктов:', err);
      throw new Error("Не удалось загрузить продукты");
    }
  }

  /**
   * Получает целевые нормы
   */
  async loadTargetMacros() {
    const user = UserService.getProfile();
    if (!user) throw new Error("Профиль не заполнен");

    this.profile = user.data;

    const engine = new (await import('./nutritionEngine.js')).NutritionEngine(user);
    this.targetMacros = engine.calculateMacros();

    return this.targetMacros;
  }

  /**
   * Находит подходящий продукт по критериям
   */
  findFood(options) {
    const { category, targetCalories, maxDeviation = 100 } = options;
    const candidates = this.foods.filter(food => {
      if (category === 'protein' && ['курица', 'яйцо', 'творог', 'рыба'].some(k => food.name.toLowerCase().includes(k))) return true;
      if (category === 'carbs' && ['рис', 'гречка', 'овсянка', 'хлеб', 'картофель'].some(k => food.name.toLowerCase().includes(k))) return true;
      if (category === 'fats' && ['авокадо', 'оливки', 'орехи', 'масло'].some(k => food.name.toLowerCase().includes(k))) return true;
      if (category === 'mixed') return true; // универсальные
      return false;
    });

    // Сортируем по близости к целевым калориям
    return candidates.sort((a, b) => {
      const diffA = Math.abs(a.calories - targetCalories);
      const diffB = Math.abs(b.calories - targetCalories);
      return diffA - diffB;
    })[0];
  }

  /**
   * Вычисляет нужные граммы продукта для заданных калорий
   */
  calculateGrams(food, targetCalories) {
    return Math.round((targetCalories / food.calories) * 100);
  }

  /**
   * Генерирует завтрак
   */
  generateBreakfast() {
    const calories = this.targetMacros.calories * 0.3; // 30%
    const protein = this.targetMacros.protein * 0.3;

    const main = this.findFood({ category: 'protein', targetCalories: calories * 0.7 });
    const side = this.findFood({ category: 'carbs', targetCalories: calories * 0.3 });

    const mainGrams = this.calculateGrams(main, calories * 0.7);
    const sideGrams = this.calculateGrams(side, calories * 0.3);

    return {
      meal: "Завтрак",
      items: [
        { ...main, grams: mainGrams },
        { ...side, grams: sideGrams }
      ],
      totalCalories: main.calories * (mainGrams / 100) + side.calories * (sideGrams / 100),
      totalProtein: main.protein * (mainGrams / 100) + side.protein * (sideGrams / 100)
    };
  }

  /**
   * Генерирует обед
   */
  generateLunch() {
    const calories = this.targetMacros.calories * 0.4; // 40%
    const protein = this.targetMacros.protein * 0.4;

    const main = this.findFood({ category: 'protein', targetCalories: calories * 0.5 });
    const carb = this.findFood({ category: 'carbs', targetCalories: calories * 0.3 });
    const veg = this.findFood({ category: 'mixed', targetCalories: calories * 0.2, nameHint: 'огурец|помидор|салат' });

    const mainGrams = this.calculateGrams(main, calories * 0.5);
    const carbGrams = this.calculateGrams(carb, calories * 0.3);
    const vegGrams = this.calculateGrams(veg, calories * 0.2);

    return {
      meal: "Обед",
      items: [
        { ...main, grams: mainGrams },
        { ...carb, grams: carbGrams },
        { ...veg, grams: vegGrams }
      ],
      totalCalories: [
        main.calories * (mainGrams / 100),
        carb.calories * (carbGrams / 100),
        veg.calories * (vegGrams / 100)
      ].reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Генерирует ужин
   */
  generateDinner() {
    const calories = this.targetMacros.calories * 0.3; // 30%

    const main = this.findFood({ category: 'protein', targetCalories: calories * 0.6 });
    const side = this.findFood({ category: 'carbs', targetCalories: calories * 0.2 });
    const fat = this.findFood({ category: 'fats', targetCalories: calories * 0.2 });

    const mainGrams = this.calculateGrams(main, calories * 0.6);
    const sideGrams = this.calculateGrams(side, calories * 0.2);
    const fatGrams = this.calculateGrams(fat, calories * 0.2);

    return {
      meal: "Ужин",
      items: [
        { ...main, grams: mainGrams },
        { ...side, grams: sideGrams },
        { ...fat, grams: fatGrams }
      ],
      totalCalories: [
        main.calories * (mainGrams / 100),
        side.calories * (sideGrams / 100),
        fat.calories * (fatGrams / 100)
      ].reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Генерирует полное меню
   */
  async generateMenu() {
    await this.loadFoods();
    await this.loadTargetMacros();

    const breakfast = this.generateBreakfast();
    const lunch = this.generateLunch();
    const dinner = this.generateDinner();

    const totalCalories = Math.round(
      breakfast.totalCalories +
      lunch.totalCalories +
      dinner.totalCalories
    );

    return {
      breakfast,
      lunch,
      dinner,
      totalCalories,
      targetCalories: this.targetMacros.calories,
      deficit: this.targetMacros.calories - totalCalories
    };
  }
}