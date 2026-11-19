import {
  DEFAULT_SUPPORT_EMAIL,
  LOG_LEVELS,
  LOG_LEVEL_RANK,
  type AutoOpenMode,
  type LogLevel,
  type LogLensSettings,
  type ScreenshotFormat,
  type SendMethod,
} from './types';

export const DEFAULT_SETTINGS: Readonly<LogLensSettings> = Object.freeze({
  captureLevel: 'error',
  errorOnly: true,
  capturePageErrors: false,
  captureConsoleErrors: false,
  captureNetworkFailures: false,
  autoOpen: 'on-error',
  autoSendEnabled: false,
  autoSendConsent: false,
  autoSendEndpoint: '',
  autoSendMethod: 'POST',
  autoSendHeaders: '{}',
  autoSendIntervalMinutes: 5,
  autoSendLevel: 'error',
  autoSendRetries: 3,
  autoSendTimeoutMs: 10_000,
  supportEmail: DEFAULT_SUPPORT_EMAIL,
  maxEntries: 200,
  retentionDays: 7,
  redactSecrets: true,
  statusBadge: true,
  notificationsEnabled: true,
  screenshotFormat: 'png',
  includeEnvironment: true,
  includeFullUrls: false,
  allowedExternalIds: [],
  allowedOrigins: [],
});

const AUTO_OPEN_MODES: readonly AutoOpenMode[] = ['never', 'on-error', 'always'];
const SCREENSHOT_FORMATS: readonly ScreenshotFormat[] = ['png', 'jpeg'];
const SEND_METHODS: readonly SendMethod[] = ['POST', 'PUT'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asLevel(value: unknown, fallback: LogLevel): LogLevel {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value)
    ? (value as LogLevel)
    : fallback;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function asInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function asString(value: unknown, fallback: string, maxLength = 2048): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 256 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= 50) break;
  }
  return result;
}

export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const origins = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const origin = normalizeOrigin(item);
    if (origin) origins.add(origin);
    if (origins.size >= 50) break;
  }
  return [...origins];
}

/** Merge unknown storage data with safe defaults. Never throws. */
export function normalizeSettings(value: unknown): LogLensSettings {
  const input = isRecord(value) ? value : {};
  const autoSendConsent = asBoolean(input.autoSendConsent, DEFAULT_SETTINGS.autoSendConsent);
  const autoSendEnabled =
    autoSendConsent && asBoolean(input.autoSendEnabled, DEFAULT_SETTINGS.autoSendEnabled);

  return {
    captureLevel: asLevel(input.captureLevel, DEFAULT_SETTINGS.captureLevel),
    errorOnly: asBoolean(input.errorOnly, DEFAULT_SETTINGS.errorOnly),
    capturePageErrors: asBoolean(input.capturePageErrors, DEFAULT_SETTINGS.capturePageErrors),
    captureConsoleErrors: asBoolean(
      input.captureConsoleErrors,
      DEFAULT_SETTINGS.captureConsoleErrors,
    ),
    captureNetworkFailures: asBoolean(
      input.captureNetworkFailures,
      DEFAULT_SETTINGS.captureNetworkFailures,
    ),
    autoOpen: asEnum(input.autoOpen, AUTO_OPEN_MODES, DEFAULT_SETTINGS.autoOpen),
    autoSendEnabled,
    autoSendConsent,
    autoSendEndpoint: asString(input.autoSendEndpoint, DEFAULT_SETTINGS.autoSendEndpoint).trim(),
    autoSendMethod: asEnum(input.autoSendMethod, SEND_METHODS, DEFAULT_SETTINGS.autoSendMethod),
    autoSendHeaders: asString(
      input.autoSendHeaders,
      DEFAULT_SETTINGS.autoSendHeaders,
      8192,
    ).trim(),
    autoSendIntervalMinutes: asInteger(
      input.autoSendIntervalMinutes,
      DEFAULT_SETTINGS.autoSendIntervalMinutes,
      0,
      1440,
    ),
    autoSendLevel: asLevel(input.autoSendLevel, DEFAULT_SETTINGS.autoSendLevel),
    autoSendRetries: asInteger(
      input.autoSendRetries,
      DEFAULT_SETTINGS.autoSendRetries,
      0,
      10,
    ),
    autoSendTimeoutMs: asInteger(
      input.autoSendTimeoutMs,
      DEFAULT_SETTINGS.autoSendTimeoutMs,
      1_000,
      60_000,
    ),
    supportEmail: asString(input.supportEmail, DEFAULT_SETTINGS.supportEmail, 320).trim(),
    maxEntries: asInteger(input.maxEntries, DEFAULT_SETTINGS.maxEntries, 10, 2_000),
    retentionDays: asInteger(input.retentionDays, DEFAULT_SETTINGS.retentionDays, 1, 365),
    redactSecrets: asBoolean(input.redactSecrets, DEFAULT_SETTINGS.redactSecrets),
    statusBadge: asBoolean(input.statusBadge, DEFAULT_SETTINGS.statusBadge),
    notificationsEnabled: asBoolean(
      input.notificationsEnabled,
      DEFAULT_SETTINGS.notificationsEnabled,
    ),
    screenshotFormat: asEnum(
      input.screenshotFormat,
      SCREENSHOT_FORMATS,
      DEFAULT_SETTINGS.screenshotFormat,
    ),
    includeEnvironment: asBoolean(input.includeEnvironment, DEFAULT_SETTINGS.includeEnvironment),
    includeFullUrls: asBoolean(input.includeFullUrls, DEFAULT_SETTINGS.includeFullUrls),
    allowedExternalIds: asStringArray(input.allowedExternalIds),
    allowedOrigins: normalizeOrigins(input.allowedOrigins),
  };
}

export function isLevelEnabled(level: LogLevel, settings: LogLensSettings): boolean {
  if (settings.errorOnly) return level === 'error' || level === 'failure';
  return LOG_LEVEL_RANK[level] <= LOG_LEVEL_RANK[settings.captureLevel];
}

export function isLevelSendable(level: LogLevel, settings: LogLensSettings): boolean {
  return LOG_LEVEL_RANK[level] <= LOG_LEVEL_RANK[settings.autoSendLevel];
}

export interface HeaderParseResult {
  ok: boolean;
  headers: Record<string, string>;
  error?: string;
}

export function parseHeaderJson(json: string): HeaderParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json || '{}');
  } catch {
    return { ok: false, headers: {}, error: 'Headers must be valid JSON.' };
  }
  if (!isRecord(parsed)) {
    return { ok: false, headers: {}, error: 'Headers must be a JSON object.' };
  }
  const headers: Record<string, string> = {};
  for (const [key, raw] of Object.entries(parsed)) {
    if (!key.trim() || key.length > 128 || !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(key)) {
      return { ok: false, headers: {}, error: 'Header names must be valid HTTP token names.' };
    }
    if (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean') {
      return {
        ok: false,
        headers: {},
        error: `Header "${key}" must be a string, number, or boolean.`,
      };
    }
    const headerValue = String(raw);
    if (/[\r\n]/.test(headerValue)) {
      return { ok: false, headers: {}, error: `Header "${key}" must not contain line breaks.` };
    }
    headers[key] = headerValue;
  }
  return { ok: true, headers };
}

/** HTTPS everywhere, except localhost for development. */
export function isAllowedEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === 'https:') return true;
  if (url.protocol !== 'http:') return false;
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

export function endpointPermissionPattern(endpoint: string): string | null {
  if (!isAllowedEndpoint(endpoint)) return null;
  const url = new URL(endpoint);
  // Chrome match patterns do not accept ports; host permissions apply to every port.
  return `${url.protocol}//${url.hostname}/*`;
}

/**
 * Local Development HTTP origins are already covered by the required host
 * permissions in the manifest, so Chrome must not be asked for them again.
 */
export function needsEndpointPermission(endpoint: string): boolean {
  if (!isAllowedEndpoint(endpoint)) return false;
  const url = new URL(endpoint);
  if (url.protocol !== 'http:') return true;
  return url.hostname !== 'localhost' && url.hostname !== '127.0.0.1';
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function settingsEqual(a: LogLensSettings, b: LogLensSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
