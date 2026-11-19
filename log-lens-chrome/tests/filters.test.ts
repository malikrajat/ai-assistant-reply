import { describe, expect, it } from 'vitest';
import {
  countByLevel,
  filterEntries,
  latestTimestamp,
  listSources,
} from '../src/shared/filters';
import type { FilterState } from '../src/shared/types';
import { entry } from './helpers';

const NOW = Date.parse('2026-11-07T12:00:00.000Z');
const base: FilterState = { search: '', level: 'all', source: '', timeRange: 'all' };

const entries = [
  entry({
    id: 'a',
    timestamp: '2026-11-07T11:59:00.000Z',
    level: 'error',
    source: 'network',
    message: 'HTTP 500 from API',
    url: 'https://example.com/path',
  }),
  entry({
    id: 'b',
    timestamp: '2026-11-07T11:00:00.000Z',
    level: 'failure',
    source: 'page',
    message: 'Unhandled rejection',
    details: 'Cannot read properties of undefined',
  }),
  entry({
    id: 'c',
    timestamp: '2026-11-06T12:00:00.000Z',
    level: 'warn',
    source: 'extension',
    message: 'Deprecated option',
  }),
  entry({
    id: 'd',
    timestamp: '2026-10-01T12:00:00.000Z',
    level: 'info',
    source: 'external',
    message: 'External entry',
  }),
];

describe('filters', () => {
  it('searches message, details, source, url, and metadata', () => {
    expect(filterEntries(entries, { ...base, search: 'http 500' }, NOW).map((e) => e.id)).toEqual([
      'a',
    ]);
    expect(filterEntries(entries, { ...base, search: 'undefined' }, NOW).map((e) => e.id)).toEqual([
      'b',
    ]);
    expect(filterEntries(entries, { ...base, search: 'external' }, NOW).map((e) => e.id)).toEqual([
      'd',
    ]);
  });

  it('filters by level and source', () => {
    expect(filterEntries(entries, { ...base, level: 'failure' }, NOW).map((e) => e.id)).toEqual([
      'b',
    ]);
    expect(filterEntries(entries, { ...base, source: 'page' }, NOW).map((e) => e.id)).toEqual([
      'b',
    ]);
  });

  it('applies time ranges relative to now', () => {
    expect(
      filterEntries(entries, { ...base, timeRange: 'hour' }, NOW).map((e) => e.id),
    ).toEqual(['a', 'b']);
    expect(
      filterEntries(entries, { ...base, timeRange: 'day' }, NOW).map((e) => e.id),
    ).toEqual(['a', 'b', 'c']);
    expect(
      filterEntries(entries, { ...base, timeRange: 'week' }, NOW).map((e) => e.id),
    ).toEqual(['a', 'b', 'c']);
    expect(filterEntries(entries, { ...base, timeRange: 'all' }, NOW)).toHaveLength(4);
  });

  it('sorts newest first and lists unique sources', () => {
    expect(filterEntries(entries, base, NOW).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(listSources(entries)).toEqual(['extension', 'external', 'network', 'page']);
  });

  it('counts levels and finds the latest timestamp', () => {
    expect(countByLevel(entries)).toMatchObject({ error: 1, failure: 1, warn: 1, info: 1, debug: 0 });
    expect(latestTimestamp(entries)).toBe('2026-11-07T11:59:00.000Z');
    expect(latestTimestamp([])).toBeNull();
  });
});
