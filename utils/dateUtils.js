// /utils/dateUtils.js

export class DateUtils {
  /**
   * Сегодня в формате YYYY-MM-DD
   */
  static today() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Форматирование даты
   */
  static format(date, options = {}) {
    return new Date(date).toLocaleDateString('ru-RU', options);
  }

  /**
   * Разница в днях
   */
  static diffInDays(date1, date2) {
    const d1 = new Date(date1).setHours(0,0,0,0);
    const d2 = new Date(date2).setHours(0,0,0,0);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  /**
   * День недели
   */
  static getDayName(date) {
    return new Date(date).toLocaleDateString('ru-RU', { weekday: 'long' });
  }
}