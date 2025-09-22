// /utils/validators.js

export class Validators {
  static isEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static isPositiveNumber(value) {
    return !isNaN(value) && parseFloat(value) > 0;
  }

  static isInRange(value, min, max) {
    const num = parseFloat(value);
    return num >= min && num <= max;
  }

  static required(value) {
    return value !== undefined && value !== null && value.toString().trim() !== '';
  }
}