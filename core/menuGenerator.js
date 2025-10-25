// /core/menuGenerator.js
// v0.9.0 — Адаптивные калории + микро-советы + альтернативы

import { UserService } from '/services/userService.js';

export class MenuGenerator {
  constructor() {
    this.foods = [];
    this.profile = null;
    this.targetMacros = null;
    this.currentSeason = this._getCurrentSeason();
  }

  _getCurrentSeason() {
    const month = new Date().getMonth();
    if ([11, 0, 1].includes(month)) return 'winter';
    if ([2, 3, 4].includes(month)) return 'spring';
    if ([5, 6, 7].includes(month)) return 'summer';
    return 'autumn';
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

    let engine;
    try {
      const { NutritionEngine } = await import('/core/nutritionEngine.js');
      engine = new NutritionEngine(user);
    } catch (e) {
      console.warn('NutritionEngine не найден, используем fallback');
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

  _isPreferred(food) {
    if (!this.profile) return true;
    if (this.profile.dislikes?.some(d => food.name.toLowerCase().includes(d.toLowerCase()))) {
      return false;
    }
    if (this.profile.cuisinePreference && food.cuisine && food.cuisine !== this.profile.cuisinePreference) {
      return false;
    }
    return true;
  }

  findFood(options, excludeIds = []) {
    const { category, targetCalories } = options;

    const candidates = this.foods.filter(food => {
      if (excludeIds.includes(food.id)) return false;
      if (!this._isPreferred(food)) return false;
      if (food.season && !food.season.includes(this.currentSeason)) return false;

      if (!food.tags) return false;
      if (category === 'protein' && food.tags.includes('protein')) return true;
      if (category === 'carbs' && food.tags.includes('carbs')) return true;
      if (category === 'fats' && food.tags.includes('fats')) return true;
      if (category === 'veggies' && food.tags.includes('veggies')) return true;
      if (category === 'mixed') return true;
      return false;
    });

    if (candidates.length === 0) {
      if (category !== 'mixed') {
        const mixedFallback = this.foods.filter(food =>
          !excludeIds.includes(food.id) &&
          this._isPreferred(food) &&
          (!food.season || food.season.includes(this.currentSeason)) &&
          food.tags?.includes('mixed')
        );
        if (mixedFallback.length > 0) {
          return mixedFallback.sort((a, b) => Math.abs((a.calories || 0) - targetCalories) - Math.abs((b.calories || 0) - targetCalories))[0];
        }
      }
      return this.foods[0] || { name: 'Неизвестный продукт', calories: 100, protein: 0, fats: 0, carbs: 0 };
    }

    return candidates.sort((a, b) => {
      const diffA = Math.abs((a.calories || 0) - targetCalories);
      const diffB = Math.abs((b.calories || 0) - targetCalories);
      return diffA - diffB;
    })[0];
  }

  findFoodAlternatives(options, excludeIds = [], count = 3) {
    const { category, targetCalories } = options;

    const candidates = this.foods.filter(food => {
      if (excludeIds.includes(food.id)) return false;
      if (!this._isPreferred(food)) return false;
      if (food.season && !food.season.includes(this.currentSeason)) return false;

      if (!food.tags) return false;
      if (category === 'protein' && food.tags.includes('protein')) return true;
      if (category === 'carbs' && food.tags.includes('carbs')) return true;
      if (category === 'fats' && food.tags.includes('fats')) return true;
      if (category === 'veggies' && food.tags.includes('veggies')) return true;
      if (category === 'mixed') return true;
      return false;
    });

    const sorted = candidates.sort((a, b) => {
      const diffA = Math.abs((a.calories || 0) - targetCalories);
      const diffB = Math.abs((b.calories || 0) - targetCalories);
      return diffA - diffB;
    });

    return sorted.slice(0, count).map(food => ({
      ...food,
      grams: this.calculateGrams(food, targetCalories)
    }));
  }

  calculateGrams(food, targetCalories) {
    const caloriesPer100g = food.calories || 100;
    if (caloriesPer100g <= 0) return 100;
    let grams = Math.round((targetCalories / caloriesPer100g) * 100);
    if (food.portionMin !== undefined) grams = Math.max(food.portionMin, grams);
    if (food.portionMax !== undefined) grams = Math.min(food.portionMax, grams);
    return Math.max(1, grams);
  }

  // Обновлённые методы с поддержкой целевых калорий
  generateBreakfast(excludeIds = [], targetCalories = 600) {
    const main = this.findFood({ category: 'protein', targetCalories: targetCalories * 0.6 }, excludeIds);
    const side = this.findFood({ category: 'carbs', targetCalories: targetCalories * 0.4 }, excludeIds);

    const mainGrams = this.calculateGrams(main, targetCalories * 0.6);
    const sideGrams = this.calculateGrams(side, targetCalories * 0.4);

    return {
      meal: "Завтрак",
      items: [
        { ...main, grams: mainGrams, tip: main.tip },
        { ...side, grams: sideGrams, tip: side.tip }
      ],
      totalCalories: (main.calories || 0) * (mainGrams / 100) + (side.calories || 0) * (sideGrams / 100)
    };
  }

  generateLunch(excludeIds = [], targetCalories = 800) {
    const main = this.findFood({ category: 'protein', targetCalories: targetCalories * 0.5 }, excludeIds);
    const carb = this.findFood({ category: 'carbs', targetCalories: targetCalories * 0.3 }, excludeIds);
    const veg = this.findFood({ category: 'veggies', targetCalories: targetCalories * 0.2 }, excludeIds);

    const mainGrams = this.calculateGrams(main, targetCalories * 0.5);
    const carbGrams = this.calculateGrams(carb, targetCalories * 0.3);
    const vegGrams = this.calculateGrams(veg, targetCalories * 0.2);

    return {
      meal: "Обед",
      items: [
        { ...main, grams: mainGrams, tip: main.tip },
        { ...carb, grams: carbGrams, tip: carb.tip },
        { ...veg, grams: vegGrams, tip: veg.tip }
      ],
      totalCalories: [
        (main.calories || 0) * (mainGrams / 100),
        (carb.calories || 0) * (carbGrams / 100),
        (veg.calories || 0) * (vegGrams / 100)
      ].reduce((a, b) => a + b, 0)
    };
  }

  generateDinner(excludeIds = [], targetCalories = 600) {
    const main = this.findFood({ category: 'protein', targetCalories: targetCalories * 0.5 }, excludeIds);
    const side = this.findFood({ category: 'carbs', targetCalories: targetCalories * 0.2 }, excludeIds);
    const fat = this.findFood({ category: 'fats', targetCalories: targetCalories * 0.3 }, excludeIds);

    const mainGrams = this.calculateGrams(main, targetCalories * 0.5);
    const sideGrams = this.calculateGrams(side, targetCalories * 0.2);
    const fatGrams = this.calculateGrams(fat, targetCalories * 0.3);

    return {
      items: [
        { ...main, grams: mainGrams, tip: main.tip },
        { ...side, grams: sideGrams, tip: side.tip },
        { ...fat, grams: fatGrams, tip: fat.tip }
      ],
      totalCalories: [
        (main.calories || 0) * (mainGrams / 100),
        (side.calories || 0) * (sideGrams / 100),
        (fat.calories || 0) * (fatGrams / 100)
      ].reduce((a, b) => a + b, 0)
    };
  }

  generateDinnerAlternatives(excludeIds = [], count = 3, targetCalories = 600) {
    const alternatives = [];
    for (let i = 0; i < count; i++) {
      const used = [...excludeIds];
      if (alternatives.length > 0) {
        used.push(...alternatives.flatMap(a => a.items.map(it => it.id)));
      }

      const mainOpts = this.findFoodAlternatives({ category: 'protein', targetCalories: targetCalories * 0.5 }, used, 1);
      if (mainOpts.length === 0) break;

      const main = mainOpts[0];
      const side = this.findFood({ category: 'carbs', targetCalories: targetCalories * 0.2 }, [...used, main.id]);
      const fat = this.findFood({ category: 'fats', targetCalories: targetCalories * 0.3 }, [...used, main.id, side.id]);

      const mainGrams = main.grams;
      const sideGrams = this.calculateGrams(side, targetCalories * 0.2);
      const fatGrams = this.calculateGrams(fat, targetCalories * 0.3);

      alternatives.push({
        items: [
          { ...main, grams: mainGrams, tip: main.tip },
          { ...side, grams: sideGrams, tip: side.tip },
          { ...fat, grams: fatGrams, tip: fat.tip }
        ],
        totalCalories: [
          (main.calories || 0) * (mainGrams / 100),
          (side.calories || 0) * (sideGrams / 100),
          (fat.calories || 0) * (fatGrams / 100)
        ].reduce((a, b) => a + b, 0)
      });
    }

    return alternatives.length > 0 ? alternatives : [this.generateDinner(excludeIds, targetCalories)];
  }

  async generateMenu() {
    await this.loadFoods();
    await this.loadTargetMacros();

    const totalTarget = this.targetMacros.calories || 2000;

    // Минимумы для приёмов пищи
    const minBreakfast = Math.max(400, totalTarget * 0.25);
    const minLunch = Math.max(500, totalTarget * 0.35);
    const minDinner = Math.max(300, totalTarget * 0.25);

    // Завтрак — 30% от цели, но не меньше minBreakfast
    let breakfast = this.generateBreakfast([], minBreakfast);
    let remaining = totalTarget - breakfast.totalCalories;

    // Обед — 40% от цели или всё, что осталось (но не меньше minLunch)
    let lunchTarget = Math.min(remaining, Math.max(minLunch, totalTarget * 0.4));
    let lunch = this.generateLunch([breakfast.items[0].id], lunchTarget);
    remaining -= lunch.totalCalories;

    // Ужин — всё оставшееся, но не меньше minDinner
    let dinnerTarget = Math.max(remaining, minDinner);
    let dinnerAlternatives = this.generateDinnerAlternatives(
      [breakfast.items[0].id, lunch.items[0].id],
      3,
      dinnerTarget
    );
    let dinner = dinnerAlternatives[0];

    const totalCalories = Math.round(
      breakfast.totalCalories +
      lunch.totalCalories +
      dinner.totalCalories
    );

    return {
      breakfast,
      lunch,
      dinner,
      dinnerAlternatives,
      totalCalories,
      targetCalories: totalTarget,
      deficit: totalTarget - totalCalories
    };
  }
}