/**
 * Logger для системы логирования
 * Поддерживает уровни: DEBUG, INFO, WARN, ERROR
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static currentLevel: LogLevel = LogLevel.INFO;

  static {
    // Инициализация из переменной окружения
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      Logger.currentLevel = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  /**
   * Установить уровень логирования
   */
  static setLevel(level: LogLevel): void {
    Logger.currentLevel = level;
  }

  /**
   * Получить текущий уровень логирования
   */
  static getLevel(): LogLevel {
    return Logger.currentLevel;
  }

  /**
   * Debug сообщение (для детальной отладки)
   */
  static debug(message: string, ...args: unknown[]): void {
    if (Logger.currentLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Info сообщение (общая информация)
   */
  static info(message: string, ...args: unknown[]): void {
    if (Logger.currentLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Warning сообщение (предупреждения)
   */
  static warn(message: string, ...args: unknown[]): void {
    if (Logger.currentLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Error сообщение (ошибки)
   */
  static error(message: string, ...args: unknown[]): void {
    if (Logger.currentLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Логирование с префиксом модуля
   */
  static withPrefix(prefix: string) {
    return {
      debug: (message: string, ...args: unknown[]) =>
        Logger.debug(`[${prefix}] ${message}`, ...args),
      info: (message: string, ...args: unknown[]) =>
        Logger.info(`[${prefix}] ${message}`, ...args),
      warn: (message: string, ...args: unknown[]) =>
        Logger.warn(`[${prefix}] ${message}`, ...args),
      error: (message: string, ...args: unknown[]) =>
        Logger.error(`[${prefix}] ${message}`, ...args)
    };
  }
}
