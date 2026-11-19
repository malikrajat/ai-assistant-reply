import { redactEntry, truncate } from './redaction';
import type {
  EnvironmentInfo,
  LogEntry,
  LogLensSettings,
  SendPayload,
} from './types';

export const MAX_EMAIL_BODY = 18_000;
export const MAX_EXPORT_BYTES = 2_500_000;

export function formatTimestampForFilename(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function createEnvironmentInfo(
  version: string,
  userAgent: string,
  platform: string,
  generatedAt = new Date(),
): EnvironmentInfo {
  const chromeMatch = /Chrome\/([\d.]+)/.exec(userAgent);
  return {
    version,
    chromeVersion: chromeMatch?.[1] ?? 'unknown',
    platform,
    userAgent,
    generatedAt: generatedAt.toISOString(),
  };
}

export function formatEntry(entry: LogEntry, index?: number): string {
  const lines: string[] = [];
  const prefix = index === undefined ? '' : `#${index} `;
  lines.push(`${prefix}[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.source}`);
  lines.push(entry.message);
  if (entry.url) lines.push(`url: ${entry.url}`);
  if (entry.details) lines.push(`details:\n${entry.details}`);
  if (entry.stack) lines.push(`stack:\n${entry.stack}`);
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    try {
      lines.push(`metadata: ${JSON.stringify(entry.metadata, null, 2)}`);
    } catch {
      lines.push('metadata: [unserializable]');
    }
  }
  return lines.join('\n');
}

export function buildTextReport(
  entries: LogEntry[],
  settings: LogLensSettings,
  environment: EnvironmentInfo,
): string {
  const safeEntries = entries.map((entry) =>
    redactEntry(entry, {
      redactSecrets: settings.redactSecrets,
      includeFullUrls: settings.includeFullUrls,
    }),
  );
  const header: string[] = [];
  if (settings.includeEnvironment) {
    header.push(
      'Log Lens for Chrome',
      `Version: ${environment.version}`,
      `Chrome: ${environment.chromeVersion}`,
      `Platform: ${environment.platform}`,
      `Generated: ${environment.generatedAt}`,
      `Entries: ${safeEntries.length}`,
      `User agent: ${environment.userAgent}`,
      '-'.repeat(72),
      '',
    );
  } else {
    header.push(`Log Lens error logs (${safeEntries.length} entries)`, '');
  }

  const body = safeEntries.map((entry, index) => formatEntry(entry, index + 1)).join('\n\n');
  return `${header.join('\n')}${body}\n`;
}

export function buildJsonReport(
  entries: LogEntry[],
  settings: LogLensSettings,
  environment: EnvironmentInfo,
): string {
  const safeEntries = entries.map((entry) =>
    redactEntry(entry, {
      redactSecrets: settings.redactSecrets,
      includeFullUrls: settings.includeFullUrls,
    }),
  );
  return JSON.stringify(
    {
      extension: 'log-lens-chrome',
      version: environment.version,
      generatedAt: environment.generatedAt,
      environment: settings.includeEnvironment ? environment : undefined,
      entries: safeEntries,
    },
    null,
    2,
  );
}

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  mailto: string;
}

export function buildEmailRequest(
  entries: LogEntry[],
  settings: LogLensSettings,
  environment: EnvironmentInfo,
): EmailRequest {
  const subject = `Log Lens error logs (${entries.length} entries)`;
  const fullBody = buildTextReport(entries, settings, environment);
  const body = truncate(fullBody, MAX_EMAIL_BODY);
  const to = settings.supportEmail.trim();
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
  return { to, subject, body, mailto };
}

export function buildSendPayload(
  version: string,
  entries: LogEntry[],
  sentAt = new Date(),
): SendPayload {
  return {
    extension: 'log-lens-chrome',
    version,
    sentAt: sentAt.toISOString(),
    entries,
  };
}

export function buildExportFilename(date = new Date()): string {
  return `log-lens-errors-${formatTimestampForFilename(date)}.log`;
}

export function buildPanelScreenshotFilename(
  format: 'png' | 'jpeg',
  date = new Date(),
): string {
  return `log-lens-panel-${formatTimestampForFilename(date)}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

export function buildPageScreenshotFilename(
  format: 'png' | 'jpeg',
  date = new Date(),
): string {
  return `log-lens-page-${formatTimestampForFilename(date)}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}
