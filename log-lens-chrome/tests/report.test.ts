import { describe, expect, it } from 'vitest';
import {
  MAX_EMAIL_BODY,
  buildEmailRequest,
  buildExportFilename,
  buildPanelScreenshotFilename,
  buildSendPayload,
  buildTextReport,
  createEnvironmentInfo,
  formatTimestampForFilename,
} from '../src/shared/report';
import { entry, settings } from './helpers';

const environment = createEnvironmentInfo(
  '1.1.0',
  'Mozilla/5.0 Chrome/141.0.7390.55 Safari/537.36',
  'Win32',
  new Date('2026-11-07T14:32:10.482Z'),
);

const entries = [
  entry({ id: 'a', timestamp: '2026-11-07T12:00:02.000Z', message: 'second', level: 'failure' }),
  entry({
    id: 'b',
    timestamp: '2026-11-07T12:00:01.000Z',
    message: 'first token=supersecret',
    level: 'error',
    details: 'password=hunter2',
  }),
];

describe('report', () => {
  it('includes the environment header and entries in order', () => {
    const report = buildTextReport(entries, settings(), environment);
    expect(report).toContain('Log Lens for Chrome');
    expect(report).toContain('Version: 1.1.0');
    expect(report).toContain('Chrome: 141.0.7390.55');
    expect(report).toContain('Entries: 2');
    expect(report.indexOf('second')).toBeLessThan(report.indexOf('first'));
  });

  it('redacts secrets again before export', () => {
    const report = buildTextReport(entries, settings(), environment);
    expect(report).not.toContain('supersecret');
    expect(report).not.toContain('hunter2');
    expect(report).toContain('[REDACTED]');
  });

  it('can omit the environment header', () => {
    const report = buildTextReport(entries, settings({ includeEnvironment: false }), environment);
    expect(report).not.toContain('User agent:');
    expect(report).toContain('Log Lens error logs (2 entries)');
  });

  it('builds email subject, recipient, body, and mailto URL', () => {
    const request = buildEmailRequest(entries, settings({ supportEmail: 'dev@example.com' }), environment);
    expect(request.to).toBe('dev@example.com');
    expect(request.subject).toBe('Log Lens error logs (2 entries)');
    expect(request.body).toContain('second');
    expect(request.mailto).toContain('mailto:dev%40example.com');
    expect(request.mailto).toContain('subject=Log%20Lens%20error%20logs%20(2%20entries)');
  });

  it('truncates email bodies to a safe size', () => {
    const huge = Array.from({ length: 400 }, (_, index) =>
      entry({ id: `e-${index}`, message: 'x'.repeat(2000) }),
    );
    const request = buildEmailRequest(huge, settings(), environment);
    expect(request.body.length).toBeLessThanOrEqual(MAX_EMAIL_BODY + 100);
    expect(request.body).toContain('truncated');
  });

  it('builds stable payloads and filenames', () => {
    const payload = buildSendPayload('1.1.0', entries, new Date('2026-11-07T12:00:00.000Z'));
    expect(payload).toMatchObject({
      extension: 'log-lens-chrome',
      version: '1.1.0',
      sentAt: '2026-11-07T12:00:00.000Z',
    });
    expect(payload.entries).toHaveLength(2);
    expect(formatTimestampForFilename(new Date('2026-11-07T14:32:10'))).toBe('2026-11-07_14-32-10');
    expect(buildExportFilename(new Date('2026-11-07T14:32:10'))).toBe(
      'log-lens-errors-2026-11-07_14-32-10.log',
    );
    expect(buildPanelScreenshotFilename('png', new Date('2026-11-07T14:32:10'))).toBe(
      'log-lens-panel-2026-11-07_14-32-10.png',
    );
    expect(buildPanelScreenshotFilename('jpeg', new Date('2026-11-07T14:32:10'))).toBe(
      'log-lens-panel-2026-11-07_14-32-10.jpg',
    );
  });
});
