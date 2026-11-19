import '../ui/theme.css';
import './options.css';
import { PAGE_CAPTURE_ORIGINS } from '../shared/permissions';
import {
  DEFAULT_SETTINGS,
  endpointPermissionPattern,
  isAllowedEndpoint,
  isValidEmail,
  needsEndpointPermission,
  normalizeOrigins,
  normalizeSettings,
  parseHeaderJson,
} from '../shared/settings';
import type {
  LogLevel,
  LogLensSettings,
  OperationResult,
  PreviewResult,
  SendResult,
} from '../shared/types';
import { fetchState, isOperationError, sendRuntime } from '../ui/actions';
import { confirmAction, previewDialog } from '../ui/dialog';
import { $, copyText, create, toast } from '../ui/dom';

function checked(id: string): boolean {
  return $<HTMLInputElement>(`#${id}`).checked;
}

function value(id: string): string {
  return $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`).value;
}

function numberValue(id: string): number {
  return Number(value(id));
}

function lines(valueText: string): string[] {
  return valueText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function requestPermissions(details: chrome.permissions.Permissions): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.request(details, (granted) => resolve(Boolean(granted)));
  });
}

function containsPermissions(details: chrome.permissions.Permissions): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.contains(details, (granted) => resolve(Boolean(granted)));
  });
}

class OptionsController {
  private statusTimer: number | null = null;
  private saving = false;

  async init(): Promise<void> {
    this.bind();
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const state = await fetchState();
      this.populate(state.settings, state.status.outboxCount, state.extensionId, state.version);
      await this.updatePermissionStatuses();
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Could not load settings.', 'error');
    }
  }

  private populate(
    settings: LogLensSettings,
    outboxCount: number,
    extensionId: string,
    version: string,
  ): void {
    const set = (id: string, valueText: string | number | boolean): void => {
      const element = $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`);
      if (element instanceof HTMLInputElement && element.type === 'checkbox') {
        element.checked = Boolean(valueText);
      } else {
        element.value = String(valueText);
      }
    };

    set('capture-level', settings.captureLevel);
    set('error-only', settings.errorOnly);
    set('capture-page-errors', settings.capturePageErrors);
    set('capture-console-errors', settings.captureConsoleErrors);
    set('capture-network-failures', settings.captureNetworkFailures);
    set('redact-secrets', settings.redactSecrets);
    set('include-full-urls', settings.includeFullUrls);
    set('max-entries', settings.maxEntries);
    set('retention-days', settings.retentionDays);
    set('auto-open', settings.autoOpen);
    set('notifications-enabled', settings.notificationsEnabled);
    set('status-badge', settings.statusBadge);
    set('support-email', settings.supportEmail);
    set('screenshot-format', settings.screenshotFormat);
    set('include-environment', settings.includeEnvironment);
    set('auto-send-consent', settings.autoSendConsent);
    set('auto-send-enabled', settings.autoSendEnabled);
    set('auto-send-endpoint', settings.autoSendEndpoint);
    set('auto-send-method', settings.autoSendMethod);
    set('auto-send-headers', settings.autoSendHeaders);
    set('auto-send-interval', settings.autoSendIntervalMinutes);
    set('auto-send-level', settings.autoSendLevel);
    set('auto-send-retries', settings.autoSendRetries);
    set('auto-send-timeout', settings.autoSendTimeoutMs);
    set('allowed-external-ids', settings.allowedExternalIds.join('\n'));
    set('allowed-origins', settings.allowedOrigins.join('\n'));

    $('#outbox-count').textContent = `${outboxCount} pending ${outboxCount === 1 ? 'batch' : 'batches'}`;
    $('#extension-id').textContent = extensionId;
    $('#options-version').textContent = `v${version}`;
    this.updateConsentState();
  }

  private collect(): LogLensSettings {
    const consent = checked('auto-send-consent');
    return normalizeSettings({
      captureLevel: value('capture-level') as LogLevel,
      errorOnly: checked('error-only'),
      capturePageErrors: checked('capture-page-errors'),
      captureConsoleErrors: checked('capture-console-errors'),
      captureNetworkFailures: checked('capture-network-failures'),
      redactSecrets: checked('redact-secrets'),
      includeFullUrls: checked('include-full-urls'),
      maxEntries: numberValue('max-entries'),
      retentionDays: numberValue('retention-days'),
      autoOpen: value('auto-open'),
      notificationsEnabled: checked('notifications-enabled'),
      statusBadge: checked('status-badge'),
      supportEmail: value('support-email'),
      screenshotFormat: value('screenshot-format'),
      includeEnvironment: checked('include-environment'),
      autoSendConsent: consent,
      autoSendEnabled: consent && checked('auto-send-enabled'),
      autoSendEndpoint: value('auto-send-endpoint'),
      autoSendMethod: value('auto-send-method'),
      autoSendHeaders: value('auto-send-headers'),
      autoSendIntervalMinutes: numberValue('auto-send-interval'),
      autoSendLevel: value('auto-send-level') as LogLevel,
      autoSendRetries: numberValue('auto-send-retries'),
      autoSendTimeoutMs: numberValue('auto-send-timeout'),
      allowedExternalIds: lines(value('allowed-external-ids')),
      allowedOrigins: lines(value('allowed-origins')),
    });
  }

  private validate(settings: LogLensSettings): { ok: boolean; error?: string; settings: LogLensSettings } {
    if (!isValidEmail(settings.supportEmail)) {
      return { ok: false, error: 'Enter a valid support email address.', settings };
    }
    if (settings.autoSendConsent && settings.autoSendHeaders.trim()) {
      const headers = parseHeaderJson(settings.autoSendHeaders);
      if (!headers.ok) return { ok: false, error: headers.error, settings };
    }
    if (
      settings.autoSendConsent &&
      settings.autoSendEndpoint.trim() &&
      !isAllowedEndpoint(settings.autoSendEndpoint)
    ) {
      return {
        ok: false,
        error: 'Auto-send endpoint must be HTTPS, or HTTP on localhost/127.0.0.1.',
        settings,
      };
    }
    if (settings.autoSendEnabled && !settings.autoSendEndpoint.trim()) {
      return { ok: false, error: 'Configure an auto-send endpoint before enabling sending.', settings };
    }
    if (settings.autoSendEnabled && !settings.autoSendConsent) {
      return { ok: false, error: 'Auto-send requires the consent checkbox.', settings };
    }
    const originInput = lines(value('allowed-origins'));
    for (const origin of originInput) {
      const normalized = normalizeOrigins([origin]);
      if (normalized.length !== 1) {
        return {
          ok: false,
          error: `Approved web origin is invalid: ${origin}. Use an exact http(s) origin.`,
          settings,
        };
      }
    }
    for (const extensionId of settings.allowedExternalIds) {
      if (!/^[a-p]{32}$/.test(extensionId)) {
        return {
          ok: false,
          error: `Approved extension ID is invalid: ${extensionId}. Use the 32-character Chrome extension ID.`,
          settings,
        };
      }
    }
    return { ok: true, settings: { ...settings, allowedOrigins: normalizeOrigins(originInput) } };
  }

  private async handleSave(options: { silent?: boolean } = {}): Promise<boolean> {
    if (this.saving) return false;
    this.saving = true;
    try {
      const raw = this.collect();
      const validation = this.validate(raw);
      if (!validation.ok) {
        this.showStatus(validation.error ?? 'Invalid settings.', 'error');
        return false;
      }
      const settings = validation.settings;

      const permissions = new Set<chrome.runtime.ManifestPermission>();
      const origins = new Set<string>();
      if (settings.capturePageErrors || settings.captureConsoleErrors) {
        for (const origin of PAGE_CAPTURE_ORIGINS) origins.add(origin);
      }
      if (settings.captureNetworkFailures) {
        permissions.add('webRequest');
        permissions.add('tabs');
        for (const origin of PAGE_CAPTURE_ORIGINS) origins.add(origin);
      }
      if (
        settings.autoSendConsent &&
        settings.autoSendEndpoint.trim() &&
        needsEndpointPermission(settings.autoSendEndpoint)
      ) {
        const pattern = endpointPermissionPattern(settings.autoSendEndpoint);
        if (pattern) origins.add(pattern);
      }

      if (permissions.size > 0 || origins.size > 0) {
        let granted = false;
        try {
          granted = await requestPermissions({
            permissions: [...permissions],
            origins: [...origins],
          });
        } catch (error) {
          this.showStatus(
            error instanceof Error
              ? `Chrome could not request permissions: ${error.message}`
              : 'Chrome could not request permissions.',
            'error',
          );
          return false;
        }
        if (!granted) {
          this.showStatus(
            'Permission was not granted. Turn off the feature that needs it, or try Save Settings again.',
            'error',
          );
          return false;
        }
      }

      const response = await sendRuntime<OperationResult>({
        type: 'LOG_LENS/SAVE_SETTINGS',
        settings,
      });
      if (isOperationError(response)) {
        this.showStatus(response.error ?? 'Could not save settings.', 'error');
        return false;
      }
      if (!options.silent) {
        this.showStatus('Settings saved.', 'success');
        await this.load();
      }
      return true;
    } finally {
      this.saving = false;
    }
  }

  private updateConsentState(): void {
    const consent = checked('auto-send-consent');
    if (!consent) $<HTMLInputElement>('#auto-send-enabled').checked = false;
    const ids = [
      'auto-send-enabled',
      'auto-send-endpoint',
      'auto-send-method',
      'auto-send-headers',
      'auto-send-interval',
      'auto-send-level',
      'auto-send-retries',
      'auto-send-timeout',
    ];
    for (const id of ids) {
      $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`).disabled = !consent;
    }
    $<HTMLButtonElement>('#send-test').disabled = !consent;
  }

  private async updatePermissionStatuses(): Promise<void> {
    const page = $('#permission-page-status');
    const network = $('#permission-network-status');
    const endpoint = $('#permission-endpoint-status');
    try {
      const pageGranted = await containsPermissions({
        origins: [...PAGE_CAPTURE_ORIGINS],
      });
      page.textContent = pageGranted ? 'Granted' : 'Not granted (asked when you enable page capture)';
    } catch {
      page.textContent = 'Unknown';
    }
    try {
      const networkGranted = await containsPermissions({ permissions: ['webRequest'] });
      network.textContent = networkGranted ? 'Granted' : 'Not granted (asked when you enable network capture)';
    } catch {
      network.textContent = 'Unknown';
    }
    const endpointUrl = value('auto-send-endpoint');
    const pattern =
      endpointUrl && needsEndpointPermission(endpointUrl)
        ? endpointPermissionPattern(endpointUrl)
        : null;
    if (!pattern) {
      endpoint.textContent = endpointUrl
        ? endpointPermissionPattern(endpointUrl)
          ? 'Granted (localhost)'
          : 'Invalid endpoint'
        : 'Not configured';
    } else {
      try {
        const granted = await containsPermissions({ origins: [pattern] });
        endpoint.textContent = granted ? 'Granted' : 'Asked when you save';
      } catch {
        endpoint.textContent = 'Unknown';
      }
    }
  }

  private async preview(): Promise<void> {
    const saved = await this.handleSave({ silent: true });
    if (!saved) return;
    try {
      const result = await sendRuntime<PreviewResult | OperationResult>({ type: 'LOG_LENS/PREVIEW_SEND' });
      if ('ok' in result && result.ok === false) {
        this.showStatus(result.error ?? 'Could not build payload.', 'error');
        return;
      }
      const preview = result as PreviewResult;
      await previewDialog({
        title: 'Auto-send preview',
        description: `${preview.method} ${preview.endpoint || '(no endpoint)'} — this is the exact JSON body. Nothing has been sent.`,
        text: preview.json,
        copyLabel: 'Copy JSON',
      });
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Could not preview payload.', 'error');
    }
  }

  private async sendTest(): Promise<void> {
    const consent = checked('auto-send-consent');
    if (!consent) {
      this.showStatus('Check the consent box before sending a test payload.', 'error');
      return;
    }
    const saved = await this.handleSave({ silent: true });
    if (!saved) return;
    const endpoint = value('auto-send-endpoint');
    const confirmed = await confirmAction({
      title: 'Send a test payload?',
      message: `Log Lens will send a JSON payload containing up to 50 log entries to ${endpoint}.`,
      confirmLabel: 'Send test',
    });
    if (!confirmed) return;
    try {
      const result = await sendRuntime<SendResult | OperationResult>({ type: 'LOG_LENS/SEND_TEST' });
      if ('ok' in result && result.ok === false) {
        this.showStatus(result.error ?? 'Test send failed.', 'error');
      } else {
        const send = result as SendResult;
        if (send.sent) {
          this.showStatus(`Test payload accepted (HTTP ${send.status ?? 200}).`, 'success');
        } else {
          this.showStatus(send.error ?? 'Test payload failed.', 'error');
        }
      }
      await this.load();
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Test send failed.', 'error');
    }
  }

  private async retryOutbox(): Promise<void> {
    try {
      const result = await sendRuntime<SendResult | OperationResult>({ type: 'LOG_LENS/RETRY_OUTBOX' });
      if ('ok' in result && result.ok === false) {
        this.showStatus(result.error ?? 'Could not retry queued sends.', 'error');
      } else {
        const send = result as SendResult;
        this.showStatus(
          send.error
            ? `Retry finished: ${send.error}`
            : `Retry finished. ${send.queued} batch${send.queued === 1 ? '' : 'es'} still queued.`,
          send.error ? 'error' : 'success',
        );
      }
      await this.load();
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Could not retry queued sends.', 'error');
    }
  }

  private async resetDefaults(): Promise<void> {
    const confirmed = await confirmAction({
      title: 'Reset Log Lens settings?',
      message:
        'This restores every default, turns auto-send off, and clears the consent checkbox. Captured logs are not deleted.',
      confirmLabel: 'Reset settings',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const response = await sendRuntime<OperationResult>({
        type: 'LOG_LENS/SAVE_SETTINGS',
        settings: { ...DEFAULT_SETTINGS },
      });
      if (isOperationError(response)) {
        this.showStatus(response.error ?? 'Could not reset settings.', 'error');
        return;
      }
      this.showStatus('Settings reset to defaults.', 'success');
      await this.load();
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Could not reset settings.', 'error');
    }
  }

  private showStatus(message: string, kind: 'success' | 'error' | 'info'): void {
    const node = $('#settings-status');
    node.className = `status-message show ${kind}`;
    node.textContent = message;
    if (this.statusTimer !== null) window.clearTimeout(this.statusTimer);
    if (kind !== 'error') {
      this.statusTimer = window.setTimeout(() => {
        node.className = 'status-message';
        node.textContent = '';
        this.statusTimer = null;
      }, 5_000);
    }
  }

  private bind(): void {
    $('#save-settings').addEventListener('click', () => {
      void this.handleSave();
    });
    $('#reset-defaults').addEventListener('click', () => {
      void this.resetDefaults();
    });
    $('#preview-payload').addEventListener('click', () => {
      void this.preview();
    });
    $('#send-test').addEventListener('click', () => {
      void this.sendTest();
    });
    $('#retry-outbox').addEventListener('click', () => {
      void this.retryOutbox();
    });
    $('#open-logs').addEventListener('click', () => {
      void sendRuntime({ type: 'LOG_LENS/OPEN_LOGS' }).catch(() => undefined);
    });
    $('#copy-extension-id').addEventListener('click', async () => {
      const id = $('#extension-id').textContent ?? '';
      const ok = await copyText(id);
      toast(ok ? 'Extension ID copied.' : 'Could not copy the extension ID.', ok ? 'success' : 'error');
    });
    $('#auto-send-consent').addEventListener('change', () => this.updateConsentState());
    $('#auto-send-endpoint').addEventListener('change', () => {
      void this.updatePermissionStatuses();
    });
    $('#capture-page-errors').addEventListener('change', () => {
      void this.updatePermissionStatuses();
    });
    $('#capture-network-failures').addEventListener('change', () => {
      void this.updatePermissionStatuses();
    });
    $('#auto-send-enabled').addEventListener('change', () => {
      if (checked('auto-send-enabled') && !checked('auto-send-consent')) {
        this.showStatus('Check the consent box before enabling auto-send.', 'error');
        $<HTMLInputElement>('#auto-send-enabled').checked = false;
      }
    });

    // Keep the HTML description in sync with the actual permission model.
    const endpointHelp = create('small');
    endpointHelp.className = 'muted';
    endpointHelp.textContent = 'HTTPS only. HTTP is allowed for localhost development.';
    $('#auto-send-endpoint').parentElement?.appendChild(endpointHelp);
  }
}

const options = new OptionsController();
void options.init();
