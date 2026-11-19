import { describe, expect, it, vi } from 'vitest';
import { AutoSendService } from '../src/background/auto-send';
import type { LogEntry, LogLensSettings, OutboxBatch } from '../src/shared/types';
import { entry, settings } from './helpers';

interface HarnessOptions {
  entryList?: LogEntry[];
  overrides?: Partial<LogLensSettings>;
  fetchImpl?: typeof fetch;
  start?: number;
  cursor?: number;
}

function harness(options: HarnessOptions = {}) {
  let now = options.start ?? Date.parse('2026-11-07T12:00:00.000Z');
  let outbox: OutboxBatch[] = [];
  let cursor = options.cursor ?? now;
  const failures: Array<{ message: string; details?: string }> = [];
  let id = 0;
  const fetchImpl =
    options.fetchImpl ??
    (vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch);
  let currentSettings: LogLensSettings = {
    ...settings({
      autoSendEnabled: true,
      autoSendConsent: true,
      autoSendEndpoint: 'https://logs.example.com/ingest',
      autoSendIntervalMinutes: 0,
      autoSendRetries: 2,
      autoSendTimeoutMs: 2_000,
    }),
    ...options.overrides,
  };
  const service = new AutoSendService({
    getSettings: async () => currentSettings,
    getEntries: async () => options.entryList ?? [],
    loadOutbox: async () => outbox,
    saveOutbox: async (next) => {
      outbox = next;
    },
    loadCursor: async () => cursor,
    saveCursor: async (next) => {
      cursor = next;
    },
    fetchImpl,
    version: '1.1.0',
    now: () => now,
    idFactory: () => `batch-${++id}`,
    recordFailure: async (message, details) => {
      failures.push({ message, details });
    },
  });
  return {
    service,
    fetchImpl,
    failures,
    getOutbox: () => outbox,
    getCursor: () => cursor,
    getNow: () => now,
    advance: (ms: number) => {
      now += ms;
    },
    setSettings: (next: Partial<LogLensSettings>) => {
      currentSettings = settings({ ...currentSettings, ...next });
    },
  };
}

describe('AutoSendService', () => {
  it('previews the exact payload without consent or network access', async () => {
    const h = harness({
      overrides: { autoSendConsent: false, autoSendEnabled: false },
      entryList: [entry({ id: 'a', message: 'boom' })],
    });
    const preview = await h.service.preview();
    expect(preview.payload.extension).toBe('log-lens-chrome');
    expect(preview.payload.version).toBe('1.1.0');
    expect(preview.payload.entries).toHaveLength(1);
    expect(preview.json).toContain('"entries"');
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });

  it('uses a sample entry when there are no logs', async () => {
    const h = harness({ entryList: [] });
    const preview = await h.service.preview();
    expect(preview.payload.entries[0]?.source).toBe('log-lens-test');
  });

  it('requires explicit consent before sending a test payload', async () => {
    const h = harness({ overrides: { autoSendConsent: false, autoSendEnabled: false } });
    await expect(h.service.sendTest()).rejects.toThrow(/consent/i);
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });

  it('sends immediately and builds the expected request', async () => {
    const h = harness();
    const item = entry({ id: 'a', message: 'boom', timestamp: '2026-11-07T12:00:01.000Z' });
    const result = await h.service.onNewEntry(item);
    expect(result.sent).toBe(true);
    expect(h.fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (h.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://logs.example.com/ingest');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(init.cache).toBe('no-store');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    const payload = JSON.parse(String(init.body)) as { entries: LogEntry[] };
    expect(payload.entries[0]?.message).toBe('boom');
    expect(h.getOutbox()).toHaveLength(0);
  });

  it('does nothing when auto-send is disabled or entry level is below the send level', async () => {
    const disabled = harness({ overrides: { autoSendEnabled: false } });
    expect((await disabled.service.onNewEntry(entry())).queued).toBe(0);
    expect(disabled.fetchImpl).not.toHaveBeenCalled();

    const level = harness({ overrides: { autoSendLevel: 'error' } });
    expect((await level.service.onNewEntry(entry({ level: 'warn' }))).queued).toBe(0);
    expect(level.fetchImpl).not.toHaveBeenCalled();
  });

  it('does not send immediately when an interval is configured', async () => {
    const h = harness({ overrides: { autoSendIntervalMinutes: 5 } });
    const result = await h.service.onNewEntry(entry());
    expect(result.queued).toBe(0);
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });

  it('retries failed sends with backoff and keeps the outbox until success', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response('{}', { status: calls === 1 ? 500 : 200 });
    }) as unknown as typeof fetch;
    const h = harness({ fetchImpl, overrides: { autoSendRetries: 3 } });
    const item = entry({ id: 'a', message: 'retry me', timestamp: '2026-11-07T12:00:01.000Z' });
    const first = await h.service.onNewEntry(item);
    expect(first.sent).toBe(false);
    expect(h.getOutbox()).toHaveLength(1);
    expect(h.getOutbox()[0]?.attempts).toBe(1);
    expect(h.failures).toHaveLength(0);

    h.advance(5_000);
    const second = await h.service.tick();
    expect(second.sent).toBe(true);
    expect(h.getOutbox()).toHaveLength(0);
  });

  it('keeps a non-retryable rejection queued and records a failure', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 400 })) as unknown as typeof fetch;
    const h = harness({ fetchImpl, overrides: { autoSendRetries: 3 } });
    await h.service.onNewEntry(
      entry({ id: 'a', message: 'bad request', timestamp: '2026-11-07T12:00:01.000Z' }),
    );
    expect(h.getOutbox()).toHaveLength(1);
    expect(h.getOutbox()[0]?.nextAttemptAt).toBeGreaterThan(h.getNow());
    expect(h.failures[0]?.message).toMatch(/rejected/i);
  });

  it('times out a stalled request', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as unknown as typeof fetch;
    const h = harness({
      fetchImpl,
      overrides: { autoSendTimeoutMs: 20, autoSendConsent: true },
    });
    const result = await h.service.sendTest();
    expect(result.sent).toBe(false);
    expect(result.error).toMatch(/timed out/i);
  });

  it('collects scheduled entries after the interval and sends them', async () => {
    const start = Date.parse('2026-11-07T12:00:00.000Z');
    const h = harness({
      overrides: { autoSendIntervalMinutes: 1 },
      start,
      cursor: start - 60_000,
      entryList: [entry({ id: 'a', timestamp: new Date(start - 30_000).toISOString() })],
    });
    const result = await h.service.tick();
    expect(result.sent).toBe(true);
    expect(h.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('resets the outbox on manual retry', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    const h = harness({ fetchImpl });
    await h.service.onNewEntry(
      entry({ id: 'a', message: 'x', timestamp: '2026-11-07T12:00:01.000Z' }),
    );
    h.advance(120_000);
    const result = await h.service.retryOutbox();
    expect(result.queued).toBe(0);
  });
});
