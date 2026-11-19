import { filterEntries, latestTimestamp, listSources } from '../shared/filters';
import {
  STORAGE_KEYS,
  type FilterState,
  type LogLensState,
  type LogLevel,
  type TimeRange,
} from '../shared/types';
import {
  capturePanel,
  captureVisiblePage,
  clearLogs,
  copyAll,
  exportLogs,
  fetchState,
  filterSummary,
  openOptions,
  showEmailPreview,
  showScreenshotMenu,
} from './actions';
import { $, formatDateTime, relativeTime, toast } from './dom';
import { LogList } from './log-list';
import { VIEWER_TEMPLATE } from './viewer-template';

export class LogViewer {
  private state: LogLensState | null = null;
  private readonly list: LogList;
  private readonly search: HTMLInputElement;
  private readonly level: HTMLSelectElement;
  private readonly source: HTMLSelectElement;
  private readonly time: HTMLSelectElement;
  private readonly count: HTMLElement;
  private readonly latest: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly autoSendBadge: HTMLElement;
  private readonly captureBadge: HTMLElement;
  private readonly version: HTMLElement;
  private refreshTimer: number | null = null;
  private filters: FilterState = {
    search: '',
    level: 'all',
    source: '',
    timeRange: 'all',
  };

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = VIEWER_TEMPLATE;
    this.list = new LogList($('#log-list', root));
    this.search = $('#filter-search', root);
    this.level = $('#filter-level', root);
    this.source = $('#filter-source', root);
    this.time = $('#filter-time', root);
    this.count = $('#viewer-count', root);
    this.latest = $('#viewer-latest', root);
    this.subtitle = $('#viewer-subtitle', root);
    this.autoSendBadge = $('#viewer-autosend', root);
    this.captureBadge = $('#viewer-capture', root);
    this.version = $('#viewer-version', root);
  }

  async init(): Promise<void> {
    this.bind();
    await this.refresh();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (
        changes[STORAGE_KEYS.entries] ||
        changes[STORAGE_KEYS.settings] ||
        changes[STORAGE_KEYS.outbox]
      ) {
        this.scheduleRefresh();
      }
    });
    const query = new URLSearchParams(location.search);
    const capture = query.get('capture');
    const tabIdValue = Number(query.get('tabId'));
    const tabId = Number.isInteger(tabIdValue) && tabIdValue >= 0 ? tabIdValue : undefined;
    if (capture) {
      history.replaceState({}, '', location.pathname);
      window.setTimeout(() => {
        if (capture === 'page') void captureVisiblePage(this.currentFormat(), tabId);
        if (capture === 'panel') void this.capturePanelNow();
      }, 250);
    }
  }

  private currentFormat(): 'png' | 'jpeg' {
    return this.state?.settings.screenshotFormat ?? 'png';
  }

  private async capturePanelNow(): Promise<void> {
    const panel = this.root.querySelector<HTMLElement>('.viewer');
    if (panel) await capturePanel(panel, this.currentFormat());
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 120);
  }

  async refresh(): Promise<void> {
    try {
      this.state = await fetchState();
      this.updateChrome();
      this.renderList();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load logs.', 'error');
    }
  }

  private updateChrome(): void {
    const state = this.state;
    if (!state) return;
    const { status, settings } = state;
    this.subtitle.textContent =
      status.entryCount === 0
        ? 'Waiting for the first error…'
        : `${status.entryCount} stored · latest ${this.latestLabel()}`;
    this.count.textContent = `${status.entryCount} ${status.entryCount === 1 ? 'entry' : 'entries'}`;
    this.latest.textContent = status.lastErrorAt
      ? `Last error ${relativeTime(status.lastErrorAt)}`
      : 'No errors captured yet';
    this.latest.title = status.lastErrorAt ? formatDateTime(status.lastErrorAt) : '';
    this.autoSendBadge.className = `badge ${settings.autoSendEnabled ? 'failure' : 'info'}`;
    this.autoSendBadge.textContent = settings.autoSendEnabled ? 'Auto-send on' : 'Auto-send off';
    const capturePieces: string[] = [];
    if (settings.capturePageErrors) capturePieces.push('page');
    if (settings.captureConsoleErrors) capturePieces.push('console');
    if (settings.captureNetworkFailures) capturePieces.push('network');
    this.captureBadge.textContent = capturePieces.length
      ? `+ ${capturePieces.join(' + ')}`
      : settings.errorOnly
        ? 'Errors only'
        : `Level: ${settings.captureLevel}`;
    this.version.textContent = `v${state.version}`;
    this.updateSourceOptions();
  }

  private latestLabel(): string {
    const latest = this.state ? latestTimestamp(this.state.entries) : null;
    return latest ? relativeTime(latest) : 'none';
  }

  private updateSourceOptions(): void {
    if (!this.state) return;
    const sources = listSources(this.state.entries);
    if (this.filters.source && !sources.includes(this.filters.source)) {
      this.filters.source = '';
    }
    const current = this.filters.source;
    this.source.textContent = '';
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All sources';
    this.source.appendChild(all);
    for (const source of sources) {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      this.source.appendChild(option);
    }
    this.source.value = current;
  }

  private renderList(): void {
    if (!this.state) return;
    const visible = filterEntries(this.state.entries, this.filters);
    const total = this.state.entries.length;
    const emptyMessage =
      total === 0
        ? 'No logs yet. Only errors and failures are recorded by default.'
        : 'No entries match the current search and filters.';
    this.list.render(visible, emptyMessage);
    this.count.textContent = filterSummary(this.filters, total, visible.length);
  }

  private bind(): void {
    this.search.addEventListener('input', () => {
      this.filters.search = this.search.value;
      this.renderList();
    });
    this.level.addEventListener('change', () => {
      this.filters.level = this.level.value as LogLevel | 'all';
      this.renderList();
    });
    this.source.addEventListener('change', () => {
      this.filters.source = this.source.value;
      this.renderList();
    });
    this.time.addEventListener('change', () => {
      this.filters.timeRange = this.time.value as TimeRange;
      this.renderList();
    });

    this.root.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'reset-filters') {
        this.filters = { search: '', level: 'all', source: '', timeRange: 'all' };
        this.search.value = '';
        this.level.value = 'all';
        this.source.value = '';
        this.time.value = 'all';
        this.renderList();
      } else if (action === 'refresh') {
        void this.refresh();
      } else if (action === 'settings') {
        openOptions();
      } else if (action === 'email' && this.state) {
        void showEmailPreview(this.state);
      } else if (action === 'export') {
        void exportLogs();
      } else if (action === 'screenshot' && this.state) {
        void showScreenshotMenu(this.state, this.root.querySelector<HTMLElement>('.viewer'));
      } else if (action === 'copy' && this.state) {
        void copyAll(this.state);
      } else if (action === 'clear') {
        void clearLogs().then(() => this.refresh());
      }
    });
  }
}
