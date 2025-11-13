/**
 * LLM Service - сервис для обработки запросов через DeepSeek API (via AITunnel)
 * Портирован с Python модуля langchain_query.py
 */

import OpenAI from 'openai';
import { getTableList, formatTableListForPrompt } from '../utils/tableListLoader';
import { TableSchemaGenerator } from '../utils/tableSchemaGenerator';
import { getLLMLogger } from '../utils/llmLogger';
import {
  formatStep1Prompt,
  formatStep2Prompt,
  formatStep3Prompt
} from '../utils/prompts';

interface Step1Result {
  form_code: string;
  view_type: string;
}

interface Step2Result {
  section: string;
}

interface Step3Result {
  col_index: number;
  row_index: number;
}

interface LLMStep {
  step: number;
  description: string;
  llm_output: any;
}

export interface QueryParams {
  form_code: string;
  view_type: string;
  section: string;
  col_index: number;
  row_index: number;
  year: number;
  steps: LLMStep[];
}

/**
 * Класс для обработки запросов на естественном языке к статистической БД
 */
export class LLMService {
  private openai: OpenAI;
  private model: string;
  private tableSchemaGenerator: TableSchemaGenerator;
  private defaultYear: number;

  constructor(
    openaiApiKey: string,
    model: string,
    neo4jUri: string,
    neo4jUser: string,
    neo4jPassword: string,
    defaultYear: number = 2024
  ) {
    // Инициализация OpenAI клиента для DeepSeek через AITunnel
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: 'https://api.aitunnel.ru/v1/'
    });

    this.model = model;

    // Инициализация генератора схем таблиц
    this.tableSchemaGenerator = new TableSchemaGenerator(neo4jUri, neo4jUser, neo4jPassword);
    this.defaultYear = defaultYear;

    console.log(`[LLMService] Инициализирован (модель: ${model}, год: ${defaultYear})`);
    console.log('[LLMService] DeepSeek API через AITunnel прокси');
    console.log('[LLMService] Локальное логирование активно (директория: logs/llm/)');
  }

  /**
   * Закрывает подключения
   */
  async close(): Promise<void> {
    await this.tableSchemaGenerator.close();
  }

  /**
   * Вызывает DeepSeek API через AITunnel и логирует локально
   */
  private async callDeepSeek(
    step: number,
    stepName: string,
    prompt: string
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Вызов DeepSeek API через OpenAI-совместимый интерфейс
      const response = await this.openai.chat.completions.create({
        model: this.model,
        max_tokens: 1024,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const result = response.choices[0]?.message?.content || '';
      const duration = Date.now() - startTime;

      // Локальное логирование
      const logger = getLLMLogger();
      logger.logStep(
        step,
        stepName,
        prompt,
        result,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        duration
      );

      console.log(`[LLMService] ${stepName} завершен (${duration}ms, ${response.usage?.prompt_tokens}/${response.usage?.completion_tokens} tokens)`);

      return result;

    } catch (error) {
      // Логируем ошибку
      const logger = getLLMLogger();
      logger.logStepError(step, stepName, String(error));
      throw error;
    }
  }

  /**
   * Парсит JSON из ответа LLM (structured output)
   */
  private parseJsonResponse(response: string): any {
    try {
      // Пробуем парсить напрямую
      return JSON.parse(response);
    } catch (error) {
      // Fallback: ищем JSON в тексте
      // Сначала убираем двойные фигурные скобки {{ }} -> { }
      let cleanedResponse = response.replace(/\{\{/g, '{').replace(/\}\}/g, '}');
      
      // Ищем первую { и последнюю }
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        const jsonStr = cleanedResponse.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error('[LLMService] Ошибка парсинга извлеченного JSON:', e);
          console.error('[LLMService] Извлеченная строка:', jsonStr);
          throw new Error(`LLM вернул невалидный JSON: ${response}`);
        }
      }
      
      throw new Error(`LLM вернул невалидный JSON: ${response}`);
    }
  }

  /**
   * Шаг 1: Определить form_code и view_type
   */
  private async step1IdentifyFormAndView(query: string): Promise<Step1Result> {
    console.log('[LLMService] Шаг 1: Определение формы и вида данных...');

    const prompt = formatStep1Prompt(query);
    const response = await this.callDeepSeek(1, 'Шаг 1: form_code + view_type', prompt);

    const result = this.parseJsonResponse(response);

    // Валидация
    if (!this.validateStep1(result)) {
      throw new Error(`Невалидный результат шага 1: ${JSON.stringify(result)}`);
    }

    console.log(`[LLMService] Шаг 1 завершен: form_code=${result.form_code}, view_type=${result.view_type}`);
    return result;
  }

  /**
   * Валидация результата шага 1
   */
  private validateStep1(result: any): boolean {
    if (!result.form_code || !result.view_type) {
      console.error('[LLMService] Отсутствуют обязательные поля');
      return false;
    }

    if (!['OO_1', 'OO_2'].includes(result.form_code)) {
      console.error(`[LLMService] Неверный form_code: ${result.form_code}`);
      return false;
    }

    const validViewTypes = ['гоу_город', 'гоу_село', 'ноу_город', 'ноу_село'];
    if (!validViewTypes.includes(result.view_type)) {
      console.error(`[LLMService] Неверный view_type: ${result.view_type}`);
      return false;
    }

    return true;
  }

  /**
   * Шаг 2: Выбрать раздел (section)
   */
  private async step2SelectSection(query: string, formCode: string): Promise<Step2Result> {
    console.log('[LLMService] Шаг 2: Выбор таблицы (раздела)...');

    // Загрузить список таблиц
    const tableList = getTableList(formCode);
    const tableListStr = formatTableListForPrompt(tableList);

    const prompt = formatStep2Prompt(query, formCode, tableListStr);
    const response = await this.callDeepSeek(2, 'Шаг 2: section', prompt);

    const result = this.parseJsonResponse(response);

    // Валидация
    if (!this.validateStep2(result, formCode)) {
      throw new Error(`Невалидный результат шага 2: ${JSON.stringify(result)}`);
    }

    console.log(`[LLMService] Шаг 2 завершен: section=${result.section}`);
    return result;
  }

  /**
   * Валидация результата шага 2
   */
  private validateStep2(result: any, formCode: string): boolean {
    if (!result.section) {
      console.error('[LLMService] Отсутствует поле section');
      return false;
    }

    // Проверить, что section существует в списке
    const tableList = getTableList(formCode);
    const validSections = tableList.map(item => item.section);

    if (!validSections.includes(result.section)) {
      console.error(`[LLMService] Секция ${result.section} не найдена в списке таблиц`);
      console.error(`[LLMService] Доступные секции: ${validSections.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Шаг 3: Определить координаты ячейки
   */
  private async step3SelectCell(
    query: string,
    formCode: string,
    section: string
  ): Promise<Step3Result> {
    console.log('[LLMService] Шаг 3: Выбор ячейки (координаты)...');

    // Сгенерировать схему таблицы
    const tableSchema = await this.tableSchemaGenerator.generateSchema(
      formCode,
      section,
      this.defaultYear
    );

    const prompt = formatStep3Prompt(query, formCode, section, tableSchema);
    const response = await this.callDeepSeek(3, 'Шаг 3: col_index + row_index', prompt);

    const result = this.parseJsonResponse(response);

    // Валидация
    if (!this.validateStep3(result)) {
      throw new Error(`Невалидный результат шага 3: ${JSON.stringify(result)}`);
    }

    console.log(`[LLMService] Шаг 3 завершен: col_index=${result.col_index}, row_index=${result.row_index}`);
    return result;
  }

  /**
   * Валидация результата шага 3
   */
  private validateStep3(result: any): boolean {
    if (!result.col_index || !result.row_index) {
      console.error('[LLMService] Отсутствуют обязательные поля col_index/row_index');
      return false;
    }

    if (typeof result.col_index !== 'number' || result.col_index < 1) {
      console.error(`[LLMService] Неверный col_index: ${result.col_index}`);
      return false;
    }

    if (typeof result.row_index !== 'number' || result.row_index < 1) {
      console.error(`[LLMService] Неверный row_index: ${result.row_index}`);
      return false;
    }

    return true;
  }

  /**
   * Главный метод обработки запроса
   * Выполняет 3 шага LLM и возвращает параметры для Neo4j
   */
  async processQuery(query: string): Promise<QueryParams> {
    console.log('='.repeat(80));
    console.log(`[LLMService] Получен запрос: ${query}`);
    console.log('='.repeat(80));

    // Начинаем логирование запроса
    const logger = getLLMLogger();
    logger.startQuery(query);

    const steps: LLMStep[] = [];

    try {
      // Шаг 1: Определить form_code и view_type
      const step1Result = await this.step1IdentifyFormAndView(query);
      steps.push({
        step: 1,
        description: 'Определение формы и вида данных',
        llm_output: step1Result
      });

      // Шаг 2: Выбрать раздел
      const step2Result = await this.step2SelectSection(query, step1Result.form_code);
      steps.push({
        step: 2,
        description: 'Выбор таблицы (раздела)',
        llm_output: step2Result
      });

      // Шаг 3: Определить координаты ячейки
      const step3Result = await this.step3SelectCell(
        query,
        step1Result.form_code,
        step2Result.section
      );
      steps.push({
        step: 3,
        description: 'Выбор ячейки (координаты)',
        llm_output: step3Result
      });

      const params: QueryParams = {
        form_code: step1Result.form_code,
        view_type: step1Result.view_type,
        section: step2Result.section,
        col_index: step3Result.col_index,
        row_index: step3Result.row_index,
        year: this.defaultYear,
        steps
      };

      // Завершаем логирование с результатом
      logger.endQuery({
        form_code: params.form_code,
        view_type: params.view_type,
        section: params.section,
        col_index: params.col_index,
        row_index: params.row_index
      });

      console.log('='.repeat(80));
      console.log('[LLMService] Запрос обработан успешно!');
      console.log('='.repeat(80));

      return params;

    } catch (error) {
      // Завершаем логирование с ошибкой
      logger.endQuery(undefined, String(error));

      console.error(`[LLMService] Ошибка обработки запроса:`, error);
      throw error;
    }
  }
}

