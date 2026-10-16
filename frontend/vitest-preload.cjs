// 1. Polyfill worker_threads.markAsUncloneable for undici on Node < 21.2
try {
  const workerThreads = require('node:worker_threads');
  if (typeof workerThreads.markAsUncloneable !== 'function') {
    workerThreads.markAsUncloneable = (val) => val;
  }
} catch {
  // Ignore in environments where node:worker_threads is not accessible
}

// 2. Polyfill global Iterator & AsyncIterator for jsdom / ECMAScript 2024 on Node < 22
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
if (typeof Symbol !== 'undefined' && Symbol.iterator && globalThis.Iterator) {
  if (!globalThis.Iterator.prototype[Symbol.iterator]) {
    globalThis.Iterator.prototype[Symbol.iterator] = function () {
      return this;
    };
  }
}

// 3. Patch node:vm context for JSDOM createWindow isolation on Node < 22
try {
  const vm = require('node:vm');

  const patchRun = (fn) => function (arg1, arg2, arg3) {
    try {
      return fn.apply(this, arguments);
    } catch (err) {
      if (err instanceof ReferenceError && typeof err.message === 'string' && err.message.includes('Iterator is not defined')) {
        const targetCtx = (arg2 && typeof arg2 === 'object') ? arg2 : (arg1 && typeof arg1 === 'object' ? arg1 : null);
        if (targetCtx) {
          try {
            targetCtx.Iterator = class Iterator {};
            targetCtx.AsyncIterator = class AsyncIterator {};
            return targetCtx.Iterator;
          } catch {}
        }
      }
      throw err;
    }
  };

  if (typeof vm.runInContext === 'function') {
    vm.runInContext = patchRun(vm.runInContext);
  }
  if (vm.Script && typeof vm.Script.prototype.runInContext === 'function') {
    vm.Script.prototype.runInContext = patchRun(vm.Script.prototype.runInContext);
  }

  const origCreateContext = vm.createContext;
  if (typeof origCreateContext === 'function') {
    vm.createContext = function (sandbox, options) {
      const ctx = origCreateContext.call(this, sandbox, options);
      try {
        if (ctx && typeof ctx === 'object') {
          if (typeof ctx.Iterator === 'undefined') {
            ctx.Iterator = class Iterator {};
          }
          if (typeof ctx.AsyncIterator === 'undefined') {
            ctx.AsyncIterator = class AsyncIterator {};
          }
        }
      } catch {}
      return ctx;
    };
  }
} catch {
  // Ignore in environments where node:vm is not accessible
}
