// /modules/userProfile.js
import { StorageManager } from '/utils/storage.js';

export class UserProfile {
  constructor() {
    this.storageKey = 'morphe-user-profile';
    this.data = this.load();
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey);
    if (!raw || !['male', 'female'].includes(raw.gender)) {
      return { gender: 'male' };
    }
    return raw;
  }

  save() {
    StorageManager.setItem(this.storageKey, this.data);
  }

  setGender(gender) {
    if (!['male', 'female'].includes(gender)) {
      throw new Error('Пол должен быть "male" или "female"');
    }
    this.data.gender = gender;
    this.save();
  }

  getGender() {
    return this.data.gender;
  }
}