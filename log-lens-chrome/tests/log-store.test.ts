import { describe, expect, it } from 'vitest';
import { LogStore } from '../src/background/log-store';
import { STORAGE_KEYS } from '../src/shared/types';
import { entry, input, MemoryStorage, settings } from './helpers';

function createStore(
  storage: MemoryStorage,
  overrides: Parameters<typeof settings>[0] = {},
  start = Date.parse('2026-11-07T12:00:00.000Z'),
) {
  let now = start;
  let counter = 0;
  const store = new LogStore({
    storage,
    getSettings: () => settings(overrides),
    now: () => now,
    idFactory: () => `id-${++counter}`,
    dedupeWindowMs: 3_000,
  });
  return {
    store,
    advance: (ms: number) => {
      now += ms;
    },
    now: () => now,
  };
}

describe('LogStore', () => {
  it('adds entries, persists them, and returns newest first', async () => {
    const storage = new MemoryStorage();
    const { store, advance } = createStore(storage);

    await store.add(input({ message: 'first' }));
    advance(1_000);
    await store.add(input({ message: 'second' }));

    const entries = await store.all();
    expect(entries.map((item) => item.message)).toEqual(['second', 'first']);
    expect(storage.data.get(STORAGE_KEYS.entries)).toHaveLength(2);
  });

  it('persists across store instances', async () => {
    const storage = new MemoryStorage();
    const first = createStore(storage);
    await first.store.add(input({ message: 'survives' }));

    const second = createStore(storage);
    const entries = await second.store.all();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe('survives');
  });

  it('trims the ring buffer to maxEntries and keeps the newest', async () => {
    const storage = new MemoryStorage();
    const { store, advance } = createStore(storage, { maxEntries: 10 });
    for (let index = 0; index < 14; index += 1) {
      await store.add(input({ message: `entry-${index}` }));
      advance(10);
    }
    const entries = await store.all();
    expect(entries).toHaveLength(10);
    expect(entries[0]?.message).toBe('entry-13');
    expect(entries[9]?.message).toBe('entry-4');
  });

  it('drops entries outside the retention window', async () => {
    const storage = new MemoryStorage();
    storage.data.set(STORAGE_KEYS.entries, [
      entry({ id: 'old', timestamp: '2026-10-01T12:00:00.000Z', message: 'old' }),
      entry({ id: 'fresh', timestamp: '2026-11-06T12:00:00.000Z', message: 'fresh' }),
    ]);
    const { store } = createStore(storage, { retentionDays: 7 });
    const entries = await store.all();
    expect(entries.map((item) => item.message)).toEqual(['fresh']);
  });

  it('de-duplicates consecutive identical entries and counts occurrences', async () => {
    const storage = new MemoryStorage();
    const { store } = createStore(storage);
    const first = await store.add(input());
    const second = await store.add(input());
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    const entries = await store.all();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.metadata?.occurrences).toBe(2);
  });

  it('does not de-duplicate entries outside the window', async () => {
    const storage = new MemoryStorage();
    const { store, advance } = createStore(storage);
    await store.add(input());
    advance(4_000);
    const second = await store.add(input());
    expect(second.duplicate).toBe(false);
    expect(await store.all()).toHaveLength(2);
  });

  it('filters levels according to capture settings', async () => {
    const storage = new MemoryStorage();
    const { store } = createStore(storage, { errorOnly: true });
    const result = await store.add(input({ level: 'debug', message: 'noise' }));
    expect(result.filtered).toBe(true);
    expect(await store.all()).toHaveLength(0);
  });

  it('force-stores internal failure entries when the capture level excludes them', async () => {
    const storage = new MemoryStorage();
    const { store } = createStore(storage, { errorOnly: false, captureLevel: 'error' });
    const result = await store.add(input({ level: 'info', message: 'internal' }), { force: true });
    expect(result.filtered).toBe(false);
    expect(await store.all()).toHaveLength(1);
  });

  it('clears every entry', async () => {
    const storage = new MemoryStorage();
    const { store } = createStore(storage);
    await store.add(input());
    const removed = await store.clear();
    expect(removed).toBe(1);
    expect(await store.all()).toHaveLength(0);
    expect(storage.data.get(STORAGE_KEYS.entries)).toEqual([]);
  });

  it('halves the buffer when chrome.storage hits quota', async () => {
    const storage = new MemoryStorage();
    const { store } = createStore(storage, { maxEntries: 50 });
    for (let index = 0; index < 20; index += 1) {
      await store.add(input({ message: `entry-${index}` }));
    }
    storage.failNextSets = 1;
    await store.add(input({ message: 'quota-buster' }));
    const entries = await store.all();
    expect(entries.length).toBeLessThanOrEqual(10);
    expect(storage.setCalls).toBeGreaterThan(20);
  });

  it('reports status counts and the latest error time', async () => {
    const storage = new MemoryStorage();
    const { store, advance } = createStore(storage, { errorOnly: false, captureLevel: 'warn' });
    await store.add(input({ level: 'error', message: 'e' }));
    advance(1_000);
    await store.add(input({ level: 'failure', message: 'f' }));
    advance(1_000);
    await store.add(input({ level: 'warn', message: 'w' }));
    const status = await store.status();
    expect(status.entryCount).toBe(3);
    expect(status.errorCount).toBe(1);
    expect(status.failureCount).toBe(1);
    expect(status.warningCount).toBe(1);
    expect(status.lastErrorAt).toBe('2026-11-07T12:00:01.000Z');
  });
});
