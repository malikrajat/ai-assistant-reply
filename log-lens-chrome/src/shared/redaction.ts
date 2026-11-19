import type { LogEntry } from './types';

const SENSITIVE_KEY =
  /(?:^|[_-])(?:authorization|auth|cookie|set-cookie|password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?id|private[_-]?key|client[_-]?secret|credentials?)(?:$|[_-])/i;

const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // URL credentials.
  [/\b(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, '$1[REDACTED]@'],
  // Authorization / cookie headers.
  [/\b(authorization|proxy-authorization|cookie|set-cookie)\s*[:=]\s*[^\r\n]+/gi, '$1: [REDACTED]'],
  // Bearer and Basic tokens.
  [/\b(bearer|basic)\s+[A-Za-z0-9\-._~+/]{8,}=*/gi, '$1 [REDACTED]'],
  // Common credential assignments.
  [
    /\b(api[_-]?key|apikey|x-api-key|access[_-]?token|refresh[_-]?token|id[_-]?token|auth[_-]?token|token|password|passwd|pwd|secret|client[_-]?secret|private[_-]?key|session[_-]?id)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&}\]]+)/gi,
    '$1$2[REDACTED]',
  ],
  // Sensitive URL query values.
  [
    /([?&](?:token|access_token|refresh_token|id_token|api[_-]?key|apikey|password|secret|client_secret|auth|code|session|key)=)[^&#\s]+/gi,
    '$1[REDACTED]',
  ],
  // Well-known key formats.
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_KEY]'],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, '[REDACTED_KEY]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_KEY]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_KEY]'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, '[REDACTED_KEY]'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED_KEY]'],
  // JSON Web Tokens.
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_JWT]'],
  // Long hex/base64 values that look like credentials.
  [
    /\b(?=[A-Za-z0-9+/_-]*\d)(?=[A-Za-z0-9+/_-]*[A-Za-z])[A-Za-z0-9+/_-]{40,}={0,2}\b/g,
    '[REDACTED_CREDENTIAL]',
  ],
];

const MAX_STRING = 16_000;

export function redactText(value: string): string {
  let output = value.slice(0, MAX_STRING);
  for (const [pattern, replacement] of PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n… [truncated ${value.length - maxLength} characters]`;
}

/** Remove query strings and fragments from every URL embedded in free text. */
export function stripUrlQueries(value: string): string {
  return value.replace(/\bhttps?:\/\/[^\s<>"']+/gi, (match) => {
    try {
      const url = new URL(match);
      return `${url.origin}${url.pathname}`;
    } catch {
      return match;
    }
  });
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

function cleanText(value: string, redactSecrets: boolean, includeFullUrls: boolean, max: number): string {
  const withoutControls = value.replace(CONTROL_CHARS, ' ');
  const redacted = redactSecrets ? redactText(withoutControls) : withoutControls;
  return truncate(includeFullUrls ? redacted : stripUrlQueries(redacted), max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function redactValue(
  value: unknown,
  depth = 0,
  redactSecrets = true,
  includeFullUrls = false,
): unknown {
  if (depth > 6) return '[max depth]';
  if (typeof value === 'string') {
    const redacted = redactSecrets ? redactText(value) : value;
    return includeFullUrls ? redacted : stripUrlQueries(redacted);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item) => redactValue(item, depth + 1, redactSecrets, includeFullUrls));
  }
  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 80)) {
      output[key] = SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : redactValue(item, depth + 1, redactSecrets, includeFullUrls);
    }
    return output;
  }
  return String(value);
}

/**
 * URLs are stored without query strings or fragments by default. Credentials are
 * always removed, even when the user opts into full URLs.
 */
export function sanitizeUrl(raw: string | undefined, includeFullUrls = false): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return redactText(trimmed).slice(0, 2048);
    }
    const base = `${url.origin}${url.pathname}`;
    if (!includeFullUrls) return base.slice(0, 2048);
    const search = url.search ? redactText(url.search) : '';
    const hash = url.hash ? redactText(url.hash) : '';
    return `${base}${search}${hash}`.slice(0, 2048);
  } catch {
    return redactText(trimmed).slice(0, 2048);
  }
}

export function sanitizeSource(source: string | undefined): string {
  // eslint-disable-next-line no-control-regex
  const value = (source ?? 'unknown').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return redactText(value || 'unknown').slice(0, 64);
}

export function sanitizeMessage(
  message: string,
  redactSecrets = true,
  includeFullUrls = false,
): string {
  return cleanText(message, redactSecrets, includeFullUrls, 4000);
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
  redactSecrets: boolean,
  includeFullUrls = false,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const redacted = redactValue(metadata, 0, redactSecrets, includeFullUrls);
  if (!isRecord(redacted)) return undefined;
  return redacted;
}

export interface RedactionOptions {
  redactSecrets?: boolean;
  includeFullUrls?: boolean;
}

/** Apply privacy rules to the text fields the extension actually persists. */
export function redactEntry(entry: LogEntry, options: RedactionOptions = {}): LogEntry {
  const redactSecrets = options.redactSecrets ?? true;
  const includeFullUrls = options.includeFullUrls ?? false;
  const clean = (value: string | undefined, max = MAX_STRING): string | undefined => {
    if (!value) return undefined;
    return cleanText(value, redactSecrets, includeFullUrls, max);
  };
  return {
    ...entry,
    source: sanitizeSource(entry.source),
    message: sanitizeMessage(entry.message, redactSecrets, includeFullUrls),
    details: clean(entry.details),
    stack: clean(entry.stack),
    url: sanitizeUrl(entry.url, includeFullUrls),
    tabTitle: clean(entry.tabTitle, 200),
    metadata: sanitizeMetadata(entry.metadata, redactSecrets, includeFullUrls),
  };
}
