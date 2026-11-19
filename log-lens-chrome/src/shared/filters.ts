import type { FilterState, LogEntry, LogLevel, TimeRange } from './types';

export const TIME_RANGE_MS: Readonly<Record<Exclude<TimeRange, 'all'>, number>> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export const TIME_RANGE_LABELS: Readonly<Record<TimeRange, string>> = {
  hour: 'Last hour',
  day: 'Last 24 hours',
  week: 'Last 7 days',
  all: 'All time',
};

export const LEVEL_LABELS: Readonly<Record<LogLevel, string>> = {
  error: 'Error',
  failure: 'Failure',
  warn: 'Warning',
  info: 'Info',
  debug: 'Debug',
};

function searchableText(entry: LogEntry): string {
  const parts = [entry.message, entry.source, entry.details, entry.stack, entry.url];
  if (entry.metadata) {
    try {
      parts.push(JSON.stringify(entry.metadata));
    } catch {
      // Ignore unserializable metadata.
    }
  }
  return parts.filter(Boolean).join('\n').toLowerCase();
}

export function filterEntries(
  entries: LogEntry[],
  filters: FilterState,
  now = Date.now(),
): LogEntry[] {
  const query = filters.search.trim().toLowerCase();
  const cutoff =
    filters.timeRange === 'all'
      ? 0
      : now - TIME_RANGE_MS[filters.timeRange as Exclude<TimeRange, 'all'>];

  return entries
    .filter((entry) => {
      if (filters.level !== 'all' && entry.level !== filters.level) return false;
      if (filters.source && entry.source !== filters.source) return false;
      const timestamp = Date.parse(entry.timestamp);
      if (Number.isFinite(timestamp) && timestamp < cutoff) return false;
      if (query && !searchableText(entry).includes(query)) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function listSources(entries: LogEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.source))].sort((a, b) => a.localeCompare(b));
}

export function countByLevel(entries: LogEntry[]): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = {
    error: 0,
    failure: 0,
    warn: 0,
    info: 0,
    debug: 0,
  };
  for (const entry of entries) counts[entry.level] += 1;
  return counts;
}

export function latestTimestamp(entries: LogEntry[]): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const ms = Date.parse(entry.timestamp);
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latest = entry.timestamp;
    }
  }
  return latest;
}
