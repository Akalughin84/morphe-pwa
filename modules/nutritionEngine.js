// modules/nutritionEngine.js

export class NutritionEngine {
  constructor() {
    this.foods = [];
  }

  async loadFoods() {
    const response = await fetch('../data/foods.json');
    const data = await response.json();
    this.foods = data.foods;
  }

  calculateTDEE(profile) {
    let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
    bmr += profile.gender === 'male' ? 5 : -161;

    // Активность: 1.2 – 1.9
    let activityLevel = 1.2; // сидячая работа
    if (profile.availableDays >= 5) activityLevel = 1.55;
    if (profile.goal === 'muscle') activityLevel = Math.min(activityLevel + 0.2, 1.9);

    return Math.round(bmr * activityLevel);
  }

  calculateMacros(profile, calories) {
    let protein, fat, carbsCal;

    // Цель: набор мышц
    if (profile.goal === 'muscle') {
      protein = Math.round(2.2 * profile.weight);
      fat = Math.round(1.0 * profile.weight);
    } 
    // Цель: похудение
    else if (profile.goal === 'fatloss') {
      protein = Math.round(2.0 * profile.weight);
      fat = Math.round(0.8 * profile.weight);
    } 
    // Здоровье / тонус
    else {
      protein = Math.round(1.8 * profile.weight);
      fat = Math.round(0.9 * profile.weight);
    }

    carbsCal = calories - (protein * 4) - (fat * 9);
    const carbs = Math.round(carbsCal / 4);

    return { protein, fat, carbs };
  }

  generateMealPlan(profile, macros) {
    return [
      {
        meal: "Завтрак",
        items: [
          { foodId: "oats", amount: 60, name: "Овсянка" },
          { foodId: "chicken_breast", amount: 100, name: "Яйца" },
          { foodId: "banana", amount: 100, name: "Банан" }
        ],
        estimatedCalories: 550
      },
      {
        meal: "Обед",
        items: [
          { foodId: "chicken_breast", amount: 150, name: "Курица" },
          { foodId: "oats", amount: 50, name: "Гречка" },
          { foodId: "avocado", amount: 50, name: "Авокадо" }
        ],
        estimatedCalories: 700
      },
      {
        meal: "Ужин",
        items: [
          { foodId: "salmon", amount: 120, name: "Лосось" },
          { foodId: "greek_yogurt", amount: 150, name: "Йогурт" }
        ],
        estimatedCalories: 500
      }
    ];
  }

  async getFoodById(id) {
    if (!this.foods.length) await this.loadFoods();
    return this.foods.find(f => f.id === id);
  }
}