import { AutoOpenService } from './auto-open';
import { AutoSendService } from './auto-send';
import { applyBadge } from './badge';
import { syncPageCaptureScripts } from './content-scripts';
import {
  extensionErrorToInput,
  rejectionToInput,
  type PageErrorDetail,
} from './log-capture';
import { buildStatus, LogStore } from './log-store';
import { MessageRouter } from './message-router';
import { createNetworkCapture } from './network-capture';
import { NotificationService } from './notifications';
import {
  chromeStorageArea,
  loadAutoSendCursor,
  loadLogTabId,
  loadOutbox,
  loadSettings,
  persistSettings,
  saveAutoSendCursor,
  saveLogTabId,
  saveOutbox,
} from './storage';
import { isRuntimeMessage, isTrustedInternalSender, messageError } from '../shared/messaging';
import {
  MAX_EXPORT_BYTES,
  buildExportFilename,
  buildPageScreenshotFilename,
  buildTextReport,
  createEnvironmentInfo,
} from '../shared/report';
import { normalizeSettings, settingsEqual } from '../shared/settings';
import {
  ALARM_AUTO_SEND,
  ALARM_SWEEP,
  STORAGE_KEYS,
  type AddLogInput,
  type DownloadResult,
  type EnvironmentInfo,
  type LogLensSettings,
  type LogLensState,
  type OpenLogsResult,
  type ScreenshotFormat,
  type SendResult,
} from '../shared/types';

const VERSION = chrome.runtime.getManifest().version;
const EXTENSION_ID = chrome.runtime.id;

const store = new LogStore({
  storage: chromeStorageArea,
  getSettings: loadSettings,
});

const autoOpen = new AutoOpenService({
  getSettings: loadSettings,
  sidePanelOpen: (options) => chrome.sidePanel.open(options),
  queryActiveTab: async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return null;
    return { id: tab.id, windowId: tab.windowId };
  },
  createTab: (url) => chrome.tabs.create({ url }),
  getTab: (tabId) => chrome.tabs.get(tabId),
  updateTab: (tabId, properties) => chrome.tabs.update(tabId, properties),
  focusWindow: (windowId) => chrome.windows.update(windowId, { focused: true }),
  getLogTabId: loadLogTabId,
  setLogTabId: saveLogTabId,
});

const notificationService = new NotificationService({
  api: {
    create: (notificationId, options) => chrome.notifications.create(notificationId, options),
  },
  iconUrl: chrome.runtime.getURL('icons/icon128.png'),
});

const autoSend = new AutoSendService({
  getSettings: loadSettings,
  getEntries: () => store.all(),
  loadOutbox,
  saveOutbox,
  loadCursor: loadAutoSendCursor,
  saveCursor: saveAutoSendCursor,
  version: VERSION,
  recordFailure: async (message, details) => {
    await store.add(
      {
        level: 'failure',
        source: 'auto-send',
        message,
        details,
      },
      { force: true },
    );
  },
});

const networkCapture = createNetworkCapture(async (input) => {
  await store.add(input);
});

let errorCaptureDepth = 0;

/** Re-entrancy guard only for error events, so auto-send work cannot drop errors. */
function captureError(task: () => Promise<unknown>): void {
  if (errorCaptureDepth > 0) return;
  errorCaptureDepth += 1;
  void task()
    .catch(() => undefined)
    .finally(() => {
      errorCaptureDepth = Math.max(0, errorCaptureDepth - 1);
    });
}

self.addEventListener('error', (event: Event) => {
  const errorEvent = event as ErrorEvent;
  captureError(() => store.add(extensionErrorToInput(errorEvent)));
});

self.addEventListener('unhandledrejection', (event: Event) => {
  const rejectionEvent = event as PromiseRejectionEvent;
  captureError(() => store.add(rejectionToInput(rejectionEvent.reason)));
});

// Listeners are installed at top level so Chrome can restart the worker for them.
networkCapture.install();

export async function getState(): Promise<LogLensState> {
  const [settings, entries, outbox] = await Promise.all([
    loadSettings(),
    store.all(),
    loadOutbox(),
  ]);
  return {
    entries,
    settings,
    status: buildStatus(entries, settings, outbox.length),
    extensionId: EXTENSION_ID,
    version: VERSION,
  };
}

async function refreshBadge(): Promise<void> {
  const [settings, entries, outbox] = await Promise.all([
    loadSettings(),
    store.all(),
    loadOutbox(),
  ]);
  await applyBadge(buildStatus(entries, settings, outbox.length), settings, {
    setBadgeText: (details) => chrome.action.setBadgeText(details),
    setBadgeBackgroundColor: (details) => chrome.action.setBadgeBackgroundColor(details),
    setTitle: (details) => chrome.action.setTitle(details),
  });
}

function configureAlarms(settings: LogLensSettings): void {
  chrome.alarms.create(ALARM_SWEEP, { periodInMinutes: 60, delayInMinutes: 60 });
  if (settings.autoSendEnabled && settings.autoSendConsent) {
    chrome.alarms.create(ALARM_AUTO_SEND, { periodInMinutes: 1, delayInMinutes: 1 });
  } else {
    void chrome.alarms.clear(ALARM_AUTO_SEND);
  }
}

export async function refreshConfig(settings?: LogLensSettings): Promise<void> {
  const current = settings ?? (await loadSettings());
  configureAlarms(current);
  networkCapture.setEnabled(current.captureNetworkFailures);
  if (current.captureNetworkFailures) networkCapture.install();
  else networkCapture.dispose();
  await syncPageCaptureScripts(current);
  await refreshBadge();
}

async function saveSettings(partial: Partial<LogLensSettings>): Promise<LogLensSettings> {
  const current = await loadSettings();
  const next = normalizeSettings({ ...current, ...partial });
  const wasEnabled = current.autoSendEnabled && current.autoSendConsent;
  const isEnabled = next.autoSendEnabled && next.autoSendConsent;
  if (!wasEnabled && isEnabled) {
    // Do not automatically upload historical entries when the user opts in.
    await saveAutoSendCursor(Date.now());
  }
  if (!settingsEqual(current, next)) await persistSettings(next);
  return next;
}

async function getEnvironment(): Promise<EnvironmentInfo> {
  return createEnvironmentInfo(VERSION, navigator.userAgent, navigator.platform);
}

function dataUrlForText(text: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text.slice(0, MAX_EXPORT_BYTES))}`;
}

async function downloadDataUrl(
  dataUrl: string,
  filename: string,
  saveAs: boolean,
): Promise<DownloadResult> {
  const downloadId = await chrome.downloads.download({ url: dataUrl, filename, saveAs });
  return { downloadId, filename };
}

async function clearLogs(): Promise<number> {
  const removed = await store.clear();
  await saveOutbox([]);
  await saveAutoSendCursor(0);
  return removed;
}

async function exportLogs(saveAs: boolean): Promise<DownloadResult> {
  const [entries, settings] = await Promise.all([store.all(), loadSettings()]);
  const environment = await getEnvironment();
  const report = buildTextReport(entries, settings, environment);
  const filename = buildExportFilename();
  return downloadDataUrl(dataUrlForText(report), filename, saveAs);
}

function captureVisibleTab(
  windowId: number | undefined,
  options: chrome.extensionTypes.ImageDetails,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const callback = (dataUrl: string): void => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(dataUrl);
      }
    };
    try {
      if (windowId !== undefined) {
        chrome.tabs.captureVisibleTab(windowId, options, callback);
      } else {
        chrome.tabs.captureVisibleTab(options, callback);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function capturePage(
  format: ScreenshotFormat,
  saveAs: boolean,
  targetTabId?: number,
): Promise<DownloadResult> {
  let dataUrl: string;
  const [currentTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let targetWindowId = currentTab?.windowId;
  let restoreTabId: number | undefined;
  let restoreWindowId: number | undefined;

  try {
    if (targetTabId !== undefined) {
      const target = await chrome.tabs.get(targetTabId);
      targetWindowId = target.windowId;
      restoreTabId = currentTab?.id;
      restoreWindowId = currentTab?.windowId;
      await chrome.tabs.update(targetTabId, { active: true });
      if (target.windowId !== undefined) {
        await chrome.windows.update(target.windowId, { focused: true });
      }
      // Give Chrome a moment to paint the newly activated tab before capture.
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    dataUrl = await captureVisibleTab(targetWindowId, {
      format: format === 'jpeg' ? 'jpeg' : 'png',
      quality: format === 'jpeg' ? 92 : undefined,
    });
  } catch (error) {
    const message =
      'Chrome blocked the page screenshot. Open Log Lens from the toolbar, then try again, or use the context menu.';
    await store.add(
      {
        level: 'failure',
        source: 'screenshot',
        message,
        details: messageError(error),
      },
      { force: true },
    );
    throw new Error(message);
  } finally {
    if (restoreTabId !== undefined && restoreTabId !== targetTabId) {
      try {
        await chrome.tabs.update(restoreTabId, { active: true });
        if (restoreWindowId !== undefined) {
          await chrome.windows.update(restoreWindowId, { focused: true });
        }
      } catch {
        // The user may have closed the logs tab while the capture was running.
      }
    }
  }
  const filename = buildPageScreenshotFilename(format);
  return downloadDataUrl(dataUrl, filename, saveAs);
}

async function openLogs(prefer: 'side-panel' | 'tab'): Promise<OpenLogsResult> {
  return autoOpen.openLogs(prefer);
}

async function installContextMenus(): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create(
        {
          id: 'loglens-open',
          title: 'Open Log Lens',
          contexts: ['action', 'page'],
        },
        () => {
          chrome.contextMenus.create(
            {
              id: 'loglens-capture-page',
              title: 'Capture Page Screenshot to Log Lens',
              contexts: ['page'],
            },
            () => resolve(),
          );
        },
      );
    });
  });
}

async function openLogsTabWithQuery(query: string): Promise<number | undefined> {
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(`logs.html${query}`),
  });
  if (tab.id !== undefined) await saveLogTabId(tab.id);
  return tab.id;
}

const router = new MessageRouter({
  store,
  getSettings: loadSettings,
  getState,
  clearLogs,
  saveSettings,
  refreshConfig,
  exportLogs,
  capturePage,
  openLogs,
  previewSend: () => autoSend.preview(),
  sendTest: () => autoSend.sendTest(),
  retryOutbox: () => autoSend.retryOutbox(),
  getEnvironment,
  version: VERSION,
  extensionId: EXTENSION_ID,
});

async function safelyRun(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (error) {
    await store.add(
      {
        level: 'failure',
        source: 'extension',
        message: 'Log Lens background task failed',
        details: messageError(error),
      },
      { force: true },
    );
  }
}

store.subscribe((event) => {
  if (event.type === 'add') {
    void refreshBadge().catch(() => undefined);
    if (!event.duplicate) {
      void loadSettings()
        .then((settings) => notificationService.notify(event.entry, settings))
        .catch(() => undefined);
      if (event.entry.source !== 'auto-send') {
        void autoOpen.maybeOpen(event.entry.level).catch(() => undefined);
      }
      void autoSend.onNewEntry(event.entry).catch(() => undefined);
    }
  } else {
    void refreshBadge().catch(() => undefined);
  }
});

let initializePromise: Promise<void> | null = null;

export async function initialize(): Promise<void> {
  if (initializePromise) return initializePromise;
  initializePromise = (async () => {
    const settings = await loadSettings();
    await store.init();
    await refreshConfig(settings);
    await installContextMenus();
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    } catch {
      // Older Chrome versions may not support this method.
    }
  })().catch(async (error) => {
    await store.add(
      {
        level: 'failure',
        source: 'extension',
        message: 'Log Lens failed to initialize',
        details: messageError(error),
      },
      { force: true },
    );
  });
  return initializePromise;
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});

chrome.runtime.onStartup.addListener(() => {
  void initialize();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedInternalSender(sender) || !isRuntimeMessage(message)) return false;
  void router.handleInternal(message).then(
    (response) => sendResponse(response),
    (error) => sendResponse({ ok: false, error: messageError(error) }),
  );
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  void router.handleExternal(message, sender).then(
    (response) => sendResponse(response),
    (error) => sendResponse({ ok: false, error: messageError(error) }),
  );
  return true;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-logs') {
    void openLogs('side-panel').catch(() => undefined);
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'loglens-open') {
    void openLogs('side-panel').catch(() => undefined);
  } else if (info.menuItemId === 'loglens-capture-page') {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const query =
        tab?.id === undefined ? '?capture=page' : `?capture=page&tabId=${tab.id}`;
      await openLogsTabWithQuery(query);
    })().catch(() => undefined);
  }
});

chrome.notifications.onClicked.addListener(() => {
  void openLogs('side-panel').catch(() => undefined);
});

chrome.notifications.onButtonClicked.addListener(() => {
  void openLogs('side-panel').catch(() => undefined);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_AUTO_SEND) {
    void safelyRun(async () => {
      const result = await autoSend.tick();
      if (result.error) await refreshBadge();
    });
  } else if (alarm.name === ALARM_SWEEP) {
    void safelyRun(async () => {
      await store.sweep();
      await refreshBadge();
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const settingsChange = changes[STORAGE_KEYS.settings];
  if (settingsChange) {
    const next = normalizeSettings(settingsChange.newValue);
    void safelyRun(() => refreshConfig(next));
    return;
  }
  if (changes[STORAGE_KEYS.entries]) {
    void refreshBadge();
  }
});

chrome.permissions.onAdded.addListener(() => {
  void safelyRun(async () => {
    const settings = await loadSettings();
    await refreshConfig(settings);
  });
});

chrome.permissions.onRemoved.addListener(() => {
  void safelyRun(async () => {
    const settings = await loadSettings();
    await refreshConfig(settings);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void loadLogTabId().then((logTabId) => {
    if (logTabId === tabId) void saveLogTabId(null);
  });
});

// Entry point when Chrome starts the worker for a message before onStartup runs.
void initialize();

export { autoSend, autoOpen, store, VERSION, EXTENSION_ID };
export type { AddLogInput, SendResult, PageErrorDetail };
