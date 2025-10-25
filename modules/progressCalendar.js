// /modules/progressCalendar.js
// v2.3.0 — Добавлено кэширование, улучшена надёжность

export class ProgressCalendar {
  constructor() {
    this._nutrition = null;
    this._body = null;
    this._workouts = null;
    this._supplements = null;
    this._detailsCache = new Map(); // ← кэш для getDayDetails
  }

  async getNutrition() {
    if (!this._nutrition) {
      const { NutritionTracker } = await import('/modules/nutritionTracker.js');
      this._nutrition = new NutritionTracker();
    }
    return this._nutrition;
  }

  async getBody() {
    if (!this._body) {
      const { ProgressTracker } = await import('/modules/progressTracker.js');
      this._body = new ProgressTracker();
    }
    return this._body;
  }

  async getWorkouts() {
    if (!this._workouts) {
      const { WorkoutTracker } = await import('/modules/workoutTracker.js');
      this._workouts = new WorkoutTracker();
    }
    return this._workouts;
  }

  async getSupplements() {
    if (!this._supplements) {
      try {
        const { SupplementTracker } = await import('/modules/supplementTracker.js');
        this._supplements = new SupplementTracker();
      } catch (e) {
        console.error('❌ Не удалось загрузить SupplementTracker:', e);
        this._supplements = {
          getEntriesByDate: () => []
        };
      }
    }
    return this._supplements;
  }

  async getLastDaysData(days = 30) {
    const today = new Date();
    const dates = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
    }

    const [body, nutrition, workouts, supplements] = await Promise.all([
      this.getBody(),
      this.getNutrition(),
      this.getWorkouts(),
      this.getSupplements()
    ]);

    return dates.map(dateStr => ({
      date: dateStr,
      hasBody: this._hasBodyEntry(body, dateStr),
      hasNutrition: this._hasNutritionEntry(nutrition, dateStr),
      hasWorkout: this._hasWorkoutEntry(workouts, dateStr),
      hasSupplement: this._hasSupplementEntry(supplements, dateStr)
    }));
  }

  async getLast30DaysData() {
    return this.getLastDaysData(30);
  }

  _hasBodyEntry(tracker, dateStr) {
    if (typeof tracker.getEntriesByDate === 'function') {
      return tracker.getEntriesByDate(dateStr).length > 0;
    }
    if (Array.isArray(tracker.entries)) {
      return tracker.entries.some(entry => entry.date === dateStr);
    }
    return false;
  }

  _hasNutritionEntry(tracker, dateStr) {
    if (typeof tracker.getEntriesByDate === 'function') {
      return tracker.getEntriesByDate(dateStr).length > 0;
    }
    if (Array.isArray(tracker.entries)) {
      return tracker.entries.some(entry => entry.date === dateStr);
    }
    return false;
  }

  _hasWorkoutEntry(tracker, dateStr) {
    if (typeof tracker.getWorkoutsByDate === 'function') {
      return tracker.getWorkoutsByDate(dateStr).length > 0;
    }
    if (typeof tracker.getAll === 'function') {
      const all = tracker.getAll();
      return Array.isArray(all) && all.some(w => w.date === dateStr);
    }
    if (Array.isArray(tracker.data)) {
      return tracker.data.some(w => w.date === dateStr);
    }
    return false;
  }

  _hasSupplementEntry(tracker, dateStr) {
    if (typeof tracker.getEntriesByDate === 'function') {
      return tracker.getEntriesByDate(dateStr).length > 0;
    }
    if (Array.isArray(tracker.entries)) {
      return tracker.entries.some(entry => entry.date === dateStr);
    }
    return false;
  }

  async getDayDetails(dateStr) {
    if (this._detailsCache.has(dateStr)) {
      return this._detailsCache.get(dateStr);
    }

    const [body, nutrition, workouts, supplements] = await Promise.all([
      this.getBody(),
      this.getNutrition(),
      this.getWorkouts(),
      this.getSupplements()
    ]);

    let bodyEntries = [];
    let nutritionEntries = [];
    let workoutEntries = [];
    let supplementEntries = [];

    if (typeof body.getEntriesByDate === 'function') {
      bodyEntries = body.getEntriesByDate(dateStr);
    } else if (Array.isArray(body.entries)) {
      bodyEntries = body.entries.filter(entry => entry.date === dateStr);
    }

    if (typeof nutrition.getEntriesByDate === 'function') {
      nutritionEntries = nutrition.getEntriesByDate(dateStr);
    } else if (Array.isArray(nutrition.entries)) {
      nutritionEntries = nutrition.entries.filter(entry => entry.date === dateStr);
    }

    if (typeof workouts.getWorkoutsByDate === 'function') {
      workoutEntries = workouts.getWorkoutsByDate(dateStr);
    } else if (typeof workouts.getAll === 'function') {
      const all = workouts.getAll();
      if (Array.isArray(all)) {
        workoutEntries = all.filter(w => w.date === dateStr);
      }
    } else if (Array.isArray(workouts.data)) {
      workoutEntries = workouts.data.filter(w => w.date === dateStr);
    }

    if (typeof supplements.getEntriesByDate === 'function') {
      supplementEntries = supplements.getEntriesByDate(dateStr);
    } else if (Array.isArray(supplements.entries)) {
      supplementEntries = supplements.entries.filter(entry => entry.date === dateStr);
    }

    const result = {
      date: dateStr,
      body: bodyEntries,
      nutrition: nutritionEntries,
      workouts: workoutEntries,
      supplements: supplementEntries
    };

    this._detailsCache.set(dateStr, result);
    return result;
  }

  // Опционально: вызывать после сохранения данных
  invalidateCache(dateStr) {
    this._detailsCache.delete(dateStr);
  }
}