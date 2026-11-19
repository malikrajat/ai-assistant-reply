/* global chrome */
// Generate the documentation screenshots from the real built extension.
// Requires `npm run build` first and Playwright Chromium.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const output = join(root, 'docs', 'images');
mkdirSync(output, { recursive: true });

const now = Date.now();
const iso = (offsetMinutes) => new Date(now - offsetMinutes * 60_000).toISOString();

const entries = [
  {
    id: 'doc-1',
    timestamp: iso(2),
    level: 'error',
    source: 'page',
    message: 'TypeError: Cannot read properties of undefined (reading "profile")',
    details: 'at renderProfile (https://app.example.com/assets/app.js:412:19)',
    stack:
      'TypeError: Cannot read properties of undefined (reading "profile")\n    at renderProfile (app.js:412:19)\n    at mountDashboard (app.js:288:7)',
    url: 'https://app.example.com/dashboard',
    tabId: 1,
    tabTitle: 'Acme Dashboard',
    metadata: { kind: 'error', line: 412, column: 19 },
  },
  {
    id: 'doc-2',
    timestamp: iso(9),
    level: 'failure',
    source: 'network',
    message: 'HTTP 503 Service Unavailable',
    details: 'method=GET type=xmlhttprequest status=503',
    url: 'https://api.example.com/v1/projects',
    tabId: 1,
    tabTitle: 'Acme Dashboard',
    metadata: { method: 'GET', type: 'xmlhttprequest', statusCode: 503 },
  },
  {
    id: 'doc-3',
    timestamp: iso(16),
    level: 'failure',
    source: 'network',
    message: 'Network request failed: net::ERR_CONNECTION_RESET',
    details: 'method=POST type=fetch error=net::ERR_CONNECTION_RESET',
    url: 'https://api.example.com/v1/telemetry',
    tabId: 2,
    tabTitle: 'Settings',
    metadata: { method: 'POST', type: 'fetch' },
  },
  {
    id: 'doc-4',
    timestamp: iso(24),
    level: 'error',
    source: 'extension',
    message: 'Unhandled promise rejection: Could not refresh workspace token',
    stack:
      'Error: Could not refresh workspace token\n    at refreshToken (background.js:91:11)\n    at async onAlarm (background.js:140:3)',
    metadata: { kind: 'unhandledrejection' },
  },
  {
    id: 'doc-5',
    timestamp: iso(38),
    level: 'warn',
    source: 'console.error',
    message: 'Deprecated analytics.identify() signature',
    details: 'The second argument will be required in v3.',
    url: 'https://app.example.com/settings',
    tabId: 2,
    tabTitle: 'Settings',
  },
  {
    id: 'doc-6',
    timestamp: iso(74),
    level: 'error',
    source: 'external',
    message: 'Coverage failed for src/utils/report.ts',
    details: 'The external API added this entry. Authorization: Bearer [REDACTED]',
    metadata: { extension: 'coverage-pilot', report: 'coverage-final.json' },
  },
];

const settings = {
  captureLevel: 'error',
  errorOnly: true,
  capturePageErrors: true,
  captureConsoleErrors: false,
  captureNetworkFailures: true,
  autoOpen: 'on-error',
  autoSendEnabled: true,
  autoSendConsent: true,
  autoSendEndpoint: 'https://logs.example.com/ingest',
  autoSendMethod: 'POST',
  autoSendHeaders: '{\n  "Authorization": "Bearer [REDACTED]"\n}',
  autoSendIntervalMinutes: 5,
  autoSendLevel: 'error',
  autoSendRetries: 3,
  autoSendTimeoutMs: 10000,
  supportEmail: 'support@example.com',
  maxEntries: 200,
  retentionDays: 7,
  redactSecrets: true,
  statusBadge: true,
  notificationsEnabled: true,
  screenshotFormat: 'png',
  includeEnvironment: true,
  includeFullUrls: false,
  allowedExternalIds: ['abcdefghijklmnopabcdefghijklmnop'],
  allowedOrigins: ['https://app.example.com'],
};

function installationMarkup() {
  return `<!doctype html>
  <html><head><meta charset="utf-8"><style>
    :root{--bg:#f4f6fb;--card:#fff;--text:#0f172a;--muted:#64748b;--line:#d8e0ec;--accent:#4f46e5;}
    *{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:linear-gradient(135deg,#eef2ff,#e0f2fe);color:var(--text);min-height:100vh;display:grid;place-items:center;padding:48px}
    .window{width:1100px;max-width:100%;background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:0 30px 80px rgba(15,23,42,.18);overflow:hidden}
    .chrome-bar{display:flex;align-items:center;gap:8px;padding:14px 18px;background:#f8fafc;border-bottom:1px solid var(--line)}
    .dot{width:11px;height:11px;border-radius:50%}.dot:nth-child(1){background:#f87171}.dot:nth-child(2){background:#fbbf24}.dot:nth-child(3){background:#34d399}
    .url{margin-left:14px;flex:1;background:#fff;border:1px solid var(--line);border-radius:999px;padding:7px 14px;color:var(--muted);font-size:13px}
    .content{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;padding:44px}
    h1{font-size:30px;margin:0 0 10px;letter-spacing:-.03em}
    p{line-height:1.65;color:var(--muted);margin:0 0 18px}
    .step{display:flex;gap:14px;margin:18px 0}.num{width:30px;height:30px;border-radius:50%;background:#e7e7ff;color:var(--accent);display:grid;place-items:center;font-weight:800;flex:0 0 auto}
    .step strong{display:block;margin-bottom:3px}.step small{color:var(--muted);line-height:1.5}
    .card{border:1px solid var(--line);border-radius:16px;padding:24px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.08)}
    .ext{display:flex;gap:14px;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--line)}
    .icon{width:56px;height:56px;border-radius:15px;background:linear-gradient(135deg,#4f46e5,#0ea5e9);display:grid;place-items:center;position:relative}
    .icon:before{content:"";width:22px;height:22px;border:4px solid #fff;border-radius:50%}
    .icon:after{content:"";position:absolute;width:12px;height:4px;background:#fff;border-radius:3px;transform:rotate(45deg);right:10px;bottom:13px}
    .ext h2{font-size:18px;margin:0 0 3px}.ext p{font-size:12px;margin:0}
    .versions{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);padding:14px 0 0}
    .btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;border-radius:9px;padding:10px 16px;font-weight:700;font-size:13px;margin-top:18px}
    .note{font-size:12px;color:var(--muted);margin-top:14px;line-height:1.6}
    .pill{display:inline-block;background:#dcfce7;color:#047857;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:800}
  </style></head><body>
    <div class="window">
      <div class="chrome-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="url">chrome://extensions</div></div>
      <div class="content">
        <div>
          <span class="pill">Developer mode</span>
          <h1>Load Log Lens unpacked</h1>
          <p>Install the production build, pin the action, and the extension starts watching for errors immediately.</p>
          <div class="step"><div class="num">1</div><div><strong>Build the extension</strong><small><code>npm install &amp;&amp; npm run build</code> creates the <code>dist/</code> folder.</small></div></div>
          <div class="step"><div class="num">2</div><div><strong>Open chrome://extensions</strong><small>Turn on <b>Developer mode</b> in the top-right corner.</small></div></div>
          <div class="step"><div class="num">3</div><div><strong>Click Load unpacked</strong><small>Select the generated <code>dist/</code> folder.</small></div></div>
          <div class="step"><div class="num">4</div><div><strong>Open Log Lens</strong><small>Click the toolbar icon, or press <code>Ctrl+Shift+L</code>.</small></div></div>
        </div>
        <div class="card">
          <div class="ext">
            <div class="icon"></div>
            <div><h2>Log Lens - Error Log Capture &amp; Export</h2><p>Capture, review, search, send, screenshot, and export browser error logs.</p></div>
          </div>
          <div class="versions"><span>Version 1.1.0</span><span>Manifest V3</span></div>
          <div class="note">No analytics. No remote code. Auto-send is off until you explicitly opt in.</div>
          <button class="btn">Load unpacked</button>
        </div>
      </div>
    </div>
  </body></html>`;
}

async function seed(sw) {
  await sw.evaluate(
    async ({ settingsValue, entryValues, cursor }) => {
      await chrome.storage.local.set({
        'loglens.settings.v1': settingsValue,
        'loglens.entries.v1': entryValues,
        'loglens.autosend.cursor.v1': cursor,
      });
    },
    { settingsValue: settings, entryValues: entries, cursor: now },
  );
}

function makeToastText(text) {
  return `(() => {
    const stack = document.createElement('div');
    stack.className = 'toast-stack';
    const item = document.createElement('div');
    item.className = 'toast success';
    item.textContent = ${JSON.stringify(text)};
    stack.appendChild(item);
    document.body.appendChild(stack);
  })()`;
}

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'log-lens-docs-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      headless: true,
      channel: 'chromium',
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
      viewport: { width: 1200, height: 900 },
    });
  } catch (error) {
    console.warn('Headless extension launch failed, retrying headed:', error.message);
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
      viewport: { width: 1200, height: 900 },
    });
  }

  try {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 20_000 });
    const extensionId = new URL(sw.url()).host;
    const url = (path) => `chrome-extension://${extensionId}/${path}`;
    await seed(sw);

    const page = await context.newPage();

    // Installation illustration.
    await page.setViewportSize({ width: 1200, height: 820 });
    await page.setContent(installationMarkup());
    await page.screenshot({ path: join(output, 'install.png'), fullPage: true });

    // Popup.
    await page.setViewportSize({ width: 380, height: 620 });
    await page.goto(url('popup.html'));
    await page.waitForSelector('.mini-entry');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(output, 'popup.png'), fullPage: true });

    // Side panel / logs viewer.
    await page.setViewportSize({ width: 540, height: 920 });
    await page.goto(url('sidepanel.html'));
    await page.waitForSelector('.log-card');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(output, 'sidepanel.png'), fullPage: true });

    // Options page.
    await page.setViewportSize({ width: 1200, height: 980 });
    await page.goto(url('options.html'));
    await page.waitForSelector('#save-settings');
    await page.waitForTimeout(400);
    // A fixed save bar belongs in the live page, not in a full-page screenshot.
    await page.addStyleTag({ content: '.sticky-actions{display:none!important}' });
    await page.screenshot({ path: join(output, 'options.png'), fullPage: true });
    await page.locator('.auto-send-section').screenshot({ path: join(output, 'autosend.png') });

    // Email preview and export/screenshot result states in the full viewer.
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto(url('logs.html'));
    await page.waitForSelector('.log-card');
    await page.click('[data-action="email"]');
    await page.waitForSelector('.modal');
    await page.screenshot({ path: join(output, 'email.png'), fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'detached' });

    await page.evaluate(makeToastText('Exported to C:\\Users\\dev\\Downloads\\log-lens-errors-2026-11-07_14-32-10.log'));
    await page.screenshot({ path: join(output, 'export.png'), fullPage: false });

    await page.goto(url('logs.html'));
    await page.waitForSelector('.log-card');
    await page.evaluate(makeToastText('Screenshot saved to C:\\Users\\dev\\Downloads\\log-lens-panel-2026-11-07_14-32-10.png'));
    await page.screenshot({ path: join(output, 'screenshot.png'), fullPage: false });

    // Keep a machine-readable copy of the seeded data for docs updates.
    writeFileSync(join(root, 'docs', 'seed.json'), JSON.stringify({ settings, entries }, null, 2));
    console.log(`Wrote documentation images to ${output}`);
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
