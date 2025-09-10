import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Загружаем переменные окружения
dotenv.config();

// Импорт роутов
import authRoutes from './routes/auth';
import { authenticateToken } from './middleware/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(helmet());

// CORS конфигурация для продакшена
const corsOptions = {
  origin: [
    'http://localhost:3000',           // Локальная разработка
    'http://130.193.46.4',             // Продакшн frontend (порт 80)
    'http://130.193.46.4:80',          // Продакшн frontend (явно указан порт)
    'http://127.0.0.1:3000',           // Локальная разработка (альтернативный адрес)
  ],
  credentials: true,                   // Разрешаем cookies и auth headers
  optionsSuccessStatus: 200           // Для поддержки старых браузеров
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Роуты авторизации (публичные)
app.use('/api/auth', authRoutes);

// API роуты (защищенные)
app.get('/api/hello', authenticateToken, (req, res) => {
  res.json({
    message: 'Hello World from Backend!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    user: req.user
  });
});

// Проверка здоровья сервиса
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
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
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API available at: http://0.0.0.0:${PORT}/api/hello`);
  console.log(`🔗 External access: http://130.193.46.4:${PORT}/api/hello`);
});
