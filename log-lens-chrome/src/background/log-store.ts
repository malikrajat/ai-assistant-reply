import { redactEntry } from '../shared/redaction';
import { isLevelEnabled } from '../shared/settings';
import {
  LOG_LEVELS,
  LOG_LEVEL_RANK,
  STORAGE_KEYS,
  type AddLogInput,
  type LogEntry,
  type LogLensSettings,
  type LogLensStatus,
  type LogLevel,
} from '../shared/types';
import type { StorageArea } from './storage';

export interface LogStoreOptions {
  storage: StorageArea;
  getSettings: () => LogLensSettings | Promise<LogLensSettings>;
  now?: () => number;
  idFactory?: () => string;
  dedupeWindowMs?: number;
}

export interface AddLogResult {
  entry: LogEntry | null;
  duplicate: boolean;
  filtered: boolean;
}

export type LogStoreEvent =
  | { type: 'add'; entry: LogEntry; duplicate: boolean }
  | { type: 'clear'; removed: number }
  | { type: 'sweep'; removed: number };

type Listener = (event: LogStoreEvent) => void;

const MAX_DETAILS = 12_000;
const MAX_STACK = 24_000;
const FUTURE_TOLERANCE_MS = 60_000;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value);
}

function parseStoredEntry(value: unknown): LogEntry | null {
  if (!isRecord(value)) return null;
  if (!isLogLevel(value.level)) return null;
  if (typeof value.message !== 'string' || !value.message.trim()) return null;
  const timestamp =
    typeof value.timestamp === 'string' && Number.isFinite(Date.parse(value.timestamp))
      ? new Date(value.timestamp).toISOString()
      : new Date().toISOString();
  return {
    id: typeof value.id === 'string' && value.id ? value.id : generateId(),
    timestamp,
    level: value.level,
    source: typeof value.source === 'string' ? value.source : 'unknown',
    message: value.message,
    details: typeof value.details === 'string' ? value.details : undefined,
    stack: typeof value.stack === 'string' ? value.stack : undefined,
    url: typeof value.url === 'string' ? value.url : undefined,
    tabId: typeof value.tabId === 'number' ? value.tabId : undefined,
    tabTitle: typeof value.tabTitle === 'string' ? value.tabTitle : undefined,
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
  };
}

function signature(entry: LogEntry): string {
  return [entry.level, entry.source, entry.message, entry.details ?? ''].join('\u0000');
}

/**
 * Persistent ring buffer for log entries. All mutations are serialized so two
 * rapid captures cannot lose each other, and quota failures degrade gracefully to
 * a smaller buffer rather than breaking capture.
 */
export class LogStore {
  private entries: LogEntry[] = [];
  private loaded = false;
  private memoryOnly = false;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<Listener>();
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly dedupeWindowMs: number;

  constructor(private readonly options: LogStoreOptions) {
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? generateId;
    this.dedupeWindowMs = options.dedupeWindowMs ?? 3_000;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LogStoreEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A listener must never break capture.
      }
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async init(): Promise<void> {
    await this.enqueue(() => this.loadInternal());
  }

  private async loadInternal(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const stored = await this.options.storage.get(STORAGE_KEYS.entries);
      const raw = stored[STORAGE_KEYS.entries];
      if (!Array.isArray(raw)) return;
      const settings = await this.options.getSettings();
      this.entries = raw
        .map(parseStoredEntry)
        .filter((entry): entry is LogEntry => entry !== null)
        .map((entry) =>
          redactEntry(entry, {
            redactSecrets: settings.redactSecrets,
            includeFullUrls: settings.includeFullUrls,
          }),
        );
      this.trimInternal(settings);
    } catch {
      this.entries = [];
    }
  }

  private trimInternal(settings: LogLensSettings): number {
    const before = this.entries.length;
    const cutoff = this.now() - settings.retentionDays * 24 * 60 * 60 * 1000;
    this.entries = this.entries
      .filter((entry) => {
        const ms = Date.parse(entry.timestamp);
        return !Number.isFinite(ms) || ms >= cutoff;
      })
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, settings.maxEntries);
    return before - this.entries.length;
  }

  private async persist(): Promise<void> {
    if (this.memoryOnly) return;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await this.options.storage.set({ [STORAGE_KEYS.entries]: this.entries });
        return;
      } catch {
        if (this.entries.length <= 10) {
          this.memoryOnly = true;
          return;
        }
        const keep = Math.max(10, Math.floor(this.entries.length / 2));
        this.entries = this.entries.slice(0, keep);
      }
    }
    this.memoryOnly = true;
  }

  async add(input: AddLogInput, options: { force?: boolean } = {}): Promise<AddLogResult> {
    return this.enqueue(async () => {
      await this.loadInternal();
      const settings = await this.options.getSettings();
      const level = isLogLevel(input.level) ? input.level : 'error';
      if (!options.force && !isLevelEnabled(level, settings)) {
        return { entry: null, duplicate: false, filtered: true };
      }

      const nowMs = this.now();
      const wantedMs = input.timestamp ? Date.parse(input.timestamp) : nowMs;
      const timestamp = new Date(
        Number.isFinite(wantedMs) && wantedMs <= nowMs + FUTURE_TOLERANCE_MS ? wantedMs : nowMs,
      ).toISOString();

      const entry: LogEntry = redactEntry(
        {
          id: this.idFactory(),
          timestamp,
          level,
          source: (input.source ?? 'unknown').trim() || 'unknown',
          message: (input.message ?? '').trim(),
          details: input.details?.slice(0, MAX_DETAILS),
          stack: input.stack?.slice(0, MAX_STACK),
          url: input.url,
          tabId:
            typeof input.tabId === 'number' && Number.isInteger(input.tabId) && input.tabId >= 0
              ? input.tabId
              : undefined,
          tabTitle: input.tabTitle?.slice(0, 200),
          metadata: input.metadata,
        },
        {
          redactSecrets: settings.redactSecrets,
          includeFullUrls: settings.includeFullUrls,
        },
      );

      if (!entry.message) {
        throw new Error('Log message is required.');
      }

      const previous = this.entries[0];
      if (
        previous &&
        signature(previous) === signature(entry) &&
        Math.abs(nowMs - Date.parse(previous.timestamp)) <= this.dedupeWindowMs
      ) {
        const occurrences =
          typeof previous.metadata?.occurrences === 'number'
            ? previous.metadata.occurrences + 1
            : 2;
        const updated: LogEntry = {
          ...previous,
          metadata: { ...previous.metadata, occurrences },
        };
        this.entries[0] = updated;
        this.trimInternal(settings);
        await this.persist();
        this.emit({ type: 'add', entry: updated, duplicate: true });
        return { entry: updated, duplicate: true, filtered: false };
      }

      this.entries.unshift(entry);
      this.trimInternal(settings);
      await this.persist();
      this.emit({ type: 'add', entry, duplicate: false });
      return { entry, duplicate: false, filtered: false };
    });
  }

  async all(): Promise<LogEntry[]> {
    return this.enqueue(async () => {
      await this.loadInternal();
      return this.entries.map((entry) => ({ ...entry }));
    });
  }

  async clear(): Promise<number> {
    return this.enqueue(async () => {
      await this.loadInternal();
      const removed = this.entries.length;
      this.entries = [];
      await this.persist();
      this.emit({ type: 'clear', removed });
      return removed;
    });
  }

  async sweep(): Promise<number> {
    return this.enqueue(async () => {
      await this.loadInternal();
      const settings = await this.options.getSettings();
      const removed = this.trimInternal(settings);
      if (removed > 0) {
        await this.persist();
        this.emit({ type: 'sweep', removed });
      }
      return removed;
    });
  }

  async status(): Promise<LogLensStatus> {
    return this.enqueue(async () => {
      await this.loadInternal();
      const settings = await this.options.getSettings();
      return buildStatus(this.entries, settings, 0);
    });
  }
}

export function buildStatus(
  entries: LogEntry[],
  settings: LogLensSettings,
  outboxCount: number,
): LogLensStatus {
  let errorCount = 0;
  let failureCount = 0;
  let warningCount = 0;
  let lastErrorAt: string | null = null;
  let lastErrorMs = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    if (entry.level === 'error') errorCount += 1;
    if (entry.level === 'failure') failureCount += 1;
    if (entry.level === 'warn') warningCount += 1;
    if (entry.level === 'error' || entry.level === 'failure') {
      const ms = Date.parse(entry.timestamp);
      if (Number.isFinite(ms) && ms > lastErrorMs) {
        lastErrorMs = ms;
        lastErrorAt = entry.timestamp;
      }
    }
  }
  return {
    entryCount: entries.length,
    errorCount,
    failureCount,
    warningCount,
    lastErrorAt,
    outboxCount,
    capturePaused: false,
    autoSendEnabled: settings.autoSendEnabled,
    autoSendConsent: settings.autoSendConsent,
  };
}

export function highestLevel(entries: LogEntry[]): LogLevel | null {
  let best: LogLevel | null = null;
  for (const entry of entries) {
    if (best === null || LOG_LEVEL_RANK[entry.level] < LOG_LEVEL_RANK[best]) best = entry.level;
  }
  return best;
}
