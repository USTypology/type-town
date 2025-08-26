// Web Worker for Client-side LLM processing to prevent blocking the main thread
import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for web worker environment
env.allowLocalModels = false;
env.useBrowserCache = true;

let textGenerator: any = null;
let isInitialized = false;

// Worker message types
interface WorkerRequest {
  id: string;
  type: 'initialize' | 'generate';
  data: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

// Initialize the LLM model
async function initializeLLM(modelName: string = 'Xenova/distilgpt2'): Promise<void> {
  if (isInitialized && textGenerator) {
    return;
  }

  try {
    console.log(`[Worker] Initializing ${modelName}...`);
    textGenerator = await pipeline('text-generation', modelName);
    isInitialized = true;
    console.log(`[Worker] ${modelName} initialized successfully`);
  } catch (error) {
    console.error('[Worker] Failed to initialize LLM:', error);
    throw error;
  }
}

// Generate text using the LLM
async function generateText(prompt: string, maxTokens: number = 50): Promise<string> {
  if (!textGenerator || !isInitialized) {
    throw new Error('LLM not initialized');
  }

  try {
    const result = await textGenerator(prompt, {
      max_new_tokens: maxTokens,
      do_sample: true,
      temperature: 0.8,
      top_p: 0.9,
      repetition_penalty: 1.1,
      pad_token_id: 50256,
    });

    // Extract generated text, removing the original prompt
    const generatedText = result[0].generated_text;
    const newText = generatedText.slice(prompt.length).trim();
    
    return newText;
  } catch (error) {
    console.error('[Worker] Text generation failed:', error);
    throw error;
  }
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, data } = event.data;
  
  try {
    let responseData: any;
    
    switch (type) {
      case 'initialize':
        await initializeLLM(data.modelName);
        responseData = { status: 'initialized' };
        break;
        
      case 'generate':
        responseData = { text: await generateText(data.prompt, data.maxTokens) };
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

// Export for TypeScript
export {};