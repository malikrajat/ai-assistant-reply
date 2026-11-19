import { PAGE_CAPTURE_ORIGINS } from '../shared/permissions';
import type { LogLensSettings } from '../shared/types';

const MAIN_PAGE_SCRIPT = 'loglens-main-page-errors';
const MAIN_CONSOLE_SCRIPT = 'loglens-main-console-errors';
const ISOLATED_SCRIPT = 'loglens-isolated-page-bridge';
const OWN_SCRIPT_IDS = [MAIN_PAGE_SCRIPT, MAIN_CONSOLE_SCRIPT, ISOLATED_SCRIPT];

function hasPageCapturePermission(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.permissions.contains({ origins: [...PAGE_CAPTURE_ORIGINS] }, (granted) => {
        resolve(Boolean(granted));
      });
    } catch {
      resolve(false);
    }
  });
}

async function unregisterOwnScripts(): Promise<void> {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const ids = registered
      .map((script) => script.id)
      .filter((id) => OWN_SCRIPT_IDS.includes(id));
    if (ids.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids });
    }
  } catch {
    // Registration may not exist yet.
  }
}

let syncQueue: Promise<void> = Promise.resolve();

/**
 * Page capture is dynamic on purpose: no content script is registered until the
 * user enables page/console capture and grants the optional host permission.
 */
export function syncPageCaptureScripts(settings: LogLensSettings): Promise<void> {
  const run = syncQueue.then(
    () => syncPageCaptureScriptsInternal(settings),
    () => syncPageCaptureScriptsInternal(settings),
  );
  syncQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function syncPageCaptureScriptsInternal(settings: LogLensSettings): Promise<void> {
  const wantsPage = settings.capturePageErrors || settings.captureConsoleErrors;
  if (!wantsPage || !(await hasPageCapturePermission())) {
    await unregisterOwnScripts();
    return;
  }

  await unregisterOwnScripts();
  const scripts: chrome.scripting.RegisteredContentScript[] = [];

  if (settings.capturePageErrors) {
    scripts.push({
      id: MAIN_PAGE_SCRIPT,
      js: ['page-error-bridge.js'],
      matches: [...PAGE_CAPTURE_ORIGINS],
      runAt: 'document_start',
      allFrames: false,
      persistAcrossSessions: true,
      world: 'MAIN',
    });
  }
  if (settings.captureConsoleErrors) {
    scripts.push({
      id: MAIN_CONSOLE_SCRIPT,
      js: ['page-console-bridge.js'],
      matches: [...PAGE_CAPTURE_ORIGINS],
      runAt: 'document_start',
      allFrames: false,
      persistAcrossSessions: true,
      world: 'MAIN',
    });
  }

  scripts.push({
    id: ISOLATED_SCRIPT,
    js: ['content-script.js'],
    matches: [...PAGE_CAPTURE_ORIGINS],
    runAt: 'document_start',
    allFrames: false,
    persistAcrossSessions: true,
    world: 'ISOLATED',
  });

  try {
    await chrome.scripting.registerContentScripts(scripts);
  } catch {
    // A revoked permission or a Chrome restart can race this call. The next
    // settings change or startup will try again.
  }
}
