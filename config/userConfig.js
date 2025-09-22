// /config/userConfig.js

/**
 * Глобальные настройки пользователя
 * Можно расширять: единицы измерения, уведомления и т.д.
 */
export const UserConfig = {
  units: 'metric', // metric / imperial
  remindersEnabled: true,
  dailyNotificationTime: '08:00',
  showAIHints: true,

  save() {
    localStorage.setItem('morphe-user-config', JSON.stringify(this));
  },

  load() {
    const saved = localStorage.getItem('morphe-user-config');
    if (saved) {
      Object.assign(this, JSON.parse(saved));
    }
    return this;
  }
};

// Автоматическая загрузка
UserConfig.load();