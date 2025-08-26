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
      return 'gpu' in navigator && typeof (navigator as any).gpu?.requestAdapter === 'function';
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
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        throw new Error('WebGPU adapter not available');
      }

      const device = await adapter.requestDevice();
      const start = performance.now();
      
      // Simple compute shader for FLOPS testing
      const computeShader = device.createShaderModule({
        code: `
          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= 1000u) { return; }
            
            // Perform multiple floating point operations
            var result = 0.0;
            for (var i = 0u; i < 1000u; i++) {
              result += f32(i) * 2.5 + 1.0;
              result *= 0.999;
            }
          }
        `
      });

      const pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: computeShader,
          entryPoint: 'main',
        },
      });

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.dispatchWorkgroups(16); // 64 * 16 = 1024 work items
      passEncoder.end();
      
      device.queue.submit([commandEncoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      
      const duration = performance.now() - start;
      const operations = 1000 * 1000 * 3; // 1000 iterations * 1000 work items * ~3 ops per iteration
      const flopsPerSecond = (operations / duration) * 1000;

      return {
        backend: 'WebGPU',
        flopsPerSecond,
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
    
    return validResults.reduce((best, current) => {
      // Prefer higher FLOPS, but also consider error-free results
      if (current.error && !best.error) return best;
      if (best.error && !current.error) return current;
      return current.flopsPerSecond > best.flopsPerSecond ? current : best;
    }).backend;
  }

  getBenchmarkResults(): BenchmarkResults | null {
    return this.benchmarkResults;
  }

  getCapabilities(): BackendCapabilities | null {
    return this.capabilities;
  }
}

export const backendDetector = BackendDetector.getInstance();