// /modules/profile.js
// v2.4.5 — Добавлена поддержка fillForm, исправлено сохранение activityLevel → level

import { StorageManager } from '/utils/storage.js';

export class MorpheProfile {
  constructor() {
    this.storageKey = 'morphe-user-profile';
    this.data = this.load();
  }

  /**
   * Загрузить профиль из хранилища
   */
  load() {
    const raw = StorageManager.getItem(this.storageKey);
    if (!raw) return null;

    // Если это строка — старый формат (до v2)
    if (typeof raw === 'string') {
      try {
        const oldData = JSON.parse(raw);
        return this.mapLegacyData(oldData);
      } catch (err) {
        console.error('❌ Ошибка парсинга профиля:', err);
        return null;
      }
    }

    // Если это объект — новый формат, но level может быть числом или строкой
    if (typeof raw === 'object' && raw !== null) {
      // Нормализуем числовые поля
      if (typeof raw.age === 'string') raw.age = parseFloat(raw.age);
      if (typeof raw.weight === 'string') raw.weight = parseFloat(raw.weight);
      if (typeof raw.height === 'string') raw.height = parseFloat(raw.height);

      // Если level — число, преобразуем в строку
      if (typeof raw.level === 'number') {
        raw.level = this.mapLegacyLevelToLevel(raw.level);
      }
      // Если level — строка, но не из допустимых значений — нормализуем
      if (typeof raw.level === 'string' && !['beginner', 'intermediate', 'advanced'].includes(raw.level)) {
        console.warn('⚠️ Неизвестный уровень:', raw.level, '— сбрасываем на beginner');
        raw.level = 'beginner';
      }

      return raw;
    }

    return null;
  }

  /**
   * Преобразовать старые данные в новую структуру
   */
  mapLegacyData(oldData) {
    const newData = {
      name: oldData.name || '',
      age: typeof oldData.age === 'string' ? parseFloat(oldData.age) : oldData.age || 0,
      weight: typeof oldData.weight === 'string' ? parseFloat(oldData.weight) : oldData.weight || 0,
      height: typeof oldData.height === 'string' ? parseFloat(oldData.height) : oldData.height || 0,
      goal: oldData.goal || 'maintenance',
      level: this.mapActivityLevelToLevel(oldData.activityLevel),
      equipment: oldData.equipment || ['bodyweight', 'dumbbells'],
      notes: oldData.notes || '',
      gender: oldData.gender || 'male',
      activityLevel: oldData.activityLevel || 1.375, // сохраняем для обратной совместимости
    };

    return newData;
  }

  /**
   * Маппинг activityLevel → level
   */
  mapActivityLevelToLevel(activityLevel) {
    if (activityLevel < 1.3) return 'beginner';
    if (activityLevel < 1.5) return 'intermediate';
    return 'advanced';
  }

  /**
   * Маппинг старого числового level (1,2,3) → строковый
   */
  mapLegacyLevelToLevel(levelNumber) {
    if (levelNumber === 1) return 'beginner';
    if (levelNumber === 2) return 'intermediate';
    if (levelNumber === 3) return 'advanced';
    return 'beginner';
  }

  /**
   * ✅ Заполнить форму данными профиля
   */
  fillForm(form) {
    if (!this.data) return;

    const { name, gender, age, height, weight, goal, activityLevel } = this.data;

    const setVal = (id, value) => {
      const el = form.querySelector(`[name="${id}"]`);
      if (el) el.value = value;
    };

    const setChecked = (name, value) => {
      const el = form.querySelector(`[name="${name}"][value="${value}"]`);
      if (el) el.checked = true;
    };

    setVal('name', name);
    setVal('age', age);
    setVal('height', height);
    setVal('weight', weight);
    setVal('goal', goal);
    setVal('activity', activityLevel);

    if (gender) setChecked('gender', gender);
  }

  /**
   * ✅ Сохранить профиль (из формы)
   */
  save(data) {
    // Преобразуем activityLevel → level
    const level = this.mapActivityLevelToLevel(data.activityLevel);

    // Формируем полный объект профиля
    const profileData = {
      name: data.name?.trim(),
      gender: data.gender,
      age: data.age,
      height: data.height,
      weight: data.weight,
      goal: data.goal,
      level: level, // ← ВАЖНО: сохраняем строку 'beginner' и т.д.
      activityLevel: data.activityLevel, // ← сохраняем и activityLevel для истории/совместимости
      equipment: ['bodyweight', 'dumbbells'],
      notes: '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    this.data = profileData;
    StorageManager.setItem(this.storageKey, profileData);
  }

  /**
   * Проверить, заполнен ли профиль
   */
  isComplete() {
    if (!this.data) return false;

    const { name, age, weight, height, goal, level } = this.data;

    if (typeof age !== 'number' || isNaN(age) || age <= 0) return false;
    if (typeof weight !== 'number' || isNaN(weight) || weight <= 0) return false;
    if (typeof height !== 'number' || isNaN(height) || height <= 0) return false;
    if (typeof level !== 'string' || !['beginner', 'intermediate', 'advanced'].includes(level)) return false;

    return Boolean(
      name?.trim() &&
      goal?.trim() &&
      level
    );
  }

  /**
   * Сбросить профиль
   */
  clear() {
    this.data = null;
    StorageManager.removeItem(this.storageKey);
  }
}