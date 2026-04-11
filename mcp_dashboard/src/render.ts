import puppeteer, { Browser } from 'puppeteer';

/** По умолчанию 3 мин: медленная сеть / удалённый BASE_URL, загрузка страницы и скриншот в Puppeteer. */
const DEFAULT_TIMEOUT_MS = 60_000;

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    console.error('[mcp-dashboard] [render] Запуск Chromium…');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      protocolTimeout: DEFAULT_TIMEOUT_MS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-zygote',
      ],
    });
    console.error('[mcp-dashboard] [render] Chromium запущен');
  }
  return browser;
}

/** В контейнере localhost иногда ведёт себя нестабильно; используем 127.0.0.1 для перехода. */
function urlForGoto(dashboardUrl: string): string {
  try {
    const u = new URL(dashboardUrl);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.toString();
    }
  } catch {
    // ignore
  }
  return dashboardUrl;
}

/**
 * Рендерит страницу дашборда в PNG (base64).
 * baseUrl — например http://localhost:3100
 */
export async function renderDashboardToPng(
  dashboardUrl: string,
  options?: { width?: number; height?: number; timeoutMs?: number; fullPage?: boolean }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const width = options?.width ?? 1200;
  const height = options?.height ?? 800;
  const fullPage = options?.fullPage ?? false;

  const run = async (): Promise<string> => {
    console.error('[mcp-dashboard] [render] renderDashboardToPng start', dashboardUrl);
    const b = await getBrowser();
    console.error('[mcp-dashboard] [render] newPage');
    const page = await b.newPage();
    const gotoUrl = urlForGoto(dashboardUrl);
    if (gotoUrl !== dashboardUrl) {
      console.error('[mcp-dashboard] [render] goto URL (127.0.0.1)', gotoUrl);
    }
    try {
      page.setDefaultTimeout(timeoutMs);
      page.setDefaultNavigationTimeout(timeoutMs);
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      console.error('[mcp-dashboard] [render] viewport set, goto', gotoUrl);
      await page.goto(gotoUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      console.error('[mcp-dashboard] [render] ждём data-ready…');
      await page.waitForFunction(
        () => document.body?.dataset?.ready === 'true',
        { timeout: timeoutMs }
      );
      console.error('[mcp-dashboard] [render] data-ready, делаем скриншот');
      await new Promise((r) => setTimeout(r, 300));
      const buffer = await page.screenshot({ type: 'png', fullPage });
      console.error('[mcp-dashboard] [render] скриншот готов, длина base64:', Buffer.from(buffer).toString('base64').length);
      return Buffer.from(buffer).toString('base64');
    } finally {
      await page.close();
    }
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Рендер дашборда не завершился за ${timeoutMs} мс`)), timeoutMs);
  });
  return Promise.race([run(), timeoutPromise]);
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
