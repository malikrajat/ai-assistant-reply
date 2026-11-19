import '../ui/theme.css';
import '../ui/viewer.css';
import './popup.css';
import { STORAGE_KEYS, type LogEntry, type LogLensState } from '../shared/types';
import {
  clearLogs,
  copyAll,
  exportLogs,
  fetchState,
  openOptions,
  sendRuntime,
  showEmailPreview,
  showScreenshotMenu,
} from '../ui/actions';
import { $, create, levelLabel, relativeTime, toast, truncateText } from '../ui/dom';

class PopupController {
  private state: LogLensState | null = null;

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
        void this.refresh();
      }
    });
  }

  private async refresh(): Promise<void> {
    try {
      this.state = await fetchState();
      this.render();
    } catch (error) {
      $('#popup-status-text').textContent = 'Log Lens unavailable';
      toast(error instanceof Error ? error.message : 'Could not load Log Lens.', 'error');
    }
  }

  private render(): void {
    const state = this.state;
    if (!state) return;
    const { status, settings } = state;
    $('#popup-count').textContent = String(status.entryCount);
    $('#popup-errors').textContent = String(status.errorCount + status.failureCount);
    $('#popup-last').textContent = status.lastErrorAt
      ? relativeTime(status.lastErrorAt)
      : '—';
    $('#popup-last').title = status.lastErrorAt ?? '';

    const statusText = $('#popup-status-text');
    if (settings.errorOnly) {
      statusText.innerHTML = '<i></i> Capturing errors';
    } else {
      statusText.textContent = `Capturing ${settings.captureLevel}+`;
    }

    const autoSend = $('#popup-autosend');
    autoSend.className = `badge ${settings.autoSendEnabled ? 'failure' : 'info'}`;
    autoSend.textContent = settings.autoSendEnabled
      ? `Auto-send ${settings.autoSendIntervalMinutes === 0 ? 'live' : `${settings.autoSendIntervalMinutes}m`}`
      : 'Auto-send off';

    $('#popup-version').textContent = `v${state.version}`;
    this.renderRecent(state.entries.slice(0, 3));
  }

  private renderRecent(entries: LogEntry[]): void {
    const list = $('#popup-list');
    list.textContent = '';
    if (entries.length === 0) {
      list.appendChild(
        create(
          'div',
          'mini-empty',
          'No errors captured yet. Leave Log Lens installed and errors will appear here automatically.',
        ),
      );
      return;
    }
    for (const entry of entries) {
      const button = create('button', 'mini-entry');
      button.type = 'button';
      button.title = entry.message;
      button.appendChild(create('span', `badge ${entry.level}`, levelLabel(entry.level)));
      const copy = create('span', 'mini-copy');
      copy.appendChild(create('span', 'mini-message', truncateText(entry.message, 76)));
      copy.appendChild(create('span', 'mini-meta', entry.source));
      button.appendChild(copy);
      const time = create('span', 'mini-time', relativeTime(entry.timestamp));
      button.appendChild(time);
      button.addEventListener('click', () => {
        void sendRuntime({ type: 'LOG_LENS/OPEN_LOGS' }).catch(() => undefined);
        window.close();
      });
      list.appendChild(button);
    }
  }

  private bind(): void {
    document.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'open') {
        void sendRuntime({ type: 'LOG_LENS/OPEN_LOGS' }).catch(() => undefined);
        window.close();
      } else if (action === 'settings') {
        openOptions();
        window.close();
      } else if (action === 'email' && this.state) {
        void showEmailPreview(this.state);
      } else if (action === 'export') {
        void exportLogs();
      } else if (action === 'screenshot' && this.state) {
        void showScreenshotMenu(
          this.state,
          document.querySelector<HTMLElement>('.popup-recent'),
        );
      } else if (action === 'copy' && this.state) {
        void copyAll(this.state);
      } else if (action === 'clear') {
        void clearLogs().then(() => this.refresh());
      }
    });
  }
}

const popup = new PopupController();
void popup.init();
