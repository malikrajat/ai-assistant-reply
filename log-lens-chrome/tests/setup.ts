import { vi } from 'vitest';

vi.stubGlobal('chrome', {
  runtime: {
    id: 'test-extension-id',
    getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
    getManifest: () => ({ version: '1.1.0' }),
    lastError: undefined,
  },
});
