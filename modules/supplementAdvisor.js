// /modules/supplementAdvisor.js
// v3.0.1 — Исправлено: getDailySchedule теперь использует await

import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';

export class SupplementAdvisor {
  constructor() {
    this.supplements = [];
    this.user = null;
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.symptoms = this.loadSymptoms();
  }

  loadSymptoms() {
    return {
      fatigue: localStorage.getItem('morphe-symptom-fatigue') === 'true',
      jointPain: localStorage.getItem('morphe-symptom-joint-pain') === 'true',
      muscleCramps: localStorage.getItem('morphe-symptom-cramps') === 'true',
      poorSleep: localStorage.getItem('morphe-symptom-poor-sleep') === 'true',
      lowMood: localStorage.getItem('morphe-symptom-low-mood') === 'true',
      digestiveIssues: localStorage.getItem('morphe-symptom-digestive') === 'true'
    };
  }

  async loadSupplements() {
    this.supplements = [
      {
        id: "creatine",
        name: "Креатин моногидрат",
        evidence: "Strong",
        benefits: ["Увеличение силы", "Рост мышечной массы", "Улучшение восстановления"],
        description: "Самая изученная спортивная добавка. Увеличивает запасы энергии в мышцах. Принимайте постоянно — эффект накопительный.",
        dosage: "5 г в день",
        timing: "Любое время дня, с соком или углеводами",
        form: "моногидрат — самый эффективный и дешёвый",
        forGoals: ["gain", "maintain"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: [],
        sources: ["https://examine.com/supplements/creatine/", "J Int Soc Sports Nutr. 2017"]
      },
      {
        id: "vitamin-d",
        name: "Витамин D3",
        evidence: "Strong",
        benefits: ["Здоровье костей", "Иммунитет", "Сила мышц", "Настроение"],
        description: "Дефицит очень распространён, особенно зимой. Связан с усталостью, слабостью, болью в мышцах, плохим настроением.",
        dosage: "1000–5000 МЕ в день (зависит от уровня в анализах)",
        timing: "С едой, содержащей жиры — утром или в обед",
        form: "D3 (холекальциферол) — не D2",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: ["fatigue", "lowMood", "musclePain"],
        sources: ["https://examine.com/supplements/vitamin-d/", "Nutrients. 2020"]
      },
      {
        id: "magnesium",
        name: "Магний бисглицинат",
        evidence: "Moderate",
        benefits: ["Качество сна", "Восстановление", "Снижение судорог", "Нервная система"],
        description: "Часто дефицитен у спортсменов. Бисглицинат — лучшая форма, хорошо усваивается, не слабит.",
        dosage: "200–400 мг элементарного магния в день",
        timing: "За 30–60 минут до сна",
        form: "бисглицинат — не оксид, не цитрат",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: ["poorSleep", "muscleCramps", "fatigue"],
        sources: ["https://examine.com/supplements/magnesium/", "J Res Med Sci. 2012"]
      },
      {
        id: "omega3",
        name: "Омега-3 (EPA+DHA)",
        evidence: "Strong",
        benefits: ["Снижение воспаления", "Здоровье сердца", "Поддержка суставов", "Мозг"],
        description: "Жирные кислоты EPA и DHA. Снижают воспаление, улучшают здоровье суставов и мозга. Особенно важно при боли в суставах.",
        dosage: "1–3 г EPA+DHA в день (не рыбий жир, а именно EPA+DHA)",
        timing: "С едой — утром или в обед",
        form: "триглицеридная форма — лучше усваивается",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: ["jointPain", "fatigue", "lowMood"],
        sources: ["https://examine.com/supplements/fish-oil/", "J Int Soc Sports Nutr. 2018"]
      },
      {
        id: "collagen",
        name: "Гидролизованный коллаген",
        evidence: "Moderate",
        benefits: ["Здоровье суставов", "Восстановление связок", "Кожа, волосы, ногти"],
        description: "Поддерживает соединительную ткань. Принимайте за 30–60 минут до тренировки с витамином C для лучшего усвоения.",
        dosage: "10–15 г в день",
        timing: "За 30–60 минут до тренировки + витамин C",
        form: "гидролизованный — лучше усваивается",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: ["jointPain", "tendonPain"],
        sources: ["https://examine.com/supplements/collagen/", "J Int Soc Sports Nutr. 2017"]
      },
      {
        id: "protein",
        name: "Сывороточный протеин",
        evidence: "Strong",
        benefits: ["Восполнение белка", "Рост мышц", "Восстановление"],
        description: "Быстроусвояемый белок. Идеален после тренировки или при дефиците белка в рационе. Не заменяет еду — дополняет.",
        dosage: "20–40 г в день (в зависимости от дефицита)",
        timing: "После тренировки или между приёмами пищи",
        form: "изолят — меньше лактозы, концентрат — дешевле",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: [],
        sources: ["https://examine.com/supplements/whey-protein/", "J Am Coll Nutr. 2018"]
      },
      {
        id: "zinc",
        name: "Цинк",
        evidence: "Moderate",
        benefits: ["Иммунитет", "Восстановление", "Тестостерон", "Кожа"],
        description: "Часто дефицитен при интенсивных тренировках. Принимайте вечером, отдельно от магния (если нет комплекса).",
        dosage: "15–30 мг в день (элементарного цинка)",
        timing: "Вечером, за 2 часа до/после магния",
        form: "пиколинат или бисглицинат — лучше усваиваются",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["intermediate", "advanced"],
        forSymptoms: ["fatigue", "lowMood", "poorSleep"],
        sources: ["https://examine.com/supplements/zinc/", "Nutrients. 2019"]
      },
      {
        id: "multivitamin",
        name: "Мультивитаминный комплекс",
        evidence: "Moderate",
        benefits: ["Подстраховка", "Заполнение дефицитов", "Энергия"],
        description: "Не заменяет сбалансированное питание, но страхует от дефицитов. Выбирайте без железа (если не нужно), с метилфолатом, а не фолиевой кислотой",
        dosage: "1 порция в день",
        timing: "С завтраком",
        form: "без железа (если не нужно), с метилфолатом, а не фолиевой кислотой",
        forGoals: ["gain", "maintain", "lose"],
        forLevels: ["beginner", "intermediate", "advanced"],
        forSymptoms: ["fatigue", "lowMood", "digestiveIssues"],
        sources: ["https://examine.com/supplements/multivitamin/", "Am J Clin Nutr. 2017"]
      }
    ];
    return this.supplements;
  }

  /**
   * Получить персонализированные рекомендации
   */
  async getPersonalizedRecommendations() {
    const user = UserService.getProfile();
    if (!user || !user.data) {
      throw new Error("Профиль не заполнен");
    }
    this.user = user.data;

    // Фильтруем по цели, уровню и симптомам
    return this.supplements.filter(s => {
      const matchesGoal = s.forGoals.includes(this.user.goal);
      const matchesLevel = s.forLevels.includes(this.user.level);
      const matchesSymptoms = this.symptoms && Object.keys(this.symptoms).length > 0
        ? s.forSymptoms.length === 0 || s.forSymptoms.some(symptom => this.symptoms[symptom])
        : true;
      return matchesGoal && matchesLevel && matchesSymptoms;
    });
  }

  /**
   * Получить добавки по категории
   */
  getByCategory(category) {
    const categoryMap = {
      performance: ['creatine', 'caffeine', 'beta-alanine', 'citrulline'],
      recovery: ['protein', 'omega3', 'magnesium', 'collagen', 'zinc'],
      health: ['vitamin-d', 'omega3', 'magnesium', 'multivitamin', 'zinc'],
      sleep: ['magnesium', 'glycine', 'melatonin'],
      joints: ['omega3', 'collagen', 'turmeric']
    };
    const ids = categoryMap[category] || [];
    return this.supplements.filter(s => ids.includes(s.id));
  }

  /**
   * Получить общие научные рекомендации (fallback)
   */
  _getGeneralScienceBased() {
    return this.supplements.filter(s => s.evidence === 'Strong');
  }

  /**
   * ✅ Получить план приёма на день — ИСПРАВЛЕНО: добавлен await
   */
  async getDailySchedule() {
    // ✅ ИСПРАВЛЕНО: добавлен await
    const recs = await this.getPersonalizedRecommendations();
    const schedule = {
      morning: [],
      preWorkout: [],
      postWorkout: [],
      evening: []
    };

    recs.forEach(s => {
      if (s.timing.includes('утром') || s.timing.includes('завтрак')) {
        schedule.morning.push(s);
      } else if (s.timing.includes('до тренировки')) {
        schedule.preWorkout.push(s);
      } else if (s.timing.includes('после тренировки')) {
        schedule.postWorkout.push(s);
      } else if (s.timing.includes('вечер') || s.timing.includes('сон')) {
        schedule.evening.push(s);
      } else {
        schedule.morning.push(s);
      }
    });

    return schedule;
  }
}