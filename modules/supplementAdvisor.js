// /modules/supplementAdvisor.js
// v4.1.0 — Полная поддержка supplements.json + исправление симптомов и категорий
import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';

export class SupplementAdvisor {
  constructor() {
    this._supplements = null;
    this.user = null;
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.symptoms = this.loadSymptoms();
  }

  loadSymptoms() {
    const symptomKeys = {
      fatigue: 'morphe-symptom-fatigue',
      jointPain: 'morphe-symptom-joint-pain',
      muscleCramps: 'morphe-symptom-cramps',
      poorSleep: 'morphe-symptom-poor-sleep',
      lowMood: 'morphe-symptom-low-mood',
      digestiveIssues: 'morphe-symptom-digestive'
    };
    const symptoms = {};
    for (const [key, storageKey] of Object.entries(symptomKeys)) {
      symptoms[key] = localStorage.getItem(storageKey) === 'true';
    }
    return symptoms;
  }

  async loadSupplements() {
    if (this._supplements) return this._supplements;

    try {
      // Убедитесь, что файл лежит в корне или в /data/
      const response = await fetch('/data/supplements.json');
      if (!response.ok) throw new Error('Не удалось загрузить добавки');
      const rawSupplements = await response.json();

      this._supplements = rawSupplements.map(s => ({
        id: s.id,
        name: s.name,
        evidence: this.mapEvidenceLevel(s.evidenceLevel),
        benefits: s.benefits || [],
        description: s.effect || s.description || '',
        dosage: s.dose || '—',
        timing: this.normalizeTiming(s.timing),
        timingText: s.timing || '—',
        form: s.form || '—',
        forGoals: this.mapGoals(s.goals),
        forLevels: s.forLevels || ['beginner', 'intermediate', 'advanced'],
        forSymptoms: s.forSymptoms || [],
        sources: s.sources || [],
        // Сохраняем оригинальные поля для рендера
        evidenceLevel: s.evidenceLevel,
        goals: s.goals
      }));

      return this._supplements;
    } catch (err) {
      console.error('Ошибка загрузки добавок:', err);
      this._supplements = [];
      return this._supplements;
    }
  }

  mapEvidenceLevel(level) {
    if (level === 'A') return 'Strong';
    if (level === 'B') return 'Moderate';
    return 'Limited';
  }

  mapGoals(goals) {
    const goalMap = {
      'набор массы': 'gain',
      'похудение': 'lose',
      'восстановление': 'maintain',
      'общее здоровье': 'maintain',
      'иммунитет': 'maintain',
      'сон': 'maintain',
      'гормональный баланс': 'maintain',
      'метаболизм': 'maintain',
      'травмы': 'maintain',
      'женское здоровье': 'maintain',
      'мозг': 'maintain',
      'longevity': 'maintain',
      'сердце': 'maintain',
      'кишечник': 'maintain',
      'детоксикация': 'maintain',
      'стресс': 'maintain',
      'фокус': 'maintain',
      'энергия': 'maintain',
      'сменная работа': 'maintain'
    };

    const mapped = new Set();
    goals?.forEach(g => {
      if (goalMap[g]) mapped.add(goalMap[g]);
      else mapped.add('maintain');
    });

    if (goals?.some(g => /набор|mass|gain/i.test(g))) mapped.add('gain');
    if (goals?.some(g => /похудение|lose|жир/i.test(g))) mapped.add('lose');

    return [...mapped];
  }

  normalizeTiming(timing) {
    const t = (timing || '').toLowerCase();
    if (t.includes('утром') || t.includes('завтрак')) return 'withBreakfast';
    if (t.includes('до тренировки')) return 'preWorkout';
    if (t.includes('после тренировки')) return 'postWorkout';
    if (t.includes('вечером') || t.includes('перед сном') || t.includes('ноч')) return 'beforeSleep';
    if (t.includes('с жир')) return 'withFat';
    if (t.includes('любое время')) return 'anytime';
    return 'anytime';
  }

  async getPersonalizedRecommendations() {
    const user = UserService.getProfile();
    if (!user || !user.data) {
      throw new Error("Профиль не заполнен");
    }
    this.user = user.data;
    await this.loadSupplements();

    return this._supplements.filter(s => {
      const matchesGoal = s.forGoals.includes(this.user.goal);
      const matchesLevel = s.forLevels.includes(this.user.level);
      const hasSymptoms = Object.values(this.symptoms).some(Boolean);
      const matchesSymptoms = !hasSymptoms || 
        s.forSymptoms.length === 0 || 
        s.forSymptoms.some(symptom => this.symptoms[symptom]);

      return matchesGoal && matchesLevel && matchesSymptoms;
    });
  }

  getByCategory(category) {
    const all = this._supplements || [];
    switch (category) {
      case 'recovery':
        return all.filter(s =>
          s.goals?.some(g => /восстановление|recovery|мышц|травмы|связки|суставы/i.test(g)) ||
          s.benefits?.some(b => /восстановление|recovery|мышц|сустав/i.test(b))
        );
      case 'energy':
        return all.filter(s =>
          s.goals?.some(g => /энергия|усталость|fatigue|выносливость/i.test(g)) ||
          s.benefits?.some(b => /энергия|усталость|выносливость/i.test(b)) ||
          s.forSymptoms?.includes('fatigue')
        );
      case 'stress':
        return all.filter(s =>
          s.goals?.some(g => /стресс|кортизол|тревожность|настроение|выгорание/i.test(g)) ||
          s.benefits?.some(b => /стресс|кортизол|тревожность|настроение/i.test(b)) ||
          s.forSymptoms?.some(sym => ['lowMood', 'fatigue'].includes(sym))
        );
      case 'sleep':
        return all.filter(s =>
          s.goals?.some(g => /сон|засыпание|сонливость/i.test(g)) ||
          s.benefits?.some(b => /сон|засыпание/i.test(b)) ||
          s.forSymptoms?.includes('poorSleep')
        );
      default:
        return all;
    }
  }

  async getDailySchedule() {
    const recs = await this.getPersonalizedRecommendations();
    const schedule = {
      morning: [],
      preWorkout: [],
      postWorkout: [],
      evening: []
    };

    recs.forEach(s => {
      switch (s.timing) {
        case 'preWorkout':
          schedule.preWorkout.push(s);
          break;
        case 'postWorkout':
          schedule.postWorkout.push(s);
          break;
        case 'beforeSleep':
          schedule.evening.push(s);
          break;
        case 'evening':
          schedule.evening.push(s);
          break;
        case 'withBreakfast':
          schedule.morning.push(s);
          break;
        case 'withFat':
        case 'anytime':
        default:
          schedule.morning.push(s);
      }
    });

    return schedule;
  }
}