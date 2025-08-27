// Web Worker for Backend Detection and WebGPU Benchmarking to prevent UI blocking
import { BackendCapabilities, FlopsResult, BenchmarkResults } from '../lib/backendDetection';

// Worker message types
interface WorkerRequest {
  id: string;
  type: 'detectCapabilities' | 'benchmarkFlops' | 'getWebGPUDiagnostics' | 'initializeWebGPU';
  data?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  progress?: number;
}

// Cached capabilities to avoid re-detection
let cachedCapabilities: BackendCapabilities | null = null;

// Global WebGPU detection cache to prevent repeated adapter requests
let webGPUDetectionCache: { result: boolean; timestamp: number; } | null = null;
const WEBGPU_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

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

// Detect backend capabilities in worker
async function detectCapabilities(): Promise<BackendCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  try {
    const capabilities: BackendCapabilities = {
      webnn: await detectWebNN(),
      webgpu: await detectWebGPU(),
      wasm: detectWASM(),
      webgl: detectWebGL(),
      simd: detectSIMD(),
      threads: detectThreads(),
    };

    cachedCapabilities = capabilities;
    console.log('[Backend Worker] Capabilities detected:', capabilities);
    return capabilities;
  } catch (error) {
    console.error('[Backend Worker] Error detecting capabilities:', error);
    const fallbackCapabilities: BackendCapabilities = {
      webnn: false,
      webgpu: false,
      wasm: false,
      webgl: false,
      simd: false,
      threads: false,
    };
    cachedCapabilities = fallbackCapabilities;
    return fallbackCapabilities;
  }
}

async function detectWebNN(): Promise<boolean> {
  try {
    return 'ml' in navigator && typeof (navigator as any).ml?.createContext === 'function';
  } catch {
    return false;
  }
}

async function detectWebGPU(): Promise<boolean> {
  // Check cache first
  if (webGPUDetectionCache) {
    const now = Date.now();
    if (now - webGPUDetectionCache.timestamp < WEBGPU_CACHE_DURATION) {
      return webGPUDetectionCache.result;
    }
  }

  // Perform detection with warning suppression
  const result = await suppressWebGPUWarnings(async () => {
    try {
      if (!('gpu' in navigator) || typeof (navigator as any).gpu?.requestAdapter !== 'function') {
        return false;
      }
      
      // Actually test if we can get an adapter and device
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!adapter) {
        return false;
      }
      
      // Try to create a device to ensure WebGPU is actually functional
      try {
        const device = await adapter.requestDevice();
        // Test device functionality with a simple operation
        if (device && device.queue) {
          device.destroy?.(); // Clean up the test device
          return true;
        }
        // If device exists but doesn't have queue, it's not functional
        device?.destroy?.();
        return false;
      } catch (deviceError) {
        // Only log device errors that aren't experimental warnings
        if (!deviceError || !String(deviceError).includes('experimental')) {
          console.warn('[Backend Detection Worker] WebGPU device creation failed:', deviceError);
        }
        return false;
      }
    } catch (error) {
      // Only log errors that aren't experimental warnings
      if (!error || !String(error).includes('experimental')) {
        console.warn('[Backend Detection Worker] WebGPU detection failed:', error);
      }
      return false;
    }
  });

  // Cache the result
  webGPUDetectionCache = {
    result,
    timestamp: Date.now()
  };

  return result;
}

function detectWASM(): boolean {
  try {
    return typeof WebAssembly === 'object' && 
           typeof WebAssembly.instantiate === 'function';
  } catch {
    return false;
  }
}

function detectWebGL(): boolean {
  try {
    const canvas = new OffscreenCanvas(1, 1);
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function detectSIMD(): boolean {
  try {
    // Test for WebAssembly SIMD support by attempting to validate SIMD bytecode
    const simdTestCode = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // magic
      0x01, 0x00, 0x00, 0x00, // version
      0x01, 0x05, 0x01, 0x60, // type section
      0x00, 0x01, 0x7b,       // v128 result type
    ]);
    
    return typeof WebAssembly !== 'undefined' && 
           WebAssembly.validate(simdTestCode);
  } catch {
    return false;
  }
}

function detectThreads(): boolean {
  try {
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    const hasWorker = typeof Worker !== 'undefined';
    
    if (hasSharedArrayBuffer) {
      try {
        new SharedArrayBuffer(1);
      } catch {
        return false;
      }
    }
    
    return hasSharedArrayBuffer && hasWorker;
  } catch {
    return false;
  }
}

// Benchmark WebGPU performance in worker
async function benchmarkWebGPU(onProgress?: (progress: number) => void): Promise<FlopsResult> {
  return await suppressWebGPUWarnings(async () => {
    try {
      onProgress?.(10); // Starting WebGPU benchmark
      
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance',
        forceFallbackAdapter: false
      });
      
      if (!adapter) {
        throw new Error('WebGPU adapter not available');
      }

      onProgress?.(30); // Adapter obtained
      
      const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
      });
      
      onProgress?.(50); // Device created
    
    const start = performance.now();
    
    // Enhanced compute shader for better FLOPS measurement
    const computeShader = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read_write> data: array<f32>;
        
        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let index = global_id.x;
          if (index >= arrayLength(&data)) { return; }
          
          var result = data[index];
          
          for (var i = 0u; i < 100u; i++) {
            result = result * 1.001 + 0.5;
            result = sin(result) * 0.9 + 0.1;
            result = sqrt(abs(result));
            result = result * result + 1.0;
            
            if (result > 1000.0) { result = result * 0.001; }
            if (result < 0.001) { result = result + 1.0; }
          }
          
          data[index] = result;
        }
      `
    });

    onProgress?.(70); // Shader compiled
    
    // Create larger buffer for more substantial computation
    const bufferSize = 65536; // 64K elements
    const buffer = device.createBuffer({
      size: bufferSize * 4, // 4 bytes per f32
      usage: 0x80 | 0x4 | 0x8 // STORAGE | COPY_DST | COPY_SRC
    });

    // Initialize buffer with data
    const initialData = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      initialData[i] = Math.random();
    }
    device.queue.writeBuffer(buffer, 0, initialData);

    onProgress?.(80); // Buffer prepared

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: 0x4, // COMPUTE stage
        buffer: { type: 'storage' as const }
      }]
    });

    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
      }),
      compute: {
        module: computeShader,
        entryPoint: 'main',
      },
    });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer }
      }]
    });

    onProgress?.(90); // Pipeline ready

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(bufferSize / 256));
    passEncoder.end();
    
    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    
    const duration = performance.now() - start;
      onProgress?.(100); // Complete
      
      // Calculate FLOPS: 6 operations per inner loop * 100 iterations * bufferSize elements
      const operations = 6 * 100 * bufferSize;
      const flopsPerSecond = duration > 0 ? (operations / duration) * 1000 : 0;

      // Clean up resources
      buffer.destroy();

      return {
        backend: 'WebGPU',
        flopsPerSecond: isFinite(flopsPerSecond) ? flopsPerSecond : 0,
        duration,
      };
    } catch (error) {
      return {
        backend: 'WebGPU',
        flopsPerSecond: 0,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

// Benchmark WASM performance
async function benchmarkWASM(): Promise<FlopsResult> {
  try {
    const start = performance.now();
    
    // Create a valid WASM module for floating point operations
    const wasmCode = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // magic
      0x01, 0x00, 0x00, 0x00, // version
      0x01, 0x07, 0x01, 0x60, 0x02, 0x7d, 0x7d, 0x01, 0x7d, // type section: (f32, f32) -> f32
      0x03, 0x02, 0x01, 0x00, // function section: function 0 has type 0
      0x07, 0x0c, 0x01, 0x08, 0x6d, 0x75, 0x6c, 0x74, 0x69, 0x70, 0x6c, 0x79, 0x00, 0x00, // export section: export function 0 as "multiply"
      0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x92, 0x0b // code section: multiply two f32 values
    ]);
    
    const wasmModule = await WebAssembly.instantiate(wasmCode);
    const multiply = wasmModule.instance.exports.multiply as Function;
    
    // Perform intensive floating point operations
    let result = 1.0;
    for (let i = 0; i < 1000000; i++) {
      result = multiply(result, 1.0001);
    }
    
    const duration = performance.now() - start;
    const operations = 1000000;
    const flopsPerSecond = duration > 0 ? (operations / duration) * 1000 : 0;

    return {
      backend: 'WASM',
      flopsPerSecond: isFinite(flopsPerSecond) ? flopsPerSecond : 0,
      duration,
    };
  } catch (error) {
    return {
      backend: 'WASM',
      flopsPerSecond: 0,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Benchmark JavaScript performance
async function benchmarkJavaScript(): Promise<FlopsResult> {
  const start = performance.now();
  
  // Perform intensive floating point operations in JavaScript
  let result = 1.0;
  for (let i = 0; i < 1000000; i++) {
    result = result * 1.0001 + Math.sin(i * 0.001);
    // Prevent result from growing too large
    if (!isFinite(result) || Math.abs(result) > 1e10) {
      result = 1.0;
    }
  }
  
  const duration = performance.now() - start;
  const operations = 1000000 * 2; // multiplication + addition per iteration
  const flopsPerSecond = duration > 0 ? (operations / duration) * 1000 : 0;

  return {
    backend: 'JavaScript',
    flopsPerSecond: isFinite(flopsPerSecond) ? flopsPerSecond : 0,
    duration,
  };
}

// Benchmark all available backends
async function benchmarkFlops(onProgress?: (progress: number) => void): Promise<BenchmarkResults> {
  const capabilities = await detectCapabilities();
  onProgress?.(10);
  
  const flopsResults: FlopsResult[] = [];

  // Benchmark each available backend with progress tracking
  let completed = 0;
  const totalBenchmarks = (capabilities.webgpu ? 1 : 0) + 
                         (capabilities.webnn ? 1 : 0) + 
                         (capabilities.wasm ? 1 : 0) + 1; // +1 for JavaScript

  if (capabilities.webgpu) {
    const progressStart = 20 + (completed * 60) / totalBenchmarks;
    const progressEnd = 20 + ((completed + 1) * 60) / totalBenchmarks;
    
    const result = await benchmarkWebGPU((subProgress) => {
      const overallProgress = progressStart + (subProgress / 100) * (progressEnd - progressStart);
      onProgress?.(overallProgress);
    });
    flopsResults.push(result);
    completed++;
  }

  if (capabilities.wasm) {
    onProgress?.(20 + (completed * 60) / totalBenchmarks);
    flopsResults.push(await benchmarkWASM());
    completed++;
  }

  // Always test JavaScript as fallback
  onProgress?.(20 + (completed * 60) / totalBenchmarks);
  flopsResults.push(await benchmarkJavaScript());
  completed++;

  onProgress?.(90);

  // Determine recommended backend
  const recommendedBackend = determineRecommendedBackend(flopsResults);

  const benchmarkResults: BenchmarkResults = {
    capabilities,
    flopsResults,
    recommendedBackend,
    deviceInfo: {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      memory: (performance as any)?.memory?.usedJSHeapSize,
    },
  };

  onProgress?.(100);
  return benchmarkResults;
}

function determineRecommendedBackend(results: FlopsResult[]): string {
  const validResults = results.filter(r => r.flopsPerSecond > 0 && isFinite(r.flopsPerSecond));
  if (validResults.length === 0) return 'JavaScript';
  
  // Sort by FLOPS performance, but also consider backend preference
  const sortedResults = validResults.sort((a, b) => {
    // Give slight preference to WebGPU and WebNN for similar performance
    const aScore = a.flopsPerSecond * (a.backend === 'WebGPU' ? 1.1 : a.backend === 'WebNN' ? 1.05 : 1.0);
    const bScore = b.flopsPerSecond * (b.backend === 'WebGPU' ? 1.1 : b.backend === 'WebNN' ? 1.05 : 1.0);
    
    return bScore - aScore;
  });
  
  return sortedResults[0].backend;
}

// Get detailed WebGPU diagnostics
async function getWebGPUDiagnostics(): Promise<{
  available: boolean;
  adapter?: any;
  device?: any;
  features?: string[];
  limits?: any;
  error?: string;
}> {
  return await suppressWebGPUWarnings(async () => {
    try {
      if (!('gpu' in navigator)) {
        return { available: false, error: 'WebGPU not available in this browser' };
      }

      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        return { available: false, error: 'No WebGPU adapter available' };
      }

      // Try to create a device to test actual functionality
      let device = null;
      try {
        device = await adapter.requestDevice({
          requiredFeatures: [],
          requiredLimits: {}
        });
        
        // Test basic device functionality
        if (!device || !device.queue) {
          device?.destroy?.();
          return { available: false, error: 'WebGPU device creation succeeded but device is non-functional' };
        }
      } catch (deviceError) {
        return { 
          available: false, 
          error: `WebGPU device creation failed: ${deviceError instanceof Error ? deviceError.message : 'Unknown device error'}` 
        };
      }
      
      const result = {
        available: true,
        adapter: {
          vendor: adapter.info?.vendor || 'Unknown',
          architecture: adapter.info?.architecture || 'Unknown',
          device: adapter.info?.device || 'Unknown',
          description: adapter.info?.description || 'Unknown'
        },
        features: Array.from(adapter.features || []).map(f => String(f)),
        limits: adapter.limits ? Object.fromEntries(
          Object.entries(adapter.limits).map(([key, value]) => [key, value])
        ) : {}
      };
      
      // Clean up the test device
      device?.destroy?.();
      
      return result;
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, data } = event.data;
  
  try {
    let responseData: any;
    
    // Progress callback to send progress updates
    const sendProgress = (progress: number) => {
      try {
        const progressResponse: WorkerResponse = {
          id,
          success: true,
          progress,
        };
        self.postMessage(progressResponse);
      } catch (progressError) {
        console.error('[Backend Worker] Failed to send progress:', progressError);
      }
    };
    
    console.log(`[Backend Worker] Processing request: ${type}`);
    
    switch (type) {
      case 'detectCapabilities':
        responseData = await detectCapabilities();
        break;
        
      case 'benchmarkFlops':
        responseData = await benchmarkFlops(sendProgress);
        break;
        
      case 'getWebGPUDiagnostics':
        responseData = await getWebGPUDiagnostics();
        break;
        
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
    
    const response: WorkerResponse = {
      id,
      success: true,
      data: responseData,
    };
    
    console.log(`[Backend Worker] Request ${type} completed successfully`);
    self.postMessage(response);
    
  } catch (error) {
    console.error(`[Backend Worker] Request ${type} failed:`, error);
    
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    self.postMessage(response);
  }
};

// Handle worker errors gracefully
self.onerror = (error) => {
  console.error('[Backend Worker] Global error:', error);
};

self.onunhandledrejection = (event) => {
  console.error('[Backend Worker] Unhandled promise rejection:', event.reason);
  event.preventDefault();
};

// Export for TypeScript
export {};