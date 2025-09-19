// core/menuGenerator.js

export class MenuGenerator {
  constructor(profile, foods, history = {}) {
    this.profile = profile;
    this.foods = foods;
    this.history = history;
  }

  generate() {
    const tdee = this.calculateTDEE();
    const macros = this.calculateMacros(tdee);
    const remaining = this.getRemainingMacros(macros);

    const breakfast = this.pickMeal('breakfast', remaining, 0.25);
    const lunch = this.pickMeal('lunch', remaining, 0.40);
    const dinner = this.pickMeal('dinner', remaining, 0.35);

    return {
      breakfast,
      lunch,
      dinner,
      total: this.sumMeals([breakfast, lunch, dinner]),
      suggestions: true
    };
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

  getRemainingMacros(targetMacros) {
    const today = new Date().toISOString().split('T')[0];
    const dailyLog = this.history.nutritionLog?.filter(e => e.date === today) || [];
    
    const consumed = dailyLog.reduce((acc, entry) => {
      acc.calories += entry.totals.calories;
      acc.protein += entry.totals.protein;
      acc.fat += entry.totals.fat;
      acc.carbs += entry.totals.carbs;
      return acc;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

    return {
      calories: Math.max(0, targetMacros.calories - consumed.calories),
      protein: Math.max(0, targetMacros.protein - consumed.protein),
      fat: Math.max(0, targetMacros.fat - consumed.fat),
      carbs: Math.max(0, targetMacros.carbs - consumed.carbs)
    };
  }

  pickMeal(type, remaining, portion) {
    const target = {
      calories: Math.round(remaining.calories * portion),
      protein: Math.round(remaining.protein * portion),
      fat: Math.round(remaining.fat * portion),
      carbs: Math.round(remaining.carbs * portion)
    };

    // Подбор продуктов
    const candidates = this.foods.filter(food => 
      food.calories > 0 && 
      !['snack', 'drink'].includes(food.category)
    );

    const mealItems = [];
    let current = { c: 0, p: 0, f: 0, cr: 0 };

    // Приоритет: белок → углеводы/жиры
    const highProtein = candidates
      .filter(f => f.protein > 10)
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    for (const food of highProtein) {
      const amount = this.getAmountForProtein(food, target.protein * 0.6);
      if (amount > 0) {
        mealItems.push({ foodId: food.id, amount });
        current.c += food.calories * (amount / 100);
        current.p += food.protein * (amount / 100);
        current.f += food.fat * (amount / 100);
        current.cr += food.carbs * (amount / 100);
      }
    }

    // Доливаем калории
    const filler = candidates.sort(() => 0.5 - Math.random())[0];
    const fillAmount = this.getAmountToReachTarget(filler, target, current);
    if (fillAmount > 0) {
      mealItems.push({ foodId: filler.id, amount: fillAmount });
    }

    return {
      items: mealItems,
      totals: current
    };
  }

  getAmountForProtein(food, targetProtein) {
    if (food.protein === 0) return 0;
    const per100g = food.protein / 100;
    const amount = (targetProtein / per100g);
    return amount > 300 ? 300 : Math.round(amount);
  }

  getAmountToReachTarget(food, target, current) {
    const diff = target.calories - current.c;
    if (diff <= 0) return 0;
    const per100g = food.calories / 100;
    const amount = (diff / per100g);
    return amount > 200 ? 200 : Math.round(amount);
  }

  sumMeals(meals) {
    return meals.reduce((acc, m) => ({
      calories: acc.calories + m.totals.c,
      protein: acc.protein + m.totals.p,
      fat: acc.fat + m.totals.f,
      carbs: acc.carbs + m.totals.cr
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }
}
