import { sanitizeUrl } from '../shared/redaction';
import type { AddLogInput } from '../shared/types';

export interface PageErrorDetail {
  kind: 'error' | 'rejection' | 'console';
  message: string;
  stack?: string;
  filename?: string;
  line?: number;
  column?: number;
  args?: string;
}

export function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name || 'Error', stack: error.stack };
  }
  if (error instanceof DOMException) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack };
  }
  if (typeof error === 'string') return { message: error };
  if (error === null || error === undefined) return { message: 'Unknown error' };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

export function extensionErrorToInput(event: ErrorEvent): AddLogInput {
  const { message, stack } = describeError(event.error ?? event.message);
  return {
    level: 'error',
    source: 'extension',
    message: message || 'Extension error',
    stack,
    url: event.filename || undefined,
    metadata: {
      line: event.lineno || undefined,
      column: event.colno || undefined,
    },
  };
}

export function rejectionToInput(reason: unknown): AddLogInput {
  const { message, stack } = describeError(reason);
  return {
    level: 'error',
    source: 'extension',
    message: message || 'Unhandled promise rejection',
    stack,
    metadata: { kind: 'unhandledrejection' },
  };
}

export function pageErrorToInput(
  detail: PageErrorDetail,
  sender: chrome.runtime.MessageSender,
): AddLogInput | null {
  if (!detail || typeof detail.message !== 'string' || !detail.message.trim()) return null;
  const source = detail.kind === 'console' ? 'console.error' : 'page';
  const filename = sanitizeUrl(detail.filename);
  const location = [filename, detail.line, detail.column]
    .filter((part) => part !== undefined && part !== '')
    .join(':');
  return {
    level: 'error',
    source,
    message: detail.message.slice(0, 4000),
    stack: detail.stack?.slice(0, 24_000),
    details: detail.args?.slice(0, 12_000) || location || undefined,
    url: sender.tab?.url ?? sender.url,
    tabId: sender.tab?.id,
    tabTitle: sender.tab?.title,
    metadata: {
      kind: detail.kind,
      frameId: sender.frameId,
      filename,
      line: detail.line,
      column: detail.column,
    },
  };
}

export interface NetworkFailureInfo {
  url: string;
  method?: string;
  type?: string;
  tabId?: number;
  statusCode?: number;
  statusLine?: string;
  error?: string;
  fromCache?: boolean;
}

export function networkFailureToInput(
  info: NetworkFailureInfo,
  tabTitle?: string,
): AddLogInput {
  const isHttpError = typeof info.statusCode === 'number';
  const message = isHttpError
    ? `HTTP ${info.statusCode} ${info.statusLine ?? ''}`.trim()
    : `Network request failed: ${info.error ?? 'unknown error'}`;
  const detailParts = [
    info.method ? `method=${info.method}` : '',
    info.type ? `type=${info.type}` : '',
    isHttpError ? `status=${info.statusCode}` : '',
    info.error ? `error=${info.error}` : '',
  ].filter(Boolean);
  return {
    level: 'failure',
    source: 'network',
    message,
    details: detailParts.join(' '),
    url: info.url,
    tabId: info.tabId,
    tabTitle,
    metadata: {
      method: info.method,
      type: info.type,
      statusCode: info.statusCode,
      statusLine: info.statusLine,
      error: info.error,
      fromCache: info.fromCache,
    },
  };
}

export function isHttpFailure(details: chrome.webRequest.OnCompletedDetails): boolean {
  return typeof details.statusCode === 'number' && details.statusCode >= 400;
}
