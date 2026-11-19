import type { LogLevel, LogLensSettings, OpenLogsResult } from '../shared/types';

export interface AutoOpenDeps {
  getSettings: () => Promise<LogLensSettings>;
  sidePanelOpen: (options: chrome.sidePanel.OpenOptions) => Promise<void>;
  queryActiveTab: () => Promise<{ id?: number; windowId?: number } | null>;
  createTab: (url: string) => Promise<{ id?: number }>;
  getTab: (tabId: number) => Promise<{ id?: number; windowId?: number }>;
  updateTab: (tabId: number, properties: chrome.tabs.UpdateProperties) => Promise<unknown>;
  focusWindow: (windowId: number) => Promise<unknown>;
  getLogTabId: () => Promise<number | null>;
  setLogTabId: (tabId: number | null) => Promise<void>;
  now?: () => number;
  cooldownMs?: number;
}

export function shouldAutoOpen(level: LogLevel, settings: LogLensSettings): boolean {
  if (settings.autoOpen === 'never') return false;
  if (settings.autoOpen === 'always') return true;
  return level === 'error' || level === 'failure';
}

/**
 * Opens the log UI with a side-panel-first fallback chain. Chrome requires a user
 * gesture for sidePanel.open(), so a tab fallback is mandatory for background
 * captures. A short cooldown keeps a burst of errors from opening many tabs.
 */
export class AutoOpenService {
  private lastAutoOpenAt = Number.NEGATIVE_INFINITY;
  private opening: Promise<OpenLogsResult> | null = null;
  private readonly now: () => number;
  private readonly cooldownMs: number;

  constructor(private readonly deps: AutoOpenDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.cooldownMs = deps.cooldownMs ?? 5_000;
  }

  async maybeOpen(level: LogLevel): Promise<OpenLogsResult | null> {
    const settings = await this.deps.getSettings();
    if (!shouldAutoOpen(level, settings)) return null;
    const now = this.now();
    if (now - this.lastAutoOpenAt < this.cooldownMs) return null;
    this.lastAutoOpenAt = now;
    return this.openLogs('side-panel');
  }

  async openLogs(prefer: 'side-panel' | 'tab' = 'side-panel'): Promise<OpenLogsResult> {
    if (this.opening) return this.opening;
    this.opening = this.openLogsInternal(prefer).finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async openLogsInternal(prefer: 'side-panel' | 'tab'): Promise<OpenLogsResult> {
    if (prefer === 'side-panel') {
      try {
        const activeTab = await this.deps.queryActiveTab();
        if (activeTab?.id !== undefined) {
          await this.deps.sidePanelOpen({ tabId: activeTab.id });
          return { opened: 'side-panel', tabId: activeTab.id };
        }
        if (activeTab?.windowId !== undefined) {
          await this.deps.sidePanelOpen({ windowId: activeTab.windowId });
          return { opened: 'side-panel' };
        }
      } catch {
        // Side panel requires a user gesture in most contexts. Fall through.
      }
    }
    return this.openTab();
  }

  private async openTab(): Promise<OpenLogsResult> {
    const url = chrome.runtime.getURL('logs.html');
    const existingId = await this.deps.getLogTabId();
    if (existingId !== null) {
      try {
        const existingTab = await this.deps.getTab(existingId);
        await this.deps.updateTab(existingId, { active: true });
        if (existingTab.windowId !== undefined) {
          await this.deps.focusWindow(existingTab.windowId);
        }
        return { opened: 'tab', tabId: existingId };
      } catch {
        await this.deps.setLogTabId(null);
      }
    }
    const tab = await this.deps.createTab(url);
    if (tab.id !== undefined) {
      await this.deps.setLogTabId(tab.id);
      return { opened: 'tab', tabId: tab.id };
    }
    return { opened: 'tab' };
  }
}
