import React, { useState } from 'react';
import { clientLLM } from '../lib/clientLLM';

interface LLMTestComponentProps {
  className?: string;
}

export default function LLMTestComponent({ className = '' }: LLMTestComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const runComprehensiveLLMTest = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      addTestResult('Starting comprehensive LLM functionality test...');

      // Test 1: Check available models
      const supportedModels = clientLLM.getSupportedModels();
      addTestResult(`Available models: ${Object.keys(supportedModels).join(', ')}`);

      // Test 2: Get recommended model based on device capabilities
      const recommendedModel = await clientLLM.getRecommendedModel();
      addTestResult(`Recommended model for this device: ${recommendedModel}`);

      // Test 3: Test model compatibility
      for (const modelName of ['onnx-community/Llama-3.2-1B-Instruct', 'onnx-community/Llama-3.2-3B-Instruct']) {
        const compatibility = await clientLLM.validateModelCompatibility(modelName);
        addTestResult(`${modelName}: ${compatibility.compatible ? 'Compatible' : `Incompatible - ${compatibility.reason}`}`);
      }

      // Test 4: Initialize with recommended model
      addTestResult(`Initializing ${recommendedModel}...`);
      await clientLLM.initialize(recommendedModel);
      setCurrentModel(recommendedModel);
      addTestResult(`Successfully loaded ${clientLLM.getCurrentModelConfig()?.name || recommendedModel}`);

      // Test 5: Generate a simple response
      const testPrompt = 'Hello! Please introduce yourself in one sentence.';
      addTestResult(`Testing generation with prompt: "${testPrompt}"`);
      
      const response = await clientLLM.generateResponse(testPrompt, 50);
      addTestResult(`Response: "${response}"`);

      // Test 6: Test conversation generation
      addTestResult('Testing conversation generation...');
      const conversationResponse = await clientLLM.generateConversationMessage(
        'Alice',
        'You are Alice, a friendly AI assistant.',
        [],
        'start',
        'Bob'
      );
      addTestResult(`Conversation response: "${conversationResponse}"`);

      // Test 7: If WebGPU is available and we're not using a WebGPU model, try to load one
      const currentModelConfig = clientLLM.getCurrentModelConfig();
      if (!currentModelConfig?.requiresWebGPU) {
        const webgpuCompatible = await clientLLM.validateModelCompatibility('onnx-community/Llama-3.2-1B-Instruct');
        if (webgpuCompatible.compatible) {
          addTestResult('Device supports WebGPU models. Testing Llama 1B...');
          await clientLLM.switchModel('onnx-community/Llama-3.2-1B-Instruct');
          setCurrentModel('onnx-community/Llama-3.2-1B-Instruct');
          
          const webgpuResponse = await clientLLM.generateResponse('What is artificial intelligence?', 50);
          addTestResult(`Llama 1B response: "${webgpuResponse}"`);
        }
      }

      addTestResult('✅ All tests completed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(`❌ Test failed: ${errorMessage}`);
      console.error('LLM test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className={`bg-slate-800 text-white rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">LLM Functionality Test</h3>
        <div className="flex gap-2">
          <button
            onClick={runComprehensiveLLMTest}
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            {isLoading ? 'Running...' : 'Run Full Test'}
          </button>
          <button
            onClick={clearResults}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {currentModel && (
        <div className="mb-3 p-2 bg-slate-700 rounded text-sm">
          <span className="text-green-400">Current Model:</span> {clientLLM.getCurrentModelConfig()?.name || currentModel}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-yellow-400 mb-3">
          <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
          <span>Running comprehensive tests...</span>
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`text-xs p-2 rounded ${
              result.includes('❌') 
                ? 'bg-red-800 bg-opacity-30 text-red-200' 
                : result.includes('✅')
                ? 'bg-green-800 bg-opacity-30 text-green-200'
                : 'bg-slate-700 text-gray-300'
            }`}
          >
            {result}
          </div>
        ))}
      </div>

      {testResults.length === 0 && !isLoading && (
        <div className="text-gray-400 text-sm text-center py-8">
          Click "Run Full Test" to verify LLM functionality including WebGPU support for Llama models.
          This will test model loading, inference, and WebGPU compatibility.
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        <p>This test will:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Check available models and device compatibility</li>
          <li>Load the recommended model for your device</li>
          <li>Test text generation capabilities</li>
          <li>Try WebGPU-enabled Llama models if supported</li>
          <li>Verify conversation generation features</li>
        </ul>
      </div>
    </div>
  );
}