// Configuration for LLM inference mode with enhanced model support
export const LLM_CONFIG = {
  // Set to 'client' for browser-based inference, 'server' for traditional API-based inference
  INFERENCE_MODE: (import.meta.env.VITE_LLM_INFERENCE_MODE as 'client' | 'server') || 'client',
  
  // Client-side model configuration - now supports Llama models
  CLIENT_MODEL: import.meta.env.VITE_CLIENT_LLM_MODEL || 'Xenova/distilgpt2',
  
  // Show client LLM status in UI (development only)
  SHOW_CLIENT_STATUS: !!import.meta.env.VITE_SHOW_CLIENT_LLM_STATUS || import.meta.env.NODE_ENV === 'development',
  
  // Maximum number of requests to process concurrently
  MAX_CONCURRENT_REQUESTS: parseInt(import.meta.env.VITE_MAX_CLIENT_REQUESTS || '2'),
  
  // Request timeout in milliseconds - extended for large models
  REQUEST_TIMEOUT: parseInt(import.meta.env.VITE_CLIENT_REQUEST_TIMEOUT || '45000'),

  // Model download timeout for initial loading
  MODEL_DOWNLOAD_TIMEOUT: parseInt(import.meta.env.VITE_MODEL_DOWNLOAD_TIMEOUT || '120000'),

  // Enable WebGPU acceleration when available
  ENABLE_WEBGPU: import.meta.env.VITE_ENABLE_WEBGPU !== 'false',

  // Enable SIMD optimizations
  ENABLE_SIMD: import.meta.env.VITE_ENABLE_SIMD !== 'false',

  // Preferred backend order
  BACKEND_PRIORITY: ['webgpu', 'wasm', 'javascript'] as const,
} as const;

// Supported models with their configurations
export const SUPPORTED_MODELS = {
  'Xenova/distilgpt2': {
    name: 'DistilGPT-2',
    size: '82MB',
    requiresWebGPU: false,
    contextLength: 1024,
    description: 'Fast, lightweight model suitable for all devices',
    type: 'conversational'
  },
  'onnx-community/Llama-3.2-1B-Instruct': {
    name: 'Llama 3.2 1B Instruct',
    size: '637MB', 
    requiresWebGPU: true,
    contextLength: 2048,
    description: 'High-quality instruction-following model (WebGPU required)',
    type: 'instruct'
  },
  'onnx-community/Llama-3.2-3B-Instruct': {
    name: 'Llama 3.2 3B Instruct',
    size: '1.9GB',
    requiresWebGPU: true,
    contextLength: 2048,
    description: 'Advanced instruction model with superior reasoning (WebGPU + 8GB+ RAM)',
    type: 'instruct'
  },
  'Xenova/LaMini-GPT-774M': {
    name: 'LaMini-GPT 774M',
    size: '310MB',
    requiresWebGPU: false,
    contextLength: 1024,
    description: 'Medium-sized model with good performance balance',
    type: 'conversational'
  },
  'Xenova/gpt2': {
    name: 'GPT-2',
    size: '124MB',
    requiresWebGPU: false,
    contextLength: 1024,
    description: 'Classic GPT-2 model, reliable baseline',
    type: 'conversational'
  }
} as const;

// Device capability requirements
export const MODEL_REQUIREMENTS = {
  'onnx-community/Llama-3.2-3B-Instruct': {
    minRAM: 8192, // MB
    minStorage: 2048, // MB
    requiresWebGPU: true,
    preferredCores: 8
  },
  'onnx-community/Llama-3.2-1B-Instruct': {
    minRAM: 4096, // MB
    minStorage: 1024, // MB
    requiresWebGPU: true,
    preferredCores: 4
  },
  'Xenova/LaMini-GPT-774M': {
    minRAM: 2048, // MB
    minStorage: 512, // MB
    requiresWebGPU: false,
    preferredCores: 2
  },
  'Xenova/gpt2': {
    minRAM: 1024, // MB
    minStorage: 256, // MB
    requiresWebGPU: false,
    preferredCores: 1
  },
  'Xenova/distilgpt2': {
    minRAM: 512, // MB
    minStorage: 128, // MB
    requiresWebGPU: false,
    preferredCores: 1
  }
} as const;

// Legacy server-side LLM check (for backward compatibility)
export function shouldUseClientLLM(): boolean {
  return LLM_CONFIG.INFERENCE_MODE === 'client';
}

export function shouldUseServerLLM(): boolean {
  return LLM_CONFIG.INFERENCE_MODE === 'server';
}

// Model utility functions
export function getModelType(modelName: string): 'instruct' | 'conversational' | 'unknown' {
  return SUPPORTED_MODELS[modelName as keyof typeof SUPPORTED_MODELS]?.type || 'unknown';
}

export function isModelSupported(modelName: string): boolean {
  return modelName in SUPPORTED_MODELS;
}

export function getModelInfo(modelName: string) {
  return SUPPORTED_MODELS[modelName as keyof typeof SUPPORTED_MODELS];
}

export function getModelRequirements(modelName: string) {
  return MODEL_REQUIREMENTS[modelName as keyof typeof MODEL_REQUIREMENTS];
}