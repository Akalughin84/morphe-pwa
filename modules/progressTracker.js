// modules/progressTracker.js

export class ProgressTracker {
  constructor() {
    this.weightLog = this.load('weightLog');
    this.waistLog = this.load('waistLog');
    this.workoutLog = this.load('workoutLog'); // можно расширить
  }

  load(key) {
    const saved = localStorage.getItem(`morphe_${key}`);
    return saved ? JSON.parse(saved) : [];
  }

  save(key, data) {
    try {
      localStorage.setItem(`morphe_${key}`, JSON.stringify(data));
      console.log(`✅ Сохранено: ${key}`);
    } catch (e) {
      console.error(`❌ Не удалось сохранить ${key}:`, e);
    }
  }

  logWeight(weight) {
    const entry = {
      date: new Date().toISOString().split('T')[0],
      weight: parseFloat(weight),
      dayOfWeek: new Date().toLocaleDateString('ru-RU', { weekday: 'short' })
    };
    this.weightLog.push(entry);
    this.save('weightLog', this.weightLog);
    return entry;
  }

  logWaist(waist) {
    const entry = {
      date: new Date().toISOString().split('T')[0],
      waist: parseFloat(waist),
      dayOfWeek: new Date().toLocaleDateString('ru-RU', { weekday: 'short' })
    };
    this.waistLog.push(entry);
    this.save('waistLog', this.waistLog);
    return entry;
  }

  getWeightData() {
    return this.weightLog.map(e => ({ x: e.date, y: e.weight }));
  }

  getWaistData() {
    return this.waistLog.map(e => ({ x: e.date, y: e.waist }));
  }

  getLastEntry(type) {
    const log = type === 'weight' ? this.weightLog : this.waistLog;
    return log.length > 0 ? log[log.length - 1] : null;
  }

  clearAll() {
    if (confirm("Вы уверены, что хотите удалить все данные прогресса?")) {
      this.weightLog = [];
      this.waistLog = [];
      this.save('weightLog', []);
      this.save('waistLog', []);
      alert("🗑 Все данные прогресса удалены.");
    }
  }
}