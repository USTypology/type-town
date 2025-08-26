// Service to manage client-side LLM processing using Web Workers with Llama model support
class ClientLLMWorkerService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private requestCounter = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private currentModel = 'Xenova/distilgpt2';
  private capabilities = { webGPU: false, simd: false };

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
      
      console.log('Enhanced Client LLM Worker created with Llama support');
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
        // Update local state based on response
        if (data.capabilities) {
          this.capabilities = data.capabilities;
        }
        if (data.modelName) {
          this.currentModel = data.modelName;
        }
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

      // Extended timeout for model loading and large model inference
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, type === 'initialize' || type === 'switchModel' ? 120000 : 45000); // 2min for init, 45s for generation

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
    if (this.isInitialized && this.currentModel === modelName) {
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
      const result = await this.sendWorkerRequest('initialize', { modelName });
      this.isInitialized = true;
      this.currentModel = result.modelName;
      this.capabilities = result.capabilities;
      console.log(`Client LLM Worker initialized with ${result.modelName}`);
    } catch (error) {
      console.error('Failed to initialize Client LLM Worker:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async switchModel(modelName: string): Promise<void> {
    if (this.currentModel === modelName && this.isInitialized) {
      return; // Already using this model
    }

    try {
      const result = await this.sendWorkerRequest('switchModel', { modelName });
      this.currentModel = result.modelName;
      this.capabilities = result.capabilities;
      console.log(`Switched to model: ${result.modelName}`);
    } catch (error) {
      console.error('Failed to switch model:', error);
      throw error;
    }
  }

  async generateText(prompt: string, maxTokens: number = 50): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.sendWorkerRequest('generate', { prompt, maxTokens });
      return result.text;
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }

  async getCapabilities(): Promise<any> {
    try {
      return await this.sendWorkerRequest('getCapabilities', {});
    } catch (error) {
      console.error('Failed to get capabilities:', error);
      return { webGPU: false, simd: false, currentModel: this.currentModel, isInitialized: false };
    }
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getStatus(): { isInitialized: boolean; isInitializing: boolean; hasWorker: boolean; currentModel: string; capabilities: any } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      hasWorker: this.worker !== null,
      currentModel: this.currentModel,
      capabilities: this.capabilities,
    };
  }

  // Enhanced conversation generation for different character types
  async generateConversationMessage(
    characterName: string,
    identity: string,
    conversationHistory: string[],
    type: 'start' | 'continue' | 'leave',
    otherCharacterName?: string
  ): Promise<string> {
    let prompt = '';
    const isInstructModel = this.currentModel.includes('Instruct');

    if (isInstructModel) {
      // Optimized prompt format for Llama Instruct models
      prompt = `You are ${characterName}. ${identity}

Character context: You are a thoughtful character in a virtual town simulation. Respond naturally and stay in character.

`;
    } else {
      // Format for conversation models
      prompt = `${characterName} is ${identity.toLowerCase()}

`;
    }

    if (type === 'start') {
      if (isInstructModel) {
        prompt += `Task: Start a conversation with ${otherCharacterName}. Introduce yourself naturally and start a friendly dialogue.

Response:`;
      } else {
        prompt += `${characterName} walks up to ${otherCharacterName} and says: "`;
      }
    } else if (type === 'continue') {
      if (isInstructModel) {
        prompt += `Conversation so far:
${conversationHistory.slice(-3).join('\n')}

Task: Continue this conversation naturally as ${characterName}.

Response:`;
      } else {
        prompt += conversationHistory.slice(-2).join('\n') + `\n${characterName}: "`;
      }
    } else if (type === 'leave') {
      if (isInstructModel) {
        prompt += `Conversation so far:
${conversationHistory.slice(-2).join('\n')}

Task: Politely end this conversation as ${characterName}.

Response:`;
      } else {
        prompt += conversationHistory.slice(-2).join('\n') + `\n${characterName} needs to leave and says: "`;
      }
    }

    const maxTokens = type === 'start' ? 60 : type === 'leave' ? 40 : 80;
    let response = await this.generateText(prompt, maxTokens);
    
    // Clean up response based on model type
    if (!isInstructModel && !response.endsWith('"')) {
      // Add closing quote for conversation models
      response = response.split('"')[0] + '"';
    }
    
    // Remove character name prefixes and clean up
    response = this.cleanResponse(response, characterName, otherCharacterName);
    
    return response;
  }

  private cleanResponse(response: string, characterName: string, otherCharacterName?: string): string {
    // Remove any character name prefixes that might have been generated
    response = response.replace(new RegExp(`^${characterName}:?\\s*`, 'i'), '');
    if (otherCharacterName) {
      response = response.replace(new RegExp(`^${otherCharacterName}:?\\s*`, 'i'), '');
    }
    
    // Remove quotes that were part of prompt format
    response = response.replace(/^["']|["']$/g, '');
    
    // Remove conversation formatting artifacts
    response = response.replace(/^\s*says?:?\s*/i, '');
    
    // Clean up and limit length
    response = response.trim().substring(0, 200);
    
    // Ensure proper sentence ending
    if (response && !response.match(/[.!?]$/)) {
      response += '.';
    }
    
    return response || "Hello there!";
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