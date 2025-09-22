export class PremiumManager {
  static isPro() {
    return localStorage.getItem('morphe-pro-unlocked') === 'true';
  }

  static unlockPro() {
    localStorage.setItem('morphe-pro-unlocked', 'true');
  }
}