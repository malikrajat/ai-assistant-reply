import { LOG_LEVELS, type AddLogInput, type ExternalMessage, type LogLevel, type LogLensSettings } from './types';

export const MAX_EXTERNAL_PAYLOAD_BYTES = 32 * 1024;
export const MAX_EXTERNAL_MESSAGE_LENGTH = 4_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isLogLevelValue(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value);
}

export function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isTrustedInternalSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}

export interface ExternalValidationResult {
  ok: boolean;
  message?: ExternalMessage;
  error?: string;
  authorized: boolean;
}

export function isSenderAuthorized(
  sender: chrome.runtime.MessageSender,
  settings: LogLensSettings,
): boolean {
  if (sender.id && settings.allowedExternalIds.includes(sender.id)) return true;
  const origin = sender.origin ?? originOf(sender.url);
  if (origin && settings.allowedOrigins.includes(origin)) return true;
  return false;
}

export function validateExternalMessage(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
  settings: LogLensSettings,
): ExternalValidationResult {
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    return { ok: false, error: 'Invalid message.', authorized: false };
  }
  const authorized = isSenderAuthorized(sender, settings);
  if (raw.type === 'LOG_LENS/PING') {
    return { ok: true, message: { type: 'LOG_LENS/PING' }, authorized };
  }
  if (raw.type !== 'LOG_LENS/ADD') {
    return { ok: false, error: 'Unsupported message type.', authorized };
  }
  if (!authorized) {
    return {
      ok: false,
      error:
        'Sender is not approved. Add this extension ID or origin in Log Lens options > Public API.',
      authorized: false,
    };
  }
  if (!isRecord(raw.entry)) {
    return { ok: false, error: 'An entry object is required.', authorized };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(raw.entry);
  } catch {
    return { ok: false, error: 'Entry must be JSON serializable.', authorized };
  }
  if (serialized.length > MAX_EXTERNAL_PAYLOAD_BYTES) {
    return { ok: false, error: 'Entry exceeds the 32 KB size limit.', authorized };
  }

  const entry = raw.entry;
  const level = entry.level === undefined ? 'error' : entry.level;
  if (!isLogLevelValue(level)) {
    return { ok: false, error: 'Invalid log level.', authorized };
  }
  if (typeof entry.message !== 'string' || !entry.message.trim()) {
    return { ok: false, error: 'A non-empty message is required.', authorized };
  }
  if (entry.message.length > MAX_EXTERNAL_MESSAGE_LENGTH) {
    return { ok: false, error: 'Message exceeds 4000 characters.', authorized };
  }
  if (entry.source !== undefined && typeof entry.source !== 'string') {
    return { ok: false, error: 'Source must be a string.', authorized };
  }
  if (entry.details !== undefined && typeof entry.details !== 'string') {
    return { ok: false, error: 'Details must be a string.', authorized };
  }
  if (entry.stack !== undefined && typeof entry.stack !== 'string') {
    return { ok: false, error: 'Stack must be a string.', authorized };
  }
  if (entry.url !== undefined && typeof entry.url !== 'string') {
    return { ok: false, error: 'URL must be a string.', authorized };
  }
  if (entry.metadata !== undefined && !isRecord(entry.metadata)) {
    return { ok: false, error: 'Metadata must be an object.', authorized };
  }

  const normalized: AddLogInput = {
    level,
    message: entry.message.trim(),
    source: typeof entry.source === 'string' ? entry.source : 'external',
    details: entry.details as string | undefined,
    stack: entry.stack as string | undefined,
    url: entry.url as string | undefined,
    metadata: entry.metadata as Record<string, unknown> | undefined,
    timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : undefined,
  };

  return {
    ok: true,
    message: { type: 'LOG_LENS/ADD', entry: normalized },
    authorized,
  };
}

/** Minimal shape check used before routing internal messages. */
export function isRuntimeMessage(value: unknown): value is { type: string } {
  return isRecord(value) && typeof value.type === 'string' && value.type.startsWith('LOG_LENS/');
}

export function messageError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
