import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  endpointPermissionPattern,
  isAllowedEndpoint,
  isLevelEnabled,
  isLevelSendable,
  isValidEmail,
  needsEndpointPermission,
  normalizeOrigins,
  normalizeSettings,
  parseHeaderJson,
} from '../src/shared/settings';

describe('settings', () => {
  it('ships safe defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      captureLevel: 'error',
      errorOnly: true,
      capturePageErrors: false,
      captureNetworkFailures: false,
      autoOpen: 'on-error',
      autoSendEnabled: false,
      autoSendConsent: false,
      maxEntries: 200,
      retentionDays: 7,
      redactSecrets: true,
      statusBadge: true,
    });
  });

  it('normalizes unknown data and clamps numbers', () => {
    const result = normalizeSettings({
      captureLevel: 'nope',
      maxEntries: 999_999,
      retentionDays: -4,
      autoSendIntervalMinutes: 9999,
      autoSendRetries: -2,
      autoSendTimeoutMs: 1,
      unknown: true,
    });
    expect(result.captureLevel).toBe('error');
    expect(result.maxEntries).toBe(2000);
    expect(result.retentionDays).toBe(1);
    expect(result.autoSendIntervalMinutes).toBe(1440);
    expect(result.autoSendRetries).toBe(0);
    expect(result.autoSendTimeoutMs).toBe(1000);
  });

  it('forces auto-send off without explicit consent', () => {
    const result = normalizeSettings({ autoSendEnabled: true, autoSendConsent: false });
    expect(result.autoSendEnabled).toBe(false);
    const consented = normalizeSettings({ autoSendEnabled: true, autoSendConsent: true });
    expect(consented.autoSendEnabled).toBe(true);
  });

  it('validates HTTPS endpoints and allows localhost development', () => {
    expect(isAllowedEndpoint('https://logs.example.com/ingest')).toBe(true);
    expect(isAllowedEndpoint('http://localhost:8787/logs')).toBe(true);
    expect(isAllowedEndpoint('http://127.0.0.1:8787/logs')).toBe(true);
    expect(isAllowedEndpoint('http://example.com/logs')).toBe(false);
    expect(isAllowedEndpoint('ftp://example.com/logs')).toBe(false);
    expect(isAllowedEndpoint('https://user:pass@example.com/logs')).toBe(false);
    expect(endpointPermissionPattern('https://logs.example.com/ingest')).toBe(
      'https://logs.example.com/*',
    );
    expect(endpointPermissionPattern('https://logs.example.com:8443/ingest')).toBe(
      'https://logs.example.com/*',
    );
    expect(needsEndpointPermission('https://logs.example.com/ingest')).toBe(true);
    expect(needsEndpointPermission('http://localhost:3000/ingest')).toBe(false);
    expect(needsEndpointPermission('http://127.0.0.1:3000/ingest')).toBe(false);
    expect(needsEndpointPermission('http://example.com/ingest')).toBe(false);
  });

  it('parses header JSON strictly', () => {
    expect(parseHeaderJson('{"Authorization":"Bearer x","X-Count":2}')).toEqual({
      ok: true,
      headers: { Authorization: 'Bearer x', 'X-Count': '2' },
    });
    expect(parseHeaderJson('[]').ok).toBe(false);
    expect(parseHeaderJson('{').ok).toBe(false);
    expect(parseHeaderJson('{"X-Obj":{"a":1}}').ok).toBe(false);
    expect(parseHeaderJson('{"Bad Header":"x"}').ok).toBe(false);
    expect(parseHeaderJson('{"X-Test":"line\\nbreak"}').ok).toBe(false);
  });

  it('normalizes approved origins and rejects paths', () => {
    expect(normalizeOrigins(['https://app.example.com/path', 'https://app.example.com'])).toEqual([
      'https://app.example.com',
    ]);
    expect(normalizeOrigins(['not-an-origin'])).toEqual([]);
    expect(normalizeOrigins(['ftp://example.com'])).toEqual([]);
  });

  it('evaluates capture and send levels', () => {
    const errorsOnly = normalizeSettings({ errorOnly: true, captureLevel: 'debug' });
    expect(isLevelEnabled('error', errorsOnly)).toBe(true);
    expect(isLevelEnabled('failure', errorsOnly)).toBe(true);
    expect(isLevelEnabled('warn', errorsOnly)).toBe(false);

    const debug = normalizeSettings({ errorOnly: false, captureLevel: 'debug' });
    expect(isLevelEnabled('debug', debug)).toBe(true);
    expect(isLevelSendable('error', normalizeSettings({ autoSendLevel: 'error' }))).toBe(true);
    expect(isLevelSendable('warn', normalizeSettings({ autoSendLevel: 'error' }))).toBe(false);
  });

  it('validates email addresses', () => {
    expect(isValidEmail('dev@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});
