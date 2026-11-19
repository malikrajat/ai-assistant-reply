import domtoimage from 'dom-to-image-more';
import {
  buildEmailRequest,
  buildPanelScreenshotFilename,
  buildTextReport,
} from '../shared/report';
import type {
  DownloadResult,
  EnvironmentInfo,
  FilterState,
  LogEntry,
  LogLensState,
  OperationResult,
  RuntimeMessage,
  ScreenshotFormat,
} from '../shared/types';
import { chooseDialog, confirmAction, openModal } from './dialog';
import { copyText, create, toast } from './dom';

export interface DownloadLike {
  downloadId: number;
  filename: string;
  path?: string;
}

export function isDownloadResult(value: unknown): value is DownloadResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DownloadResult).downloadId === 'number' &&
    typeof (value as DownloadResult).filename === 'string'
  );
}

export function isOperationError(value: unknown): value is OperationResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as OperationResult).ok === false
  );
}

export async function sendRuntime<T>(message: RuntimeMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as T;
  return response;
}

export async function sendOperation(message: RuntimeMessage): Promise<OperationResult> {
  const response = await sendRuntime<OperationResult>(message);
  if (isOperationError(response)) throw new Error(response.error ?? 'Operation failed.');
  return response;
}

export async function fetchState(): Promise<LogLensState> {
  const state = await sendRuntime<LogLensState>({ type: 'LOG_LENS/GET_STATE' });
  if (!state || !Array.isArray(state.entries)) {
    throw new Error('Log Lens did not return a valid state.');
  }
  return state;
}

export async function fetchEnvironment(): Promise<EnvironmentInfo> {
  return sendRuntime<EnvironmentInfo>({ type: 'LOG_LENS/GET_ENVIRONMENT' });
}

export function openOptions(): void {
  void chrome.runtime.openOptionsPage();
}

export function openLogsPage(query = ''): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(`logs.html${query}`) });
}

export async function copyAll(state: LogLensState): Promise<void> {
  const environment = await fetchEnvironment();
  const text = buildTextReport(state.entries, state.settings, environment);
  const ok = await copyText(text);
  toast(ok ? `Copied ${state.entries.length} entries.` : 'Could not copy logs.', ok ? 'success' : 'error');
}

export async function exportLogs(saveAs = true): Promise<void> {
  try {
    const result = await sendRuntime<DownloadResult | OperationResult>({
      type: 'LOG_LENS/EXPORT',
      saveAs,
    });
    if (!isDownloadResult(result)) {
      throw new Error(result.error ?? 'Export failed.');
    }
    const path = await resolveDownloadPath(result.downloadId);
    toast(path ? `Exported to ${path}` : `Exported ${result.filename}`, 'success');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Export failed.', 'error');
  }
}

export async function clearLogs(): Promise<void> {
  const confirmed = await confirmAction({
    title: 'Clear all logs?',
    message:
      'This permanently removes every captured entry and the pending auto-send outbox. This cannot be undone.',
    confirmLabel: 'Clear logs',
    danger: true,
  });
  if (!confirmed) return;
  try {
    const result = await sendOperation({ type: 'LOG_LENS/CLEAR' });
    toast(`Cleared ${result.removed ?? 0} entries.`, 'success');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Could not clear logs.', 'error');
  }
}

export async function showEmailPreview(state: LogLensState): Promise<void> {
  const environment = await fetchEnvironment();
  const request = buildEmailRequest(state.entries, state.settings, environment);
  const pre = create(
    'pre',
    undefined,
    `To: ${request.to}\nSubject: ${request.subject}\n\n${request.body.slice(0, 12_000)}`,
  );
  const result = await openModal({
    title: 'Email logs',
    description:
      'Log Lens never sends email itself. Your default mail app opens with this pre-filled report.',
    body: pre,
    wide: true,
    actions: [
      { label: 'Close', value: 'close' },
      { label: 'Copy body', value: 'copy' },
      { label: 'Open mail app', value: 'open', kind: 'primary' },
    ],
  });
  if (result === 'copy') {
    const ok = await copyText(request.body);
    toast(ok ? 'Email body copied.' : 'Could not copy the email body.', ok ? 'success' : 'error');
  }
  if (result === 'open') {
    openMailto(request.mailto);
  }
}

export function openMailto(mailto: string): void {
  try {
    const anchor = document.createElement('a');
    anchor.href = mailto;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast('Opening your mail app…', 'success');
  } catch {
    toast('Could not open a mail app. Use Export Logs instead.', 'error');
  }
}

export async function captureVisiblePage(
  format: ScreenshotFormat,
  tabId?: number,
): Promise<boolean> {
  const confirmed = await confirmAction({
    title: 'Capture the visible page?',
    message:
      'A page screenshot can contain sensitive content, including data that is not part of an error log. Log Lens only saves the image to your Downloads folder and never uploads it.',
    confirmLabel: 'Capture page',
  });
  if (!confirmed) return false;
  try {
    const result = await sendRuntime<DownloadResult | OperationResult>({
      type: 'LOG_LENS/CAPTURE_PAGE',
      format,
      saveAs: true,
      tabId,
    });
    if (!isDownloadResult(result)) throw new Error(result.error ?? 'Screenshot failed.');
    const path = await resolveDownloadPath(result.downloadId);
    toast(path ? `Screenshot saved to ${path}` : `Screenshot saved: ${result.filename}`, 'success');
    return true;
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Screenshot failed.', 'error');
    return false;
  }
}

export async function capturePanel(
  node: HTMLElement,
  format: ScreenshotFormat,
): Promise<boolean> {
  try {
    const cssBackground = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg')
      .trim();
    const options = {
      bgcolor: cssBackground || getComputedStyle(document.body).backgroundColor || '#ffffff',
      width: Math.max(node.scrollWidth, node.clientWidth),
      height: Math.max(node.scrollHeight, node.clientHeight),
      quality: 0.95,
      cacheBust: true,
    };
    const dataUrl =
      format === 'jpeg'
        ? await domtoimage.toJpeg(node, options)
        : await domtoimage.toPng(node, options);
    const filename = buildPanelScreenshotFilename(format);
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: true,
    });
    const path = await resolveDownloadPath(downloadId);
    toast(path ? `Screenshot saved to ${path}` : `Screenshot saved: ${filename}`, 'success');
    return true;
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Could not capture the log panel.', 'error');
    return false;
  }
}

export async function showScreenshotMenu(
  state: LogLensState,
  panelNode: HTMLElement | null,
): Promise<void> {
  const choice = await chooseDialog({
    title: 'Capture screenshot',
    message:
      'Log panel captures only the Log Lens viewer. Visible page captures whatever the browser is showing right now.',
    choices: [
      {
        label: 'Capture log panel',
        value: 'panel',
        primary: true,
        description: 'Renders the log viewer as an image. Safe and private.',
      },
      {
        label: 'Capture visible page',
        value: 'page',
        description: 'Asks for confirmation because the page may contain sensitive data.',
      },
    ],
  });
  if (choice === 'page') {
    await captureVisiblePage(state.settings.screenshotFormat);
    return;
  }
  if (choice !== 'panel') return;
  if (panelNode) {
    await capturePanel(panelNode, state.settings.screenshotFormat);
  } else {
    openLogsPage('?capture=panel');
  }
}

export async function resolveDownloadPath(downloadId: number): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const [item] = await chrome.downloads.search({ id: downloadId });
      if (item?.filename && item.state !== 'in_progress') return item.filename;
    } catch {
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

export function filterSummary(filters: FilterState, total: number, visible: number): string {
  const active =
    filters.search.trim() !== '' ||
    filters.level !== 'all' ||
    filters.source !== '' ||
    filters.timeRange !== 'all';
  if (!active) return `${total} entr${total === 1 ? 'y' : 'ies'}`;
  return `${visible} of ${total} entries`;
}

export function entryToPlainText(entry: LogEntry): string {
  const lines = [`[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.source}`, entry.message];
  if (entry.url) lines.push(`url: ${entry.url}`);
  if (entry.details) lines.push(`details: ${entry.details}`);
  if (entry.stack) lines.push(`stack:\n${entry.stack}`);
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    try {
      lines.push(`metadata: ${JSON.stringify(entry.metadata, null, 2)}`);
    } catch {
      lines.push('metadata: [unserializable]');
    }
  }
  return lines.join('\n');
}
