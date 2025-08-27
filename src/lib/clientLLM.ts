import { pipeline, TextGenerationPipeline, env } from '@xenova/transformers';
import { LLM_CONFIG, SUPPORTED_MODELS } from './llmConfig';
import { backendDetector } from './backendDetection';

// Model configuration interface
export interface ModelConfig {
  name: string;
  size: string;
  requiresWebGPU: boolean;
  contextLength: number;
  description: string;
  type: 'instruct' | 'conversational';
  quantized: boolean;
  simdOptimized: boolean;
}

// Enhanced client-side LLM service with WebGPU support for larger models
class ClientLLMService {
  private textGenerator: TextGenerationPipeline | null = null;
  private isLoading = false;
  private currentModel: string = LLM_CONFIG.CLIENT_MODEL;
  private supportedModels = SUPPORTED_MODELS;

  constructor() {
    // Models are now loaded from centralized config
  }

  async initialize(modelName?: string): Promise<void> {
    const targetModel = modelName || this.currentModel;
    
    if (this.textGenerator && this.currentModel === targetModel) return;
    if (this.isLoading) return;
    
    this.isLoading = true;
    try {
      // Check backend capabilities for model compatibility
      const capabilities = await backendDetector.detectCapabilities();
      const modelConfig = this.supportedModels[targetModel as keyof typeof SUPPORTED_MODELS];
      
      // Enhanced WebGPU diagnostics for large model compatibility
      if (modelConfig?.requiresWebGPU) {
        const webgpuDiagnostics = await backendDetector.getWebGPUDiagnostics();
        
        if (!webgpuDiagnostics.available) {
          console.warn(`Model ${targetModel} requires WebGPU but it's not available. Falling back to DistilGPT-2.`);
          return this.initialize('Xenova/distilgpt2');
        }
        
        // Check if WebGPU setup is suitable for large models
        if (!webgpuDiagnostics.suitableForLargeModels && modelConfig.size.includes('GB')) {
          console.warn(`WebGPU adapter may not be suitable for large model ${targetModel}. Consider using a smaller model.`);
          console.log('WebGPU diagnostics:', {
            vendor: webgpuDiagnostics.adapter?.vendor,
            description: webgpuDiagnostics.adapter?.description,
            suitableForLargeModels: webgpuDiagnostics.suitableForLargeModels
          });
        }
      } else if (!capabilities.webgpu) {
        console.warn(`Model ${targetModel} requires WebGPU but it's not available. Falling back to DistilGPT-2.`);
        return this.initialize('Xenova/distilgpt2');
      }

      // Configure transformers.js for optimal performance
      if (capabilities.webgpu && modelConfig?.requiresWebGPU) {
        // Try to initialize WebGPU properly for transformers.js
        const webgpuInit = await backendDetector.initializeWebGPUForTransformers();
        console.log('WebGPU initialization:', webgpuInit.message);
        
        if (!webgpuInit.success) {
          console.warn(`WebGPU initialization failed: ${webgpuInit.message}. Falling back to DistilGPT-2.`);
          return this.initialize('Xenova/distilgpt2');
        }

        // Set execution providers for ONNX Runtime with better error handling
        try {
          const { env } = await import('@xenova/transformers');
          if (env.backends?.onnx) {
            // Set WebGPU as the preferred execution provider with CPU as final fallback
            (env.backends.onnx as any).executionProviders = ['webgpu', 'wasm', 'cpu'];
            console.log('Set execution providers: WebGPU (primary), WASM (fallback), CPU (final)');
            
            // Add execution provider error handling
            if (env.backends.onnx.webgpu) {
              try {
                (env.backends.onnx.webgpu as any).contextTimeoutMs = 10000; // 10 second timeout
              } catch {
                // Ignore if property doesn't exist
              }
            }
          }
        } catch (epError) {
          console.warn('Could not set execution providers:', epError);
          // Continue without WebGPU if configuration fails
        }
      } else {
        // Use WASM/CPU fallback
        try {
          const { env } = await import('@xenova/transformers');
          if (env.backends?.onnx) {
            (env.backends.onnx as any).executionProviders = ['wasm', 'cpu'];
            if (env.backends.onnx.wasm) {
              (env.backends.onnx.wasm as any).useGpu = false;
            }
          }
        } catch {
          // Ignore if not available
        }
      }

      // Import env for thread configuration
      const { env } = await import('@xenova/transformers');
      
      // Set appropriate thread count based on device capabilities
      if (capabilities.threads && env.backends?.onnx?.wasm) {
        (env.backends.onnx.wasm as any).numThreads = Math.min(navigator.hardwareConcurrency, 4);
      }

      console.log(`Initializing ${modelConfig?.name || targetModel}...`);
      
      // Configure pipeline options based on available backends
      const pipelineOptions: any = {
        quantized: !modelConfig?.requiresWebGPU, // Use quantization for non-WebGPU models
      };

      // If WebGPU is available and model requires it, configure WebGPU device
      if (capabilities.webgpu && modelConfig?.requiresWebGPU) {
        pipelineOptions.device = 'webgpu'; // Use WebGPU device
        pipelineOptions.dtype = 'fp16'; // Use half precision for WebGPU to save memory
        console.log('Configuring pipeline for WebGPU with FP16 precision');
      } else if (capabilities.wasm) {
        pipelineOptions.device = 'wasm'; // Explicitly use WASM
        console.log('Configuring pipeline for WASM backend');
      }

      try {
        this.textGenerator = await pipeline('text-generation', targetModel, pipelineOptions) as TextGenerationPipeline;
        this.currentModel = targetModel;
        console.log(`Successfully loaded ${modelConfig?.name || targetModel}`);
      } catch (pipelineError) {
        console.warn('Pipeline creation failed, attempting fallback:', pipelineError);
        
        // If WebGPU pipeline fails, try WASM fallback
        if (pipelineOptions.device === 'webgpu') {
          console.log('WebGPU pipeline failed, falling back to WASM...');
          const fallbackOptions = {
            ...pipelineOptions,
            device: 'wasm',
            quantized: true, // Use quantization for WASM fallback
          };
          delete fallbackOptions.dtype; // Remove WebGPU-specific options
          
          try {
            this.textGenerator = await pipeline('text-generation', targetModel, fallbackOptions) as TextGenerationPipeline;
            this.currentModel = targetModel;
            console.log(`Successfully loaded ${modelConfig?.name || targetModel} with WASM fallback`);
          } catch (fallbackError) {
            console.error('WASM fallback also failed:', fallbackError);
            throw fallbackError;
          }
        } else {
          throw pipelineError;
        }
      }
    } catch (error) {
      console.error('Failed to initialize client-side LLM:', error);
      
      // Fallback to smaller model if large model fails
      if (targetModel !== 'Xenova/distilgpt2') {
        console.log('Falling back to DistilGPT-2...');
        return this.initialize('Xenova/distilgpt2');
      }
      
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async generateResponse(prompt: string, maxTokens: number = 100): Promise<string> {
    if (!this.textGenerator) {
      await this.initialize();
    }

    if (!this.textGenerator) {
      throw new Error('Failed to initialize text generator');
    }

    try {
      const modelConfig = this.supportedModels[this.currentModel as keyof typeof SUPPORTED_MODELS];
      const isInstructModel = this.currentModel.includes('Instruct') || 
                             modelConfig?.type === 'instruct';
      
      // Format prompt appropriately for instruction models
      let formattedPrompt = prompt;
      
      if (isInstructModel) {
        // Handle different instruction model formats
        if (this.currentModel.includes('qwen3') || this.currentModel.includes('deepseek')) {
          // Use a more generic instruction format for WebML community models
          formattedPrompt = `<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;
        } else {
          // Use Llama format for Llama models
          formattedPrompt = `<|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
        }
      }

      const response = await this.textGenerator(formattedPrompt, {
        max_new_tokens: maxTokens,
        temperature: isInstructModel ? 0.6 : 0.7,
        do_sample: true,
        top_p: 0.9,
        repetition_penalty: isInstructModel ? 1.05 : 1.1,
        pad_token_id: 50256, // Ensure proper padding
      }) as any;

      // Extract the generated text, removing the input prompt
      const fullText = Array.isArray(response) ? response[0].generated_text : response.generated_text;
      let generatedText = fullText.substring(formattedPrompt.length).trim();
      
      // Clean up instruction model responses
      if (isInstructModel) {
        if (this.currentModel.includes('qwen3') || this.currentModel.includes('deepseek')) {
          generatedText = generatedText.split('<|im_end|>')[0].trim();
        } else {
          generatedText = generatedText.split('<|eot_id|>')[0].trim();
        }
      }
      
      return generatedText;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async generateConversationMessage(
    characterName: string,
    identity: string,
    conversationHistory: string[],
    type: 'start' | 'continue' | 'leave',
    otherCharacterName?: string
  ): Promise<string> {
    let prompt = `You are ${characterName}. ${identity}\n\n`;
    
    if (type === 'start') {
      prompt += `You are starting a conversation with ${otherCharacterName}. Say hello and introduce yourself naturally.\n\n`;
      prompt += `${characterName}:`;
    } else if (type === 'continue') {
      prompt += `Conversation history:\n`;
      conversationHistory.forEach(message => {
        prompt += `${message}\n`;
      });
      prompt += `\nContinue the conversation naturally as ${characterName}.\n\n`;
      prompt += `${characterName}:`;
    } else if (type === 'leave') {
      prompt += `Conversation history:\n`;
      conversationHistory.forEach(message => {
        prompt += `${message}\n`;
      });
      prompt += `\nYou want to politely end this conversation. Say goodbye naturally.\n\n`;
      prompt += `${characterName}:`;
    }

    const maxTokens = type === 'start' ? 50 : type === 'leave' ? 30 : 80;
    let response = await this.generateResponse(prompt, maxTokens);
    
    // Clean up the response
    response = this.cleanResponse(response, characterName, otherCharacterName);
    
    return response;
  }

  private cleanResponse(response: string, characterName: string, otherCharacterName?: string): string {
    // Remove any character name prefixes that might have been generated
    response = response.replace(new RegExp(`^${characterName}:?\\s*`, 'i'), '');
    if (otherCharacterName) {
      response = response.replace(new RegExp(`^${otherCharacterName}:?\\s*`, 'i'), '');
    }
    
    // Remove any trailing conversation starters or responses
    response = response.replace(/\n.*$/s, ''); // Remove everything after first newline
    
    // Limit length and ensure it ends properly
    response = response.substring(0, 200).trim();
    
    // Ensure it doesn't end mid-sentence
    const sentences = response.split(/[.!?]+/);
    if (sentences.length > 1) {
      sentences.pop(); // Remove potentially incomplete last sentence
      response = sentences.join('.') + '.';
    }
    
    return response || "Hi there!"; // Fallback if response is empty
  }

  isReady(): boolean {
    return this.textGenerator !== null && !this.isLoading;
  }

  getLoadingStatus(): { isLoading: boolean; isReady: boolean; currentModel: string } {
    return {
      isLoading: this.isLoading,
      isReady: this.isReady(),
      currentModel: this.currentModel
    };
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getCurrentModelConfig(): ModelConfig | undefined {
    return this.supportedModels[this.currentModel as keyof typeof SUPPORTED_MODELS];
  }

  getSupportedModels(): typeof SUPPORTED_MODELS {
    return this.supportedModels;
  }

  async switchModel(modelName: string): Promise<void> {
    if (!(modelName in this.supportedModels)) {
      throw new Error(`Unsupported model: ${modelName}`);
    }

    if (this.currentModel === modelName && this.textGenerator) {
      return; // Already using this model
    }

    // Clear current generator and initialize new model
    this.textGenerator = null;
    await this.initialize(modelName);
  }

  async getRecommendedModel(): Promise<string> {
    const capabilities = await backendDetector.detectCapabilities();
    const benchmark = await backendDetector.benchmarkFlops();
    
    // Check memory constraints (rough estimates)
    const memoryMB = benchmark.deviceInfo.memory ? 
      Math.round(benchmark.deviceInfo.memory / 1024 / 1024) : 0;

    // More sophisticated model selection based on actual capabilities
    if (capabilities.webgpu && memoryMB > 8000) {
      // High-end device: can handle 3B model
      console.log('Recommending Llama 3.2 3B for high-end device with WebGPU');
      return 'onnx-community/Llama-3.2-3B-Instruct';
    } else if (capabilities.webgpu && memoryMB > 4000) {
      // Mid-range device: 1B model
      console.log('Recommending Llama 3.2 1B for mid-range device with WebGPU');
      return 'onnx-community/Llama-3.2-1B-Instruct';
    } else if (capabilities.simd && memoryMB > 2000) {
      // SIMD-capable device: medium model
      console.log('Recommending LaMini-GPT 774M for SIMD-capable device');
      return 'Xenova/LaMini-GPT-774M';
    } else if (capabilities.wasm && memoryMB > 1000) {
      // Standard device: GPT-2
      console.log('Recommending GPT-2 for standard device');
      return 'Xenova/gpt2';
    } else {
      // Very constrained device: smallest model
      console.log('Recommending DistilGPT-2 for constrained device');
      return 'Xenova/distilgpt2';
    }
  }

  // Validate model compatibility before switching
  async validateModelCompatibility(modelName: string): Promise<{ compatible: boolean; reason?: string }> {
    const capabilities = await backendDetector.detectCapabilities();
    const modelConfig = this.supportedModels[modelName as keyof typeof SUPPORTED_MODELS];
    
    if (!modelConfig) {
      return { compatible: false, reason: `Model ${modelName} is not supported` };
    }

    if (modelConfig.requiresWebGPU && !capabilities.webgpu) {
      return { 
        compatible: false, 
        reason: `Model ${modelConfig.name} requires WebGPU but it's not available on this device` 
      };
    }

    // Check rough memory requirements
    const benchmark = await backendDetector.benchmarkFlops();
    const memoryMB = benchmark.deviceInfo.memory ? 
      Math.round(benchmark.deviceInfo.memory / 1024 / 1024) : 0;

    if (modelConfig.name.includes('3B') && memoryMB < 6000) {
      return {
        compatible: false,
        reason: `3B model requires at least 6GB RAM, but device has ~${Math.round(memoryMB/1024)}GB`
      };
    }

    if (modelConfig.name.includes('1B') && memoryMB < 3000) {
      return {
        compatible: false,
        reason: `1B model requires at least 3GB RAM, but device has ~${Math.round(memoryMB/1024)}GB`
      };
    }

    return { compatible: true };
  }
}

// Export singleton instance
export const clientLLM = new ClientLLMService();