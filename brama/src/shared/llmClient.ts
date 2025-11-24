/**
 * LLM Client для работы с DeepSeek через AITunnel
 * Использует OpenAI-совместимый API
 * С поддержкой трассировки LangSmith
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { wrapOpenAI } from 'langsmith/wrappers';

export class LLMClient {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY не задан в переменных окружения');
    }

    // Инициализация OpenAI клиента для DeepSeek через AITunnel
    const client = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: 'https://api.aitunnel.ru/v1/'
    });

    // Оборачиваем клиент в LangSmith wrapper для автоматической трассировки
    // Если LANGSMITH_API_KEY не задан, wrapper просто передаёт вызовы дальше
    this.openai = wrapOpenAI(client);

    this.model = model;
    console.log(`[LLM] Инициализирован клиент для модели ${this.model} через AITunnel`);

    if (process.env.LANGSMITH_API_KEY) {
      console.log(`[LLM] LangSmith трассировка активирована (проект: ${process.env.LANGSMITH_PROJECT || 'default'})`);
    }
  }

  /**
   * Вызов LLM с системным промптом и пользовательским запросом
   * @param systemPrompt - системный промпт для LLM
   * @param userMessage - запрос пользователя
   * @param temperature - температура генерации (0-2)
   * @returns текстовый ответ LLM
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature
      });

      // Проверка структуры ответа
      if (!response) {
        throw new Error('API вернул пустой ответ');
      }

      if (!response.choices || response.choices.length === 0) {
        console.error('Полный ответ API:', JSON.stringify(response, null, 2));
        throw new Error('API вернул ответ без choices');
      }

      const content = response.choices[0]?.message?.content;

      if (!content) {
        console.error('Response choices:', JSON.stringify(response.choices, null, 2));
        throw new Error('LLM вернул пустой контент в сообщении');
      }

      return content.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ошибка при вызове LLM: ${error.message}`);
      }
      throw new Error('Неизвестная ошибка при вызове LLM');
    }
  }

  /**
   * Вызов LLM с ожиданием JSON-ответа
   * @param systemPrompt - системный промпт
   * @param userMessage - запрос пользователя
   * @param schema - Zod схема для валидации ответа
   * @param temperature - температура генерации
   * @returns распарсенный и провалидированный JSON
   */
  async chatJSON<T>(
    systemPrompt: string,
    userMessage: string,
    schema: z.ZodType<T>,
    temperature: number = 0.7
  ): Promise<T> {
    const fullSystemPrompt = `${systemPrompt}\n\nВАЖНО: Ответ должен быть ТОЛЬКО валидным JSON объектом, без дополнительного текста.`;

    const response = await this.chat(fullSystemPrompt, userMessage, temperature);

    try {
      // Пытаемся извлечь JSON из ответа (иногда LLM может добавлять markdown обёртку)
      let jsonString = response.trim();

      // Удаляем markdown обёртку, если есть
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonString);

      // Валидация через Zod схему
      const validated = schema.parse(parsed);

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `LLM вернул невалидный JSON: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
      if (error instanceof SyntaxError) {
        throw new Error(`LLM вернул некорректный JSON: ${error.message}\nОтвет: ${response}`);
      }
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[LLM] Завершение работы клиента');
  }
}
