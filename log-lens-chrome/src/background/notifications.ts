import type { LogEntry, LogLensSettings } from '../shared/types';

export interface NotificationApi {
  create(
    notificationId: string,
    options: chrome.notifications.NotificationCreateOptions,
  ): Promise<string>;
}

export interface NotificationDeps {
  api: NotificationApi;
  iconUrl: string;
  now?: () => number;
  cooldownMs?: number;
}

export function shouldNotify(entry: LogEntry, settings: LogLensSettings): boolean {
  return settings.notificationsEnabled && entry.level === 'error';
}

/** Rate-limited desktop notification for new errors only. */
export class NotificationService {
  private lastNotificationAt = Number.NEGATIVE_INFINITY;
  private readonly now: () => number;
  private readonly cooldownMs: number;

  constructor(private readonly deps: NotificationDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.cooldownMs = deps.cooldownMs ?? 8_000;
  }

  async notify(entry: LogEntry, settings: LogLensSettings): Promise<string | null> {
    if (!shouldNotify(entry, settings)) return null;
    const now = this.now();
    if (now - this.lastNotificationAt < this.cooldownMs) return null;
    this.lastNotificationAt = now;
    const message = entry.message.length > 180 ? `${entry.message.slice(0, 177)}...` : entry.message;
    return this.deps.api.create(`loglens-error-${now}`, {
      type: 'basic',
      iconUrl: this.deps.iconUrl,
      title: 'Log Lens captured an error',
      message,
      contextMessage: entry.source,
      buttons: [{ title: 'Open Logs' }],
      priority: 2,
      requireInteraction: false,
    });
  }
}
