import { describe, expect, it } from 'vitest';
import {
  isTrustedInternalSender,
  MAX_EXTERNAL_PAYLOAD_BYTES,
  originOf,
  validateExternalMessage,
} from '../src/shared/messaging';
import { settings } from './helpers';

const trusted = settings({
  allowedExternalIds: ['abcdefghijklmnopabcdefghijklmnop'],
  allowedOrigins: ['https://app.example.com'],
});

function sender(overrides: chrome.runtime.MessageSender = {}): chrome.runtime.MessageSender {
  return { id: 'abcdefghijklmnopabcdefghijklmnop', ...overrides };
}

describe('external messaging', () => {
  it('answers PING without approval', () => {
    const result = validateExternalMessage({ type: 'LOG_LENS/PING' }, sender({ id: 'other' }), trusted);
    expect(result.ok).toBe(true);
    expect(result.authorized).toBe(false);
    expect(result.message?.type).toBe('LOG_LENS/PING');
  });

  it('rejects an unapproved extension', () => {
    const result = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { message: 'hello' } },
      sender({ id: 'unapproved-extension' }),
      trusted,
    );
    expect(result.ok).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.error).toMatch(/not approved/i);
  });

  it('accepts an allow-listed extension and normalizes the entry', () => {
    const result = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { level: 'failure', message: '  broke  ', source: 'friend' } },
      sender(),
      trusted,
    );
    expect(result.ok).toBe(true);
    expect(result.authorized).toBe(true);
    expect(result.message).toMatchObject({
      type: 'LOG_LENS/ADD',
      entry: { level: 'failure', message: 'broke', source: 'friend' },
    });
  });

  it('accepts an approved web origin', () => {
    const result = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { message: 'from the web' } },
      { origin: 'https://app.example.com', url: 'https://app.example.com/a' },
      trusted,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects unknown origins even if the URL looks approved', () => {
    const result = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { message: 'nope' } },
      { origin: 'https://evil.example.com', url: 'https://app.example.com/a' },
      trusted,
    );
    expect(result.ok).toBe(false);
  });

  it('validates levels, messages, metadata, and payload size', () => {
    const badLevel = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { level: 'critical', message: 'x' } },
      sender(),
      trusted,
    );
    expect(badLevel.ok).toBe(false);

    const empty = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { message: '   ' } },
      sender(),
      trusted,
    );
    expect(empty.ok).toBe(false);

    const metadata = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { message: 'x', metadata: [] } },
      sender(),
      trusted,
    );
    expect(metadata.ok).toBe(false);

    const huge = validateExternalMessage(
      { type: 'LOG_LENS/ADD', entry: { message: 'x'.repeat(MAX_EXTERNAL_PAYLOAD_BYTES + 1) } },
      sender(),
      trusted,
    );
    expect(huge.ok).toBe(false);
  });

  it('rejects non-object and unsupported messages', () => {
    expect(validateExternalMessage('hi', sender(), trusted).ok).toBe(false);
    expect(validateExternalMessage({ type: 'OTHER' }, sender(), trusted).ok).toBe(false);
  });

  it('recognizes internal senders and parses origins', () => {
    expect(isTrustedInternalSender({ id: 'test-extension-id' })).toBe(true);
    expect(isTrustedInternalSender({ id: 'other' })).toBe(false);
    expect(originOf('https://example.com/path?x=1')).toBe('https://example.com');
    expect(originOf('nope')).toBeNull();
    expect(originOf(undefined)).toBeNull();
  });
});
