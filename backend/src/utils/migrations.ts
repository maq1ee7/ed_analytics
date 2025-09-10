import { query } from './database';
import fs from 'fs';
import path from 'path';

interface Migration {
  filename: string;
  version: string;
  sql: string;
}

// Создаем таблицу для отслеживания миграций
const createMigrationsTable = async (): Promise<void> => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await query(createTableSQL);
  console.log('✅ Schema migrations table ready');
};

// Получаем список уже примененных миграций
const getAppliedMigrations = async (): Promise<string[]> => {
  const result = await query('SELECT version FROM schema_migrations ORDER BY version');
  return result.rows.map(row => row.version);
};

// Читаем файлы миграций из папки
const readMigrationFiles = (): Migration[] => {
  // В Docker контейнере: /app/migrations, в разработке: ../../migrations
  const migrationsDir = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../../migrations')
    : path.join(__dirname, '../../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 Migrations directory not found, creating...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Сортируем по имени файла

  const migrations: Migration[] = [];

  for (const filename of files) {
    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Извлекаем версию из имени файла (например, "01_create_users_table.sql" -> "01")
    const version = filename.split('_')[0];
    
    migrations.push({
      filename,
      version,
      sql
    });
  }

  return migrations;
};

// Применяем одну миграцию
const applyMigration = async (migration: Migration): Promise<void> => {
  try {
    console.log(`📄 Applying migration: ${migration.filename}`);
    
    // Выполняем SQL миграции
    await query(migration.sql);
    
    // Записываем в таблицу что миграция применена
    await query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      [migration.version]
    );
    
    console.log(`✅ Migration ${migration.filename} applied successfully`);
  } catch (error) {
    console.error(`❌ Error applying migration ${migration.filename}:`, error);
    throw error;
  }
};

// Основная функция запуска миграций
export const runMigrations = async (): Promise<void> => {
  try {
    console.log('🔄 Starting database migrations...');
    
    // 1. Создаем таблицу миграций если её нет
    await createMigrationsTable();
    
    // 2. Получаем список уже примененных миграций
    const appliedMigrations = await getAppliedMigrations();
    console.log(`📋 Applied migrations: [${appliedMigrations.join(', ')}]`);
    
    // 3. Читаем файлы миграций
    const availableMigrations = readMigrationFiles();
    console.log(`📁 Available migrations: [${availableMigrations.map(m => m.filename).join(', ')}]`);
    
    // 4. Применяем новые миграции
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedMigrations.includes(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations, database is up to date');
      return;
    }
    
    console.log(`🚀 Applying ${pendingMigrations.length} pending migration(s)...`);
    
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error; // Прерываем запуск приложения если миграция упала
  }
};
