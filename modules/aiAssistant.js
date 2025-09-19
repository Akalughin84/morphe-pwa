// modules/aiAssistant.js

export class AIAgent {
  constructor(profile, program) {
    this.profile = profile;
    this.program = program;
  }

  getAdvice() {
    const tips = [];
    const dayOfWeek = new Date().getDay(); // 0 = вс, 1 = пн...
    const todayWorkout = this.program[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

    // 1. Травмы
    if (this.profile.injuries && this.profile.injuries.length > 0) {
      tips.push({
        type: 'warning',
        text: `⚠️ Сегодня у тебя запланированы упражнения на ${this.profile.injuries.join(', ')}. Следи за техникой.`
      });
    }

    // 2. Прогрессия
    tips.push({
      type: 'success',
      text: `✅ Попробуй увеличить вес на 1–2 кг в следующем подходе — ты готов к прогрессии!`
    });

    // 3. Питание после тренировки
    if (this.profile.goal === 'muscle') {
      tips.push({
        type: 'nutrition',
        text: `🥛 После тренировки выпей белок в течение 45 минут — это ускорит восстановление мышц.`
      });
    }

    // 4. Вода
    tips.push({
      type: 'info',
      text: `💧 Не забывай пить воду! Минимум 30 мл на кг веса — тебе нужно ~${Math.round(this.profile.weight * 30)} мл.`
    });

    // 5. Личный совет для опытных
    if (this.profile.experience === 'advanced') {
      tips.push({
        type: 'personal',
        text: `🔥 Отличная дисциплина! Следующая цель — +5 кг в приседе за 8 недель.`
      });
    }

    // 6. Сегодняшняя тренировка
    if (todayWorkout && todayWorkout.type !== 'rest') {
      tips.unshift({
        type: 'info',
        text: `📅 Сегодня у тебя: <strong>${todayWorkout.name}</strong>. Готов?`
      });
    }

    // Возвращаем случайный совет
    return tips.length > 0 
      ? tips[Math.floor(Math.random() * tips.length)] 
      : { type: 'info', text: 'Продолжай в том же духе!' };
  }

  render(containerId = 'aiAdvice') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const advice = this.getAdvice();
    container.innerHTML = `
      <div class="advice-item advice-${advice.type}">
        ${advice.text}
      </div>
    `;
  }
}