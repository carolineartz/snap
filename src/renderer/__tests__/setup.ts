import '@testing-library/jest-dom';

// Mock the window.snappy API exposed by the preload script
Object.defineProperty(window, 'snappy', {
  value: {
    app: {
      quit: vi.fn(),
      version: vi.fn().mockResolvedValue('0.1.0'),
      hideWindow: vi.fn(),
    },
    snap: {
      close: vi.fn(),
      onData: vi.fn(),
    },
  },
  writable: true,
});
