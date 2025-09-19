// core/supplementAdvisor.js

export class SupplementAdvisor {
  constructor(profile) {
    this.profile = profile;
    this.supplements = [];
  }

  async load() {
    const response = await fetch('../data/supplements.json');
    const data = await response.json();
    this.supplements = data.supplements;
  }

  // Основной метод — персональные рекомендации
  getRecommendations() {
    const recommendations = [];

    // Витамин D — всем, кроме лета
    const month = new Date().getMonth(); // 0 = январь
    if (month === 11 || month === 0 || month === 1 || month === 2 || month === 3) {
      const vitD = this.supplements.find(s => s.id === 'vitamin_d');
      if (vitD) recommendations.push(vitD);
    }

    // Магний — при бессоннице или стрессе
    if (this.profile.sleepQuality < 6 || this.profile.stressLevel > 7) {
      const mag = this.supplements.find(s => s.id === 'magnesium');
      if (mag) recommendations.push(mag);
    }

    // Омега-3 — всем, кто не ест жирную рыбу 2+ раза в неделю
    if (!this.profile.eatsFishRegularly) {
      const omega = this.supplements.find(s => s.id === 'omega_3');
      if (omega) recommendations.push(omega);
    }

    // Креатин — при цели "набор" или "сила"
    if (this.profile.goal === 'muscle' || this.profile.priority === 'strength') {
      const creatine = this.supplements.find(s => s.id === 'creatine');
      if (creatine) recommendations.push(creatine);
    }

    // ZMA — при высоком стрессе и плохом сне
    if (this.profile.sleepQuality < 5 && this.profile.stressLevel > 8) {
      const zma = this.supplements.find(s => s.id === 'zma');
      if (zma) recommendations.push(zma);
    }

    return recommendations.length > 0 ? recommendations : [
      {
        name: "Нет необходимых добавок",
        notes: "Ваш образ жизни и питание покрывают потребности. Добавки не требуются.",
        bestFor: []
      }
    ];
  }

  // Получить все добавки
  getAll() {
    return this.supplements;
  }

  // Поиск по ID
  getById(id) {
    return this.supplements.find(s => s.id === id);
  }
}