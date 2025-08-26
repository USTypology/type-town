// Service to manage client-side LLM processing using Web Workers
class ClientLLMWorkerService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private requestCounter = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker from the worker file
      this.worker = new Worker(
        new URL('../workers/clientLLMWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      console.log('Client LLM Worker created');
    } catch (error) {
      console.error('Failed to create Client LLM Worker:', error);
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { id, success, data, error } = event.data;
    const pendingRequest = this.pendingRequests.get(id);
    
    if (pendingRequest) {
      this.pendingRequests.delete(id);
      
      if (success) {
        pendingRequest.resolve(data);
      } else {
        pendingRequest.reject(new Error(error || 'Worker request failed'));
      }
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Client LLM Worker error:', error);
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests.entries()) {
      request.reject(new Error('Worker error occurred'));
      this.pendingRequests.delete(id);
    }
  }

  private async sendWorkerRequest(type: string, data: any): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }

    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestCounter}`;
      this.pendingRequests.set(id, { resolve, reject });

      // Add timeout to prevent hanging requests
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, 30000); // 30 second timeout

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
        }
      });

      this.worker!.postMessage({ id, type, data });
    });
  }

  async initialize(modelName: string = 'Xenova/distilgpt2'): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
      // Wait for existing initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;

    try {
      await this.sendWorkerRequest('initialize', { modelName });
      this.isInitialized = true;
      console.log('Client LLM Worker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Client LLM Worker:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async generateText(prompt: string, maxTokens: number = 50): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Worker not initialized. Call initialize() first.');
    }

    try {
      const result = await this.sendWorkerRequest('generate', { prompt, maxTokens });
      return result.text;
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }

  getStatus(): { isInitialized: boolean; isInitializing: boolean; hasWorker: boolean } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      hasWorker: this.worker !== null,
    };
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.isInitializing = false;
    this.pendingRequests.clear();
  }
}

// Create singleton instance
export const clientLLMWorkerService = new ClientLLMWorkerService();