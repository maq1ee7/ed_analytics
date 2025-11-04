import { Telegraf, Context } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { TELEGRAM_BOT_TOKEN, ALLOWED_USERNAMES, QUERY_TIMEOUT_MS } from './config';
import { ApiService } from './services/apiService';
import { RedisService } from './services/redisService';
import { UserSession } from './types';

/**
 * Главный класс Telegram бота
 */
class TelegramBot {
  private bot: Telegraf<Context<Update>>;
  private redisService: RedisService;
  private activeSessions: Map<number, UserSession> = new Map();

  constructor() {
    console.log('[TelegramBot] Initializing bot...');

    // Создаем экземпляр бота
    this.bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    // Инициализируем Redis сервис для получения уведомлений
    this.redisService = new RedisService(this.bot);

    // Регистрируем обработчики
    this.setupHandlers();

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
        await ctx.reply('⏳ Обрабатываю запрос...');

        // Отправляем запрос на Backend
        try {
          const response = await ApiService.submitQuery(messageText, chatId);

          // Сохраняем сессию
          this.activeSessions.set(chatId, {
            chatId,
            username,
            activeQueryUid: response.uid,
            queryStartTime: Date.now()
          });

          console.log(`[TelegramBot] Query submitted successfully: ${response.uid}`);

          // Устанавливаем таймаут на 1 минуту
          setTimeout(() => {
            this.checkQueryTimeout(chatId, response.uid);
          }, QUERY_TIMEOUT_MS);

        } catch (error) {
          console.error('[TelegramBot] Error submitting query:', error);
          
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

