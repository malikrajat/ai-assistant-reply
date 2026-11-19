import { describe, expect, it, vi } from 'vitest';
import { AutoOpenService, shouldAutoOpen } from '../src/background/auto-open';
import { settings } from './helpers';

function harness(options: { sidePanelFails?: boolean; existingTab?: number | null } = {}) {
  let now = 1_000_000;
  let logTabId = options.existingTab ?? null;
  const sidePanelOpen = options.sidePanelFails
    ? vi.fn(async () => {
        throw new Error('user gesture required');
      })
    : vi.fn(async () => undefined);
  const createTab = vi.fn(async () => ({ id: 55 }));
  const updateTab = vi.fn(async () => ({}));
  const getTab = vi.fn(async () => ({ id: 77 }));
  const focusWindow = vi.fn(async () => ({}));
  const setLogTabId = vi.fn(async (tabId: number | null) => {
    logTabId = tabId;
  });
  const service = new AutoOpenService({
    getSettings: async () => settings({ autoOpen: 'on-error' }),
    sidePanelOpen,
    queryActiveTab: async () => ({ id: 1, windowId: 2 }),
    createTab,
    getTab,
    updateTab,
    focusWindow,
    getLogTabId: async () => logTabId,
    setLogTabId,
    now: () => now,
    cooldownMs: 5_000,
  });
  return {
    service,
    sidePanelOpen,
    createTab,
    updateTab,
    getTab,
    focusWindow,
    setLogTabId,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('AutoOpenService', () => {
  it('opens the side panel first', async () => {
    const h = harness();
    const result = await h.service.openLogs('side-panel');
    expect(result.opened).toBe('side-panel');
    expect(h.sidePanelOpen).toHaveBeenCalledWith({ tabId: 1 });
    expect(h.createTab).not.toHaveBeenCalled();
  });

  it('falls back to a log tab when the side panel requires a gesture', async () => {
    const h = harness({ sidePanelFails: true });
    const result = await h.service.openLogs('side-panel');
    expect(result.opened).toBe('tab');
    expect(result.tabId).toBe(55);
    expect(h.createTab).toHaveBeenCalledWith('chrome-extension://test-extension-id/logs.html');
    expect(h.setLogTabId).toHaveBeenCalledWith(55);
  });

  it('focuses an existing log tab instead of creating a new one', async () => {
    const h = harness({ sidePanelFails: true, existingTab: 77 });
    const result = await h.service.openLogs('side-panel');
    expect(result.tabId).toBe(77);
    expect(h.getTab).toHaveBeenCalledWith(77);
    expect(h.updateTab).toHaveBeenCalledWith(77, { active: true });
    expect(h.createTab).not.toHaveBeenCalled();
  });

  it('skips the side panel when the tab preference is explicit', async () => {
    const h = harness();
    const result = await h.service.openLogs('tab');
    expect(result.opened).toBe('tab');
    expect(h.sidePanelOpen).not.toHaveBeenCalled();
  });

  it('coalesces a burst of auto-opens with a cooldown', async () => {
    const h = harness();
    expect(await h.service.maybeOpen('error')).not.toBeNull();
    expect(await h.service.maybeOpen('error')).toBeNull();
    h.advance(6_000);
    expect(await h.service.maybeOpen('error')).not.toBeNull();
  });
});

describe('shouldAutoOpen', () => {
  it('honors never, on-error, and always', () => {
    expect(shouldAutoOpen('error', settings({ autoOpen: 'never' }))).toBe(false);
    expect(shouldAutoOpen('error', settings({ autoOpen: 'on-error' }))).toBe(true);
    expect(shouldAutoOpen('warn', settings({ autoOpen: 'on-error' }))).toBe(false);
    expect(shouldAutoOpen('info', settings({ autoOpen: 'always' }))).toBe(true);
  });
});
