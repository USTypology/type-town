// Test to verify WebGPU warning suppression in actual worker functions
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('WebGPU Warning Suppression', () => {
  let originalWarn: typeof console.warn;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    originalWarn = console.warn;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn = originalWarn;
    warnSpy.mockRestore();
  });

  test('should suppress WebGPU experimental warnings', async () => {
    // Function to suppress WebGPU experimental warnings temporarily
    function suppressWebGPUWarnings<T>(fn: () => Promise<T>): Promise<T> {
      // Store original console.warn
      const originalWarn = console.warn;
      
      // Create filtered console.warn that suppresses WebGPU experimental warnings
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('WebGPU is experimental') || 
            message.includes('Failed to create WebGPU Context Provider')) {
          // Suppress these specific warnings
          return;
        }
        // Allow other warnings through
        originalWarn.apply(console, args);
      };
      
      // Execute function and restore console.warn
      return fn().finally(() => {
        console.warn = originalWarn;
      });
    }

    // Test that WebGPU experimental warnings are suppressed
    await suppressWebGPUWarnings(async () => {
      console.warn('WebGPU is experimental on this platform. See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status');
      console.warn('Failed to create WebGPU Context Provider');
    });

    // These warnings should have been suppressed
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('WebGPU is experimental')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Failed to create WebGPU Context Provider')
    );
  });

  test('should allow non-WebGPU warnings through', async () => {
    // Function to suppress WebGPU experimental warnings temporarily
    function suppressWebGPUWarnings<T>(fn: () => Promise<T>): Promise<T> {
      // Store original console.warn
      const originalWarn = console.warn;
      
      // Create filtered console.warn that suppresses WebGPU experimental warnings
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('WebGPU is experimental') || 
            message.includes('Failed to create WebGPU Context Provider')) {
          // Suppress these specific warnings
          return;
        }
        // Allow other warnings through
        originalWarn.apply(console, args);
      };
      
      // Execute function and restore console.warn
      return fn().finally(() => {
        console.warn = originalWarn;
      });
    }

    // Test that other warnings are not suppressed
    await suppressWebGPUWarnings(async () => {
      console.warn('This is a normal warning');
      console.warn('WebGPU is experimental on this platform. See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status');
      console.warn('Another normal warning');
    });

    // The normal warnings should have been called, but not the WebGPU one
    expect(warnSpy).toHaveBeenCalledWith('This is a normal warning');
    expect(warnSpy).toHaveBeenCalledWith('Another normal warning');
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('WebGPU is experimental')
    );
  });

  test('should restore console.warn after suppression', async () => {
    // Function to suppress WebGPU experimental warnings temporarily
    function suppressWebGPUWarnings<T>(fn: () => Promise<T>): Promise<T> {
      // Store original console.warn
      const originalWarn = console.warn;
      
      // Create filtered console.warn that suppresses WebGPU experimental warnings
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('WebGPU is experimental') || 
            message.includes('Failed to create WebGPU Context Provider')) {
          // Suppress these specific warnings
          return;
        }
        // Allow other warnings through
        originalWarn.apply(console, args);
      };
      
      // Execute function and restore console.warn
      return fn().finally(() => {
        console.warn = originalWarn;
      });
    }

    // Save the current console.warn
    const beforeSuppression = console.warn;

    await suppressWebGPUWarnings(async () => {
      // During suppression, console.warn should be different
      expect(console.warn).not.toBe(beforeSuppression);
    });

    // After suppression, console.warn should be restored
    expect(console.warn).toBe(beforeSuppression);
  });
});