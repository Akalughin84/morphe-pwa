// core/nutritionAdvisor.js

export class NutritionAdvisor {
  constructor(profile, history) {
    this.profile = profile;
    this.history = history;
  }

  getAdvice() {
    const tips = [];
    const dailyLog = this.history.nutritionLog?.slice(-7) || [];
    const workoutHistory = this.history.workouts?.slice(-7) || [];

    // 1. Проверка белка
    const avgProtein = this.calcAvg(dailyLog, 'protein');
    const targetProtein = Math.round(2.2 * this.profile.weight);
    if (avgProtein < targetProtein * 0.8) {
      tips.push({
        type: 'nutrition',
        text: `📉 Недостаток белка: ${Math.round(avgProtein)} из ${targetProtein} г/день. Добавьте творог, яйца или протеин — это важно для мышц и восстановления.`
      });
    }

    // 2. Проверка овощей / клетчатки (косвенно)
    const hasGreenDays = dailyLog.some(day => 
      day.items?.some(i => ['овощи', 'шпинат', 'брокколи'].some(k => i.foodName?.includes(k)))
    );
    if (!hasGreenDays) {
      tips.push({
        type: 'nutrition',
        text: `🥗 Ты давно не ел зелёных овощей. Добавь шпинат или брокколи — они улучшают пищеварение и снижают воспаление.`
      });
    }

    // 3. Гидратация
    const avgWater = this.history.hydration?.avg || 2.0;
    if (avgWater < 2.5) {
      tips.push({
        type: 'info',
        text: `💧 Пей больше воды! Минимум 30 мл на кг веса — тебе нужно ~${Math.round(this.profile.weight * 30 / 1000)} л в день.`
      });
    }

    // 4. После тренировки — белок
    const lastWorkout = workoutHistory.find(w => w.completed);
    const lastMeal = dailyLog[dailyLog.length - 1];
    if (lastWorkout && lastMeal) {
      const workoutTime = new Date(lastWorkout.date).getTime();
      const mealTime = new Date(lastMeal.date).getTime();
      const diffHours = (mealTime - workoutTime) / (1000 * 60 * 60);

      if (diffHours > 1.5 && !this.containsProtein(lastMeal)) {
        tips.push({
          type: 'recovery',
          text: `🥛 После тренировки выпей белок (творог, яйца, протеин) в течение 1–2 часов — это ускорит восстановление мышц.`
        });
      }
    }

    // 5. Скрытые калории
    if (this.profile.goal === 'fatloss' && this.history.weightTrend === 'plateau') {
      tips.push({
        type: 'info',
        text: `🔍 Вес стоит? Проверь скрытые калории: орехи, авокадо, соусы, алкоголь. Иногда 200 ккал “невидимо” мешают похудению.`
      });
    }

    // 6. Зима — витамин D
    const month = new Date().getMonth();
    if ([11, 0, 1].includes(month)) { // дек, янв, фев
      tips.push({
        type: 'nutrition',
        text: `❄️ Зимой не хватает витамина D. Принимай 1000–2000 МЕ в день или ешь жирную рыбу. Это важно для иммунитета и тестостерона.`
      });
    }

    // 7. Высокая нагрузка — разгрузка
    const intenseDays = workoutHistory.filter(w => w.intensity > 7).length;
    if (intenseDays >= 4) {
      tips.push({
        type: 'warning',
        text: `⚠️ У тебя высокая нагрузка. Рассмотрите разгрузочную неделю — это поможет прогрессу в долгосрочной перспективе.`
      });
    }

    // 8. Дефицит омега-3
    if (!this.history.eatsFishRegularly) {
      tips.push({
        type: 'nutrition',
        text: `🐟 Ты редко ешь жирную рыбу. Рассмотрите приём омега-3 — это снижает воспаление и поддерживает сердце.`
      });
    }

    // Если нет проблем — позитивный фидбэк
    if (tips.length === 0) {
      tips.push({
        type: 'success',
        text: `✅ Отлично! Твоё питание и восстановление соответствуют цели. Продолжай в том же темпе — результат придёт.`
      });
    }

    return tips;
  }

  calcAvg(log, field) {
    if (!log || log.length === 0) return 0;
    const sum = log.reduce((acc, day) => acc + (day[field] || 0), 0);
    return sum / log.length;
  }

  containsProtein(meal) {
    return meal.items?.some(i => 
      ['творог', 'яйца', 'протеин', 'курица', 'рыба'].some(k => i.foodName?.includes(k))
    );
  }
}