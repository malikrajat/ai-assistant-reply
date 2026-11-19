/**
 * Runs in the page's MAIN world. It never reads page content: it only forwards
 * the browser's own error events (and console.error, when that separate bridge is
 * registered) to the isolated Log Lens content script.
 */
(() => {
  const EVENT_NAME = 'log-lens:page-error';
  const MAX_MESSAGE = 4_000;
  const MAX_STACK = 24_000;

  let delivered = 0;
  let windowStartedAt = Date.now();
  const RATE_LIMIT = 60;
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
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'string') return value;
    try {
      const json = JSON.stringify(value);
      return json === undefined ? String(value) : json;
    } catch {
      return String(value);
    }
  };

  const dispatch = (detail: Record<string, unknown>): void => {
    if (!canSend()) return;
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    } catch {
      // The isolated bridge is best-effort.
    }
  };

  window.addEventListener(
    'error',
    (event: Event) => {
      const errorEvent = event as ErrorEvent;
      if (errorEvent.target !== window && !errorEvent.error && !errorEvent.message) return;
      const error = errorEvent.error;
      const message = String(errorEvent.message || (error instanceof Error ? error.message : error) || 'Page error').slice(
        0,
        MAX_MESSAGE,
      );
      dispatch({
        kind: 'error',
        message,
        stack: error instanceof Error ? error.stack?.slice(0, MAX_STACK) : undefined,
        filename: errorEvent.filename?.slice(0, 2048),
        line: errorEvent.lineno,
        column: errorEvent.colno,
      });
    },
    true,
  );

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message || reason.name
        : stringify(reason).slice(0, MAX_MESSAGE);
    dispatch({
      kind: 'rejection',
      message: message || 'Unhandled promise rejection',
      stack: reason instanceof Error ? reason.stack?.slice(0, MAX_STACK) : undefined,
      filename: location.href,
    });
  });
})();
