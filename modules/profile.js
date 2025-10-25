// /modules/profile.js
// v2.8.0 — Поддержка курения, алкоголя, хронических заболеваний и анализов (опционально)
import { StorageManager } from '/utils/storage.js';

export class MorpheProfile {
  constructor() {
    this.storageKey = 'morphe-user-profile';
    this.data = this.load();
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey);
    if (!raw) return null;

    if (typeof raw === 'string') {
      try {
        const oldData = JSON.parse(raw);
        return this.mapLegacyData(oldData);
      } catch (err) {
        console.error('❌ Ошибка парсинга профиля:', err);
        return null;
      }
    }

    if (typeof raw === 'object' && raw !== null) {
      // Приведение типов для совместимости
      if (typeof raw.age === 'string') raw.age = parseFloat(raw.age);
      if (typeof raw.weight === 'string') raw.weight = parseFloat(raw.weight);
      if (typeof raw.height === 'string') raw.height = parseFloat(raw.height);
      if (typeof raw.targetWeight === 'string') raw.targetWeight = parseFloat(raw.targetWeight);
      if (!Array.isArray(raw.allergies)) raw.allergies = [];
      if (!Array.isArray(raw.injuries)) raw.injuries = [];
      if (!Array.isArray(raw.chronicConditions)) raw.chronicConditions = [];
      if (typeof raw.workoutDuration !== 'number') raw.workoutDuration = 60;
      if (typeof raw.preferredWorkoutTime !== 'string') raw.preferredWorkoutTime = '19:00';
      
      // Уровень
      if (typeof raw.level === 'number') {
        raw.level = this.mapLegacyLevelToLevel(raw.level);
      }
      if (typeof raw.level === 'string' && !['beginner', 'intermediate', 'advanced'].includes(raw.level)) {
        console.warn('⚠️ Неизвестный уровень:', raw.level, '— сбрасываем на beginner');
        raw.level = 'beginner';
      }

      // Новые поля: убедимся, что они есть
      if (raw.smoking === undefined) raw.smoking = 'no';
      if (raw.alcohol === undefined) raw.alcohol = 'none';
      if (raw.chronicConditions === undefined) raw.chronicConditions = [];
      if (raw.wantsLabData === undefined) raw.wantsLabData = false;
      if (raw.lastBloodTestDate === undefined) raw.lastBloodTestDate = null;
      if (raw.hemoglobin === undefined) raw.hemoglobin = null;
      if (raw.cholesterol === undefined) raw.cholesterol = null;
      if (raw.glucose === undefined) raw.glucose = null;
      if (raw.vitaminD === undefined) raw.vitaminD = null;

      return raw;
    }
    return null;
  }

  mapLegacyData(oldData) {
    return {
      name: oldData.name || '',
      age: typeof oldData.age === 'string' ? parseFloat(oldData.age) : oldData.age || 0,
      weight: typeof oldData.weight === 'string' ? parseFloat(oldData.weight) : oldData.weight || 0,
      height: typeof oldData.height === 'string' ? parseFloat(oldData.height) : oldData.height || 0,
      goal: oldData.goal || 'maintain',
      level: this.mapActivityLevelToLevel(oldData.activityLevel),
      equipment: oldData.equipment || ['bodyweight', 'dumbbells'],
      notes: oldData.notes || '',
      gender: oldData.gender || 'male',
      activityLevel: oldData.activityLevel || 1.375,
      workoutType: oldData.workoutType || 'balanced',
      workoutLocation: oldData.workoutLocation || 'gym',
      targetWeight: oldData.targetWeight ? parseFloat(oldData.targetWeight) : null,
      allergies: [],
      injuries: [],
      chronicConditions: [], // ✅ новое
      smoking: 'no',         // ✅ новое
      alcohol: 'none',       // ✅ новое
      wantsLabData: false,   // ✅ новое
      lastBloodTestDate: null,
      hemoglobin: null,
      cholesterol: null,
      glucose: null,
      vitaminD: null,
      healthNotes: '',
      workoutDuration: 60,
      preferredWorkoutTime: '19:00',
      trainingDays: oldData.trainingDays || [1, 3, 5],
    };
  }

  mapActivityLevelToLevel(activityLevel) {
    if (activityLevel < 1.3) return 'beginner';
    if (activityLevel < 1.5) return 'intermediate';
    return 'advanced';
  }

  mapLegacyLevelToLevel(levelNumber) {
    if (levelNumber === 1) return 'beginner';
    if (levelNumber === 2) return 'intermediate';
    if (levelNumber === 3) return 'advanced';
    return 'beginner';
  }

  fillForm(form) {
    if (!this.data) return;

    const d = this.data;

    const setVal = (id, value) => {
      const el = form.querySelector(`[name="${id}"]`);
      if (el) el.value = value;
    };

    const setChecked = (name, value) => {
      const el = form.querySelector(`[name="${name}"][value="${value}"]`);
      if (el) el.checked = true;
    };

    const setCheckboxGroup = (name, values) => {
      if (!Array.isArray(values)) return;
      values.forEach(val => {
        const checkbox = form.querySelector(`[name="${name}"][value="${val}"]`);
        if (checkbox) checkbox.checked = true;
      });
    };

    // Стандартные поля
    setVal('name', d.name);
    setVal('age', d.age);
    setVal('height', d.height);
    setVal('weight', d.weight);
    setVal('targetWeight', d.targetWeight);
    setVal('goal', d.goal);
    setVal('activity', d.activityLevel);
    setVal('workoutType', d.workoutType);
    setVal('workoutLocation', d.workoutLocation);
    setVal('workoutDuration', d.workoutDuration);
    setVal('workoutTime', d.preferredWorkoutTime);
    setVal('healthNotes', d.healthNotes);

    // Анализы
    setVal('lastBloodTestDate', d.lastBloodTestDate);
    setVal('hemoglobin', d.hemoglobin);
    setVal('cholesterol', d.cholesterol);
    setVal('glucose', d.glucose);
    setVal('vitaminD', d.vitaminD);

    // Радиокнопки
    if (d.gender) setChecked('gender', d.gender);
    if (d.smoking) setVal('smoking', d.smoking);
    if (d.alcohol) setVal('alcohol', d.alcohol);

    // Чекбоксы
    setCheckboxGroup('allergies', d.allergies);
    setCheckboxGroup('injuries', d.injuries);
    setCheckboxGroup('chronicConditions', d.chronicConditions);
    setCheckboxGroup('trainingDays', d.trainingDays);

    // wantsLabData — чекбокс
    const wantsLabEl = form.querySelector('[name="wantsLabData"]');
    if (wantsLabEl) wantsLabEl.checked = d.wantsLabData === true;
  }

  save(data) {
    const level = this.mapActivityLevelToLevel(data.activityLevel);
    const profileData = {
      name: data.name?.trim(),
      gender: data.gender,
      age: data.age,
      height: data.height,
      weight: data.weight,
      targetWeight: data.targetWeight ? parseFloat(data.targetWeight) : null,
      goal: data.goal,
      level: level,
      workoutType: data.workoutType || 'balanced',
      workoutLocation: data.workoutLocation || 'gym',
      activityLevel: data.activityLevel,
      equipment: ['bodyweight', 'dumbbells'],
      notes: '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      injuries: Array.isArray(data.injuries) ? data.injuries : [],
      chronicConditions: Array.isArray(data.chronicConditions) ? data.chronicConditions : [],
      smoking: data.smoking || 'no',
      alcohol: data.alcohol || 'none',
      wantsLabData: Boolean(data.wantsLabData),
      lastBloodTestDate: data.lastBloodTestDate || null,
      hemoglobin: data.hemoglobin !== null ? parseFloat(data.hemoglobin) : null,
      cholesterol: data.cholesterol !== null ? parseFloat(data.cholesterol) : null,
      glucose: data.glucose !== null ? parseFloat(data.glucose) : null,
      vitaminD: data.vitaminD !== null ? parseFloat(data.vitaminD) : null,
      healthNotes: data.healthNotes || '',
      workoutDuration: data.workoutDuration || 60,
      preferredWorkoutTime: data.preferredWorkoutTime || '19:00',
      trainingDays: Array.isArray(data.trainingDays) ? data.trainingDays.map(Number) : [1, 3, 5],
    };

    this.data = profileData;
    StorageManager.setItem(this.storageKey, profileData);
  }

  isComplete() {
    if (!this.data) return false;
    const { name, age, weight, height, goal, level, smoking, alcohol } = this.data;
    if (typeof age !== 'number' || isNaN(age) || age <= 0) return false;
    if (typeof weight !== 'number' || isNaN(weight) || weight <= 0) return false;
    if (typeof height !== 'number' || isNaN(height) || height <= 0) return false;
    if (!name?.trim()) return false;
    if (!goal?.trim()) return false;
    if (!smoking) return false;
    if (!alcohol) return false;
    if (typeof level !== 'string' || !['beginner', 'intermediate', 'advanced'].includes(level)) return false;
    return true;
  }

  clear() {
    this.data = null;
    StorageManager.removeItem(this.storageKey);
  }
}