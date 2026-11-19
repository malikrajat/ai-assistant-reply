import type { PageErrorDetail } from '../background/log-capture';
import type { RuntimeMessage } from '../shared/types';

declare global {
  interface Window {
    __logLensContentLoaded?: boolean;
  }
}

(() => {
  if (window.__logLensContentLoaded) return;
  window.__logLensContentLoaded = true;

  const EVENT_NAME = 'log-lens:page-error';
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

  window.addEventListener(EVENT_NAME, (event: Event) => {
    if (!canSend()) return;
    const detail = (event as CustomEvent<PageErrorDetail>).detail;
    if (!detail || typeof detail.message !== 'string' || !detail.message.trim()) return;
    const message: RuntimeMessage = {
      type: 'LOG_LENS/ADD',
      entry: {
        level: 'error',
        source: detail.kind === 'console' ? 'console.error' : 'page',
        message: detail.message.slice(0, 4_000),
        stack: detail.stack?.slice(0, 24_000),
        details: detail.args?.slice(0, 12_000),
        url: location.href,
        metadata: {
          kind: detail.kind,
          filename: detail.filename,
          line: detail.line,
          column: detail.column,
        },
      },
    };
    try {
      void chrome.runtime.sendMessage(message).catch(() => {
        // The service worker may be restarting; the next event will retry.
      });
    } catch {
      // Extension context invalidated after an update. Ignore.
    }
  });
})();
