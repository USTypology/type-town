import React, { useState, useEffect } from 'react';
import { clientLLMWorkerService } from '../lib/clientLLMWorkerService';
import { backendDetector } from '../lib/backendDetection';
import { SUPPORTED_MODELS } from '../lib/llmConfig';

interface ModelSelectorProps {
  className?: string;
}

export default function ModelSelector({ className = '' }: ModelSelectorProps) {
  const [supportedModels, setSupportedModels] = useState<{ [key: string]: any }>({});
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedModel, setRecommendedModel] = useState<string>('');
  const [capabilities, setCapabilities] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    initializeModelInfo();
  }, []);

  const initializeModelInfo = async () => {
    try {
      setSupportedModels(SUPPORTED_MODELS);
      const current = clientLLMWorkerService.getCurrentModel();
      const caps = await backendDetector.detectCapabilities();
      
      setCurrentModel(current);
      setCapabilities(caps);
      
      // Simple model recommendation based on capabilities
      let recommended = 'Xenova/distilgpt2'; // Default fallback
      if (caps.webgpu) {
        // Estimate available memory (rough approximation)
        const memoryMB = (performance as any)?.memory?.usedJSHeapSize ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;
        
        if (memoryMB > 8000) {
          recommended = 'onnx-community/Llama-3.2-3B-Instruct';
        } else if (memoryMB > 4000) {
          recommended = 'onnx-community/Llama-3.2-1B-Instruct';
        } else {
          recommended = 'Xenova/LaMini-GPT-774M';
        }
      } else if (caps.simd) {
        recommended = 'Xenova/LaMini-GPT-774M';
      }
      
      setRecommendedModel(recommended);
    } catch (error) {
      console.error('Failed to initialize model info:', error);
    }
  };

  const handleModelChange = async (modelName: string) => {
    if (modelName === currentModel) return;

    setIsLoading(true);
    try {
      await clientLLMWorkerService.switchModel(modelName);
      setCurrentModel(modelName);
      console.log(`Successfully switched to ${modelName}`);
    } catch (error) {
      console.error('Failed to switch model:', error);
      alert(`Failed to load model: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getModelStatusIcon = (modelKey: string, config: any) => {
    if (modelKey === currentModel) return '✅';
    if (modelKey === recommendedModel) return '⭐';
    if (config.requiresWebGPU && !capabilities?.webgpu) return '❌';
    return '⚪';
  };

  const getModelStatusText = (modelKey: string, config: any) => {
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