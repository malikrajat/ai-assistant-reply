import { describe, expect, it, vi } from 'vitest';
import { LogStore } from '../src/background/log-store';
import { MessageRouter, type RouterDeps } from '../src/background/message-router';
import { STORAGE_KEYS, type LogLensState } from '../src/shared/types';
import { MemoryStorage, settings } from './helpers';

const allowedId = 'abcdefghijklmnopabcdefghijklmnop';
const sender: chrome.runtime.MessageSender = { id: allowedId };

function harness() {
  const storage = new MemoryStorage();
  const store = new LogStore({
    storage,
    getSettings: () => settings({ allowedExternalIds: [allowedId] }),
    now: () => Date.parse('2026-11-07T12:00:00.000Z'),
    idFactory: () => `id-${Math.random().toString(36).slice(2, 8)}`,
  });
  const state: LogLensState = {
    entries: [],
    settings: settings({ allowedExternalIds: [allowedId] }),
    status: {
      entryCount: 0,
      errorCount: 0,
      failureCount: 0,
      warningCount: 0,
      lastErrorAt: null,
      outboxCount: 0,
      capturePaused: false,
      autoSendEnabled: false,
      autoSendConsent: false,
    },
    extensionId: 'test-extension-id',
    version: '1.1.0',
  };
  const deps: RouterDeps = {
    store,
    getSettings: async () => settings({ allowedExternalIds: [allowedId] }),
    getState: vi.fn(async () => state),
    clearLogs: vi.fn(async () => store.clear()),
    saveSettings: vi.fn(async () => settings({ allowedExternalIds: [allowedId] })),
    refreshConfig: vi.fn(async () => undefined),
    exportLogs: vi.fn(async () => ({ downloadId: 1, filename: 'logs.log' })),
    capturePage: vi.fn(async () => ({ downloadId: 2, filename: 'page.png' })),
    openLogs: vi.fn(async () => ({ opened: 'tab' as const, tabId: 3 })),
    previewSend: vi.fn(async () => ({
      payload: { extension: 'log-lens-chrome', version: '1.1.0', sentAt: '', entries: [] },
      json: '{}',
      endpoint: 'https://example.com',
      method: 'POST' as const,
    })),
    sendTest: vi.fn(async () => ({ sent: true, queued: 0 })),
    retryOutbox: vi.fn(async () => ({ sent: false, queued: 0 })),
    getEnvironment: vi.fn(async () => ({
      version: '1.1.0',
      chromeVersion: '141',
      platform: 'Win32',
      userAgent: 'agent',
      generatedAt: '2026-11-07T12:00:00.000Z',
    })),
    version: '1.1.0',
    extensionId: 'test-extension-id',
    now: () => Date.parse('2026-11-07T12:00:00.000Z'),
  };
  return { router: new MessageRouter(deps), deps, storage };
}

describe('MessageRouter', () => {
  it('returns state for internal GET_STATE', async () => {
    const { router } = harness();
    const result = await router.handleInternal({ type: 'LOG_LENS/GET_STATE' });
    expect(result).toMatchObject({ extensionId: 'test-extension-id', version: '1.1.0' });
  });

  it('saves settings and refreshes configuration', async () => {
    const { router, deps } = harness();
    const result = await router.handleInternal({
      type: 'LOG_LENS/SAVE_SETTINGS',
      settings: { autoOpen: 'always' },
    });
    expect(result).toEqual({ ok: true });
    expect(deps.saveSettings).toHaveBeenCalledWith({ autoOpen: 'always' });
    expect(deps.refreshConfig).toHaveBeenCalled();
  });

  it('rejects unknown internal messages', async () => {
    const { router } = harness();
    const result = await router.handleInternal({ type: 'OTHER/THING' });
    expect(result).toMatchObject({ ok: false });
  });

  it('accepts an approved external entry and rejects an unapproved one', async () => {
    const { router, storage } = harness();
    const accepted = await router.handleExternal(
      { type: 'LOG_LENS/ADD', entry: { level: 'failure', message: 'from friend' } },
      sender,
    );
    expect(accepted.ok).toBe(true);
    expect(await storage.get(STORAGE_KEYS.entries)).toBeTruthy();

    const rejected = await router.handleExternal(
      { type: 'LOG_LENS/ADD', entry: { message: 'nope' } },
      { id: 'other-extension' },
    );
    expect(rejected.ok).toBe(false);
  });

  it('answers external PING with version information', async () => {
    const { router } = harness();
    const result = await router.handleExternal({ type: 'LOG_LENS/PING' }, { id: 'other' });
    expect(result).toEqual({
      ok: true,
      version: '1.1.0',
      extensionId: 'test-extension-id',
    });
  });

  it('rate-limits external senders', async () => {
    const { router } = harness();
    let last: { ok: boolean; error?: string } | null = null;
    for (let index = 0; index < 31; index += 1) {
      last = (await router.handleExternal(
        { type: 'LOG_LENS/ADD', entry: { message: `entry-${index}` } },
        sender,
      )) as { ok: boolean; error?: string };
    }
    expect(last?.ok).toBe(false);
    expect(last?.error).toMatch(/rate limit/i);
  });
});
