// modules/premiumManager.js

export class PremiumManager {
  constructor() {
    this.isPremium = false;
    this.expiryDate = null;
    this.init();
  }

  init() {
    const data = localStorage.getItem('morphe_premium');
    if (!data) return;

    try {
      const { expiry } = JSON.parse(data);
      const now = new Date();
      const exp = new Date(expiry);

      if (now < exp) {
        this.isPremium = true;
        this.expiryDate = exp;
      } else {
        this.deactivate();
      }
    } catch (e) {
      console.error("❌ Ошибка при загрузке подписки:", e);
    }
  }

  // Активация по ключу или после оплаты
  activate(duration = 'monthly') {
    const now = new Date();
    let expiry = new Date();

    if (duration === 'monthly') {
      expiry.setMonth(now.getMonth() + 1);
    } else if (duration === 'yearly') {
      expiry.setFullYear(now.getFullYear() + 1);
    }

    const premiumData = {
      activated: now.toISOString(),
      expiry: expiry.toISOString(),
      plan: duration
    };

    localStorage.setItem('morphe_premium', JSON.stringify(premiumData));
    this.isPremium = true;
    this.expiryDate = expiry;

    console.log(`✅ Премиум активирован до ${expiry.toLocaleDateString()}`);
  }

  // Деактивация (например, при истечении срока)
  deactivate() {
    localStorage.removeItem('morphe_premium');
    this.isPremium = false;
    this.expiryDate = null;
    console.log("❌ Подписка деактивирована");
  }

  // Проверка статуса
  getStatus() {
    return {
      isPremium: this.isPremium,
      expiry: this.expiryDate,
      daysLeft: this.isPremium ? Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : 0
    };
  }

  // Пробный период (7 дней)
  startTrial() {
    if (localStorage.getItem('morphe_trial_used')) {
      alert("Пробный период уже использован.");
      return false;
    }

    this.activate('monthly'); // но установим дату через 7 дней
    const now = new Date();
    const trialExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const trialData = {
      activated: now.toISOString(),
      expiry: trialExpiry.toISOString(),
      plan: 'trial'
    };

    localStorage.setItem('morphe_premium', JSON.stringify(trialData));
    localStorage.setItem('morphe_trial_used', 'true');

    this.isPremium = true;
    this.expiryDate = trialExpiry;

    alert("🎉 Пробный период запущен! 7 дней полного доступа к Morphe Pro.");
    return true;
  }
}