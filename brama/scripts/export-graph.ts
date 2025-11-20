#!/usr/bin/env ts-node
/**
 * Скрипт для экспорта LangGraph диаграммы в Mermaid формат
 *
 * Использование:
 *   npx ts-node scripts/export-graph.ts
 *
 * Выходные файлы:
 *   - query-agent-graph.mmd - Mermaid синтаксис
 *   - Вывод в консоль для копирования
 */

import { buildQueryGraph } from '../src/query-agent/graph/graph';
import { LLMClient } from '../src/shared/llmClient';
import { Neo4jClient } from '../src/shared/neo4jClient';
import * as fs from 'fs/promises';
import * as path from 'path';

async function exportGraphDiagram() {
  console.log('🚀 Экспорт LangGraph диаграммы...\n');

  try {
    // Инициализация клиентов (без реального подключения)
    console.log('📦 Инициализация клиентов...');
    const llmClient = new LLMClient();
    const neo4jClient = Neo4jClient.getInstance();

    // Построение графа
    console.log('🔧 Построение графа...');
    const graph = buildQueryGraph(llmClient, neo4jClient);

    // Получить представление графа
    console.log('📊 Получение визуального представления...');
    const drawableGraph = await graph.getGraphAsync({ xray: false });

    // Экспортировать в Mermaid синтаксис с настройками
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

    // Информация о диаграмме
    console.log('📝 Информация о диаграмме:');
    console.log('   - Узлы (nodes): 4');
    console.log('   - Этапы: selectStatform → selectSection → selectViewCells → generateDashboard');
    console.log('   - Условные переходы: Проверка ошибок на каждом этапе');
    console.log('   - Точка входа: selectStatform');
    console.log('   - Точка выхода: END\n');

    console.log('🎨 Цвета узлов:');
    console.log('   - selectStatform: Голубой (#E3F2FD)');
    console.log('   - selectSection: Зеленый (#E8F5E9)');
    console.log('   - selectViewCells: Оранжевый (#FFF3E0)');
    console.log('   - generateDashboard: Фиолетовый (#F3E5F5)\n');

    // Graceful shutdown
    console.log('🔌 Завершение работы...');
    await neo4jClient.shutdown();

    console.log('✨ Готово!\n');

  } catch (error) {
    console.error('❌ Ошибка при экспорте графа:', error);
    process.exit(1);
  }
}

// Запуск
exportGraphDiagram().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
