import type { AddLogInput } from '../shared/types';
import { networkFailureToInput } from './log-capture';

export interface NetworkCaptureController {
  install: () => void;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

type AddLog = (input: AddLogInput) => Promise<unknown>;

/**
 * Optional webRequest observer. It records only metadata: URL (sanitized later),
 * method, type, status, and error. Request/response bodies, cookies, and headers
 * are never read.
 */
export function createNetworkCapture(
  addLog: AddLog,
  now: () => number = () => Date.now(),
): NetworkCaptureController {
  let enabled = false;
  let installed = false;
  let delivered = 0;
  let windowStartedAt = now();
  const RATE_LIMIT = 60;
  const RATE_WINDOW = 60_000;
  const titleCache = new Map<number, { title: string; at: number }>();

  const canSend = (): boolean => {
    const timestamp = now();
    if (timestamp - windowStartedAt > RATE_WINDOW) {
      windowStartedAt = timestamp;
      delivered = 0;
    }
    if (delivered >= RATE_LIMIT) return false;
    delivered += 1;
    return true;
  };

  const getTitle = async (tabId: number | undefined): Promise<string | undefined> => {
    if (tabId === undefined || tabId < 0) return undefined;
    const cached = titleCache.get(tabId);
    if (cached && now() - cached.at < 30_000) return cached.title;
    try {
      const tab = await chrome.tabs.get(tabId);
      const title = tab.title?.slice(0, 200);
      if (title) titleCache.set(tabId, { title, at: now() });
      return title;
    } catch {
      return undefined;
    }
  };

  const onErrorOccurred = (details: chrome.webRequest.OnErrorOccurredDetails): void => {
    if (!enabled || !canSend()) return;
    void (async () => {
      const tabTitle = await getTitle(details.tabId);
      await addLog(
        networkFailureToInput(
          {
            url: details.url,
            method: details.method,
            type: details.type,
            tabId: details.tabId >= 0 ? details.tabId : undefined,
            error: details.error,
            fromCache: details.fromCache,
          },
          tabTitle,
        ),
      );
    })().catch(() => undefined);
  };

  const onCompleted = (details: chrome.webRequest.OnCompletedDetails): void => {
    if (!enabled || !canSend()) return;
    if (typeof details.statusCode !== 'number' || details.statusCode < 400) return;
    void (async () => {
      const tabTitle = await getTitle(details.tabId);
      await addLog(
        networkFailureToInput(
          {
            url: details.url,
            method: details.method,
            type: details.type,
            tabId: details.tabId >= 0 ? details.tabId : undefined,
            statusCode: details.statusCode,
            statusLine: details.statusLine,
            fromCache: details.fromCache,
          },
          tabTitle,
        ),
      );
    })().catch(() => undefined);
  };

  const install = (): void => {
    if (installed) return;
    installed = true;
    try {
      chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, {
        urls: ['http://*/*', 'https://*/*'],
      });
      chrome.webRequest.onCompleted.addListener(onCompleted, {
        urls: ['http://*/*', 'https://*/*'],
      });
    } catch {
      installed = false;
    }
  };

  const dispose = (): void => {
    if (!installed) return;
    try {
      chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurred);
      chrome.webRequest.onCompleted.removeListener(onCompleted);
    } catch {
      // Permission may already be gone.
    }
    installed = false;
  };

  return {
    install,
    setEnabled: (value: boolean) => {
      enabled = value;
    },
    dispose,
  };
}
