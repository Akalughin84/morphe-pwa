// /core/exerciseRecommender.js
// v2.0.0 — Полная интеграция с системой генерации тренировок
import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { DataService } from '/services/dataService.js';

/**
 * ExerciseRecommender — даёт персональные советы и альтернативы
 * На основе: цель, уровень, история, риски, оборудование
 */
export class ExerciseRecommender {
  constructor() {
    this.profile = null;
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.exercises = [];
  }

  /**
   * Загружает все данные
   */
  async loadAll() {
    const user = UserService.getProfile();
    if (!user) throw new Error("Профиль не заполнен");
    this.profile = user.data;
    try {
      this.exercises = await DataService.getExercises();
    } catch (err) {
      console.error('❌ Не удалось загрузить упражнения:', err);
      throw err;
    }
  }

  /**
   * Получает рекомендации
   */
  async getRecommendations() {
    await this.loadAll();
    const recommendations = [];

    // 1. Рекомендация на основе цели
    recommendations.push(...this._getGoalBased());

    // 2. Компенсация дисбалансов
    recommendations.push(...this._getCorrective());

    // 3. Альтернативы при высоком риске
    recommendations.push(...this._getSafeAlternatives());

    // 4. Прогрессия для опытных
    recommendations.push(...this._getProgression());

    return recommendations;
  }

  /**
   * ✅ Получить альтернативные упражнения для ротации
   * @param {Object} baseExercise - базовое упражнение
   * @param {number} count - количество альтернатив
   * @param {string} variationType - 'equipment', 'intensity', 'tempo'
   * @returns {Array} - массив альтернативных упражнений
   */
  getAlternatives(baseExercise, count = 3, variationType = 'equipment') {
    if (!baseExercise) return [];
    const userEquipment = this.profile?.equipment || ['bodyweight'];
    const userLevel = this.profile?.level || 'beginner';
    let alternatives = this.exercises.filter(ex => 
      ex.id !== baseExercise.id &&
      ex.type === baseExercise.type && // тот же тип движения
      this._isLevelAppropriate(ex.level, userLevel) &&
      userEquipment.includes(ex.equipment) // доступное оборудование
    );

    // Сортируем по приоритету — сначала другие типы оборудования
    if (variationType === 'equipment') {
      alternatives.sort((a, b) => {
        if (a.equipment !== baseExercise.equipment && b.equipment === baseExercise.equipment) return -1;
        if (a.equipment === baseExercise.equipment && b.equipment !== baseExercise.equipment) return 1;
        return 0;
      });
    }

    // Рандомизируем оставшиеся
    alternatives = alternatives.sort(() => Math.random() - 0.5);
    return alternatives.slice(0, count);
  }

  /**
   * Рекомендации на основе цели
   */
  _getGoalBased() {
    const goal = this.profile.goal;
    const level = this._getExperienceLevel();
    
    // Проверяем, можно ли рекомендовать приседания
    const canRecommendSquats = !this.profile.injuries?.includes('knee');

    if (goal === 'gain' || goal === 'maintain') {
      const recs = [];
      if (canRecommendSquats) {
        recs.push({
          exercise: this._findExercise('squat-barbell'),
          reason: 'Базовое упражнение для роста мышц ног и силы',
          priority: 'high'
        });
      }
      recs.push({
        exercise: this._findExercise('bench-press'),
        reason: 'Основное упражнение для развития груди и трицепса',
        priority: 'high'
      });
      return recs;
    }
    
    if (goal === 'lose') {
      return [{
        exercise: this._findExercise('pull-ups'),
        reason: 'Высокое потребление калорий, развивает мышцы без лишнего веса',
        priority: 'medium'
      }, {
        exercise: this._findExercise('burpees'),
        reason: 'Комплексное упражнение для сжигания калорий',
        priority: 'medium'
      }];
    }
    return [];
  }

  /**
   * Коррекционные упражнения (если есть дисбалансы)
   */
  _getCorrective() {
    const recent = this.progress.getSince(14); // за 2 недели
    if (recent.length < 2) return [];
    const first = recent[0];
    const last = recent[recent.length - 1];
    const waistChange = last.waist - first.waist;
    if (waistChange > 0 && this.profile.goal === 'lose') {
      return [{
        exercise: this._findExercise('plank'),
        reason: 'Укрепляет кор, помогает снизить жир на талии',
        priority: 'high'
      }, {
        exercise: this._findExercise('russian-twist'),
        reason: 'Развивает косые мышцы живота для лучшего контроля талии',
        priority: 'medium'
      }];
    }
    return [];
  }

  /**
 * Безопасные альтернативы при травмах из профиля
 */
  _getSafeAlternatives() {
    const profile = this.profile;
    if (!profile || !Array.isArray(profile.injuries) || profile.injuries.length === 0) {
      return [];
    }

    const recommendations = [];

    // Травма колена → исключаем приседания, выпады и т.д.
    if (profile.injuries.includes('knee')) {
      recommendations.push({
        exercise: this._findExercise('leg-press'),
        reason: 'Безопасная альтернатива приседаниям при травме колена — меньше сдвига и сжатия',
        priority: 'critical'
      }, {
        exercise: this._findExercise('seated-leg-curl'),
        reason: 'Изолированная проработка бицепса бедра без нагрузки на коленный сустав',
        priority: 'high'
      });
    }

    // Травма спины
    if (profile.injuries.includes('back')) {
      recommendations.push({
        exercise: this._findExercise('chest-press-machine'),
        reason: 'Меньше стресса на позвоночник по сравнению с жимом лёжа',
        priority: 'high'
      });
    }

    // Травма плеча
    if (profile.injuries.includes('shoulder')) {
      recommendations.push({
        exercise: this._findExercise('chest-fly-machine'),
        reason: 'Безопасная альтернатива жиму при травме плеча — меньше компрессии сустава',
        priority: 'critical'
      });
    }

    return recommendations;
  }

  /**
   * Прогрессия для опытных
   */
  _getProgression() {
    const level = this._getExperienceLevel();
    const weeklyCount = this.workouts.getWeeklyCount();
    if (level === 'advanced' && weeklyCount >= 4) {
      return [{
        exercise: this._findExercise('deadlift'),
        reason: 'Сложное упражнение для комплексного развития силы',
        priority: 'high'
      }, {
        exercise: this._findExercise('overhead-press'),
        reason: 'Развивает силу плечевого пояса и стабильность корпуса',
        priority: 'medium'
      }];
    }
    return [];
  }

  /**
   * Поиск упражнения по ID
   */
  _findExercise(id) {
    return this.exercises.find(e => e.id === id) || null;
  }

  /**
   * Оценка уровня опыта
   */
  _getExperienceLevel() {
    const workoutCount = this.workouts.getAll().length;
    if (workoutCount < 10) return 'beginner';
    if (workoutCount < 50) return 'intermediate';
    return 'advanced';
  }

  /**
   * Проверка соответствия уровня
   */
  _isLevelAppropriate(exLevel, userLevel) {
    const levelMap = {
      beginner: ['beginner'],
      intermediate: ['beginner', 'intermediate'],
      advanced: ['beginner', 'intermediate', 'advanced']
    };
    return levelMap[userLevel]?.includes(exLevel);
  }

  /**
   * Фильтрация по оборудованию
   */
  _filterByEquipment(exercises, equipment) {
    return exercises.filter(e => e.equipment === equipment);
  }
}