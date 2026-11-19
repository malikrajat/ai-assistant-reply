import { describe, expect, it, vi } from 'vitest';
import { applyBadge, computeBadgeText, countErrors } from '../src/background/badge';
import type { LogLensStatus } from '../src/shared/types';
import { entry, settings } from './helpers';

const status: LogLensStatus = {
  entryCount: 5,
  errorCount: 2,
  failureCount: 1,
  warningCount: 1,
  lastErrorAt: '2026-11-07T12:00:00.000Z',
  outboxCount: 0,
  capturePaused: false,
  autoSendEnabled: false,
  autoSendConsent: false,
};

describe('badge', () => {
  it('formats and hides the error count', () => {
    expect(computeBadgeText(0)).toBe('');
    expect(computeBadgeText(1)).toBe('1');
    expect(computeBadgeText(99)).toBe('99');
    expect(computeBadgeText(100)).toBe('99+');
  });

  it('counts errors and failures', () => {
    expect(
      countErrors([
        entry({ level: 'error' }),
        entry({ level: 'failure' }),
        entry({ level: 'warn' }),
      ]),
    ).toBe(2);
  });

  it('applies the badge and title', async () => {
    const api = {
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setTitle: vi.fn(async () => undefined),
    };
    await applyBadge(status, settings(), api);
    expect(api.setBadgeText).toHaveBeenCalledWith({ text: '3' });
    expect(api.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#dc2626' });
    expect(api.setTitle).toHaveBeenCalledWith({ title: 'Log Lens - 3 errors' });
  });

  it('hides the badge when status badges are disabled', async () => {
    const api = {
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setTitle: vi.fn(async () => undefined),
    };
    await applyBadge(status, settings({ statusBadge: false }), api);
    expect(api.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(api.setTitle).toHaveBeenCalledWith({ title: 'Log Lens' });
  });
});
