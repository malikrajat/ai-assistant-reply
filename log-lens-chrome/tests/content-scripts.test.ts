import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncPageCaptureScripts } from '../src/background/content-scripts';
import { settings } from './helpers';

interface Registered {
  id: string;
  js: string[];
  matches: string[];
  world?: string;
}

function harness(permissionGranted: boolean) {
  let registered: Registered[] = [];
  const registerContentScripts = vi.fn(async (scripts: Registered[]) => {
    registered = scripts;
  });
  const unregisterContentScripts = vi.fn(async ({ ids }: { ids: string[] }) => {
    registered = registered.filter((script) => !ids.includes(script.id));
  });
  const getRegisteredContentScripts = vi.fn(async () => registered);
  const contains = vi.fn(
    (_details: chrome.permissions.Permissions, callback: (granted: boolean) => void) => {
      callback(permissionGranted);
    },
  );
  vi.stubGlobal('chrome', {
    permissions: { contains },
    scripting: { registerContentScripts, unregisterContentScripts, getRegisteredContentScripts },
  });
  return { registerContentScripts, unregisterContentScripts, getRegisteredContentScripts, contains, getRegistered: () => registered };
}

describe('dynamic page capture registration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the MAIN bridge and isolated script only when enabled and granted', async () => {
    const h = harness(true);
    await syncPageCaptureScripts(settings({ capturePageErrors: true }));
    expect(h.registerContentScripts).toHaveBeenCalledTimes(1);
    const scripts = h.getRegistered();
    expect(scripts.map((script) => script.id).sort()).toEqual([
      'loglens-isolated-page-bridge',
      'loglens-main-page-errors',
    ]);
    expect(scripts.find((script) => script.id === 'loglens-main-page-errors')?.world).toBe('MAIN');
    expect(scripts.find((script) => script.id === 'loglens-isolated-page-bridge')?.world).toBe(
      'ISOLATED',
    );
    expect(scripts.every((script) => script.matches.includes('https://*/*'))).toBe(true);
  });

  it('adds the console bridge when console capture is enabled', async () => {
    const h = harness(true);
    await syncPageCaptureScripts(
      settings({ capturePageErrors: true, captureConsoleErrors: true }),
    );
    expect(h.getRegistered().map((script) => script.id).sort()).toEqual([
      'loglens-isolated-page-bridge',
      'loglens-main-console-errors',
      'loglens-main-page-errors',
    ]);
  });

  it('does not register anything without the optional host permission', async () => {
    const h = harness(false);
    await syncPageCaptureScripts(settings({ capturePageErrors: true }));
    expect(h.registerContentScripts).not.toHaveBeenCalled();
  });

  it('unregisters its scripts when capture is disabled', async () => {
    const h = harness(true);
    await syncPageCaptureScripts(settings({ capturePageErrors: true }));
    expect(h.getRegistered()).toHaveLength(2);
    await syncPageCaptureScripts(settings({ capturePageErrors: false }));
    expect(h.getRegistered()).toHaveLength(0);
    expect(h.unregisterContentScripts).toHaveBeenCalled();
  });
});
