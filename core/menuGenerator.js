// /core/menuGenerator.js
// v0.6.1 — Надёжный генератор меню с защитой от ошибок

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

  async loadFoods() {
    try {
      const response = await fetch('/data/foods.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.foods = await response.json();
      return this.foods;
    } catch (err) {
      console.error('❌ Не удалось загрузить базу продуктов:', err);
      throw new Error("Не удалось загрузить продукты");
    }
  }

  async loadTargetMacros() {
    const user = UserService.getProfile();
    if (!user || !user.data) throw new Error("Профиль не заполнен");

    this.profile = user.data;

    // ✅ Исправлен путь: предполагаем, что NutritionEngine в /core/
    let engine;
    try {
      const { NutritionEngine } = await import('/core/nutritionEngine.js');
      engine = new NutritionEngine(user);
    } catch (e) {
      console.warn('NutritionEngine не найден, используем fallback');
      // Fallback: расчёт на основе профиля
      const weight = this.profile.weight || 70;
      const goal = this.profile.goal || 'maintain';
      let calories = 2000;
      if (goal === 'lose') calories = Math.max(1200, weight * 22 - 500);
      if (goal === 'gain') calories = weight * 22 + 300;

      this.targetMacros = {
        calories: Math.round(calories),
        protein: Math.round(weight * 2),
        fats: Math.round(calories * 0.3 / 9),
        carbs: Math.round((calories - (weight * 2 * 4) - (calories * 0.3)) / 4)
      };
      return this.targetMacros;
    }

    this.targetMacros = engine.calculateMacros();
    return this.targetMacros;
  }

  findFood(options) {
    const { category, targetCalories, maxDeviation = 100 } = options;

    // ✅ Используем теги вместо поиска в названии (предполагаем, что в foods.json есть поле `tags`)
    const candidates = this.foods.filter(food => {
      if (!food.tags) return false;
      if (category === 'protein' && food.tags.includes('protein')) return true;
      if (category === 'carbs' && food.tags.includes('carbs')) return true;
      if (category === 'fats' && food.tags.includes('fats')) return true;
      if (category === 'veggies' && food.tags.includes('veggies')) return true;
      if (category === 'mixed') return true;
      return false;
    });

    if (candidates.length === 0) {
      // Fallback: любой продукт
      return this.foods[0] || { name: 'Неизвестный продукт', calories: 100, protein: 0, fats: 0, carbs: 0 };
    }

    // Сортируем по близости к целевым калориям
    return candidates.sort((a, b) => {
      const diffA = Math.abs((a.calories || 0) - targetCalories);
      const diffB = Math.abs((b.calories || 0) - targetCalories);
      return diffA - diffB;
    })[0];
  }

  calculateGrams(food, targetCalories) {
    const caloriesPer100g = food.calories || 100;
    if (caloriesPer100g <= 0) return 100;
    return Math.max(10, Math.round((targetCalories / caloriesPer100g) * 100));
  }

  generateBreakfast() {
    const calories = (this.targetMacros.calories || 2000) * 0.3;
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
      totalCalories: (main.calories || 0) * (mainGrams / 100) + (side.calories || 0) * (sideGrams / 100)
    };
  }

  generateLunch() {
    const calories = (this.targetMacros.calories || 2000) * 0.4;
    const main = this.findFood({ category: 'protein', targetCalories: calories * 0.5 });
    const carb = this.findFood({ category: 'carbs', targetCalories: calories * 0.3 });
    const veg = this.findFood({ category: 'veggies', targetCalories: calories * 0.2 });

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
        (main.calories || 0) * (mainGrams / 100),
        (carb.calories || 0) * (carbGrams / 100),
        (veg.calories || 0) * (vegGrams / 100)
      ].reduce((a, b) => a + b, 0)
    };
  }

  generateDinner() {
    const calories = (this.targetMacros.calories || 2000) * 0.3;
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
        (main.calories || 0) * (mainGrams / 100),
        (side.calories || 0) * (sideGrams / 100),
        (fat.calories || 0) * (fatGrams / 100)
      ].reduce((a, b) => a + b, 0)
    };
  }

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
      targetCalories: this.targetMacros.calories || 2000,
      deficit: (this.targetMacros.calories || 2000) - totalCalories
    };
  }
}