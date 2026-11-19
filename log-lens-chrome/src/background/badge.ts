import type { LogEntry, LogLensSettings, LogLensStatus } from '../shared/types';

export function computeBadgeText(errorCount: number): string {
  if (errorCount <= 0) return '';
  if (errorCount > 99) return '99+';
  return String(errorCount);
}

export function countErrors(entries: LogEntry[]): number {
  return entries.filter((entry) => entry.level === 'error' || entry.level === 'failure').length;
}

export interface BadgeApi {
  setBadgeText(details: { text: string }): Promise<void>;
  setBadgeBackgroundColor(details: { color: string }): Promise<void>;
  setTitle(details: { title: string }): Promise<void>;
}

export async function applyBadge(
  status: LogLensStatus,
  settings: LogLensSettings,
  api: BadgeApi,
): Promise<void> {
  const count = status.errorCount + status.failureCount;
  const text = settings.statusBadge ? computeBadgeText(count) : '';
  await api.setBadgeText({ text });
  if (text) {
    await api.setBadgeBackgroundColor({ color: '#dc2626' });
  }
  await api.setTitle({
    title: text ? `Log Lens - ${count} error${count === 1 ? '' : 's'}` : 'Log Lens',
  });
}
