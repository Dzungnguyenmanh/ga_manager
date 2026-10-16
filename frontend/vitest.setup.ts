import '@testing-library/jest-dom';

// Polyfill Iterator & AsyncIterator in JSDOM environment context for Node < 22
if (typeof globalThis.Iterator === 'undefined') {
  (globalThis as unknown as { Iterator: unknown }).Iterator = class Iterator {};
}
if (typeof (globalThis as unknown as { AsyncIterator?: unknown }).AsyncIterator === 'undefined') {
  (globalThis as unknown as { AsyncIterator: unknown }).AsyncIterator = class AsyncIterator {};
}
