import { Telegraf, Context, Markup } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { TELEGRAM_BOT_TOKEN, ALLOWED_USERNAMES, QUERY_TIMEOUT_MS } from './config';
import { ApiService } from './services/apiService';
import { RedisService } from './services/redisService';
import { WebSearchService } from './services/webSearchService';
import { UserSession, ClarificationSuggestion } from './types';

/**
 * Главный класс Telegram бота
 */
class TelegramBot {
  private bot: Telegraf<Context<Update>>;
  private redisService: RedisService;
  private webSearchService: WebSearchService;
  private activeSessions: Map<number, UserSession> = new Map();

  constructor() {
    console.log('[TelegramBot] Initializing bot...');

    // Создаем экземпляр бота
    this.bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    // Инициализируем Redis сервис для получения уведомлений
    // Передаем callback для очистки сессий и отмены таймеров
    this.redisService = new RedisService(this.bot, this.handleQueryCompletion.bind(this));

    // Инициализируем WebSearch сервис для получения результатов веб-поиска
    this.webSearchService = new WebSearchService(this.bot);

    // Регистрируем обработчики
    this.setupHandlers();
    this.setupCallbackHandlers();

    console.log('[TelegramBot] Bot initialized successfully');
  }

  /**
   * Проверяет, разрешен ли пользователь
   */
  private isUserAllowed(username?: string): boolean {
    if (!username) return false;
    return ALLOWED_USERNAMES.includes(username);
  }

  /**
   * Создает inline клавиатуру с множественным выбором
   */
  private buildSelectionKeyboard(suggestions: ClarificationSuggestion[], selectedIds: Set<number>) {
    const buttons = suggestions.map((s: ClarificationSuggestion) => {
      const isSelected = selectedIds.has(s.id);
      const prefix = isSelected ? '✅' : '⬜';
      // Показываем: prefix + label (короткий текст для кнопки)
      const text = `${prefix} ${s.label}`;
      return [Markup.button.callback(text, `toggle_${s.id}`)];
    });

    // Добавляем кнопку "Готово"
    const selectedCount = selectedIds.size;
    const submitText = selectedCount > 0
      ? `Готово (${selectedCount}) ➡️`
      : 'Выберите варианты';

    buttons.push([Markup.button.callback(submitText, selectedCount > 0 ? 'submit_selection' : 'noop')]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Настраивает обработчики сообщений
   */
  private setupHandlers(): void {
    // Обработчик всех текстовых сообщений
    this.bot.on('text', async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        const username = ctx.from.username;
        const messageText = ctx.message.text;

        console.log(`[TelegramBot] Received message from @${username} (${chatId}): ${messageText}`);

        // Проверяем whitelist
        if (!this.isUserAllowed(username)) {
          console.log(`[TelegramBot] User @${username} is not allowed`);
          await ctx.reply('❌ У вас нет доступа к этому боту.');
          return;
        }

        // Проверяем, есть ли активный запрос
        const session = this.activeSessions.get(chatId);
        if (session?.activeQueryUid) {
          console.log(`[TelegramBot] User has active query: ${session.activeQueryUid}`);
          await ctx.reply('⏳ Ваш предыдущий запрос еще обрабатывается. Пожалуйста, подождите.');
          return;
        }

        // Отправляем подтверждение получения
        await ctx.reply('🔍 Анализирую запрос...');

        // Сначала получаем варианты уточнения
        try {
          const clarificationResponse = await ApiService.getClarifications(messageText);
          const suggestions = clarificationResponse.clarifications.suggestions;

          // Формируем сообщение с вариантами
          let message = '🤔 Выберите интересующие данные (можно несколько):\n\n';
          suggestions.forEach((s: ClarificationSuggestion) => {
            message += `• *${s.label}*\n`;
            message += `  ${s.description}\n\n`;
          });

          // Создаем клавиатуру с пустым выбором
          const selectedIds = new Set<number>();
          const keyboard = this.buildSelectionKeyboard(suggestions, selectedIds);

          // Отправляем сообщение с кнопками (с поддержкой markdown)
          const sentMessage = await ctx.reply(message, {
            ...keyboard,
            parse_mode: 'Markdown'
          });

          // Сохраняем сессию с вариантами уточнения
          this.activeSessions.set(chatId, {
            chatId,
            username,
            pendingClarification: {
              originalQuery: messageText,
              suggestions,
              selectedIds,
              messageId: sentMessage.message_id
            }
          });

          console.log(`[TelegramBot] Sent ${suggestions.length} clarification options to chat ${chatId}`);

        } catch (error) {
          console.error('[TelegramBot] Error getting clarifications:', error);

          const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при обработке запроса.';
          await ctx.reply(`❌ ${errorMessage}`);
        }

      } catch (error) {
        console.error('[TelegramBot] Error handling message:', error);
        await ctx.reply('❌ Произошла неожиданная ошибка. Попробуйте еще раз.');
      }
    });

    // Обработчик ошибок
    this.bot.catch((error, ctx) => {
      console.error('[TelegramBot] Bot error:', error);
      console.error('[TelegramBot] Error context:', ctx);
    });
  }

  /**
   * Настраивает обработчики callback кнопок
   */
  private setupCallbackHandlers(): void {
    // Обработчик toggle выбора варианта
    this.bot.action(/^toggle_(\d+)$/, async (ctx) => {
      try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        const match = ctx.match;
        const toggleId = parseInt(match[1], 10);

        console.log(`[TelegramBot] User toggled option ${toggleId} in chat ${chatId}`);

        // Получаем сохраненную сессию
        const session = this.activeSessions.get(chatId);
        if (!session?.pendingClarification) {
          await ctx.answerCbQuery('❌ Сессия истекла. Отправьте запрос заново.');
          return;
        }

        const { suggestions, selectedIds } = session.pendingClarification;

        // Toggle выбора
        if (selectedIds.has(toggleId)) {
          selectedIds.delete(toggleId);
        } else {
          selectedIds.add(toggleId);
        }

        // Обновляем клавиатуру
        const keyboard = this.buildSelectionKeyboard(suggestions, selectedIds);
        await ctx.editMessageReplyMarkup(keyboard.reply_markup);

        await ctx.answerCbQuery(selectedIds.has(toggleId) ? '✅ Выбрано' : '⬜ Снято');

      } catch (error) {
        console.error('[TelegramBot] Error handling toggle:', error);
      }
    });

    // Обработчик noop (когда ничего не выбрано)
    this.bot.action('noop', async (ctx) => {
      await ctx.answerCbQuery('⚠️ Выберите хотя бы один вариант');
    });

    // Обработчик отправки выбранных вариантов
    this.bot.action('submit_selection', async (ctx) => {
      try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        console.log(`[TelegramBot] User submitted selection in chat ${chatId}`);

        // Получаем сохраненную сессию
        const session = this.activeSessions.get(chatId);
        if (!session?.pendingClarification) {
          await ctx.answerCbQuery('❌ Сессия истекла. Отправьте запрос заново.');
          return;
        }

        const { originalQuery, suggestions, selectedIds } = session.pendingClarification;

        if (selectedIds.size === 0) {
          await ctx.answerCbQuery('⚠️ Выберите хотя бы один вариант');
          return;
        }

        // Получаем выбранные варианты
        const selectedSuggestions = suggestions.filter(s => selectedIds.has(s.id));

        // Формируем описание выбора
        const selectionText = selectedSuggestions
          .map(s => `• ${s.label}`)
          .join('\n');

        // Отвечаем на callback
        await ctx.answerCbQuery('✅ Отправляю запрос...');

        // Удаляем кнопки из сообщения
        await ctx.editMessageReplyMarkup(undefined);

        // Отправляем сообщение о начале обработки
        await ctx.reply(`⏳ Обрабатываю запрос:\n${selectionText}`);

        // Формируем комбинированный запрос: "исходный запрос. описание1. описание2."
        const combinedQuery = selectedSuggestions.length > 0
          ? `${originalQuery}. ${selectedSuggestions.map(s => s.description).join('. ')}`
          : originalQuery;

        console.log(`[TelegramBot] Combined query: "${combinedQuery}"`);

        // Отправляем запрос на обработку
        try {
          const response = await ApiService.submitQuery(combinedQuery, chatId);

          // Устанавливаем таймаут на 1 минуту
          const timeoutId = setTimeout(() => {
            this.checkQueryTimeout(chatId, response.uid);
          }, QUERY_TIMEOUT_MS);

          // Обновляем сессию
          this.activeSessions.set(chatId, {
            chatId,
            username: session.username,
            activeQueryUid: response.uid,
            queryStartTime: Date.now(),
            timeoutId
          });

          console.log(`[TelegramBot] Query submitted with selection: ${response.uid}`);

        } catch (error) {
          console.error('[TelegramBot] Error submitting query:', error);

          const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при обработке запроса.';
          await ctx.reply(`❌ ${errorMessage}`);

          // Очищаем сессию
          this.activeSessions.delete(chatId);
        }

      } catch (error) {
        console.error('[TelegramBot] Error handling submit:', error);
      }
    });
  }

  /**
   * Обрабатывает завершение запроса (успешное или с ошибкой)
   * Вызывается из RedisService при получении уведомления
   */
  private handleQueryCompletion(queryUid: string): void {
    // Находим сессию с этим queryUid
    for (const [chatId, session] of this.activeSessions) {
      if (session.activeQueryUid === queryUid) {
        console.log(`[TelegramBot] Query ${queryUid} completed, clearing session for chat ${chatId}`);

        // Отменяем таймер, если он существует
        if (session.timeoutId) {
          clearTimeout(session.timeoutId);
          console.log(`[TelegramBot] Timeout cancelled for query ${queryUid}`);
        }

        // Очищаем сессию
        this.activeSessions.delete(chatId);
        break;
      }
    }
  }

  /**
   * Проверяет таймаут запроса (1 минута)
   */
  private checkQueryTimeout(chatId: number, queryUid: string): void {
    const session = this.activeSessions.get(chatId);

    // Если запрос все еще активен (не получили уведомление)
    if (session?.activeQueryUid === queryUid) {
      console.log(`[TelegramBot] Query ${queryUid} timed out for chat ${chatId}`);

      this.bot.telegram.sendMessage(
        chatId,
        '⏱ Время ожидания истекло. Обработка запроса занимает больше времени, чем ожидалось. Пожалуйста, попробуйте еще раз позже.'
      ).catch(error => {
        console.error('[TelegramBot] Failed to send timeout message:', error);
      });

      // Очищаем сессию
      this.activeSessions.delete(chatId);
    }
  }

  /**
   * Запускает бота
   */
  async start(): Promise<void> {
    console.log('[TelegramBot] Starting bot...');

    // Graceful shutdown
    process.once('SIGINT', () => this.stop('SIGINT'));
    process.once('SIGTERM', () => this.stop('SIGTERM'));

    // Запускаем бота в long polling режиме
    await this.bot.launch();

    console.log('[TelegramBot] Bot is running! Press Ctrl+C to stop.');
  }

  /**
   * Останавливает бота
   */
  private async stop(signal: string): Promise<void> {
    console.log(`[TelegramBot] Received ${signal}, stopping bot...`);

    try {
      // Останавливаем бота
      this.bot.stop(signal);

      // Закрываем Redis соединение
      await this.redisService.close();

      // Закрываем WebSearch соединение
      await this.webSearchService.close();

      console.log('[TelegramBot] Bot stopped successfully');
      process.exit(0);

    } catch (error) {
      console.error('[TelegramBot] Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Запускаем бота
const bot = new TelegramBot();
bot.start().catch(error => {
  console.error('[TelegramBot] Fatal error:', error);
  process.exit(1);
});
