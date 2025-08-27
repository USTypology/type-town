// Test to verify comprehensive WebGPU, ONNX Runtime, and related warning suppression
import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { suppressWebGPUWarnings, setupGlobalWarningSuppressions } from '../lib/warningSuppressionUtils';

describe('Enhanced Warning Suppression', () => {
  let originalWarn: typeof console.warn;
  let originalLog: typeof console.log;
  let warnSpy: ReturnType<typeof jest.spyOn>;
  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    originalWarn = console.warn;
    originalLog = console.log;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.log = originalLog;
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('should suppress comprehensive WebGPU warnings', async () => {
    // Test that all WebGPU-related warnings are suppressed
    await suppressWebGPUWarnings(async () => {
      console.warn('WebGPU is experimental on this platform. See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status');
      console.warn('Failed to create WebGPU Context Provider');
      console.warn('Implementation-Status#implementation-status');
    });

    // These warnings should have been suppressed
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('WebGPU is experimental')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Failed to create WebGPU Context Provider')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Implementation-Status#implementation-status')
    );
  });

  test('should suppress WebGL fallback warnings', async () => {
    // Test that WebGL fallback warnings are suppressed
    await suppressWebGPUWarnings(async () => {
      console.warn('Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader');
      console.warn('enable-unsafe-swiftshader (about:flags#enable-unsafe-swiftshader) flag to opt in');
      console.warn('[GroupMarkerNotSet(crbug.com/242999)!:A030BC10742F0000]Automatic fallback to software WebGL');
    });

    // These warnings should have been suppressed
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Automatic fallback to software WebGL has been deprecated')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('enable-unsafe-swiftshader')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('GroupMarkerNotSet')
    );
  });

  test('should suppress texture cache warnings', async () => {
    // Test that PIXI.js texture cache warnings are suppressed
    await suppressWebGPUWarnings(async () => {
      console.warn('Texture added to the cache with an id [pixels_large1.png] that already had an entry');
      console.warn('Texture added to the cache with an id [pixels_large2.png] that already had an entry');
    });

    // These warnings should have been suppressed
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Texture added to the cache with an id')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('that already had an entry')
    );
  });

  test('should suppress ONNX Runtime model optimization warnings', async () => {
    // Test that ONNX Runtime model optimization warnings are suppressed
    await suppressWebGPUWarnings(async () => {
      console.log('2025-08-26 23:27:49.360300 [W:onnxruntime:, graph.cc:3490 CleanUnusedInitializersAndNodeArgs] Removing initializer \'/transformer/h.5/attn/Constant_18_output_0\'. It is not used by any node and should be removed from the model.');
      console.log('2025-08-26 23:27:49.361600 [W:onnxruntime:, graph.cc:3490 CleanUnusedInitializersAndNodeArgs] Removing initializer \'/transformer/h.3/attn/Constant_18_output_0\'. It is not used by any node and should be removed from the model.');
      console.log('[W:onnxruntime:, graph.cc:3490] Some other ONNX Runtime warning');
    });

    // These ONNX warnings should have been suppressed
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Removing initializer')
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('CleanUnusedInitializersAndNodeArgs')
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[W:onnxruntime:, graph.cc:')
    );
  });

  test('should allow non-problematic warnings through', async () => {
    // Test that normal warnings and logs are not suppressed
    await suppressWebGPUWarnings(async () => {
      console.warn('This is a normal warning');
      console.warn('Another important warning');
      console.log('This is a normal log message');
      console.log('Another important log');
    });

    // The normal warnings and logs should have been called
    expect(warnSpy).toHaveBeenCalledWith('This is a normal warning');
    expect(warnSpy).toHaveBeenCalledWith('Another important warning');
    expect(logSpy).toHaveBeenCalledWith('This is a normal log message');
    expect(logSpy).toHaveBeenCalledWith('Another important log');
  });

  test('should restore console methods after suppression', async () => {
    const beforeWarn = console.warn;
    const beforeLog = console.log;

    await suppressWebGPUWarnings(async () => {
      // During suppression, console methods should be different
      expect(console.warn).not.toBe(beforeWarn);
      expect(console.log).not.toBe(beforeLog);
    });

    // After suppression, console methods should be restored
    expect(console.warn).toBe(beforeWarn);
    expect(console.log).toBe(beforeLog);
  });

  test('should support global warning suppression setup', () => {
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Setup global suppression
    const restoreConsole = setupGlobalWarningSuppressions();

    // Console methods should be modified
    expect(console.warn).not.toBe(originalConsoleWarn);
    expect(console.log).not.toBe(originalConsoleLog);

    // Test that warnings are suppressed globally
    console.warn('WebGPU is experimental on this platform');
    console.log('2025-08-26 23:27:49.360300 [W:onnxruntime:, graph.cc:3490 CleanUnusedInitializersAndNodeArgs] Removing initializer');

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('WebGPU is experimental')
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Removing initializer')
    );

    // Normal messages should still work
    console.warn('Normal warning');
    console.log('Normal log');

    expect(warnSpy).toHaveBeenCalledWith('Normal warning');
    expect(logSpy).toHaveBeenCalledWith('Normal log');

    // Restore console
    restoreConsole();

    // Console methods should be restored
    expect(console.warn).toBe(originalConsoleWarn);
    expect(console.log).toBe(originalConsoleLog);
  });
});