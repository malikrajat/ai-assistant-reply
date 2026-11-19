import { describe, expect, it, vi } from 'vitest';
import { NotificationService, shouldNotify } from '../src/background/notifications';
import { entry, settings } from './helpers';

function harness() {
  const create = vi.fn(
    async (_notificationId: string, _options: chrome.notifications.NotificationCreateOptions) =>
      'notification-id',
  );
  const service = new NotificationService({
    api: { create },
    iconUrl: 'chrome-extension://test/icons/icon128.png',
    now: () => 1_000_000,
    cooldownMs: 5_000,
  });
  return { service, create };
}

describe('notifications', () => {
  it('only notifies for errors when enabled', () => {
    expect(shouldNotify(entry({ level: 'error' }), settings())).toBe(true);
    expect(shouldNotify(entry({ level: 'failure' }), settings())).toBe(false);
    expect(shouldNotify(entry({ level: 'error' }), settings({ notificationsEnabled: false }))).toBe(
      false,
    );
  });

  it('creates a notification and rate-limits follow-ups', async () => {
    const h = harness();
    const first = await h.service.notify(entry({ message: 'boom' }), settings());
    const second = await h.service.notify(entry({ message: 'boom again' }), settings());
    expect(first).toBe('notification-id');
    expect(second).toBeNull();
    expect(h.create).toHaveBeenCalledTimes(1);
    const options = h.create.mock.calls[0]?.[1] as {
      title: string;
      message: string;
      buttons: Array<{ title: string }>;
    };
    expect(options.title).toBe('Log Lens captured an error');
    expect(options.buttons[0]?.title).toBe('Open Logs');
  });

  it('truncates very long messages', async () => {
    const h = harness();
    await h.service.notify(entry({ message: 'x'.repeat(300) }), settings());
    const options = h.create.mock.calls[0]?.[1] as { message: string };
    expect(options.message.length).toBeLessThanOrEqual(180);
    expect(options.message.endsWith('...')).toBe(true);
  });

  it('does nothing when notifications are disabled', async () => {
    const h = harness();
    expect(await h.service.notify(entry(), settings({ notificationsEnabled: false }))).toBeNull();
    expect(h.create).not.toHaveBeenCalled();
  });
});
