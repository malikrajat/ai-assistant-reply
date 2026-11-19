import {
  isRuntimeMessage,
  messageError,
  validateExternalMessage,
} from '../shared/messaging';
import type {
  AddLogInput,
  DownloadResult,
  EnvironmentInfo,
  ExternalResponse,
  LogLensSettings,
  LogLensState,
  OpenLogsResult,
  PreviewResult,
  RuntimeMessage,
  RuntimeResponse,
  ScreenshotFormat,
  SendResult,
} from '../shared/types';
import type { LogStore } from './log-store';

export interface RouterDeps {
  store: LogStore;
  getSettings: () => Promise<LogLensSettings>;
  getState: () => Promise<LogLensState>;
  clearLogs: () => Promise<number>;
  saveSettings: (partial: Partial<LogLensSettings>) => Promise<LogLensSettings>;
  refreshConfig: (settings: LogLensSettings) => Promise<void>;
  exportLogs: (saveAs: boolean) => Promise<DownloadResult>;
  capturePage: (
    format: ScreenshotFormat,
    saveAs: boolean,
    tabId?: number,
  ) => Promise<DownloadResult>;
  openLogs: (prefer: 'side-panel' | 'tab') => Promise<OpenLogsResult>;
  previewSend: () => Promise<PreviewResult>;
  sendTest: () => Promise<SendResult>;
  retryOutbox: () => Promise<SendResult>;
  getEnvironment: () => Promise<EnvironmentInfo>;
  version: string;
  extensionId: string;
  now?: () => number;
}

interface RateBucket {
  startedAt: number;
  count: number;
}

const EXTERNAL_RATE_LIMIT = 30;
const EXTERNAL_RATE_WINDOW = 60_000;

export class MessageRouter {
  private readonly now: () => number;
  private readonly externalBuckets = new Map<string, RateBucket>();

  constructor(private readonly deps: RouterDeps) {
    this.now = deps.now ?? (() => Date.now());
  }

  async handleInternal(raw: unknown): Promise<RuntimeResponse> {
    if (!isRuntimeMessage(raw)) {
      return { ok: false, error: 'Unsupported message.' } as RuntimeResponse;
    }
    const message = raw as RuntimeMessage;
    try {
      switch (message.type) {
        case 'LOG_LENS/GET_STATE':
          return await this.deps.getState();
        case 'LOG_LENS/ADD': {
          const result = await this.deps.store.add(message.entry);
          if (result.filtered) {
            return { ok: false, error: 'Entry was filtered by the current capture level.' };
          }
          return {
            ok: true,
            entry: result.entry ?? undefined,
            duplicates: result.duplicate ? 1 : 0,
          };
        }
        case 'LOG_LENS/CLEAR': {
          const removed = await this.deps.clearLogs();
          return { ok: true, removed };
        }
        case 'LOG_LENS/EXPORT':
          return await this.deps.exportLogs(message.saveAs ?? true);
        case 'LOG_LENS/CAPTURE_PAGE': {
          const settings = await this.deps.getSettings();
          return await this.deps.capturePage(
            message.format ?? settings.screenshotFormat,
            message.saveAs ?? true,
            message.tabId,
          );
        }
        case 'LOG_LENS/OPEN_LOGS':
          return await this.deps.openLogs(message.prefer ?? 'side-panel');
        case 'LOG_LENS/SAVE_SETTINGS': {
          const settings = await this.deps.saveSettings(message.settings ?? {});
          await this.deps.refreshConfig(settings);
          return { ok: true };
        }
        case 'LOG_LENS/PREVIEW_SEND':
          return await this.deps.previewSend();
        case 'LOG_LENS/SEND_TEST':
          return await this.deps.sendTest();
        case 'LOG_LENS/RETRY_OUTBOX':
          return await this.deps.retryOutbox();
        case 'LOG_LENS/REFRESH_CONFIG': {
          const settings = await this.deps.getSettings();
          await this.deps.refreshConfig(settings);
          return { ok: true };
        }
        case 'LOG_LENS/GET_ENVIRONMENT':
          return await this.deps.getEnvironment();
        case 'LOG_LENS/PING':
          return {
            ok: true,
            version: this.deps.version,
            extensionId: this.deps.extensionId,
          };
        default:
          return { ok: false, error: 'Unsupported message.' } as RuntimeResponse;
      }
    } catch (error) {
      return { ok: false, error: messageError(error) } as RuntimeResponse;
    }
  }

  async handleExternal(raw: unknown, sender: chrome.runtime.MessageSender): Promise<ExternalResponse> {
    const settings = await this.deps.getSettings();
    const validation = validateExternalMessage(raw, sender, settings);
    if (!validation.ok || !validation.message) {
      return { ok: false, error: validation.error ?? 'Invalid external message.' };
    }
    if (validation.message.type === 'LOG_LENS/PING') {
      return {
        ok: true,
        version: this.deps.version,
        extensionId: this.deps.extensionId,
      };
    }
    if (!validation.authorized) {
      return {
        ok: false,
        error:
          'Sender is not approved. Add this extension ID or origin in Log Lens options > Public API.',
      };
    }

    const key = sender.id || sender.origin || 'unknown';
    if (this.isRateLimited(key)) {
      return { ok: false, error: 'Rate limit exceeded. Try again in a minute.' };
    }

    try {
      const entry: AddLogInput = validation.message.entry;
      const result = await this.deps.store.add(entry);
      if (result.filtered) {
        return { ok: false, error: 'Entry was filtered by the current capture level.' };
      }
      return { ok: true, id: result.entry?.id };
    } catch (error) {
      return { ok: false, error: messageError(error) };
    }
  }

  private isRateLimited(key: string): boolean {
    const timestamp = this.now();
    const bucket = this.externalBuckets.get(key);
    if (!bucket || timestamp - bucket.startedAt > EXTERNAL_RATE_WINDOW) {
      this.externalBuckets.set(key, { startedAt: timestamp, count: 1 });
      return false;
    }
    if (bucket.count >= EXTERNAL_RATE_LIMIT) return true;
    bucket.count += 1;
    return false;
  }
}
