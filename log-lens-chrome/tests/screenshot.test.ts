import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPanelScreenshotFilename, buildPageScreenshotFilename } from '../src/shared/report';

const domtoimage = vi.hoisted(() => ({
  toPng: vi.fn(async () => 'data:image/png;base64,AAAA'),
  toJpeg: vi.fn(async () => 'data:image/jpeg;base64,BBBB'),
}));

vi.mock('dom-to-image-more', () => ({ default: domtoimage }));

const downloads = vi.hoisted(() => ({
  download: vi.fn(async () => 12),
  search: vi.fn(async () => [{ id: 12, filename: 'C:\\Users\\dev\\Downloads\\shot.png', state: 'complete' }]),
}));

describe('screenshot capture', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension-id',
        getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
        getManifest: () => ({ version: '1.1.0' }),
        lastError: undefined,
      },
      downloads,
    });
    vi.clearAllMocks();
  });

  it('renders the log panel with dom-to-image and downloads a PNG', async () => {
    const { capturePanel } = await import('../src/ui/actions');
    const node = document.createElement('div');
    node.textContent = 'log panel';
    const ok = await capturePanel(node, 'png');
    expect(ok).toBe(true);
    expect(domtoimage.toPng).toHaveBeenCalledWith(node, expect.any(Object));
    expect(downloads.download).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'data:image/png;base64,AAAA',
        filename: expect.stringMatching(/^log-lens-panel-.*\.png$/),
        saveAs: true,
      }),
    );
  });

  it('uses JPEG when configured', async () => {
    const { capturePanel } = await import('../src/ui/actions');
    const node = document.createElement('div');
    const ok = await capturePanel(node, 'jpeg');
    expect(ok).toBe(true);
    expect(domtoimage.toJpeg).toHaveBeenCalled();
    expect(downloads.download).toHaveBeenCalledWith(
      expect.objectContaining({ filename: expect.stringMatching(/^log-lens-panel-.*\.jpg$/) }),
    );
  });

  it('builds timestamped screenshot filenames', () => {
    expect(buildPanelScreenshotFilename('png', new Date('2026-11-07T14:32:10'))).toBe(
      'log-lens-panel-2026-11-07_14-32-10.png',
    );
    expect(buildPageScreenshotFilename('jpeg', new Date('2026-11-07T14:32:10'))).toBe(
      'log-lens-page-2026-11-07_14-32-10.jpg',
    );
  });
});
