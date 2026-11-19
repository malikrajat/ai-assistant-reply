import { normalizeSettings } from '../shared/settings';
import {
  STORAGE_KEYS,
  type LogLensSettings,
  type OutboxBatch,
} from '../shared/types';

export interface StorageArea {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export const chromeStorageArea: StorageArea = {
  get: (keys) => chrome.storage.local.get(keys),
  set: (items) => chrome.storage.local.set(items),
  remove: (keys) => chrome.storage.local.remove(keys),
};

export const chromeSessionArea: StorageArea = {
  get: (keys) => chrome.storage.session.get(keys),
  set: (items) => chrome.storage.session.set(items),
  remove: (keys) => chrome.storage.session.remove(keys),
};

const memorySession = new Map<string, unknown>();

/** Session storage can be unavailable in tests; keep a small in-memory fallback. */
export const sessionArea: StorageArea = {
  async get(keys) {
    const list = typeof keys === 'string' ? [keys] : (keys ?? []);
    const output: Record<string, unknown> = {};
    for (const key of list) {
      if (memorySession.has(key)) output[key] = memorySession.get(key);
    }
    try {
      if (chrome.storage.session) {
        const stored = await chrome.storage.session.get(list);
        return { ...output, ...stored };
      }
    } catch {
      // Fall through to memory.
    }
    return output;
  },
  async set(items) {
    for (const [key, value] of Object.entries(items)) memorySession.set(key, value);
    try {
      if (chrome.storage.session) await chrome.storage.session.set(items);
    } catch {
      // Memory fallback already updated.
    }
  },
  async remove(keys) {
    const list = typeof keys === 'string' ? [keys] : keys;
    for (const key of list) memorySession.delete(key);
    try {
      if (chrome.storage.session) await chrome.storage.session.remove(list);
    } catch {
      // Memory fallback already updated.
    }
  },
};

export async function loadSettings(): Promise<LogLensSettings> {
  try {
    const stored = await chromeStorageArea.get(STORAGE_KEYS.settings);
    return normalizeSettings(stored[STORAGE_KEYS.settings]);
  } catch {
    return normalizeSettings(undefined);
  }
}

export async function persistSettings(settings: LogLensSettings): Promise<void> {
  await chromeStorageArea.set({ [STORAGE_KEYS.settings]: settings });
}

export async function loadOutbox(): Promise<OutboxBatch[]> {
  try {
    const stored = await chromeStorageArea.get(STORAGE_KEYS.outbox);
    const value = stored[STORAGE_KEYS.outbox];
    if (!Array.isArray(value)) return [];
    return value.filter(isOutboxBatch).slice(0, 50);
  } catch {
    return [];
  }
}

export async function saveOutbox(outbox: OutboxBatch[]): Promise<void> {
  await chromeStorageArea.set({ [STORAGE_KEYS.outbox]: outbox.slice(0, 50) });
}

export async function loadAutoSendCursor(): Promise<number> {
  try {
    const stored = await chromeStorageArea.get(STORAGE_KEYS.autoSendCursor);
    const value = stored[STORAGE_KEYS.autoSendCursor];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export async function saveAutoSendCursor(value: number): Promise<void> {
  await chromeStorageArea.set({ [STORAGE_KEYS.autoSendCursor]: value });
}

export async function loadLogTabId(): Promise<number | null> {
  try {
    const stored = await chromeStorageArea.get(STORAGE_KEYS.logTabId);
    const value = stored[STORAGE_KEYS.logTabId];
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

export async function saveLogTabId(tabId: number | null): Promise<void> {
  if (tabId === null) {
    await chromeStorageArea.remove(STORAGE_KEYS.logTabId);
    return;
  }
  await chromeStorageArea.set({ [STORAGE_KEYS.logTabId]: tabId });
}

function isOutboxBatch(value: unknown): value is OutboxBatch {
  if (typeof value !== 'object' || value === null) return false;
  const batch = value as Partial<OutboxBatch>;
  return (
    typeof batch.id === 'string' &&
    typeof batch.createdAt === 'string' &&
    typeof batch.attempts === 'number' &&
    typeof batch.nextAttemptAt === 'number' &&
    Array.isArray(batch.entries)
  );
}
