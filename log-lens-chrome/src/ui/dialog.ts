import { copyText, create, toast } from './dom';

export interface DialogAction {
  label: string;
  value: string;
  kind?: 'primary' | 'danger' | 'default';
}

export interface ModalOptions {
  title: string;
  description?: string;
  body?: Node;
  actions: DialogAction[];
  wide?: boolean;
  dismissible?: boolean;
}

export function openModal(options: ModalOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = create('div', 'modal-backdrop');
    const modal = create('div', `modal${options.wide ? ' wide' : ''}`);
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', options.title);

    modal.appendChild(create('h2', undefined, options.title));
    if (options.description) {
      modal.appendChild(create('p', undefined, options.description));
    }
    if (options.body) modal.appendChild(options.body);

    const actions = create('div', 'modal-actions');
    const buttons: HTMLButtonElement[] = [];
    let settled = false;

    const close = (value: string | null): void => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      previousFocus?.focus();
      resolve(value);
    };

    for (const action of options.actions) {
      const button = create(
        'button',
        `btn ${action.kind === 'primary' ? 'primary' : action.kind === 'danger' ? 'danger' : ''}`,
        action.label,
      );
      button.type = 'button';
      button.addEventListener('click', () => close(action.value));
      buttons.push(button);
      actions.appendChild(button);
    }
    modal.appendChild(actions);
    backdrop.appendChild(modal);

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && options.dismissible !== false) {
        event.preventDefault();
        close(null);
      }
      if (event.key !== 'Tab' || buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop && options.dismissible !== false) close(null);
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(backdrop);
    buttons[0]?.focus();
  });
}

export async function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await openModal({
    title: options.title,
    description: options.message,
    actions: [
      { label: options.cancelLabel ?? 'Cancel', value: 'cancel' },
      {
        label: options.confirmLabel,
        value: 'confirm',
        kind: options.danger ? 'danger' : 'primary',
      },
    ],
  });
  return result === 'confirm';
}

export async function previewDialog(options: {
  title: string;
  description?: string;
  text: string;
  copyLabel?: string;
}): Promise<void> {
  const pre = create('pre', undefined, options.text);
  const result = await openModal({
    title: options.title,
    description: options.description,
    body: pre,
    wide: true,
    actions: [
      { label: 'Close', value: 'close' },
      { label: options.copyLabel ?? 'Copy', value: 'copy' },
    ],
  });
  if (result === 'copy') {
    const ok = await copyText(options.text);
    toast(ok ? 'Copied to clipboard.' : 'Could not copy to clipboard.', ok ? 'success' : 'error');
  }
}

export async function chooseDialog(options: {
  title: string;
  message: string;
  choices: Array<{ label: string; value: string; description?: string; primary?: boolean }>;
}): Promise<string | null> {
  const body = create('div');
  for (const choice of options.choices) {
    if (!choice.description) continue;
    const row = create('p', 'muted');
    row.textContent = `${choice.label}: ${choice.description}`;
    body.appendChild(row);
  }
  const result = await openModal({
    title: options.title,
    description: options.message,
    body: body.childElementCount > 0 ? body : undefined,
    actions: [
      { label: 'Cancel', value: 'cancel' },
      ...options.choices.map((choice) => ({
        label: choice.label,
        value: choice.value,
        kind: choice.primary ? ('primary' as const) : ('default' as const),
      })),
    ],
  });
  return result === 'cancel' || result === null ? null : result;
}
