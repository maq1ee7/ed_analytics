#!/usr/bin/env node
/**
 * Скрипт для экспорта LangGraph диаграммы в Mermaid формат
 * Работает со скомпилированным кодом из dist/
 *
 * Использование:
 *   npm run build && node scripts/export-graph.js
 */

// Загрузка переменных окружения
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { buildQueryGraph } = require('../dist/query-agent/graph/graph.js');
const { LLMClient } = require('../dist/shared/llmClient.js');
const { Neo4jClient } = require('../dist/shared/neo4jClient.js');
const fs = require('fs/promises');
const path = require('path');

async function exportGraphDiagram() {
  console.log('🚀 Экспорт LangGraph диаграммы...\n');

  try {
    // Инициализация клиентов
    console.log('📦 Инициализация клиентов...');
    const llmClient = new LLMClient();
    const neo4jClient = Neo4jClient.getInstance();

    // Построение графа
    console.log('🔧 Построение графа...');
    const graph = buildQueryGraph(llmClient, neo4jClient);

    // Получить представление графа
    console.log('📊 Получение визуального представления...');
    const drawableGraph = await graph.getGraphAsync({ xray: false });

    // Экспортировать в Mermaid синтаксис
    console.log('✨ Генерация Mermaid диаграммы...');
    const mermaidSyntax = drawableGraph.drawMermaid({
      withStyles: true,
      curveStyle: 'linear',
      wrapLabelNWords: 5,
      nodeColors: {
        'selectStatform': '#E3F2FD',      // Голубой
        'selectSection': '#E8F5E9',       // Зеленый
        'selectViewCells': '#FFF3E0',     // Оранжевый
        'generateDashboard': '#F3E5F5'    // Фиолетовый
      }
    });

    // Вывести в консоль
    console.log('\n' + '='.repeat(80));
    console.log('MERMAID DIAGRAM (копируйте отсюда):');
    console.log('='.repeat(80) + '\n');
    console.log(mermaidSyntax);
    console.log('\n' + '='.repeat(80) + '\n');

    // Сохранить в файл
    const outputPath = path.join(__dirname, '..', 'query-agent-graph.mmd');
    await fs.writeFile(outputPath, mermaidSyntax, 'utf-8');
    console.log(`✅ Диаграмма сохранена в: ${outputPath}\n`);

    // Информация
    console.log('📝 Информация о диаграмме:');
    console.log('   - Узлы (nodes): 4');
    console.log('   - Этапы: selectStatform → selectSection → selectViewCells → generateDashboard');
    console.log('   - Условные переходы: Проверка ошибок на каждом этапе');
    console.log('   - Точка входа: selectStatform');
    console.log('   - Точка выхода: END\n');

    // Graceful shutdown
    console.log('🔌 Завершение работы...');
    await neo4jClient.shutdown();

    console.log('✨ Готово!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Ошибка при экспорте графа:', error);
    process.exit(1);
  }
}

// Запуск
exportGraphDiagram();
