// modules/notifications.js

export class NotificationManager {
  constructor() {
    this.enabled = false;
    this.schedule = [];
    this.init();
  }

  init() {
    // Проверяем поддержку уведомлений
    if (!("Notification" in window)) {
      console.warn("❌ Браузер не поддерживает уведомления");
      return;
    }

    // Запрашиваем разрешение при первом запуске
    if (Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        this.enabled = permission === "granted";
        console.log(`✅ Разрешение на уведомления: ${permission}`);
      });
    } else {
      this.enabled = Notification.permission === "granted";
    }
  }

  // Добавить напоминание
  addReminder(type, time, message, repeat = true) {
    const reminder = {
      id: Date.now(),
      type,        // workout, meal, custom
      time,        // "08:00", "13:30"
      message,
      repeat,
      enabled: true
    };

    this.schedule.push(reminder);
    this.save();
    this.startChecking();
    return reminder;
  }

  // Удалить напоминание
  removeReminder(id) {
    this.schedule = this.schedule.filter(r => r.id !== id);
    this.save();
  }

  // Сохранить расписание
  save() {
    localStorage.setItem('morphe_notifications', JSON.stringify(this.schedule));
  }

  // Загрузить расписание
  load() {
    const saved = localStorage.getItem('morphe_notifications');
    if (saved) {
      try {
        this.schedule = JSON.parse(saved);
      } catch (e) {
        console.error("⚠️ Ошибка загрузки уведомлений:", e);
      }
    }
  }

  // Показать уведомление
  show(title, body, icon = "/assets/icons/icon-192.png") {
    if (!this.enabled) return;

    const options = {
      body,
      icon,
      badge: "/assets/icons/icon-192.png",
      tag: "morphe-notification"
    };

    new Notification(title, options);
  }

  // Запустить проверку времени
  startChecking() {
    this.load(); // Перед стартом — загружаем сохранённые

    setInterval(() => {
      if (!this.enabled || this.schedule.length === 0) return;

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

      this.schedule.forEach(reminder => {
        if (reminder.enabled && reminder.time === currentTime) {
          this.show("Morphe", reminder.message);

          // Если не повторяется — отключаем
          if (!reminder.repeat) {
            reminder.enabled = false;
            this.save();
          }
        }
      });
    }, 30_000); // Каждые 30 секунд
  }

  // Автозапуск при старте
  autoStart() {
    this.load();
    if (this.schedule.length > 0) {
      this.startChecking();
    }
  }
}