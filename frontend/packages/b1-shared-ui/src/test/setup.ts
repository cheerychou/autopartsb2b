import '@testing-library/jest-dom';

// jsdom polyfill: Radix UI Slider 等组件需要 ResizeObserver
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
