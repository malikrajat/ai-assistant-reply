export const VIEWER_TEMPLATE = `
<div class="viewer">
  <header class="viewer-header">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"><span></span></div>
      <div class="brand-copy">
        <h1>Log Lens</h1>
        <p id="viewer-subtitle">Loading logs…</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn ghost small" type="button" data-action="refresh" title="Refresh logs">↻ Refresh</button>
      <button class="btn ghost small" type="button" data-action="settings" title="Open settings">⚙ Settings</button>
    </div>
  </header>

  <section class="viewer-status" aria-label="Log status">
    <div class="status-left">
      <span id="viewer-count" class="count-pill">0 entries</span>
      <span id="viewer-latest" class="muted"></span>
    </div>
    <div class="status-right">
      <span id="viewer-autosend" class="badge info">Auto-send off</span>
      <span id="viewer-capture" class="badge debug">Errors only</span>
      <span class="live-dot" title="Live updates from chrome.storage"><span></span> Live</span>
    </div>
  </section>

  <section class="viewer-actions" aria-label="Log actions">
    <button class="btn" type="button" data-action="email">✉ Email Logs</button>
    <button class="btn" type="button" data-action="export">⇩ Export Logs</button>
    <button class="btn" type="button" data-action="screenshot">▣ Capture Screenshot</button>
    <button class="btn" type="button" data-action="copy">⧉ Copy All</button>
    <button class="btn danger" type="button" data-action="clear">⌫ Clear Logs</button>
  </section>

  <section class="filter-bar" aria-label="Filter logs">
    <label class="search-field">
      <span class="sr-only">Search logs</span>
      <input id="filter-search" class="input" type="search" placeholder="Search message, source, stack…" autocomplete="off" />
    </label>
    <label>
      <span class="sr-only">Level</span>
      <select id="filter-level" class="select">
        <option value="all">All levels</option>
        <option value="error">Error</option>
        <option value="failure">Failure</option>
        <option value="warn">Warning</option>
        <option value="info">Info</option>
        <option value="debug">Debug</option>
      </select>
    </label>
    <label>
      <span class="sr-only">Source</span>
      <select id="filter-source" class="select">
        <option value="">All sources</option>
      </select>
    </label>
    <label>
      <span class="sr-only">Time range</span>
      <select id="filter-time" class="select">
        <option value="all">All time</option>
        <option value="hour">Last hour</option>
        <option value="day">Last 24 hours</option>
        <option value="week">Last 7 days</option>
      </select>
    </label>
    <button class="btn ghost small" type="button" data-action="reset-filters">Reset</button>
  </section>

  <main id="log-list" class="log-list scroll-area" aria-live="polite"></main>

  <footer class="viewer-footer">
    <span>Local-only ring buffer. Nothing is uploaded unless you enable auto-send.</span>
    <span id="viewer-version" class="muted"></span>
  </footer>
</div>
`;
