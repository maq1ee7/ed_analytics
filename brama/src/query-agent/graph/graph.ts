/**
 * LangGraph граф для обработки запросов пользователей
 */

import { StateGraph, END } from '@langchain/langgraph';
import { AgentState, AgentStateType } from './state.js';
import { clarifyQueryNode } from './nodes/clarifyQueryNode.js';
import { selectStatformNode } from './nodes/selectStatformNode.js';
import { selectSectionNode } from './nodes/selectSectionNode.js';
import { selectViewCellsNode } from './nodes/selectViewCellsNode.js';
import { generateDashboardNode } from './nodes/generateDashboardNode.js';
import { LLMClient } from '../../shared/llmClient.js';
import { Neo4jClient } from '../../shared/neo4jClient.js';
import { Logger } from '../../shared/logger.js';

const logger = Logger.withPrefix('QueryGraph');

/**
 * Построить граф обработки запросов
 * @param llmClient - клиент LLM
 * @param neo4jClient - клиент Neo4j
 * @returns скомпилированный граф
 */
export function buildQueryGraph(llmClient: LLMClient, neo4jClient: Neo4jClient) {
  logger.info('Построение LangGraph графа обработки запросов');

  // Создать граф с определенным состоянием используя method chaining
  // Важно: method chaining позволяет TypeScript корректно выводить типы узлов
  const app = new StateGraph(AgentState)
    // Добавить узлы графа
    .addNode('selectStatform', async (state: AgentStateType) => {
      return await selectStatformNode(state, llmClient, neo4jClient);
    })
    .addNode('selectSection', async (state: AgentStateType) => {
      return await selectSectionNode(state, llmClient, neo4jClient);
    })
    .addNode('selectViewCells', async (state: AgentStateType) => {
      return await selectViewCellsNode(state, llmClient, neo4jClient);
    })
    .addNode('generateDashboard', async (state: AgentStateType) => {
      return await generateDashboardNode(state);
    })
    // Условные переходы: если ошибка, завершить; иначе продолжить
    .addConditionalEdges(
      'selectStatform',
      (state: AgentStateType) => {
        if (state.error) {
          logger.error('Ошибка на этапе выбора статформ, завершение графа');
          return END;
        }
        return 'selectSection';
      }
    )
    .addConditionalEdges(
      'selectSection',
      (state: AgentStateType) => {
        if (state.error) {
          logger.error('Ошибка на этапе выбора раздела, завершение графа');
          return END;
        }
        return 'selectViewCells';
      }
    )
    .addConditionalEdges(
      'selectViewCells',
      (state: AgentStateType) => {
        if (state.error) {
          logger.error('Ошибка на этапе выбора представления, завершение графа');
          return END;
        }
        return 'generateDashboard';
      }
    )
    .addEdge('generateDashboard', END)
    // Определить точку входа
    .setEntryPoint('selectStatform')
    // Скомпилировать граф
    .compile();

  logger.info('Граф успешно построен и скомпилирован');

  return app;
}

/**
 * Построить отдельный граф для уточнения запросов
 * @param llmClient - клиент LLM
 * @param neo4jClient - клиент Neo4j
 * @returns скомпилированный граф уточнения
 */
export function buildClarificationGraph(llmClient: LLMClient, neo4jClient: Neo4jClient) {
  logger.info('Построение LangGraph графа уточнения запросов');

  const app = new StateGraph(AgentState)
    .addNode('clarifyQuery', async (state: AgentStateType) => {
      return await clarifyQueryNode(state, llmClient, neo4jClient);
    })
    .addEdge('clarifyQuery', END)
    .setEntryPoint('clarifyQuery')
    .compile();

  logger.info('Граф уточнения успешно построен');

  return app;
}
