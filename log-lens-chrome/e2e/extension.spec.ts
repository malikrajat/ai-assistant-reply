import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium, expect, test, type BrowserContext, type Page, type Worker } from '@playwright/test';

const dist = join(process.cwd(), 'dist');

interface ExtensionHarness {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  profile: string;
  url: (path: string) => string;
  close: (keepProfile?: boolean) => Promise<void>;
}

async function launch(profile?: string): Promise<ExtensionHarness> {
  const userDataDir = profile ?? mkdtempSync(join(tmpdir(), 'log-lens-e2e-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
    viewport: { width: 1100, height: 900 },
  });
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 20_000 });
  }
  const extensionId = new URL(serviceWorker.url()).host;
  return {
    context,
    serviceWorker,
    extensionId,
    profile: userDataDir,
    url: (path: string) => `chrome-extension://${extensionId}/${path}`,
    close: async (keepProfile = false) => {
      await context.close();
      if (!keepProfile) rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

async function openPage(h: ExtensionHarness, path: string): Promise<Page> {
  const page = await h.context.newPage();
  await page.goto(h.url(path));
  return page;
}

async function seed(
  h: ExtensionHarness,
  entries: unknown[],
  settings: Record<string, unknown> = {},
): Promise<void> {
  await h.serviceWorker.evaluate(
    async ({ entryValues, settingsValue }) => {
      await chrome.storage.local.set({
        'loglens.entries.v1': entryValues,
        'loglens.settings.v1': settingsValue,
      });
    },
    { entryValues: entries, settingsValue: { ...settings } },
  );
}

function sampleEntries() {
  const now = Date.now();
  return [
    {
      id: 'e2e-1',
      timestamp: new Date(now - 60_000).toISOString(),
      level: 'error',
      source: 'page',
      message: 'TypeError: e2e boom',
      details: 'at run (app.js:1:1)',
      url: 'https://example.com/app',
    },
    {
      id: 'e2e-2',
      timestamp: new Date(now - 120_000).toISOString(),
      level: 'failure',
      source: 'network',
      message: 'HTTP 503 Service Unavailable',
      details: 'method=GET status=503',
      url: 'https://api.example.com/items',
    },
  ];
}

test('loads the unpacked extension and renders the popup summary', async () => {
  const h = await launch();
  try {
    await seed(h, sampleEntries(), { supportEmail: 'dev@example.com' });
    const page = await openPage(h, 'popup.html');
    await expect(page.locator('.mini-entry')).toHaveCount(2);
    await expect(page.locator('#popup-count')).toHaveText('2');
    await expect(page.locator('#popup-errors')).toHaveText('2');
    await expect(page.locator('#popup-status-text')).toContainText('Capturing errors');
    await expect(page.locator('#popup-version')).toHaveText('v1.1.0');
  } finally {
    await h.close();
  }
});

test('captures an extension error automatically and shows it in the viewer', async () => {
  const h = await launch();
  try {
    await h.serviceWorker.evaluate(() => {
      self.dispatchEvent(
        new ErrorEvent('error', {
          message: 'e2e extension boom',
          error: new Error('e2e extension boom'),
        }),
      );
    });
    await expect
      .poll(async () =>
        h.serviceWorker.evaluate(async () => {
          const stored = await chrome.storage.local.get('loglens.entries.v1');
          const entries = stored['loglens.entries.v1'];
          return Array.isArray(entries) ? entries.length : 0;
        }),
      )
      .toBeGreaterThan(0);

    const page = await openPage(h, 'logs.html');
    await expect(page.locator('.log-card').first()).toContainText('e2e extension boom');
  } finally {
    await h.close();
  }
});

test('filters logs, clears them (including the outbox), and resets the badge', async () => {
  const h = await launch();
  try {
    await seed(h, sampleEntries());
    await h.serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        'loglens.outbox.v1': [
          {
            id: 'pending-batch',
            createdAt: new Date().toISOString(),
            attempts: 1,
            nextAttemptAt: Date.now() + 60_000,
            entries: [],
          },
        ],
      });
    });
    const page = await openPage(h, 'logs.html');
    await expect(page.locator('.log-card')).toHaveCount(2);

    await page.fill('#filter-search', '503');
    await expect(page.locator('.log-card')).toHaveCount(1);
    await expect(page.locator('.log-card')).toContainText('503');

    await page.fill('#filter-search', 'nothing-matches-this');
    await expect(page.locator('.empty-state')).toBeVisible();
    await page.click('[data-action="reset-filters"]');
    await expect(page.locator('.log-card')).toHaveCount(2);

    await page.click('[data-action="clear"]');
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal .btn.danger').click();
    await expect(page.locator('.empty-state')).toBeVisible();

    await expect
      .poll(async () => h.serviceWorker.evaluate(() => chrome.action.getBadgeText({})))
      .toBe('');
    expect(
      await h.serviceWorker.evaluate(async () => {
        const stored = await chrome.storage.local.get('loglens.outbox.v1');
        return stored['loglens.outbox.v1'];
      }),
    ).toEqual([]);
  } finally {
    await h.close();
  }
});

test('persists entries across a browser restart', async () => {
  const first = await launch();
  const profile = first.profile;
  try {
    const page = await openPage(first, 'popup.html');
    const response = await page.evaluate(async () => {
      return chrome.runtime.sendMessage({
        type: 'LOG_LENS/ADD',
        entry: { level: 'error', source: 'e2e', message: 'survives restart' },
      });
    });
    expect(response).toMatchObject({ ok: true });
  } finally {
    await first.close(true);
  }

  const second = await launch(profile);
  try {
    const page = await openPage(second, 'logs.html');
    await expect(page.locator('.log-card').first()).toContainText('survives restart');
  } finally {
    await second.close();
  }
});

test('sends a matching entry to a local auto-send endpoint', async () => {
  const received: { payload: { entries?: Array<{ message?: string }> } | null } = {
    payload: null,
  };
  const server: Server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
    });
    request.on('end', () => {
      try {
        received.payload = JSON.parse(body) as typeof received.payload;
      } catch {
        received.payload = null;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"ok":true}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  const h = await launch();
  try {
    await h.serviceWorker.evaluate(
      async ({ endpoint }) => {
        await chrome.storage.local.set({
          'loglens.settings.v1': {
            autoSendEnabled: true,
            autoSendConsent: true,
            autoSendEndpoint: endpoint,
            autoSendIntervalMinutes: 0,
            autoSendLevel: 'error',
            autoSendRetries: 0,
            autoSendTimeoutMs: 5000,
            autoSendHeaders: '{}',
          },
        });
      },
      { endpoint: `http://127.0.0.1:${port}/ingest` },
    );

    const page = await openPage(h, 'popup.html');
    await page.evaluate(async () => {
      await chrome.runtime.sendMessage({
        type: 'LOG_LENS/ADD',
        entry: { level: 'error', source: 'e2e', message: 'auto-send me' },
      });
    });

    await expect
      .poll(() => received.payload, { timeout: 10_000 })
      .not.toBeNull();
    expect(received.payload?.entries?.[0]?.message).toBe('auto-send me');
  } finally {
    await h.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('renders the log panel to a PNG through dom-to-image', async () => {
  const h = await launch();
  try {
    await seed(h, sampleEntries());
    const page = await openPage(h, 'logs.html');
    await expect(page.locator('.log-card').first()).toBeVisible();

    await page.evaluate(() => {
      const target = window as unknown as {
        __logLensDownload?: { filename: string; url: string };
      };
      target.__logLensDownload = undefined;
      chrome.downloads.download = async (options) => {
        target.__logLensDownload = {
          filename: options.filename ?? '',
          url: options.url,
        };
        return 99;
      };
    });

    await page.click('[data-action="screenshot"]');
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal .btn.primary').click();
    await expect(page.locator('.toast').last()).toContainText('Screenshot saved');

    const download = await page.evaluate(() => {
      return (window as unknown as { __logLensDownload?: { filename: string; url: string } })
        .__logLensDownload;
    });
    expect(download?.filename).toMatch(/^log-lens-panel-.*\.png$/);
    expect(download?.url.startsWith('data:image/png;base64,')).toBe(true);
  } finally {
    await h.close();
  }
});

test('exports a complete log report through chrome.downloads', async () => {
  const h = await launch();
  try {
    await seed(h, sampleEntries());
    const page = await openPage(h, 'popup.html');
    const result = (await page.evaluate(async () => {
      return chrome.runtime.sendMessage({ type: 'LOG_LENS/EXPORT', saveAs: false });
    })) as { downloadId?: number; filename?: string };

    expect(result.filename).toMatch(/^log-lens-errors-.*\.log$/);
    expect(result.downloadId).toBeDefined();

    await expect
      .poll(
        async () =>
          h.serviceWorker.evaluate(async (downloadId) => {
            const [item] = await chrome.downloads.search({ id: downloadId });
            return item?.state ?? 'missing';
          }, result.downloadId as number),
        { timeout: 10_000 },
      )
      .toBe('complete');
  } finally {
    await h.close();
  }
});
