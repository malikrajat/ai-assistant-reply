import type { StorageArea } from '../src/background/storage';
import { normalizeSettings } from '../src/shared/settings';
import type { AddLogInput, LogEntry, LogLensSettings } from '../src/shared/types';

export class MemoryStorage implements StorageArea {
  readonly data = new Map<string, unknown>();
  failNextSets = 0;
  setCalls = 0;

  async get(keys: string | string[] | null): Promise<Record<string, unknown>> {
    const list =
      keys === null ? [...this.data.keys()] : typeof keys === 'string' ? [keys] : keys;
    const output: Record<string, unknown> = {};
    for (const key of list) {
      if (this.data.has(key)) output[key] = structuredClone(this.data.get(key));
    }
    return output;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.setCalls += 1;
    if (this.failNextSets > 0) {
      this.failNextSets -= 1;
      throw new Error('QUOTA_BYTES quota exceeded');
    }
    for (const [key, value] of Object.entries(items)) {
      this.data.set(key, structuredClone(value));
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const list = typeof keys === 'string' ? [keys] : keys;
    for (const key of list) this.data.delete(key);
  }
}

export function settings(overrides: Partial<LogLensSettings> = {}): LogLensSettings {
  return normalizeSettings({ ...overrides });
}

export function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'entry-1',
    timestamp: '2026-11-07T12:00:00.000Z',
    level: 'error',
    source: 'test',
    message: 'Something broke',
    ...overrides,
  };
}

export function input(overrides: Partial<AddLogInput> = {}): AddLogInput {
  return {
    level: 'error',
    source: 'test',
    message: 'Something broke',
    ...overrides,
  };
}
