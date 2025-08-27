import React, { useState, useEffect } from 'react';
import { ModelConfig } from '../lib/clientLLM';
import { clientLLMWorkerService } from '../lib/clientLLMWorkerService';
import { backendDetectionWorkerService } from '../lib/backendDetectionWorkerService';

interface ModelSelectorProps {
  className?: string;
}

// Model configuration (moved from clientLLM since we need it here)
interface LocalModelConfig {
  name: string;
  size: string;
  requiresWebGPU: boolean;
  contextLength: number;
  description: string;
}

const supportedModels: { [key: string]: LocalModelConfig } = {
  'Xenova/distilgpt2': {
    name: 'DistilGPT-2',
    size: '82MB',
    requiresWebGPU: false,
    contextLength: 1024,
    description: 'Fast, lightweight model suitable for all devices'
  },
  'onnx-community/Llama-3.2-1B-Instruct': {
    name: 'Llama 3.2 1B Instruct',
    size: '637MB',
    requiresWebGPU: true,
    contextLength: 2048,
    description: 'High-quality instruction-following model (WebGPU required)'
  },
  'onnx-community/Llama-3.2-3B-Instruct': {
    name: 'Llama 3.2 3B Instruct',
    size: '1.9GB',
    requiresWebGPU: true,
    contextLength: 2048,
    description: 'Advanced instruction model with superior reasoning (WebGPU + 8GB+ RAM)'
  },
  'Xenova/LaMini-GPT-774M': {
    name: 'LaMini-GPT 774M',
    size: '310MB',
    requiresWebGPU: false,
    contextLength: 1024,
    description: 'Medium-sized model with good performance balance'
  },
  'Xenova/gpt2': {
    name: 'GPT-2',
    size: '124MB',
    requiresWebGPU: false,
    contextLength: 1024,
    description: 'Classic GPT-2 model, reliable baseline'
  }
};

export default function ModelSelector({ className = '' }: ModelSelectorProps) {
  const [currentModel, setCurrentModel] = useState<string>('Xenova/distilgpt2');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [recommendedModel, setRecommendedModel] = useState<string>('');
  const [capabilities, setCapabilities] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    initializeModelInfo();
  }, []);

  const initializeModelInfo = async () => {
    try {
      const workerStatus = clientLLMWorkerService.getStatus();
      setCurrentModel(workerStatus.currentModel);
      
      const caps = await backendDetectionWorkerService.detectCapabilities();
      setCapabilities(caps);
      
      // Determine recommended model based on capabilities
      if (caps.webgpu) {
        setRecommendedModel('onnx-community/Llama-3.2-1B-Instruct');
      } else if (caps.simd) {
        setRecommendedModel('Xenova/LaMini-GPT-774M');
      } else {
        setRecommendedModel('Xenova/distilgpt2');
      }
    } catch (error) {
      console.error('Failed to initialize model info:', error);
    }
  };

  const handleModelChange = async (modelName: string) => {
    if (modelName === currentModel) return;

    setIsLoading(true);
    setLoadingProgress('Switching model...');
    
    try {
      // Check if model is compatible before switching
      const config = supportedModels[modelName];
      if (config?.requiresWebGPU && !capabilities?.webgpu) {
        throw new Error(`${config.name} requires WebGPU but it's not available on this device`);
      }

      setLoadingProgress('Initializing model in background worker...');
      await clientLLMWorkerService.switchModel(modelName);
      
      setCurrentModel(modelName);
      setLoadingProgress(`${config?.name} loaded successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setLoadingProgress(''), 3000);
    } catch (error) {
      console.error('Failed to switch model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLoadingProgress(`Failed to load model: ${errorMessage}`);
      alert(`Failed to load model: ${errorMessage}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => setLoadingProgress(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const getModelStatusIcon = (modelKey: string, config: LocalModelConfig) => {
    if (modelKey === currentModel) return '✅';
    if (modelKey === recommendedModel) return '⭐';
    if (config.requiresWebGPU && !capabilities?.webgpu) return '❌';
    return '⚪';
  };

  const getModelStatusText = (modelKey: string, config: LocalModelConfig) => {
    if (modelKey === currentModel) return 'Current';
    if (modelKey === recommendedModel) return 'Recommended';
    if (config.requiresWebGPU && !capabilities?.webgpu) return 'WebGPU Required';
    return 'Available';
  };

  return (
    <div className={`bg-slate-800 text-white rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Language Model</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="mb-3">
        <div className="text-sm opacity-80 mb-1">Current Model:</div>
        <div className="text-green-400 font-bold">
          {supportedModels[currentModel]?.name || currentModel}
        </div>
        <div className="text-xs text-gray-400">
          {supportedModels[currentModel]?.description}
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-2 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-sm text-blue-400">{loadingProgress}</span>
          </div>
        )}
        
        {/* Progress message without spinner */}
        {!isLoading && loadingProgress && (
          <div className="mt-2 text-sm text-green-400">{loadingProgress}</div>
        )}
        
        {isLoading && (
          <div className="text-xs text-gray-400 mt-1">
            Processing in background worker - UI remains responsive
          </div>
        )}
      </div>

      {showDetails && (
        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <h4 className="font-semibold mb-2">Available Models</h4>
            <div className="space-y-2">
              {Object.entries(supportedModels).map(([modelKey, config]) => {
                const isSelectable = !config.requiresWebGPU || capabilities?.webgpu;
                return (
                  <button
                    key={modelKey}
                    onClick={() => isSelectable && handleModelChange(modelKey)}
                    disabled={!isSelectable || isLoading}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      modelKey === currentModel
                        ? 'bg-green-800 bg-opacity-30 border border-green-600'
                        : isSelectable
                        ? 'bg-slate-700 hover:bg-slate-600'
                        : 'bg-slate-900 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getModelStatusIcon(modelKey, config)}
                        </span>
                        <div>
                          <div className="font-medium">{config.name}</div>
                          <div className="text-xs text-gray-400">
                            {config.size} • {config.contextLength} tokens
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">
                          {getModelStatusText(modelKey, config)}
                        </div>
                        {config.requiresWebGPU && (
                          <div className="text-xs text-orange-400">WebGPU</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                      {config.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {recommendedModel && recommendedModel !== currentModel && (
            <div className="p-3 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400">⭐</span>
                <span className="font-semibold text-yellow-300">Recommended Model</span>
              </div>
              <p className="text-sm text-yellow-100 mb-2">
                Based on your device capabilities, we recommend switching to{' '}
                <strong>{supportedModels[recommendedModel]?.name}</strong> for optimal performance.
              </p>
              <button
                onClick={() => handleModelChange(recommendedModel)}
                disabled={isLoading}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                {isLoading ? 'Switching...' : 'Switch to Recommended'}
              </button>
            </div>
          )}

          {/* WebGPU Status */}
          {capabilities && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>WebGPU Support: {capabilities.webgpu ? '✅ Available' : '❌ Not Available'}</div>
              <div>WASM Support: {capabilities.wasm ? '✅ Available' : '❌ Not Available'}</div>
              {capabilities.webgpu && (
                <div className="text-green-400">
                  🚀 WebGPU enabled - Larger models (1B-3B) can be loaded
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
              <span>Loading new model...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}