/** Public log levels. Only error/failure are captured by default. */
export type LogLevel = 'error' | 'failure' | 'warn' | 'info' | 'debug';

export const LOG_LEVELS: readonly LogLevel[] = ['error', 'failure', 'warn', 'info', 'debug'];

export const LOG_LEVEL_RANK: Readonly<Record<LogLevel, number>> = {
  error: 0,
  failure: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

/** A single stored log entry. */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
  stack?: string;
  url?: string;
  tabId?: number;
  tabTitle?: string;
  metadata?: Record<string, unknown>;
}

/** Input accepted by the store and the public API. */
export interface AddLogInput {
  level?: LogLevel;
  source?: string;
  message: string;
  details?: string;
  stack?: string;
  url?: string;
  tabId?: number;
  tabTitle?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export type AutoOpenMode = 'never' | 'on-error' | 'always';
export type SendMethod = 'POST' | 'PUT';
export type ScreenshotFormat = 'png' | 'jpeg';
export type TimeRange = 'hour' | 'day' | 'week' | 'all';

export interface LogLensSettings {
  captureLevel: LogLevel;
  errorOnly: boolean;
  capturePageErrors: boolean;
  captureConsoleErrors: boolean;
  captureNetworkFailures: boolean;
  autoOpen: AutoOpenMode;
  autoSendEnabled: boolean;
  autoSendConsent: boolean;
  autoSendEndpoint: string;
  autoSendMethod: SendMethod;
  autoSendHeaders: string;
  autoSendIntervalMinutes: number;
  autoSendLevel: LogLevel;
  autoSendRetries: number;
  autoSendTimeoutMs: number;
  supportEmail: string;
  maxEntries: number;
  retentionDays: number;
  redactSecrets: boolean;
  statusBadge: boolean;
  notificationsEnabled: boolean;
  screenshotFormat: ScreenshotFormat;
  includeEnvironment: boolean;
  includeFullUrls: boolean;
  allowedExternalIds: string[];
  allowedOrigins: string[];
}

export interface LogLensStatus {
  entryCount: number;
  errorCount: number;
  failureCount: number;
  warningCount: number;
  lastErrorAt: string | null;
  outboxCount: number;
  capturePaused: false;
  autoSendEnabled: boolean;
  autoSendConsent: boolean;
}

export interface LogLensState {
  entries: LogEntry[];
  settings: LogLensSettings;
  status: LogLensStatus;
  extensionId: string;
  version: string;
}

export interface FilterState {
  search: string;
  level: LogLevel | 'all';
  source: string;
  timeRange: TimeRange;
}

export interface OutboxBatch {
  id: string;
  createdAt: string;
  attempts: number;
  nextAttemptAt: number;
  entries: LogEntry[];
}

export interface SendPayload {
  extension: string;
  version: string;
  sentAt: string;
  entries: LogEntry[];
}

export interface EnvironmentInfo {
  version: string;
  chromeVersion: string;
  platform: string;
  userAgent: string;
  generatedAt: string;
}

export interface DownloadResult {
  downloadId: number;
  filename: string;
  path?: string;
}

export interface OpenLogsResult {
  opened: 'side-panel' | 'tab';
  tabId?: number;
}

export interface SendResult {
  sent: boolean;
  status?: number;
  queued: number;
  error?: string;
}

export interface PreviewResult {
  payload: SendPayload;
  json: string;
  endpoint: string;
  method: SendMethod;
}

export interface OperationResult {
  ok: boolean;
  error?: string;
  removed?: number;
}

export interface AddResult extends OperationResult {
  entry?: LogEntry;
  duplicates?: number;
}

/** Runtime messages used by extension pages and content scripts. */
export type RuntimeMessage =
  | { type: 'LOG_LENS/GET_STATE' }
  | { type: 'LOG_LENS/ADD'; entry: AddLogInput }
  | { type: 'LOG_LENS/CLEAR' }
  | { type: 'LOG_LENS/EXPORT'; saveAs?: boolean }
  | {
      type: 'LOG_LENS/CAPTURE_PAGE';
      format?: ScreenshotFormat;
      saveAs?: boolean;
      tabId?: number;
    }
  | { type: 'LOG_LENS/OPEN_LOGS'; prefer?: 'side-panel' | 'tab' }
  | { type: 'LOG_LENS/SAVE_SETTINGS'; settings: Partial<LogLensSettings> }
  | { type: 'LOG_LENS/PREVIEW_SEND' }
  | { type: 'LOG_LENS/SEND_TEST' }
  | { type: 'LOG_LENS/RETRY_OUTBOX' }
  | { type: 'LOG_LENS/REFRESH_CONFIG' }
  | { type: 'LOG_LENS/GET_ENVIRONMENT' }
  | { type: 'LOG_LENS/PING' };

export type RuntimeResponse =
  | LogLensState
  | AddResult
  | OperationResult
  | DownloadResult
  | OpenLogsResult
  | SendResult
  | PreviewResult
  | EnvironmentInfo
  | { ok: true; version: string; extensionId: string };

/** The external API is intentionally small and explicit. */
export interface ExternalAddMessage {
  type: 'LOG_LENS/ADD';
  entry: AddLogInput;
}

export interface ExternalPingMessage {
  type: 'LOG_LENS/PING';
}

export type ExternalMessage = ExternalAddMessage | ExternalPingMessage;

export type ExternalResponse =
  | { ok: true; id?: string; version?: string; extensionId?: string }
  | { ok: false; error: string };

export const DEFAULT_SUPPORT_EMAIL = 'support@example.com';

export const STORAGE_KEYS = {
  settings: 'loglens.settings.v1',
  entries: 'loglens.entries.v1',
  outbox: 'loglens.outbox.v1',
  autoSendCursor: 'loglens.autosend.cursor.v1',
  logTabId: 'loglens.logTabId.v1',
  sidePanelOpenedAt: 'loglens.sidePanelOpenedAt.v1',
} as const;

export const ALARM_AUTO_SEND = 'loglens.autosend.tick';
export const ALARM_SWEEP = 'loglens.sweep';

export const APP_NAME = 'log-lens-chrome';
export const APP_DISPLAY_NAME = 'Log Lens';
