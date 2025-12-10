#!/usr/bin/env node

/**
 * GitHub Actions script to update Google Sheets with PR information
 *
 * Environment variables required:
 * - GOOGLE_SHEETS_CREDENTIALS: JSON string with service account credentials
 * - GOOGLE_SHEETS_ID: Google Sheets spreadsheet ID
 * - PR_BODY: Pull request body text
 * - PR_NUMBER: Pull request number
 * - PR_URL: Pull request URL
 * - SHEET_NAME: Name of the sheet (default: Sheet1)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const config = require('./config.js');
const {
  extractTaskId,
  formatPrLink,
  createSheetLinkWithRange,
  isValidRowNumber,
} = require('./utils.js');

async function updateGoogleSheet() {
  try {
    console.log('🚀 Starting Google Sheets update process...\n');

    // Получаем переменные окружения
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    const sheetsId = process.env.GOOGLE_SHEETS_ID;
    const prBody = process.env.PR_BODY || '';
    const prNumber = process.env.PR_NUMBER;
    const prUrl = process.env.PR_URL;
    const prTitle = process.env.PR_TITLE || 'No title';
    const sheetName = process.env.SHEET_NAME || config.SHEET_NAME;

    // Валидация обязательных переменных
    if (!credentialsJson) {
      throw new Error('GOOGLE_SHEETS_CREDENTIALS is not set');
    }
    if (!sheetsId) {
      throw new Error('GOOGLE_SHEETS_ID is not set');
    }
    if (!prNumber) {
      throw new Error('PR_NUMBER is not set');
    }
    if (!prUrl) {
      throw new Error('PR_URL is not set');
    }

    // Парсим JSON credentials
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (e) {
      throw new Error(`Invalid GOOGLE_SHEETS_CREDENTIALS JSON format: ${e.message}`);
    }

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Credentials JSON missing required fields (client_email, private_key)');
    }

    console.log('✅ Environment variables loaded');
    console.log(`📊 Sheet ID: ${sheetsId}`);
    console.log(`📄 Sheet Name: ${sheetName}`);
    console.log(`🔗 PR #${prNumber}\n`);

    // Создаем JWT клиент для аутентификации
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    console.log('✅ Google authentication initialized\n');

    const sheets = google.sheets({ version: 'v4', auth });

    // Извлекаем Task ID из тела PR
    const extracted = extractTaskId(prBody);

    if (!extracted) {
      console.log('❌ Task ID not found in PR body.');
      console.log('Expected one of these formats:');
      console.log('  - Task ID: IT-48');
      console.log('  - IT-48');
      console.log('  - #IT-48\n');

      // Выходим без ошибки, просто не обновляем sheets
      console.log('::set-output name=task_id::');
      console.log('::set-output name=row_number::');
      return;
    }

    const { taskId, rowNumber } = extracted;
    console.log(`✅ Task ID extracted: ${taskId}`);
    console.log(`📍 Row number: ${rowNumber}\n`);

    // Валидация номера строки
    if (!isValidRowNumber(rowNumber)) {
      console.log(`⚠️  Invalid row number: ${rowNumber}`);
      console.log('Row number must be >= 2 (row 1 is headers)\n');
      console.log('::set-output name=task_id::');
      console.log('::set-output name=row_number::');
      return;
    }

    // Формируем диапазон для обновления
    // Колонка H (индекс 7) для ссылки на PR
    const columnLetter = String.fromCharCode(65 + config.COLUMNS.PR_LINK); // H
    const cellAddress = `${columnLetter}${rowNumber}`;
    const updateRange = `${sheetName}!${cellAddress}`;

    console.log(`📝 Target cell: ${cellAddress}`);
    console.log(`📋 Range: ${updateRange}\n`);

    // Форматируем ссылку на PR
    const prLink = formatPrLink(prNumber, prUrl);
    console.log(`🔗 PR Link: ${prLink}\n`);

    // Обновляем Google Sheets
    console.log('⏳ Updating Google Sheets...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetsId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[prLink]],
      },
    });

    console.log('✅ Google Sheets updated successfully!\n');

    // Создаем ссылку на задачу в Sheets с range параметром
    const sheetLink = createSheetLinkWithRange(sheetsId, rowNumber);
    console.log(`📊 Sheet link: ${sheetLink}\n`);

    // Экспортируем outputs для GitHub Actions
    console.log('::set-output name=task_id::' + taskId);
    console.log('::set-output name=row_number::' + rowNumber);
    console.log('::set-output name=sheet_link::' + sheetLink);

    console.log('\n✅ All done!');

  } catch (error) {
    console.error('\n❌ Error updating Google Sheets:');
    console.error(`   ${error.message}\n`);

    // Подсказки для распространенных ошибок
    if (error.message.includes('Permission denied') || error.message.includes('403')) {
      console.error('💡 Tip: Make sure the Service Account email is added to the Google Sheet');
      console.error(`   Service Account: ${process.env.GOOGLE_SHEETS_CREDENTIALS ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS).client_email : 'N/A'}\n`);
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.error('💡 Tip: Check your GOOGLE_SHEETS_ID environment variable');
      console.error(`   Current ID: ${process.env.GOOGLE_SHEETS_ID || 'NOT SET'}\n`);
    }
    if (error.message.includes('UNAUTHENTICATED') || error.message.includes('401')) {
      console.error('💡 Tip: Check that GOOGLE_SHEETS_CREDENTIALS is valid JSON');
      console.error('   Make sure the private key is complete and properly formatted\n');
    }

    process.exit(1);
  }
}

// Запускаем функцию
updateGoogleSheet();
