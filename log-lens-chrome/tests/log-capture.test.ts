import { describe, expect, it } from 'vitest';
import {
  describeError,
  extensionErrorToInput,
  networkFailureToInput,
  pageErrorToInput,
  rejectionToInput,
} from '../src/background/log-capture';

const sender: chrome.runtime.MessageSender = {
  id: 'test-extension-id',
  tab: {
    id: 7,
    title: 'Example',
    url: 'https://example.com/page?secret=1',
  } as unknown as chrome.tabs.Tab,
  frameId: 0,
};

describe('log capture', () => {
  it('describes errors, strings, and unknown values', () => {
    expect(describeError(new Error('boom'))).toMatchObject({ message: 'boom' });
    expect(describeError('plain')).toEqual({ message: 'plain' });
    expect(describeError(42)).toEqual({ message: '42' });
  });

  it('builds an extension error entry', () => {
    const event = new ErrorEvent('error', {
      message: 'extension failed',
      error: new Error('extension failed'),
      filename: 'chrome-extension://test/service-worker.js',
      lineno: 12,
      colno: 4,
    });
    const input = extensionErrorToInput(event);
    expect(input).toMatchObject({ level: 'error', source: 'extension', message: 'extension failed' });
    expect(input.metadata).toMatchObject({ line: 12, column: 4 });
  });

  it('builds a rejection entry', () => {
    const input = rejectionToInput(new TypeError('nope'));
    expect(input).toMatchObject({ level: 'error', source: 'extension', message: 'nope' });
  });

  it('builds page and console entries without reading page content', () => {
    const page = pageErrorToInput(
      {
        kind: 'error',
        message: 'page blew up',
        stack: 'stack',
        filename: 'https://example.com/app.js',
        line: 3,
        column: 9,
      },
      sender,
    );
    expect(page).toMatchObject({
      level: 'error',
      source: 'page',
      message: 'page blew up',
      tabId: 7,
      tabTitle: 'Example',
    });
    expect(page?.url).toBe('https://example.com/page?secret=1');
    expect(page?.metadata).toMatchObject({ kind: 'error', frameId: 0 });

    const consoleEntry = pageErrorToInput(
      { kind: 'console', message: 'console says', args: '{"a":1}' },
      sender,
    );
    expect(consoleEntry?.source).toBe('console.error');
    expect(consoleEntry?.details).toBe('{"a":1}');

    expect(pageErrorToInput({ kind: 'error', message: '   ' }, sender)).toBeNull();
  });

  it('records network failures as metadata only', () => {
    const failed = networkFailureToInput(
      {
        url: 'https://api.example.com/users?token=secret',
        method: 'GET',
        type: 'xmlhttprequest',
        tabId: 7,
        error: 'net::ERR_FAILED',
      },
      'Example',
    );
    expect(failed).toMatchObject({ level: 'failure', source: 'network', tabId: 7 });
    expect(failed.message).toContain('net::ERR_FAILED');
    expect(JSON.stringify(failed)).not.toContain('cookie');
    expect(JSON.stringify(failed)).not.toContain('requestBody');

    const http = networkFailureToInput({
      url: 'https://api.example.com/users',
      method: 'POST',
      type: 'xmlhttprequest',
      statusCode: 503,
      statusLine: 'Service Unavailable',
    });
    expect(http.message).toBe('HTTP 503 Service Unavailable');
    expect(http.metadata).toMatchObject({ method: 'POST', statusCode: 503 });
  });
});
