// Service to manage backend detection and benchmarking using Web Workers
import { BenchmarkResults, BackendCapabilities } from './backendDetection';

interface WorkerRequest {
  id: string;
  type: string;
  data?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  progress?: number;
}

class BackendDetectionWorkerService {
  private worker: Worker | null = null;
  private requestCounter = 0;
  private pendingRequests = new Map<string, { 
    resolve: Function; 
    reject: Function; 
    onProgress?: (progress: number) => void 
  }>();
  private isInitialized = false;
  private cachedResults: BenchmarkResults | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker from the worker file - try/catch for different environments
      try {
        this.worker = new Worker(
          new URL('../workers/backendDetectionWorker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (urlError) {
        // Fallback for environments where import.meta.url is not available
        this.worker = new Worker('/src/workers/backendDetectionWorker.ts', { type: 'module' });
      }

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      this.isInitialized = true;
      console.log('Backend Detection Worker created');
    } catch (error) {
      console.error('Failed to create Backend Detection Worker:', error);
      this.isInitialized = false;
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, success, data, error, progress } = event.data;
    const pendingRequest = this.pendingRequests.get(id);
    
    if (pendingRequest) {
      // Handle progress updates
      if (progress !== undefined && pendingRequest.onProgress) {
        pendingRequest.onProgress(progress);
        return; // Don't resolve yet, just update progress
      }

      // Handle final response
      this.pendingRequests.delete(id);
      
      if (success) {
        // Cache benchmark results
        if (data && data.capabilities) {
          this.cachedResults = data;
        }
        pendingRequest.resolve(data);
      } else {
        pendingRequest.reject(new Error(error || 'Worker request failed'));
      }
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Backend Detection Worker error:', error);
    // Reject all pending requests
    this.pendingRequests.forEach((request, id) => {
      request.reject(new Error('Worker error occurred'));
      this.pendingRequests.delete(id);
    });
  }

  private async sendWorkerRequest(
    type: string, 
    data?: any, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    if (!this.worker || !this.isInitialized) {
      // Fallback to direct detection if worker fails
      console.warn('Worker not available, falling back to main thread detection');
      return this.fallbackToMainThread(type, data);
    }

    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestCounter}`;
      this.pendingRequests.set(id, { resolve, reject, onProgress });

      // Extended timeout for benchmarking operations
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, type === 'benchmarkFlops' ? 60000 : 15000); // 60s for benchmarks, 15s for detection

      const originalResolve = resolve;
      const originalReject = reject;

      // Wrap resolve/reject to clear timeout
      this.pendingRequests.set(id, {
        resolve: (result: any) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          originalReject(error);
        },
        onProgress
      });

      this.worker!.postMessage({ id, type, data });
    });
  }

  // Fallback implementation for when worker is not available
  private async fallbackToMainThread(type: string, data?: any): Promise<any> {
    console.warn(`[BackendDetectionWorkerService] Worker not available, falling back to main thread for: ${type}`);
    
    try {
      // Import the original backend detector as fallback
      const { backendDetector } = await import('./backendDetection');
      
      switch (type) {
        case 'detectCapabilities':
          return await backendDetector.detectCapabilities();
        case 'benchmarkFlops':
          console.warn('[BackendDetectionWorkerService] Running benchmarks on main thread - UI may freeze temporarily');
          return await backendDetector.benchmarkFlops();
        case 'getWebGPUDiagnostics':
          return await backendDetector.getWebGPUDiagnostics();
        default:
          throw new Error(`Unknown fallback type: ${type}`);
      }
    } catch (importError) {
      console.error(`[BackendDetectionWorkerService] Fallback failed for ${type}:`, importError);
      throw new Error(`Fallback failed: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
    }
  }

  async detectCapabilities(): Promise<BackendCapabilities> {
    try {
      return await this.sendWorkerRequest('detectCapabilities');
    } catch (error) {
      console.error('Failed to detect capabilities:', error);
      // Return safe fallback capabilities
      return {
        webnn: false,
        webgpu: false,
        wasm: typeof WebAssembly !== 'undefined',
        webgl: false,
        simd: false,
        threads: false,
      };
    }
  }

  async benchmarkFlops(onProgress?: (progress: number) => void): Promise<BenchmarkResults> {
    try {
      const result = await this.sendWorkerRequest('benchmarkFlops', undefined, onProgress);
      this.cachedResults = result;
      return result;
    } catch (error) {
      console.error('Failed to benchmark FLOPS:', error);
      // Return cached results or safe fallback
      if (this.cachedResults) {
        return this.cachedResults;
      }
      throw error;
    }
  }

  async getWebGPUDiagnostics(): Promise<{
    available: boolean;
    adapter?: any;
    device?: any;
    features?: string[];
    limits?: any;
    error?: string;
  }> {
    try {
      return await this.sendWorkerRequest('getWebGPUDiagnostics');
    } catch (error) {
      console.error('Failed to get WebGPU diagnostics:', error);
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get cached results without running new benchmarks
  getCachedResults(): BenchmarkResults | null {
    return this.cachedResults;
  }

  // Check if worker is available
  isWorkerAvailable(): boolean {
    return this.worker !== null && this.isInitialized;
  }

  // Force refresh - clear cache and run new benchmarks
  async forceRefresh(onProgress?: (progress: number) => void): Promise<BenchmarkResults> {
    this.cachedResults = null;
    return this.benchmarkFlops(onProgress);
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.pendingRequests.clear();
    this.cachedResults = null;
  }
}

// Create singleton instance
export const backendDetectionWorkerService = new BackendDetectionWorkerService();