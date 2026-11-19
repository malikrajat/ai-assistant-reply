/**
 * Optional MAIN-world bridge for console.error. It is registered only when the
 * user turns on console capture. Arguments are serialized but page content is not
 * inspected beyond the values the page itself passed to console.error.
 */
(() => {
  const EVENT_NAME = 'log-lens:page-error';
  const original = console.error.bind(console);
  let delivered = 0;
  let windowStartedAt = Date.now();
  const RATE_LIMIT = 40;
  const RATE_WINDOW = 60_000;

  const canSend = (): boolean => {
    const now = Date.now();
    if (now - windowStartedAt > RATE_WINDOW) {
      windowStartedAt = now;
      delivered = 0;
    }
    if (delivered >= RATE_LIMIT) return false;
    delivered += 1;
    return true;
  };

  const stringify = (value: unknown): string => {
    if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
    if (typeof value === 'string') return value;
    try {
      const json = JSON.stringify(value);
      return json === undefined ? String(value) : json;
    } catch {
      return String(value);
    }
  };

  console.error = (...args: unknown[]): void => {
    original(...args);
    if (!canSend()) return;
    let message = 'console.error';
    let details = '';
    try {
      const [first, ...rest] = args;
      message = (typeof first === 'string' ? first : stringify(first)).slice(0, 4_000);
      details = rest.map(stringify).join(' ').slice(0, 12_000);
    } catch {
      // Never let capture break the page's logging call.
    }
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            kind: 'console',
            message: message || 'console.error',
            args: details,
            stack: new Error('console.error').stack?.slice(0, 24_000),
            filename: location.href,
          },
        }),
      );
    } catch {
      // Best-effort only.
    }
  };
})();
