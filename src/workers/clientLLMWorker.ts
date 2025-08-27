// Web Worker for Client-side LLM processing to prevent blocking the main thread
import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for web worker environment with optimizations
env.allowLocalModels = false;
env.useBrowserCache = true;

// Enhanced model configuration for WebGPU/SIMD support
interface ModelConfig {
  name: string;
  size: string;
  requiresWebGPU: boolean;
  contextLength: number;
  quantized: boolean;
  simdOptimized: boolean;
}

const supportedModels: { [key: string]: ModelConfig } = {
  'Xenova/distilgpt2': {
    name: 'DistilGPT-2',
    size: '82MB',
    requiresWebGPU: false,
    contextLength: 1024,
    quantized: true,
    simdOptimized: true
  },
  'onnx-community/Llama-3.2-1B-Instruct': {
    name: 'Llama 3.2 1B Instruct',
    size: '637MB',
    requiresWebGPU: true,
    contextLength: 2048,
    quantized: false,
    simdOptimized: true
  },
  'onnx-community/Llama-3.2-3B-Instruct': {
    name: 'Llama 3.2 3B Instruct',
    size: '1.9GB',
    requiresWebGPU: true,
    contextLength: 2048,
    quantized: false,
    simdOptimized: true
  },
  'Xenova/LaMini-GPT-774M': {
    name: 'LaMini-GPT 774M',
    size: '310MB',
    requiresWebGPU: false,
    contextLength: 1024,
    quantized: true,
    simdOptimized: true
  }
};

let textGenerator: any = null;
let isInitialized = false;
let isInitializing = false; // Add lock to prevent simultaneous initializations
let currentModelName = '';
let webGPUSupported = false;
let simdSupported = false;

// Worker message types
interface WorkerRequest {
  id: string;
  type: 'initialize' | 'generate' | 'getCapabilities' | 'switchModel';
  data: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

// Detect backend capabilities in worker
async function detectCapabilities() {
  try {
    // Check WebGPU support with actual device creation test
    webGPUSupported = await testWebGPUSupport();
    
    // Check SIMD support (WebAssembly SIMD)
    simdSupported = typeof WebAssembly !== 'undefined' && 
                   WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    
    console.log(`[Worker] Capabilities detected - WebGPU: ${webGPUSupported}, SIMD: ${simdSupported}`);
    
    return { webGPU: webGPUSupported, simd: simdSupported };
  } catch (error) {
    console.warn('[Worker] Error detecting capabilities:', error);
    return { webGPU: false, simd: false };
  }
}

// Test WebGPU support with actual device creation
async function testWebGPUSupport(): Promise<boolean> {
  try {
    if (!('gpu' in navigator) || typeof (navigator as any).gpu?.requestAdapter !== 'function') {
      return false;
    }
    
    const adapter = await (navigator as any).gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    
    if (!adapter) {
      return false;
    }
    
    // Try to create a device to ensure WebGPU is actually functional
    try {
      const device = await adapter.requestDevice();
      if (device && device.queue) {
        device.destroy?.(); // Clean up the test device
        return true;
      }
    } catch (deviceError) {
      console.warn('[Worker] WebGPU device creation failed:', deviceError);
      return false;
    }
    
    return false;
  } catch (error) {
    console.warn('[Worker] WebGPU detection failed:', error);
    return false;
  }
}

// Configure transformers.js environment for optimal performance
async function configureEnvironment(modelName: string) {
  const modelConfig = supportedModels[modelName];
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${modelName}`);
  }

  try {
    // Configure WebGPU if available and required
    if (modelConfig.requiresWebGPU && webGPUSupported) {
      try {
        // Enable WebGPU backend if available in this version
        if ((env.backends as any).webgpu) {
          (env.backends as any).webgpu.enabled = true;
          console.log('[Worker] WebGPU backend enabled');
        } else {
          console.log('[Worker] WebGPU not available in this Transformers.js version');
        }
      } catch (e) {
        console.log('[Worker] WebGPU configuration not available');
      }
    }

    // Configure WASM with SIMD and threading optimizations
    if (env.backends.onnx?.wasm) {
      // Enable SIMD if supported
      if (simdSupported && modelConfig.simdOptimized) {
        try {
          (env.backends.onnx.wasm as any).simd = true;
          console.log('[Worker] WASM SIMD enabled');
        } catch (e) {
          console.log('[Worker] SIMD configuration not available');
        }
      }

      // Configure threading
      const numThreads = Math.min(navigator.hardwareConcurrency || 4, 8);
      try {
        (env.backends.onnx.wasm as any).numThreads = numThreads;
        console.log(`[Worker] Using ${numThreads} threads`);
      } catch (e) {
        console.log('[Worker] Thread configuration not available');
      }

      // Memory optimization for large models
      if (modelConfig.size.includes('GB')) {
        try {
          (env.backends.onnx.wasm as any).memoryLimitMB = 4096; // 4GB limit
          console.log('[Worker] Memory limit set for large model');
        } catch (e) {
          console.log('[Worker] Memory configuration not available');
        }
      }
    }

    // Set cache directory optimization
    env.cacheDir = './.cache/transformers';

  } catch (error) {
    console.warn('[Worker] Environment configuration error:', error);
    // Continue with default configuration
  }
}

// Initialize the LLM model with optimizations
async function initializeLLM(modelName: string = 'Xenova/distilgpt2'): Promise<void> {
  if (isInitialized && textGenerator && currentModelName === modelName) {
    return;
  }

  // Prevent simultaneous initialization attempts
  if (isInitializing) {
    console.log('[Worker] Initialization already in progress, waiting...');
    // Wait for current initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isInitializing = true;

  try {
    // Clear previous model if switching
    if (textGenerator && currentModelName !== modelName) {
      textGenerator = null;
      isInitialized = false;
    }

    await detectCapabilities();
    await configureEnvironment(modelName);
    
    const modelConfig = supportedModels[modelName];
    console.log(`[Worker] Initializing ${modelConfig?.name || modelName}...`);
    
    // Check hardware compatibility
    if (modelConfig?.requiresWebGPU && !webGPUSupported) {
      throw new Error(`Model ${modelName} requires WebGPU but it's not available. Consider using a lighter model.`);
    }

    // Initialize with optimized configuration
    const pipelineOptions: any = {};
    
    // Use quantization for smaller models or when WebGPU is not available
    if (modelConfig?.quantized || !webGPUSupported) {
      pipelineOptions.quantized = true;
    }

    // Set device preference with better error handling
    if (modelConfig?.requiresWebGPU && webGPUSupported) {
      pipelineOptions.device = 'webgpu';
      pipelineOptions.dtype = 'fp16'; // Use FP16 for WebGPU
    } else {
      pipelineOptions.device = 'wasm';
    }

    try {
      textGenerator = await pipeline('text-generation', modelName, pipelineOptions);
      isInitialized = true;
      currentModelName = modelName;
      console.log(`[Worker] ${modelConfig?.name || modelName} initialized successfully`);
    } catch (pipelineError) {
      console.warn(`[Worker] Pipeline creation failed, attempting fallback:`, pipelineError);
      
      // If WebGPU pipeline fails, try WASM fallback
      if (pipelineOptions.device === 'webgpu') {
        console.log('[Worker] WebGPU pipeline failed, falling back to WASM...');
        const fallbackOptions = {
          ...pipelineOptions,
          device: 'wasm',
          quantized: true, // Use quantization for WASM fallback
        };
        delete fallbackOptions.dtype; // Remove WebGPU-specific options
        
        try {
          textGenerator = await pipeline('text-generation', modelName, fallbackOptions);
          isInitialized = true;
          currentModelName = modelName;
          console.log(`[Worker] ${modelConfig?.name || modelName} initialized successfully with WASM fallback`);
        } catch (fallbackError) {
          console.error('[Worker] WASM fallback also failed:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw pipelineError;
      }
    }
    
  } catch (error) {
    console.error(`[Worker] Failed to initialize ${modelName}:`, error);
    
    // Fallback to smaller model if initialization fails
    if (modelName !== 'Xenova/distilgpt2') {
      console.log('[Worker] Falling back to DistilGPT-2...');
      isInitializing = false; // Reset lock before recursive call
      return initializeLLM('Xenova/distilgpt2');
    }
    
    throw error;
  } finally {
    isInitializing = false;
  }
}

// Generate text using the LLM with model-specific optimizations
async function generateText(prompt: string, maxTokens: number = 50): Promise<string> {
  if (!textGenerator || !isInitialized) {
    throw new Error('LLM not initialized');
  }

  try {
    const modelConfig = supportedModels[currentModelName];
    const isInstructModel = currentModelName.includes('Instruct');
    
    // Format prompt appropriately for instruction models
    const formattedPrompt = isInstructModel ? 
      `<|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n` : 
      prompt;

    // Model-specific generation parameters
    const generationConfig: any = {
      max_new_tokens: maxTokens,
      do_sample: true,
      pad_token_id: isInstructModel ? 128001 : 50256, // Llama vs GPT-2 pad tokens
    };

    // Configure generation parameters based on model type
    if (isInstructModel) {
      // Optimized settings for Llama Instruct models
      generationConfig.temperature = 0.6;
      generationConfig.top_p = 0.9;
      generationConfig.repetition_penalty = 1.05;
      generationConfig.top_k = 50;
    } else {
      // Settings for conversation models like DistilGPT-2
      generationConfig.temperature = 0.7;
      generationConfig.top_p = 0.9;
      generationConfig.repetition_penalty = 1.1;
    }

    // Use WebGPU-optimized generation if available
    if (modelConfig?.requiresWebGPU && webGPUSupported) {
      generationConfig.use_cache = true; // Enable KV cache for better performance
    }

    const result = await textGenerator(formattedPrompt, generationConfig);

    // Extract and clean generated text
    const fullText = Array.isArray(result) ? result[0].generated_text : result.generated_text;
    let newText = fullText.slice(formattedPrompt.length).trim();
    
    // Clean up instruction model responses
    if (isInstructModel) {
      newText = newText.split('<|eot_id|>')[0].trim();
    }
    
    // Remove potential repetition or incomplete sentences for better quality
    newText = cleanGeneratedText(newText);
    
    return newText;
  } catch (error) {
    console.error('[Worker] Text generation failed:', error);
    throw error;
  }
}

// Clean and optimize generated text
function cleanGeneratedText(text: string): string {
  // Remove excessive repetition
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Remove duplicate consecutive sentences
  const uniqueSentences = [];
  let lastSentence = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed !== lastSentence && trimmed.length > 3) {
      uniqueSentences.push(trimmed);
      lastSentence = trimmed;
    }
    if (uniqueSentences.length >= 3) break; // Limit response length
  }
  
  let result = uniqueSentences.join('. ');
  if (result && !result.match(/[.!?]$/)) {
    result += '.';
  }
  
  return result.substring(0, 200).trim() || "I understand.";
}

// Handle model switching
async function switchModel(modelName: string): Promise<void> {
  if (!supportedModels[modelName]) {
    throw new Error(`Unsupported model: ${modelName}`);
  }

  if (currentModelName === modelName && textGenerator && isInitialized) {
    return; // Already using this model
  }

  // Clear current model
  if (textGenerator) {
    textGenerator = null;
    isInitialized = false;
  }

  // Initialize new model
  await initializeLLM(modelName);
}

// Handle messages from the main thread with enhanced functionality
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, data } = event.data;
  
  try {
    let responseData: any;
    
    switch (type) {
      case 'initialize':
        await initializeLLM(data.modelName);
        responseData = { 
          status: 'initialized', 
          modelName: currentModelName,
          capabilities: { webGPU: webGPUSupported, simd: simdSupported }
        };
        break;
        
      case 'generate':
        responseData = { text: await generateText(data.prompt, data.maxTokens) };
        break;

      case 'switchModel':
        await switchModel(data.modelName);
        responseData = { 
          status: 'switched', 
          modelName: currentModelName,
          capabilities: { webGPU: webGPUSupported, simd: simdSupported }
        };
        break;

      case 'getCapabilities':
        await detectCapabilities();
        responseData = { 
          webGPU: webGPUSupported, 
          simd: simdSupported,
          currentModel: currentModelName,
          supportedModels: Object.keys(supportedModels),
          isInitialized
        };
        break;
        
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
    
    const response: WorkerResponse = {
      id,
      success: true,
      data: responseData,
    };
    
    self.postMessage(response);
    
  } catch (error) {
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
  console.error('[Worker] Global error:', error);
};

self.onunhandledrejection = (event) => {
  console.error('[Worker] Unhandled promise rejection:', event.reason);
  event.preventDefault();
};

// Export for TypeScript
export {};