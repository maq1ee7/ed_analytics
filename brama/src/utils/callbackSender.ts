import axios from 'axios';
import { ProcessResult } from '../types';

/**
 * Утилита для отправки результатов обработки в основной Backend
 */
export class CallbackSender {
  /**
   * Отправляет результат обработки в callback URL
   * 
   * @param callbackUrl - URL для callback (например http://backend:5000/api/callbacks/:taskId)
   * @param result - результат обработки (completed/failed)
   */
  static async sendResult(callbackUrl: string, result: ProcessResult): Promise<void> {
    const apiKey = process.env.ALLOWED_API_KEY;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 секунды

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Callback] Attempt ${attempt}/${maxRetries}: Sending result to ${callbackUrl}`);

        const response = await axios.post(
          callbackUrl,
          result,
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 10000, // 10 секунд таймаут
            proxy: false // Внутренние запросы к backend напрямую, без прокси
          }
        );

        console.log(`[Callback] Success: ${response.status} ${response.statusText}`);
        return; // Успешно отправили, выходим

      } catch (error) {
        console.error(`[Callback] Attempt ${attempt}/${maxRetries} failed:`, error);

        // Если это последняя попытка, логируем критическую ошибку
        if (attempt === maxRetries) {
          console.error(`[Callback] CRITICAL: Failed to send result after ${maxRetries} attempts`);
          console.error(`[Callback] URL: ${callbackUrl}`);
          console.error(`[Callback] Result:`, JSON.stringify(result, null, 2));
          throw error;
        }

        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Отправляет успешный результат
   */
  static async sendSuccess(callbackUrl: string, result: any): Promise<void> {
    await this.sendResult(callbackUrl, {
      status: 'completed',
      result
    });
  }

  /**
   * Отправляет ошибку
   */
  static async sendError(callbackUrl: string, error: string): Promise<void> {
    await this.sendResult(callbackUrl, {
      status: 'failed',
      error
    });
  }
}


