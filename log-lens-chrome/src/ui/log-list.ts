import type { LogEntry } from '../shared/types';
import { entryToPlainText } from './actions';
import { copyText, create, formatDateTime, levelLabel, relativeTime, toast } from './dom';

export class LogList {
  private readonly openIds = new Set<string>();

  constructor(private readonly container: HTMLElement) {}

  render(entries: LogEntry[], emptyMessage?: string): void {
    this.container.textContent = '';
    if (entries.length === 0) {
      const empty = create('div', 'empty-state');
      empty.appendChild(create('div', 'empty-icon', '◎'));
      empty.appendChild(create('h3', undefined, 'Nothing to see here'));
      empty.appendChild(
        create(
          'p',
          'muted',
          emptyMessage ?? 'No logs yet. Only errors and failures are recorded by default.',
        ),
      );
      this.container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach((entry, index) => {
      fragment.appendChild(this.renderEntry(entry, index + 1));
    });
    this.container.appendChild(fragment);
  }

  private renderEntry(entry: LogEntry, index: number): HTMLElement {
    const card = create('article', `log-card level-${entry.level}`);
    card.dataset.entryId = entry.id;

    const top = create('div', 'log-card-top');
    top.appendChild(create('span', `badge ${entry.level}`, levelLabel(entry.level)));
    const source = create('span', 'log-source', entry.source);
    source.title = entry.source;
    top.appendChild(source);

    const occurrences =
      typeof entry.metadata?.occurrences === 'number' ? entry.metadata.occurrences : 1;
    if (occurrences > 1) top.appendChild(create('span', 'log-occurrences', `×${occurrences}`));

    const time = create('time', 'log-time', relativeTime(entry.timestamp));
    time.dateTime = entry.timestamp;
    time.title = formatDateTime(entry.timestamp);
    top.appendChild(time);

    top.appendChild(create('span', 'log-index', `#${index}`));

    const copyButton = create('button', 'btn ghost small icon log-copy', '⧉');
    copyButton.type = 'button';
    copyButton.title = 'Copy this entry';
    copyButton.setAttribute('aria-label', 'Copy this entry');
    copyButton.addEventListener('click', async () => {
      const ok = await copyText(entryToPlainText(entry));
      toast(ok ? 'Entry copied.' : 'Could not copy entry.', ok ? 'success' : 'error');
    });
    top.appendChild(copyButton);
    card.appendChild(top);

    card.appendChild(create('p', 'log-message', entry.message));

    const hasDetails =
      Boolean(entry.details) ||
      Boolean(entry.stack) ||
      Boolean(entry.url) ||
      Boolean(entry.metadata && Object.keys(entry.metadata).length > 0);
    if (hasDetails) {
      const details = create('details', 'log-details');
      details.open = this.openIds.has(entry.id);
      details.addEventListener('toggle', () => {
        if (details.open) this.openIds.add(entry.id);
        else this.openIds.delete(entry.id);
      });
      details.appendChild(create('summary', undefined, 'Details'));

      if (entry.url) {
        const row = create('div', 'log-detail-row');
        row.appendChild(create('span', 'log-detail-label', 'URL'));
        row.appendChild(create('code', 'log-detail-value', entry.url));
        details.appendChild(row);
      }
      if (entry.details) {
        details.appendChild(create('div', 'log-detail-label', 'Details'));
        details.appendChild(create('pre', 'log-pre', entry.details));
      }
      if (entry.stack) {
        details.appendChild(create('div', 'log-detail-label', 'Stack'));
        details.appendChild(create('pre', 'log-pre', entry.stack));
      }
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        details.appendChild(create('div', 'log-detail-label', 'Metadata'));
        let metadata = '';
        try {
          metadata = JSON.stringify(entry.metadata, null, 2);
        } catch {
          metadata = '[unserializable metadata]';
        }
        details.appendChild(create('pre', 'log-pre', metadata));
      }
      card.appendChild(details);
    }

    return card;
  }
}
