// /services/dataService.js
/**
 * DataService — безопасный доступ к JSON-файлам
 */
export class DataService {
  static async fetchJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`❌ Не удалось загрузить ${path}:`, err);
      throw new Error(`Не удалось загрузить данные: ${path}`);
    }
  }

  static async getFoods() {
    return await this.fetchJSON('/data/foods.json');
  }

  static async getExercises() {
    return await this.fetchJSON('/data/exercises.json');
  }

  static async getPrograms() {
    return await this.fetchJSON('/data/programs.json');
  }

  static async getSupplements() {
    return await this.fetchJSON('/data/supplements.json');
  }
}