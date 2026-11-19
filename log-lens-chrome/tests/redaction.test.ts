import { describe, expect, it } from 'vitest';
import {
  redactEntry,
  redactText,
  redactValue,
  sanitizeUrl,
} from '../src/shared/redaction';
import { entry } from './helpers';

describe('redaction', () => {
  it('redacts bearer tokens and authorization headers', () => {
    const text = redactText('Authorization: Bearer abcdefghijklmnopqrstuvwxyz token=super-secret');
    expect(text).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(text).not.toContain('super-secret');
    expect(text).toContain('[REDACTED]');
  });

  it('redacts assignment-style secrets and URL query values', () => {
    const text = redactText(
      'api_key=abcd1234&password=hunter2&token=xyz https://x.test/?access_token=abcdef',
    );
    expect(text).not.toContain('abcd1234');
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('abcdef');
  });

  it('redacts JWTs and credential-like long strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwxyz';
    const text = redactText(`jwt ${jwt} key sk-abcdefghijklmnopqrstuvwxyz123456`);
    expect(text).toContain('[REDACTED_JWT]');
    expect(text).toContain('[REDACTED_KEY]');
    expect(text).not.toContain(jwt);
  });

  it('redacts URL credentials and strips query strings by default', () => {
    expect(sanitizeUrl('https://user:pass@example.com/a?token=abc#frag')).toBe(
      'https://example.com/a',
    );
    expect(sanitizeUrl('not a url')).toBe('not a url');
  });

  it('keeps redacted query values when full URLs are enabled', () => {
    const url = sanitizeUrl('https://example.com/a?token=abc&ok=1', true);
    expect(url).toContain('token=[REDACTED]');
    expect(url).not.toContain('abc');
  });

  it('redacts sensitive metadata keys recursively', () => {
    const value = redactValue({
      headers: { authorization: 'Bearer abc', accept: 'json' },
      nested: [{ password: 'hunter2', count: 2 }],
    });
    expect(value).toEqual({
      headers: { authorization: '[REDACTED]', accept: 'json' },
      nested: [{ password: '[REDACTED]', count: 2 }],
    });
  });

  it('redacts every text field on an entry', () => {
    const redacted = redactEntry(
      entry({
        message: 'api_key=abcd1234',
        details: 'password=hunter2',
        stack: 'Authorization: Bearer abcdefghijklmnop',
        url: 'https://example.com/path?token=abc',
        metadata: { token: 'abc' },
        tabTitle: 'secret=abcdefgh',
      }),
    );
    expect(redacted.message).not.toContain('abcd1234');
    expect(redacted.details).not.toContain('hunter2');
    expect(redacted.stack).not.toContain('abcdefghijklmnop');
    expect(redacted.url).toBe('https://example.com/path');
    expect(redacted.metadata).toEqual({ token: '[REDACTED]' });
    expect(redacted.tabTitle).not.toContain('abcdefgh');
  });

  it('strips query strings from URLs embedded in free text and metadata', () => {
    const redacted = redactEntry(
      entry({
        message: 'Failed at https://app.example.com/checkout?token=abc&ok=1',
        details: 'see https://docs.example.com/help?secret=xyz',
        metadata: { request: 'https://api.example.com/v1/items?api_key=abc' },
      }),
    );
    expect(redacted.message).toContain('https://app.example.com/checkout');
    expect(redacted.message).not.toContain('token=');
    expect(redacted.details).toContain('https://docs.example.com/help');
    expect(JSON.stringify(redacted.metadata)).not.toContain('api_key');
  });

  it('can skip secret redaction when the user turns it off, but still sanitizes URLs', () => {
    const redacted = redactEntry(
      entry({ message: 'token=abc', url: 'https://example.com/a?token=abc' }),
      { redactSecrets: false },
    );
    expect(redacted.message).toBe('token=abc');
    expect(redacted.url).toBe('https://example.com/a');
  });
});
