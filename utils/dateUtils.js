// /utils/dateUtils.js
// v1.0.1 — Надёжные утилиты для работы с датами

/**
 * Утилиты для работы с датами
 */
export class DateUtils {
  /**
   * Сегодня в формате YYYY-MM-DD
   * @returns {string}
   */
  static today() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Форматирование даты
   * @param {string|Date} date
   * @param {Object} [options]
   * @returns {string}
   */
  static format(date, options = {}) {
    try {
      return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options
      });
    } catch (e) {
      console.warn('Некорректная дата:', date);
      return '—';
    }
  }

  /**
   * Разница в днях между двумя датами (date2 - date1)
   * @param {string} date1 — начальная дата (YYYY-MM-DD)
   * @param {string} date2 — конечная дата (YYYY-MM-DD)
   * @returns {number}
   */
  static diffInDays(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      console.warn('Некорректные даты в diffInDays:', date1, date2);
      return 0;
    }
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  }

  /**
   * Полное название дня недели
   * @param {string|Date} date
   * @returns {string}
   */
  static getDayName(date) {
    try {
      return new Date(date).toLocaleDateString('ru-RU', { weekday: 'long' });
    } catch (e) {
      return '—';
    }
  }
}