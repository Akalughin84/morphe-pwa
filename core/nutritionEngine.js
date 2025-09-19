// core/nutritionEngine.js

export class NutritionEngine {
  constructor(profile) {
    this.profile = profile;
    this.foods = [];
    this.meals = [];
    this.dailyLog = []; // { date, time, items, totals }
  }

  async loadFoods() {
    const response = await fetch('../data/foods.json');
    const data = await response.json();
    this.foods = data.foods;
    this.meals = data.meals;
  }

  getFood(id) {
    return this.foods.find(f => f.id === id);
  }

  getMeal(id) {
    return this.meals.find(m => m.id === id);
  }

  calculateTDEE() {
    let bmr = 10 * this.profile.weight + 6.25 * this.profile.height - 5 * this.profile.age;
    bmr += this.profile.gender === 'male' ? 5 : -161;

    const activityLevel = [1.2, 1.375, 1.55, 1.725, 1.9][this.profile.activity || 2];
    return Math.round(bmr * activityLevel);
  }

  calculateMacros(tdee) {
    let targetCalories = tdee;
    let protein, fat, carbs;

    if (this.profile.goal === 'muscle') {
      targetCalories += 250;
      protein = Math.round(2.2 * this.profile.weight);
      fat = Math.round(1.0 * this.profile.weight);
    } else if (this.profile.goal === 'fatloss') {
      targetCalories -= 300;
      protein = Math.round(2.0 * this.profile.weight);
      fat = Math.round(0.8 * this.profile.weight);
    } else {
      protein = Math.round(1.8 * this.profile.weight);
      fat = Math.round(0.9 * this.profile.weight);
    }

    const carbsCal = targetCalories - (protein * 4) - (fat * 9);
    carbs = Math.max(0, Math.round(carbsCal / 4));

    return { calories: targetCalories, protein, fat, carbs };
  }

  addMeal(foodItems) {
    const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };

    foodItems.forEach(item => {
      const food = this.getFood(item.foodId);
      if (!food) return;

      const multiplier = item.amount / 100;
      totals.calories += food.calories * multiplier;
      totals.protein += food.protein * multiplier;
      totals.fat += food.fat * multiplier;
      totals.carbs += food.carbs * multiplier;
    });

    const entry = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      items: foodItems,
      totals
    };

    this.dailyLog.push(entry);
    this.saveLog();
    return entry;
  }

  getDailyTotal() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = this.dailyLog.filter(e => e.date === today);
    
    return todayEntries.reduce((acc, entry) => {
      acc.calories += entry.totals.calories;
      acc.protein += entry.totals.protein;
      acc.fat += entry.totals.fat;
      acc.carbs += entry.totals.carbs;
      return acc;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }

  getWeeklyProteinHistory() {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const recent = this.dailyLog.filter(e => e.date >= weekAgo);

    return recent.map(entry => ({
      x: entry.date,
      y: entry.totals.protein
    }));
  }

  generateShoppingList() {
    const dailyLog = this.dailyLog.slice(-7);
    if (dailyLog.length === 0) return ["Фрукты", "Овёс", "Яйца"];

    const avgProtein = dailyLog.reduce((a, d) => a + d.totals.protein, 0) / dailyLog.length;
    const target = Math.round(2.2 * this.profile.weight);

    if (avgProtein < target * 0.8) {
      return ["Творог", "Яйца", "Рыба", "Протеин"];
    }

    return ["Фрукты", "Орехи", "Авокадо", "Шпинат"];
  }

  saveLog() {
    localStorage.setItem('morphe_nutrition_log', JSON.stringify(this.dailyLog));
  }

  loadLog() {
    const saved = localStorage.getItem('morphe_nutrition_log');
    if (saved) {
      try {
        this.dailyLog = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load nutrition log:", e);
      }
    }
  }
}