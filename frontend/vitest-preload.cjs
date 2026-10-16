// 1. Polyfill worker_threads.markAsUncloneable for undici on Node < 21.2
try {
  const workerThreads = require('node:worker_threads');
  if (typeof workerThreads.markAsUncloneable !== 'function') {
    workerThreads.markAsUncloneable = (val) => val;
  }
} catch {
  // Ignore in environments where node:worker_threads is not accessible
}

// 2. Polyfill Iterator & AsyncIterator for jsdom / ECMAScript 2024 on Node < 22
if (typeof globalThis.Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}
if (typeof global.Iterator === 'undefined') {
  global.Iterator = globalThis.Iterator;
}
if (typeof globalThis.AsyncIterator === 'undefined') {
  globalThis.AsyncIterator = class AsyncIterator {};
}
if (typeof global.AsyncIterator === 'undefined') {
  global.AsyncIterator = globalThis.AsyncIterator;
}

// 3. Ensure Symbol.iterator on Iterator prototype if missing
if (typeof Symbol !== 'undefined' && Symbol.iterator && globalThis.Iterator) {
  if (!globalThis.Iterator.prototype[Symbol.iterator]) {
    globalThis.Iterator.prototype[Symbol.iterator] = function () {
      return this;
    };
  }
}
