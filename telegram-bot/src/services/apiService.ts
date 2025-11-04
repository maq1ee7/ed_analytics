import axios, { AxiosError } from 'axios';
import { BACKEND_URL, TELEGRAM_BOT_API_KEY } from '../config';
import { BackendQueryResponse } from '../types';

/**
 * Сервис для взаимодействия с Backend API
 */
export class ApiService {
  /**
   * Отправляет запрос пользователя на Backend
   */
  static async submitQuery(question: string, chatId: number): Promise<BackendQueryResponse> {
    try {
      console.log(`[ApiService] Submitting query from chat ${chatId}`);
      
      const response = await axios.post<BackendQueryResponse>(
        `${BACKEND_URL}/api/queries/telegram`,
        {
          question,
          chatId
        },
        {
          headers: {
            'X-API-Key': TELEGRAM_BOT_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 секунд таймаут
        }
      );

      console.log(`[ApiService] Query submitted successfully, uid: ${response.data.uid}`);
      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('[ApiService] Backend API error:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        });

        if (axiosError.response?.status === 503) {
          throw new Error('Сервис обработки временно недоступен. Попробуйте позже.');
        }

        throw new Error('Не удалось отправить запрос на обработку. Попробуйте еще раз.');
      }

      console.error('[ApiService] Unexpected error:', error);
      throw new Error('Произошла неожиданная ошибка. Попробуйте еще раз.');
    }
  }
}

