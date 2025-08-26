/**
 * Jest Setup File
 * Configures the testing environment for static migration tests
 */

import '@testing-library/jest-dom';

// Mock import.meta.env for Vite
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_LLM_INFERENCE_MODE: 'client',
        VITE_CLIENT_LLM_MODEL: 'Xenova/distilgpt2',
        VITE_SERVER_URL: 'http://localhost:3000'
      }
    }
  }
});

// Mock browser APIs that aren't available in Node.js
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    }
  }
});

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { storage = {}; },
    get length() { return Object.keys(storage).length; },
    key: (index: number) => Object.keys(storage)[index] || null
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock()
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock()
});

// Mock Worker since it's used by DuckDB-WASM
(global as any).Worker = class MockWorker {
  constructor(public scriptURL: string) {}
  postMessage = () => {};
  terminate = () => {};
  addEventListener = () => {};
  removeEventListener = () => {};
  dispatchEvent = () => {};
  onmessage = null;
  onerror = null;
  onmessageerror = null;
};

// Mock WebAssembly support with basic functions
(global as any).WebAssembly = {
  instantiate: () => Promise.resolve({ instance: {}, module: {} }),
  instantiateStreaming: () => Promise.resolve({ instance: {}, module: {} }),
  compile: () => Promise.resolve({}),
  compileStreaming: () => Promise.resolve({}),
  validate: () => true,
  Module: class MockModule {},
  Instance: class MockInstance {},
  Memory: class MockMemory {},
  Table: class MockTable {},
  Global: class MockGlobal {},
  CompileError: Error,
  RuntimeError: Error,
  LinkError: Error
};

// Dummy test to satisfy Jest requirements
describe('Setup', () => {
  it('should setup test environment', () => {
    expect(true).toBe(true);
  });
});