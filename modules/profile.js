// modules/profile.js
// Version: 1.5.0

export class MorpheProfile {
  constructor() {
    this.data = this.load();
    console.log("📂 Профиль загружен:", this.data);
  }

  // Базовый профиль по умолчанию
  getDefaultProfile() {
    return {
      name: "",
      age: 25,
      gender: "male",
      height: 175,
      weight: 75,
      goal: "muscle", // muscle / fatloss / health
      experience: "beginner", // beginner / intermediate / advanced
      equipment: ["dumbbells"], // dumbbells, bench, bands, none
      injuries: [], // shoulder, back, knee
      availableDays: 4, // 2-7
      timePerSession: 45, // 30, 45, 60, 75
      preferredTime: "morning", // morning / afternoon / evening
      dietaryRestrictions: [],
      completedAt: null,
      createdAt: new Date().toISOString()
    };
  }

  // Загрузка из localStorage
  load() {
    try {
      const saved = localStorage.getItem('morphe_profile');
      if (saved) {
        const profile = JSON.parse(saved);
        
        // Проверяем обязательные поля
        if (!profile.availableDays) {
          profile.availableDays = 4;
        }
        if (!profile.goal) {
          profile.goal = "muscle";
        }
        if (!profile.experience) {
          profile.experience = "beginner";
        }
        if (!profile.equipment) {
          profile.equipment = ["dumbbells"];
        }
        if (!profile.injuries) {
          profile.injuries = [];
        }
        if (!profile.preferredTime) {
          profile.preferredTime = "morning";
        }

        return profile;
      }
    } catch (err) {
      console.warn("⚠️ Ошибка при загрузке профиля, сброс к умолчаниям");
    }
    return this.getDefaultProfile();
  }

  // Сохранение в localStorage
  save() {
    try {
      localStorage.setItem('morphe_profile', JSON.stringify(this.data));
      console.log("✅ Профиль сохранён");
    } catch (err) {
      console.error("❌ Не удалось сохранить профиль:", err);
    }
  }

  // Обновление одного поля
  update(field, value) {
    this.data[field] = value;
    this.save();
    console.log(`📝 Обновлено: ${field} =`, value);
  }

  // Обновление нескольких полей
  updateBatch(data) {
    for (let key in data) {
      this.data[key] = data[key];
    }
    this.save();
  }

  // Проверка: заполнен ли профиль минимум на базовом уровне
  isComplete() {
    const required = ['age', 'height', 'weight', 'goal', 'availableDays'];
    return required.every(field => this.data[field] && this.data[field] !== "");
  }

  // Метод для отметки: профиль полностью настроен
  markAsCompleted() {
    this.data.completedAt = new Date().toISOString();
    this.save();
  }

  // Получить статус профиля
  getStatus() {
    if (!this.isComplete()) return "incomplete";
    if (!this.data.completedAt) return "ready";
    return "complete";
  }
}