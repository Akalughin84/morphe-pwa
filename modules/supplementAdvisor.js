// /modules/supplementAdvisor.js
// v5.2.0 — Полная персонализация: пол, возраст, травмы, гормоны, метаболизм
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
      digestiveIssues: 'morphe-symptom-digestive',
      pms: 'morphe-symptom-pms',
      frequentUrination: 'morphe-symptom-frequent-urination'
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
        evidenceLevel: s.evidenceLevel,
        goals: s.goals,
        priority: this.calculatePriority(s)
      }));

      return this._supplements;
    } catch (err) {
      console.error('Ошибка загрузки добавок:', err);
      this._supplements = [];
      return this._supplements;
    }
  }

  calculatePriority(supplement) {
    let score = 0;
    // Базовые и высокоприоритетные
    const highPriority = [
      'vitamin-d', 'omega-3', 'magnesium', 'b-complex', 'vitamin-c',
      'iron', 'b12', 'creatine', 'collagen', 'glucosamine'
    ];
    if (highPriority.includes(supplement.id)) score += 8;
    if (supplement.evidenceLevel === 'A') score += 5;
    if (supplement.evidenceLevel === 'B') score += 2;
    // Гендерно-специфичные
    if (['vitex', 'calcium'].includes(supplement.id)) score += 3;
    if (['zma', 'pumpkin-seed'].includes(supplement.id)) score += 3;
    return score;
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
      'сменная работа': 'maintain',
      'аллергия': 'maintain',
      'простата': 'maintain',
      'кости': 'maintain'
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

    // 1. Фильтрация по противопоказаниям
    let candidates = this._supplements.filter(s => {
      const chronic = this.user.chronicConditions || [];
      const nameLow = s.name.toLowerCase();
      const descLow = s.description?.toLowerCase() || '';

      if (chronic.includes('diabetes') && (nameLow.includes('гейнер') || descLow.includes('сахар'))) return false;
      if ((chronic.includes('heart') || chronic.includes('hypertension')) && (nameLow.includes('кофеин') || descLow.includes('стимулятор'))) return false;
      if (chronic.includes('kidney') && s.id === 'protein') return false;
      if (chronic.includes('hemochromatosis') && s.id === 'iron') return false;
      if (chronic.includes('prostate-cancer') && s.id === 'pumpkin-seed') return false;

      return true;
    });

    const recommendations = [];

    // === 2. Базовые рекомендации ===
    if (this.user.vitaminD == null || this.user.vitaminD < 30 || this.user.sunExposure === 'low' || this.user.level === 'beginner') {
      const vitD = candidates.find(s => s.id === 'vitamin-d');
      if (vitD) recommendations.push(vitD);
    }

    const needsOmega3 = 
      this.user.fishIntake === 'rare' || 
      this.user.fishIntake === 'never' ||
      this.hasInflammationOrAllergy() ||
      this.user.level === 'beginner';
    if (needsOmega3) {
      const omega3 = candidates.find(s => s.id === 'omega-3');
      if (omega3) recommendations.push(omega3);
    }

    // === 3. Образ жизни ===
    if (['regular', 'occasional'].includes(this.user.smoking)) {
      const vitC = candidates.find(s => s.id === 'vitamin-c');
      if (vitC) recommendations.push(vitC);
    }

    if (['frequent', 'occasional'].includes(this.user.alcohol)) {
      const bComplex = candidates.find(s => s.id === 'b-complex');
      const milkThistle = candidates.find(s => s.id === 'milk-thistle');
      if (bComplex) recommendations.push(bComplex);
      if (milkThistle) recommendations.push(milkThistle);
    }

    // === 4. Анализы ===
    if (this.user.hemoglobin != null && this.user.hemoglobin < 120) {
      const iron = candidates.find(s => s.id === 'iron');
      if (iron && !this.user.chronicConditions?.includes('hemochromatosis')) {
        recommendations.push(iron);
      }
    }

    if (this.user.glucose != null && this.user.glucose > 6.0 && (this.user.goal === 'lose' || this.user.chronicConditions?.includes('diabetes'))) {
      const berberine = candidates.find(s => s.id === 'berberine');
      if (berberine) recommendations.push(berberine);
    }

    if (this.user.cholesterol != null && this.user.cholesterol > 5.2) {
      const milkThistle = candidates.find(s => s.id === 'milk-thistle');
      if (milkThistle && !recommendations.some(r => r.id === 'milk-thistle')) {
        recommendations.push(milkThistle);
      }
    }

    // === 5. Цель и тренировки ===
    if (this.user.goal === 'gain' && (this.user.trainingDays?.length || 0) >= 2) {
      const creatine = candidates.find(s => s.id === 'creatine');
      if (creatine) recommendations.push(creatine);
    }

    // === 6. Диета ===
    if (['vegan', 'vegetarian'].includes(this.user.diet)) {
      const b12 = candidates.find(s => s.id === 'b12');
      if (b12) recommendations.push(b12);
    }

    // === 7. Пол и возраст ===
    if (this.user.gender === 'female') {
      // Кальций при возрасте 30+ и низком потреблении молочки
      if (this.user.age >= 30 && this.user.dairyIntake !== 'high') {
        const calcium = candidates.find(s => s.id === 'calcium');
        if (calcium) recommendations.push(calcium);
      }
      // Витекс при ПМС или целях женского здоровья
      if (this.symptoms.pms || this.user.goals?.includes('женское здоровье')) {
        const vitex = candidates.find(s => s.id === 'vitex');
        if (vitex) recommendations.push(vitex);
      }
    }

    if (this.user.gender === 'male' && this.user.age >= 30) {
      if (this.symptoms.frequentUrination || this.user.goals?.includes('простата')) {
        const pumpkin = candidates.find(s => s.id === 'pumpkin-seed');
        if (pumpkin) recommendations.push(pumpkin);
      }
      // ZMA для тренирующихся мужчин
      if (this.user.trainingDays?.length >= 2 && this.user.goal === 'gain') {
        const zma = candidates.find(s => s.id === 'zma');
        if (zma) recommendations.push(zma);
      }
    }

    // === 8. Травмы и восстановление ===
    if (this.hasInjuriesOrJointPain()) {
      const collagen = candidates.find(s => s.id === 'collagen');
      const glucosamine = candidates.find(s => s.id === 'glucosamine');
      const bromelain = candidates.find(s => s.id === 'bromelain');
      const curcumin = candidates.find(s => s.id === 'curcumin');
      const quercetin = candidates.find(s => s.id === 'quercetin');

      if (collagen) recommendations.push(collagen);
      if (glucosamine) recommendations.push(glucosamine);
      if (bromelain && ['A', 'B'].includes(bromelain.evidenceLevel)) recommendations.push(bromelain);
      if (curcumin && ['A', 'B'].includes(curcumin.evidenceLevel)) recommendations.push(curcumin);
      if (quercetin && ['A', 'B'].includes(quercetin.evidenceLevel)) recommendations.push(quercetin);
    }

    // === 9. Стресс и ЦНС ===
    if (this.symptoms.lowMood || this.symptoms.fatigue || this.user.stressLevel === 'high') {
      const ashwagandha = candidates.find(s => s.id === 'ashwagandha');
      const rhodiola = candidates.find(s => s.id === 'rhodiola');
      const lTheanine = candidates.find(s => s.id === 'l-theanine');

      if (ashwagandha && ['A', 'B'].includes(ashwagandha.evidenceLevel)) recommendations.push(ashwagandha);
      if (rhodiola && ['A', 'B'].includes(rhodiola.evidenceLevel)) recommendations.push(rhodiola);
      if (lTheanine) recommendations.push(lTheanine);
    }

    // === 10. Финальная фильтрация ===
    let finalList = recommendations
      .filter((s, i, arr) => arr.findIndex(t => t.id === s.id) === i) // дубли
      .filter(s => s.forLevels.includes(this.user.level))
      .sort((a, b) => b.priority - a.priority);

    const maxCount = this.user.level === 'beginner' ? 3 : 5;
    finalList = finalList.slice(0, maxCount);

    return finalList;
  }

  hasInflammationOrAllergy() {
    return (
      this.symptoms.allergies ||
      this.symptoms.runnyNose ||
      this.symptoms.itchyEyes ||
      this.user.chronicConditions?.includes('asthma') ||
      this.user.injuries?.some(i => /joint|knee|shoulder|ankle|elbow|wrist|hip/.test(i))
    );
  }

  hasInjuriesOrJointPain() {
    return (
      this.symptoms.jointPain ||
      (this.user.injuries && this.user.injuries.length > 0) ||
      this.user.chronicConditions?.some(c => /arthritis|back|disc/.test(c))
    );
  }

  // === Категории без изменений ===
  getByCategory(category) {
    const all = this._supplements || [];
    switch (category) {
      case 'recovery':
        return all.filter(s =>
          s.goals?.some(g => /восстановление|recovery|мышц|травмы|связки|суставы|collagen|glucosamine/i.test(g)) ||
          s.benefits?.some(b => /восстановление|recovery|сустав|связк/i.test(b))
        );
      case 'energy':
        return all.filter(s =>
          s.goals?.some(g => /энергия|усталость|fatigue|выносливость|берберин|родиола/i.test(g)) ||
          s.benefits?.some(b => /энергия|усталость|выносливость/i.test(b)) ||
          s.forSymptoms?.includes('fatigue')
        );
      case 'stress':
        return all.filter(s =>
          s.goals?.some(g => /стресс|кортизол|тревожность|настроение|выгорание|адаптоген/i.test(g)) ||
          s.benefits?.some(b => /стресс|кортизол|тревожность|настроение/i.test(b)) ||
          s.forSymptoms?.some(sym => ['lowMood', 'fatigue', 'anxiety'].includes(sym))
        );
      case 'sleep':
        return all.filter(s =>
          s.goals?.some(g => /сон|засыпание|сонливость|магний|мелатонин/i.test(g)) ||
          s.benefits?.some(b => /сон|засыпание/i.test(b)) ||
          s.forSymptoms?.includes('poorSleep')
        );
      case 'hormones':
        return all.filter(s =>
          s.goals?.some(g => /гормональный баланс|тестостерон|ПМС|женское здоровье|простата/i.test(g)) ||
          s.id === 'vitex' || s.id === 'zma' || s.id === 'ashwagandha'
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