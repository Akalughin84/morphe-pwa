// /modules/supplementTracker.js
export class SupplementTracker {
  constructor() {
    this.storageKey = 'morphe-supplements-log';
    this.entries = this.load();
  }

  _getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  _normalizeDate(date) {
    return String(date).split('T')[0];
  }

  load() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
  }

  add(supplement, date = null) {
    const entry = {
      ...supplement,
      date: this._normalizeDate(date || new Date()),
      timestamp: Date.now()
    };
    this.entries.push(entry);
    this.save();
    return entry;
  }

  getEntriesByDate(date = null) {
    const targetDate = this._normalizeDate(date || new Date());
    return this.entries.filter(e => e.date === targetDate);
  }
}