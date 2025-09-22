// /utils/logger.js

export class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = process.env.NODE_ENV === 'production' 
    ? Logger.LEVELS.WARN 
    : Logger.LEVELS.DEBUG;

  static log(level, module, message, data = null) {
    if (level < this.currentLevel) return;

    const time = new Date().toISOString().split('T')[1].split('.')[0];
    const label = ['DEBUG', 'INFO ', 'WARN ', 'ERROR'][level];
    const output = `[${time}] ${label} [${module}] ${message}`;

    switch (level) {
      case this.LEVELS.ERROR:
        console.error(output, data || '');
        break;
      case this.LEVELS.WARN:
        console.warn(output, data || '');
        break;
      default:
        console.log(output, data || '');
    }
  }

  static debug(module, message, data) {
    this.log(this.LEVELS.DEBUG, module, message, data);
  }

  static info(module, message, data) {
    this.log(this.LEVELS.INFO, module, message, data);
  }

  static warn(module, message, data) {
    this.log(this.LEVELS.WARN, module, message, data);
  }

  static error(module, message, data) {
    this.log(this.LEVELS.ERROR, module, message, data);
  }
}