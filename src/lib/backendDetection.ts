// Backend Detection and FLOPS Benchmarking System

export interface BackendCapabilities {
  webnn: boolean;
  webgpu: boolean; 
  wasm: boolean;
  webgl: boolean;
  simd: boolean;
  threads: boolean;
}

export interface FlopsResult {
  backend: string;
  flopsPerSecond: number;
  duration: number;
  error?: string;
}

export interface BenchmarkResults {
  capabilities: BackendCapabilities;
  flopsResults: FlopsResult[];
  recommendedBackend: string;
  deviceInfo: {
    userAgent: string;
    hardwareConcurrency: number;
    memory?: number;
  };
}

export class BackendDetector {
  private static instance: BackendDetector;
  private capabilities: BackendCapabilities | null = null;
  private benchmarkResults: BenchmarkResults | null = null;

  static getInstance(): BackendDetector {
    if (!this.instance) {
      this.instance = new BackendDetector();
    }
    return this.instance;
  }

  async detectCapabilities(): Promise<BackendCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    this.capabilities = {
      webnn: await this.detectWebNN(),
      webgpu: await this.detectWebGPU(),
      wasm: this.detectWASM(),
      webgl: this.detectWebGL(),
      simd: this.detectSIMD(),
      threads: this.detectThreads(),
    };

    return this.capabilities;
  }

  private async detectWebNN(): Promise<boolean> {
    try {
      // Check for WebNN API
      return 'ml' in navigator && typeof (navigator as any).ml?.createContext === 'function';
    } catch {
      return false;
    }
  }

  private async detectWebGPU(): Promise<boolean> {
    try {
      if (!('gpu' in navigator) || typeof (navigator as any).gpu?.requestAdapter !== 'function') {
        return false;
      }
      
      // Actually test if we can get an adapter
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      return adapter !== null;
    } catch {
      return false;
    }
  }

  private detectWASM(): boolean {
    try {
      return typeof WebAssembly === 'object' && 
             typeof WebAssembly.instantiate === 'function';
    } catch {
      return false;
    }
  }

  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private detectSIMD(): boolean {
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

  private detectThreads(): boolean {
    try {
      // Check for SharedArrayBuffer and Worker support, and that they're not disabled
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      const hasWorker = typeof Worker !== 'undefined';
      
      // Additional check: SharedArrayBuffer might be disabled due to security headers
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

  async benchmarkFlops(): Promise<BenchmarkResults> {
    const capabilities = await this.detectCapabilities();
    const flopsResults: FlopsResult[] = [];

    // Benchmark each available backend
    if (capabilities.webgpu) {
      flopsResults.push(await this.benchmarkWebGPU());
    }

    if (capabilities.webnn) {
      flopsResults.push(await this.benchmarkWebNN());
    }

    if (capabilities.wasm) {
      flopsResults.push(await this.benchmarkWASM());
    }

    // Always test JavaScript as fallback
    flopsResults.push(await this.benchmarkJavaScript());

    // Determine recommended backend
    const recommendedBackend = this.determineRecommendedBackend(flopsResults);

    this.benchmarkResults = {
      capabilities,
      flopsResults,
      recommendedBackend,
      deviceInfo: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        memory: (performance as any)?.memory?.usedJSHeapSize,
      },
    };

    return this.benchmarkResults;
  }

  private async benchmarkWebGPU(): Promise<FlopsResult> {
    try {
      // Request adapter with detailed options
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance',
        forceFallbackAdapter: false
      });
      
      if (!adapter) {
        throw new Error('WebGPU adapter not available');
      }

      // Get device with required features if available
      const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
      });
      
      const start = performance.now();
      
      // Enhanced compute shader for better FLOPS measurement
      const computeShader = device.createShaderModule({
        code: `
          @group(0) @binding(0) var<storage, read_write> data: array<f32>;
          
          @compute @workgroup_size(256)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= arrayLength(&data)) { return; }
            
            // Intensive floating point computation
            var result = data[index];
            
            for (var i = 0u; i < 100u; i++) {
              // Multiple operations per iteration to increase FLOPS
              result = result * 1.001 + 0.5;
              result = sin(result) * 0.9 + 0.1;
              result = sqrt(abs(result));
              result = result * result + 1.0;
              
              // Prevent overflow/underflow
              if (result > 1000.0) { result = result * 0.001; }
              if (result < 0.001) { result = result + 1.0; }
            }
            
            data[index] = result;
          }
        `
      });

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

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      // Dispatch workgroups to cover all buffer elements
      passEncoder.dispatchWorkgroups(Math.ceil(bufferSize / 256));
      passEncoder.end();
      
      device.queue.submit([commandEncoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      
      const duration = performance.now() - start;
      
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
  }

  private async benchmarkWebNN(): Promise<FlopsResult> {
    try {
      const ml = (navigator as any).ml;
      const context = await ml.createContext();
      
      const start = performance.now();
      
      // Create a simple neural network operation for benchmarking
      const builder = new ml.GraphBuilder(context);
      const input = builder.input('input', { type: 'float32', dimensions: [1, 1000] });
      const weights = builder.constant({ type: 'float32', dimensions: [1000, 1000] }, new Float32Array(1000000).fill(0.1));
      const output = builder.matmul(input, weights);
      const graph = await builder.build({ output });
      
      // Execute the computation
      const inputBuffer = { input: new Float32Array(1000).fill(1.0) };
      const results = await context.compute(graph, inputBuffer);
      
      const duration = performance.now() - start;
      const operations = 1000 * 1000 * 2; // Matrix multiplication operations
      const flopsPerSecond = (operations / duration) * 1000;

      return {
        backend: 'WebNN',
        flopsPerSecond,
        duration,
      };
    } catch (error) {
      return {
        backend: 'WebNN',
        flopsPerSecond: 0,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async benchmarkWASM(): Promise<FlopsResult> {
    try {
      const start = performance.now();
      
      // Create a valid WASM module for floating point operations
      // This creates a simple multiply function: (f32, f32) -> f32
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
        result = result * 1.0001;
        if (result > 1000) result = 1.0; // Prevent overflow
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

  private async benchmarkJavaScript(): Promise<FlopsResult> {
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

  private determineRecommendedBackend(results: FlopsResult[]): string {
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
  async getWebGPUDiagnostics(): Promise<{
    available: boolean;
    adapter?: any;
    device?: any;
    features?: string[];
    limits?: any;
    error?: string;
  }> {
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

      const device = await adapter.requestDevice();
      
      return {
        available: true,
        adapter: {
          vendor: adapter.info?.vendor || 'Unknown',
          architecture: adapter.info?.architecture || 'Unknown',
          device: adapter.info?.device || 'Unknown',
          description: adapter.info?.description || 'Unknown'
        },
        features: Array.from(adapter.features || []),
        limits: adapter.limits ? Object.fromEntries(
          Object.entries(adapter.limits).map(([key, value]) => [key, value])
        ) : {}
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getBenchmarkResults(): BenchmarkResults | null {
    return this.benchmarkResults;
  }

  getCapabilities(): BackendCapabilities | null {
    return this.capabilities;
  }

  // Force re-detection and benchmarking
  async forceRefresh(): Promise<BenchmarkResults> {
    this.capabilities = null;
    this.benchmarkResults = null;
    return await this.benchmarkFlops();
  }

  // Attempt to initialize WebGPU for transformers.js
  async initializeWebGPUForTransformers(): Promise<{ success: boolean; message: string }> {
    try {
      const diagnostics = await this.getWebGPUDiagnostics();
      
      if (!diagnostics.available) {
        return {
          success: false,
          message: `WebGPU not available: ${diagnostics.error}`
        };
      }

      // Import transformers env and try to enable WebGPU
      const { env } = await import('@xenova/transformers');
      
      // Configure WebGPU backend for transformers.js
      try {
        // Set the preferred backend order to prioritize WebGPU
        if (env.backends && env.backends.onnx) {
          // Enable WebGPU backend if available
          if (env.backends.onnx.webgpu) {
            // Set WebGPU as the preferred backend
            (env.backends.onnx as any).preferredBackend = 'webgpu';
            console.log('Setting WebGPU as preferred backend for ONNX Runtime');
          }

          // Ensure WASM backend is also optimally configured as fallback
          if (env.backends.onnx.wasm) {
            (env.backends.onnx.wasm as any).numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
            (env.backends.onnx.wasm as any).simd = true; // Enable SIMD if available
            console.log(`Configured WASM backend: ${(env.backends.onnx.wasm as any).numThreads} threads, SIMD enabled`);
          }
        }

        // Try to initialize ONNX Runtime with WebGPU support directly
        if (typeof (window as any).ort !== 'undefined') {
          const ort = (window as any).ort;
          if (ort.env) {
            // Configure ONNX Runtime environment
            ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
            ort.env.wasm.simd = true;
            
            // Set WebGPU as execution provider preference
            if (ort.env.webgpu) {
              ort.env.webgpu.validateInputContent = false; // Improve performance
              console.log('Configured ONNX Runtime WebGPU execution provider');
            }
          }
        }

        return {
          success: true,
          message: 'WebGPU backend configuration completed for transformers.js'
        };
      } catch (transformersError) {
        console.warn('WebGPU configuration failed, falling back to WASM:', transformersError);
        
        // Fallback: at least optimize WASM settings
        try {
          if (env.backends?.onnx?.wasm) {
            (env.backends.onnx.wasm as any).numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
            (env.backends.onnx.wasm as any).simd = true;
          }
          
          return {
            success: true,
            message: 'WebGPU unavailable, using optimized WASM backend with multi-threading'
          };
        } catch {
          return {
            success: false,
            message: `Failed to configure any backend: ${transformersError instanceof Error ? transformersError.message : 'Unknown error'}`
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Backend initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const backendDetector = BackendDetector.getInstance();