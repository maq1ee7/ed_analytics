/**
 * Модуль локального логирования LLM запросов
 * Сохраняет все промпты, ответы, метрики в JSON файлы
 */

import * as fs from 'fs';
import * as path from 'path';

interface LLMLogEntry {
  id: string;
  timestamp: string;
  step: number;
  stepName: string;
  prompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  cost: number;
  error?: string;
}

interface QueryLog {
  queryId: string;
  question: string;
  timestamp: string;
  steps: LLMLogEntry[];
  totalTokens: number;
  totalCost: number;
  totalDurationMs: number;
  result?: {
    form_code: string;
    view_type: string;
    section: string;
    col_index: number;
    row_index: number;
  };
  error?: string;
}

/**
 * Класс для локального логирования LLM запросов
 */
export class LLMLogger {
  private logsDir: string;
  private currentQuery: QueryLog | null = null;

  constructor() {
    // Директория для логов: brama/logs/llm/
    this.logsDir = path.join(__dirname, '../../logs/llm');
    this.ensureLogsDirectory();
  }

  /**
   * Создает директорию для логов если её нет
   */
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log(`[LLMLogger] Создана директория для логов: ${this.logsDir}`);
    }
  }

  /**
   * Начинает новый запрос
   */
  startQuery(question: string): string {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentQuery = {
      queryId,
      question,
      timestamp: new Date().toISOString(),
      steps: [],
      totalTokens: 0,
      totalCost: 0,
      totalDurationMs: 0
    };

    console.log(`[LLMLogger] Начат запрос: ${queryId}`);
    return queryId;
  }

  /**
   * Логирует один шаг LLM
   */
  logStep(
    step: number,
    stepName: string,
    prompt: string,
    response: string,
    inputTokens: number,
    outputTokens: number,
    durationMs: number
  ): void {
    if (!this.currentQuery) {
      console.warn('[LLMLogger] Нет активного запроса для логирования шага');
      return;
    }

    // Расчет стоимости (Claude 3.5 Sonnet)
    const inputCost = (inputTokens / 1_000_000) * 3.0;  // $3 за 1M tokens
    const outputCost = (outputTokens / 1_000_000) * 15.0; // $15 за 1M tokens
    const totalCost = inputCost + outputCost;

    const entry: LLMLogEntry = {
      id: `step_${step}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      step,
      stepName,
      prompt,
      response,
      inputTokens,
      outputTokens,
      durationMs,
      cost: totalCost
    };

    this.currentQuery.steps.push(entry);
    this.currentQuery.totalTokens += inputTokens + outputTokens;
    this.currentQuery.totalCost += totalCost;
    this.currentQuery.totalDurationMs += durationMs;

    console.log(`[LLMLogger] Шаг ${step} залогирован: ${inputTokens}/${outputTokens} tokens, ${durationMs}ms, $${totalCost.toFixed(4)}`);
  }

  /**
   * Логирует ошибку шага
   */
  logStepError(step: number, stepName: string, error: string): void {
    if (!this.currentQuery) {
      return;
    }

    const entry: LLMLogEntry = {
      id: `step_${step}_error_${Date.now()}`,
      timestamp: new Date().toISOString(),
      step,
      stepName,
      prompt: '',
      response: '',
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 0,
      cost: 0,
      error
    };

    this.currentQuery.steps.push(entry);
  }

  /**
   * Завершает запрос и сохраняет в файл
   */
  endQuery(result?: any, error?: string): void {
    if (!this.currentQuery) {
      return;
    }

    if (result) {
      this.currentQuery.result = result;
    }

    if (error) {
      this.currentQuery.error = error;
    }

    // Сохраняем в файл
    const filename = `${this.currentQuery.queryId}.json`;
    const filepath = path.join(this.logsDir, filename);

    try {
      fs.writeFileSync(
        filepath,
        JSON.stringify(this.currentQuery, null, 2),
        'utf-8'
      );

      console.log(`[LLMLogger] Запрос сохранен: ${filepath}`);
      console.log(`[LLMLogger] Итого: ${this.currentQuery.totalTokens} tokens, ${this.currentQuery.totalDurationMs}ms, $${this.currentQuery.totalCost.toFixed(4)}`);
    } catch (err) {
      console.error('[LLMLogger] Ошибка сохранения лога:', err);
    }

    this.currentQuery = null;
  }

  /**
   * Получает статистику по всем логам
   */
  getStats(): {
    totalQueries: number;
    totalTokens: number;
    totalCost: number;
    avgDuration: number;
  } {
    try {
      const files = fs.readdirSync(this.logsDir).filter(f => f.endsWith('.json'));
      
      let totalTokens = 0;
      let totalCost = 0;
      let totalDuration = 0;

      for (const file of files) {
        const filepath = path.join(this.logsDir, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        const log: QueryLog = JSON.parse(content);

        totalTokens += log.totalTokens;
        totalCost += log.totalCost;
        totalDuration += log.totalDurationMs;
      }

      return {
        totalQueries: files.length,
        totalTokens,
        totalCost,
        avgDuration: files.length > 0 ? totalDuration / files.length : 0
      };
    } catch (error) {
      console.error('[LLMLogger] Ошибка получения статистики:', error);
      return {
        totalQueries: 0,
        totalTokens: 0,
        totalCost: 0,
        avgDuration: 0
      };
    }
  }

  /**
   * Очищает старые логи (старше N дней)
   */
  cleanOldLogs(daysToKeep: number = 30): void {
    try {
      const files = fs.readdirSync(this.logsDir).filter(f => f.endsWith('.json'));
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.logsDir, file);
        const stats = fs.statSync(filepath);

        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`[LLMLogger] Удалено ${deletedCount} старых логов (старше ${daysToKeep} дней)`);
      }
    } catch (error) {
      console.error('[LLMLogger] Ошибка очистки логов:', error);
    }
  }
}

// Singleton экземпляр
let loggerInstance: LLMLogger | null = null;

/**
 * Получает singleton экземпляр логгера
 */
export function getLLMLogger(): LLMLogger {
  if (!loggerInstance) {
    loggerInstance = new LLMLogger();
  }
  return loggerInstance;
}






