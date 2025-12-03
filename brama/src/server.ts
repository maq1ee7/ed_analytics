import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Загружаем переменные окружения
dotenv.config();

// Импорт роутов и сервисов
import processRoutes from './routes/process';
import clarificationsRoutes from './routes/clarifications';
import { QueueService } from './services/queueService';
import { TaskProcessor } from './workers/taskProcessor';
import { WebSearchProcessor } from './workers/webSearchProcessor.js';
import { DashboardGenerator } from './utils/dashboardGenerator';

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Инициализация Dashboard Generator (LLM + Neo4j сервисы)
console.log('🤖 Инициализация LLM и Neo4j сервисов...');
DashboardGenerator.initialize();

// Инициализация Queue и Worker
const queueService = QueueService.getInstance();
const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);
TaskProcessor.initialize(workerConcurrency);

// Инициализация WebSearchProcessor (параллельный веб-поиск)
const webSearchConcurrency = parseInt(process.env.WEB_SEARCH_CONCURRENCY || '5', 10);
const webSearchProcessor = new WebSearchProcessor(webSearchConcurrency);
console.log(`🔍 WebSearchProcessor initialized with concurrency: ${webSearchConcurrency}`);

// Bull Board UI (только в development режиме)
if (NODE_ENV === 'development') {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullAdapter(queueService.getQueue())],
    serverAdapter: serverAdapter
  });

  app.use('/admin/queues', serverAdapter.getRouter());
  console.log('📊 Bull Board UI enabled at /admin/queues');
}

// API Routes
app.use('/api/process', processRoutes);
app.use('/api/clarifications', clarificationsRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const stats = await queueService.getStats();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      queue: {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Queue unavailable'
    });
  }
});

// Обработка несуществующих роутов
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Глобальная обработка ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 Brama Backend is running');
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
  console.log(`💚 Health: http://0.0.0.0:${PORT}/health`);
  if (NODE_ENV === 'development') {
    console.log(`📈 Bull Board: http://0.0.0.0:${PORT}/admin/queues`);
  }
  console.log(`👷 Workers: ${workerConcurrency} concurrent tasks`);
  console.log('');
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    await TaskProcessor.shutdown();
    await webSearchProcessor.shutdown();
    await DashboardGenerator.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


