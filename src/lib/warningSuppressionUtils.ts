// Utility functions for suppressing WebGPU, ONNX Runtime, and related warnings

// Global warning suppression that can be applied application-wide
export function setupGlobalWarningSuppressions() {
  // Store original console methods
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;
  
  // Create filtered console.warn that suppresses known problematic warnings
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (
      // WebGPU experimental warnings
      message.includes('WebGPU is experimental') || 
      message.includes('Failed to create WebGPU Context Provider') ||
      message.includes('Implementation-Status#implementation-status') ||
      
      // WebGL fallback warnings
      message.includes('Automatic fallback to software WebGL has been deprecated') ||
      message.includes('enable-unsafe-swiftshader') ||
      message.includes('GroupMarkerNotSet') ||
      
      // Texture cache warnings from PIXI.js
      message.includes('Texture added to the cache with an id') ||
      message.includes('that already had an entry')
    ) {
      // Suppress these specific warnings
      return;
    }
    // Allow other warnings through
    originalWarn.apply(console, args);
  };

  // Also suppress ONNX Runtime model optimization warnings that come through console.log
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (
      // ONNX Runtime unused initializer warnings
      message.includes('Removing initializer') ||
      message.includes('It is not used by any node and should be removed from the model') ||
      message.includes('CleanUnusedInitializersAndNodeArgs') ||
      message.includes('[W:onnxruntime:, graph.cc:')
    ) {
      // Suppress these model optimization warnings
      return;
    }
    // Allow other logs through
    originalLog.apply(console, args);
  };

  // Return a cleanup function to restore original console methods
  return function restoreConsole() {
    console.warn = originalWarn;
    console.error = originalError;
    console.log = originalLog;
  };
}

// Comprehensive function to suppress warnings during a specific operation
export function suppressWebGPUWarnings<T>(fn: () => Promise<T>): Promise<T> {
  // Store original console methods
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;
  
  // Create filtered console methods that suppress known problematic warnings
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (
      // WebGPU experimental warnings
      message.includes('WebGPU is experimental') || 
      message.includes('Failed to create WebGPU Context Provider') ||
      message.includes('Implementation-Status#implementation-status') ||
      
      // WebGL fallback warnings
      message.includes('Automatic fallback to software WebGL has been deprecated') ||
      message.includes('enable-unsafe-swiftshader') ||
      message.includes('GroupMarkerNotSet') ||
      
      // Texture cache warnings from PIXI.js
      message.includes('Texture added to the cache with an id') ||
      message.includes('that already had an entry')
    ) {
      // Suppress these specific warnings
      return;
    }
    // Allow other warnings through
    originalWarn.apply(console, args);
  };

  // Also suppress ONNX Runtime model optimization warnings that come through console.log
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (
      // ONNX Runtime unused initializer warnings
      message.includes('Removing initializer') ||
      message.includes('It is not used by any node and should be removed from the model') ||
      message.includes('CleanUnusedInitializersAndNodeArgs') ||
      message.includes('[W:onnxruntime:, graph.cc:')
    ) {
      // Suppress these model optimization warnings
      return;
    }
    // Allow other logs through
    originalLog.apply(console, args);
  };
  
  // Execute function and restore console methods
  return fn().finally(() => {
    console.warn = originalWarn;
    console.error = originalError;
    console.log = originalLog;
  });
}