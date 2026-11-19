import { buildSendPayload } from '../shared/report';
import { isAllowedEndpoint, isLevelSendable, parseHeaderJson } from '../shared/settings';
import type {
  LogEntry,
  LogLensSettings,
  OutboxBatch,
  PreviewResult,
  SendResult,
} from '../shared/types';

export interface AutoSendDeps {
  getSettings: () => Promise<LogLensSettings>;
  getEntries: () => Promise<LogEntry[]>;
  loadOutbox: () => Promise<OutboxBatch[]>;
  saveOutbox: (outbox: OutboxBatch[]) => Promise<void>;
  loadCursor: () => Promise<number>;
  saveCursor: (cursor: number) => Promise<void>;
  fetchImpl?: typeof fetch;
  version: string;
  now?: () => number;
  idFactory?: () => string;
  recordFailure?: (message: string, details?: string) => Promise<void>;
}

export class SendError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SendError';
  }
}

const MAX_BATCH_ENTRIES = 50;
const MAX_OUTBOX_BATCHES = 50;
const PERMANENT_RETRY_DELAY_MS = 15 * 60 * 1000;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sampleEntry(nowMs: number): LogEntry {
  return {
    id: 'log-lens-test-payload',
    timestamp: new Date(nowMs).toISOString(),
    level: 'error',
    source: 'log-lens-test',
    message: 'This is a Log Lens test payload. No real error occurred.',
    details: 'Sent manually from the Log Lens options page.',
  };
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Auto-send is an explicit opt-in feature. It never sends anything unless both
 * `autoSendEnabled` and `autoSendConsent` are true. Failed batches stay in a
 * persistent outbox and retry with capped exponential backoff.
 */
export class AutoSendService {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly deps: AutoSendDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.idFactory = deps.idFactory ?? generateId;
    // Native fetch must run on the global scope. Calling a detached reference as
    // `this.fetchImpl(...)` throws "Illegal invocation" in a service worker.
    this.fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async requireConsent(): Promise<LogLensSettings> {
    const settings = await this.deps.getSettings();
    if (!settings.autoSendConsent) throw new SendError('Auto-send consent is required.', false);
    if (!isAllowedEndpoint(settings.autoSendEndpoint)) {
      throw new SendError('Configure a valid HTTPS endpoint (or localhost) first.', false);
    }
    const headers = parseHeaderJson(settings.autoSendHeaders);
    if (!headers.ok) throw new SendError(headers.error ?? 'Invalid headers.', false);
    return settings;
  }

  async onNewEntry(entry: LogEntry): Promise<SendResult> {
    if (entry.source === 'auto-send') return { sent: false, queued: 0 };
    return this.enqueue(async () => {
      const settings = await this.deps.getSettings();
      if (!settings.autoSendEnabled || !settings.autoSendConsent) {
        return { sent: false, queued: 0 };
      }
      if (!isLevelSendable(entry.level, settings)) return { sent: false, queued: 0 };
      if (settings.autoSendIntervalMinutes > 0) return { sent: false, queued: 0 };
      await this.enqueueEntries([entry], settings);
      return this.flushInternal(settings);
    });
  }

  async tick(): Promise<SendResult> {
    return this.enqueue(async () => {
      const settings = await this.deps.getSettings();
      if (!settings.autoSendEnabled || !settings.autoSendConsent) {
        return { sent: false, queued: 0 };
      }
      if (settings.autoSendIntervalMinutes > 0) {
        const cursor = await this.deps.loadCursor();
        const intervalMs = settings.autoSendIntervalMinutes * 60 * 1000;
        if (this.now() - cursor >= intervalMs) {
          const entries = await this.deps.getEntries();
          await this.enqueueEntries(entries, settings);
        }
      }
      return this.flushInternal(settings);
    });
  }

  async preview(): Promise<PreviewResult> {
    const settings = await this.deps.getSettings();
    const entries = await this.deps.getEntries();
    const selected = entries.filter((entry) => isLevelSendable(entry.level, settings));
    const payload = buildSendPayload(
      this.deps.version,
      selected.length > 0 ? selected.slice(0, MAX_BATCH_ENTRIES) : [sampleEntry(this.now())],
      new Date(this.now()),
    );
    return {
      payload,
      json: JSON.stringify(payload, null, 2),
      endpoint: settings.autoSendEndpoint,
      method: settings.autoSendMethod,
    };
  }

  async sendTest(): Promise<SendResult> {
    return this.enqueue(async () => {
      const settings = await this.requireConsent();
      const entries = await this.deps.getEntries();
      const selected = entries.filter((entry) => isLevelSendable(entry.level, settings));
      const payloadEntries = selected.length > 0 ? selected.slice(0, MAX_BATCH_ENTRIES) : [sampleEntry(this.now())];
      const payload = buildSendPayload(this.deps.version, payloadEntries, new Date(this.now()));
      try {
        const status = await this.post(settings, payload);
        return { sent: true, status, queued: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.deps.recordFailure?.('Auto-send test failed', message);
        return { sent: false, queued: 0, error: message };
      }
    });
  }

  async retryOutbox(): Promise<SendResult> {
    return this.enqueue(async () => {
      const settings = await this.deps.getSettings();
      if (!settings.autoSendConsent) {
        throw new SendError('Auto-send consent is required.', false);
      }
      const outbox = await this.deps.loadOutbox();
      for (const batch of outbox) {
        batch.attempts = 0;
        batch.nextAttemptAt = this.now();
      }
      await this.deps.saveOutbox(outbox);
      return this.flushInternal(settings);
    });
  }

  async outboxCount(): Promise<number> {
    return (await this.deps.loadOutbox()).length;
  }

  private async enqueueEntries(
    entries: LogEntry[],
    settings: LogLensSettings,
  ): Promise<number> {
    const cursor = await this.deps.loadCursor();
    const fresh = entries
      .filter((entry) => isLevelSendable(entry.level, settings))
      .filter((entry) => Date.parse(entry.timestamp) > cursor)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    if (fresh.length === 0) return 0;

    const outbox = await this.deps.loadOutbox();
    let maxCursor = cursor;
    for (let index = 0; index < fresh.length; index += MAX_BATCH_ENTRIES) {
      const chunk = fresh.slice(index, index + MAX_BATCH_ENTRIES);
      const next = Math.max(...chunk.map((entry) => Date.parse(entry.timestamp)));
      maxCursor = Math.max(maxCursor, next);
      outbox.push({
        id: this.idFactory(),
        createdAt: new Date(this.now()).toISOString(),
        attempts: 0,
        nextAttemptAt: this.now(),
        entries: chunk,
      });
    }
    // Persist the outbox first: if the cursor write fails we may resend a batch,
    // which is recoverable. Advancing the cursor first could lose an entry.
    await this.deps.saveOutbox(outbox.slice(-MAX_OUTBOX_BATCHES));
    await this.deps.saveCursor(maxCursor);
    return fresh.length;
  }

  private async flushInternal(settings: LogLensSettings): Promise<SendResult> {
    const outbox = await this.deps.loadOutbox();
    let sent = 0;
    let lastStatus: number | undefined;
    let lastError: string | undefined;
    const remaining: OutboxBatch[] = [];

    for (const batch of outbox) {
      if (batch.nextAttemptAt > this.now()) {
        remaining.push(batch);
        continue;
      }
      try {
        const status = await this.post(settings, buildSendPayload(this.deps.version, batch.entries, new Date(this.now())));
        sent += batch.entries.length;
        lastStatus = status;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = error instanceof SendError ? error.retryable : true;
        const status = error instanceof SendError ? error.status : undefined;
        if (status !== undefined) lastStatus = status;
        lastError = message;
        batch.attempts += 1;
        if (!retryable) {
          batch.nextAttemptAt = this.now() + PERMANENT_RETRY_DELAY_MS;
          batch.attempts = settings.autoSendRetries + 1;
          await this.deps.recordFailure?.('Auto-send rejected the payload', message);
        } else if (batch.attempts > settings.autoSendRetries) {
          batch.nextAttemptAt = this.now() + PERMANENT_RETRY_DELAY_MS;
          await this.deps.recordFailure?.(
            'Auto-send failed after retries; entries remain queued',
            message,
          );
        } else {
          const delay = Math.min(60_000, 2 ** batch.attempts * 1_000);
          batch.nextAttemptAt = this.now() + delay;
        }
        remaining.push(batch);
      }
    }

    await this.deps.saveOutbox(remaining);
    return {
      sent: sent > 0,
      status: lastStatus,
      queued: remaining.length,
      error: lastError,
    };
  }

  private async post(
    settings: LogLensSettings,
    payload: ReturnType<typeof buildSendPayload>,
  ): Promise<number> {
    if (!isAllowedEndpoint(settings.autoSendEndpoint)) {
      throw new SendError('Invalid auto-send endpoint.', false);
    }
    const parsedHeaders = parseHeaderJson(settings.autoSendHeaders);
    if (!parsedHeaders.ok) throw new SendError(parsedHeaders.error ?? 'Invalid headers.', false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.autoSendTimeoutMs);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...parsedHeaders.headers,
      };
      const response = await this.fetchImpl(settings.autoSendEndpoint, {
        method: settings.autoSendMethod,
        headers,
        body: JSON.stringify(payload),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new SendError(
          `Endpoint returned HTTP ${response.status}.`,
          isRetryableStatus(response.status),
          response.status,
        );
      }
      return response.status;
    } catch (error) {
      if (error instanceof SendError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new SendError('Request timed out.', true);
      }
      throw new SendError(error instanceof Error ? error.message : String(error), true);
    } finally {
      clearTimeout(timeout);
    }
  }
}
