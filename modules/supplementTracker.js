// /modules/supplementTracker.js
// v1.0.0 — Интеграция с питанием, календарём и уведомлениями

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
    if (!data) return [];
    
    try {
      return JSON.parse(data).map(entry => ({
        ...entry,
        date: this._normalizeDate(entry.date || this._getCurrentDate()),
        timestamp: entry.timestamp || Date.now()
      }));
    } catch (e) {
      console.warn('Ошибка загрузки лога добавок:', e);
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
  }

  /**
   * Добавляет запись о приёме добавки
   * @param {string} supplementId — ID из supplements.json
   * @param {string|Date} [date] — дата приёма (опционально)
   * @returns {Object} запись
   */
  add(supplementId, date = null) {
  const targetDate = date ? this._normalizeDate(date) : this._getCurrentDate();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    supplementId,
    date: targetDate,
    timestamp: Date.now()
  };
  this.entries.push(entry);
  this.save();
  return entry;
}

_getCurrentDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

_normalizeDate(date) {
  if (!date) return this._getCurrentDate();
  if (typeof date === 'string') {
    // Если дата в формате DD.MM.YYYY → преобразуем в YYYY-MM-DD
    if (date.includes('.')) {
      const [day, month, year] = date.split('.');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Если дата в формате YYYY-MM-DD — оставляем как есть
    return date.split('T')[0];
  }
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return this._getCurrentDate();
}

  /**
   * Получает все приёмы за указанную дату
   */
  getEntriesByDate(date = null) {
    const targetDate = this._normalizeDate(date || new Date());
    return this.entries.filter(e => e.date === targetDate);
  }

  /**
   * Удаляет запись по ID
   */
  remove(entryId) {
    this.entries = this.entries.filter(e => e.id !== entryId);
    this.save();
  }

  /**
   * Очищает весь лог
   */
  clear() {
    this.entries = [];
    localStorage.removeItem(this.storageKey);
  }
}