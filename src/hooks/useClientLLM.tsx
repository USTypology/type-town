import React, { useCallback, useEffect, useState } from 'react';
import { 
  ConversationContext
} from '../lib/clientConversation';
import { LLM_CONFIG, shouldUseClientLLM } from '../lib/llmConfig';
import { clientLLMWorkerService } from '../lib/clientLLMWorkerService';

// Mock interfaces for compatibility
interface LLMRequest {
  id: string;
  type: 'start' | 'continue' | 'leave';
  context: ConversationContext;
  operationId: string;
}

// Simple in-memory queue for demonstration (in real app this would be persistent)
let requestQueue: LLMRequest[] = [];
let requestIdCounter = 0;

export function useClientLLMProcessor(worldId?: string) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<LLMRequest[]>([]);
  
  // Only process if client-side LLM is enabled
  const shouldProcess = shouldUseClientLLM();
  
  // Poll for pending requests
  useEffect(() => {
    if (!shouldProcess) return;
    
    const pollRequests = () => {
      setPendingRequests([...requestQueue]);
    };
    
    // Poll every 1 second
    const interval = setInterval(pollRequests, 1000);
    return () => clearInterval(interval);
  }, [shouldProcess]);

  // Initialize the client LLM on mount
  useEffect(() => {
    const init = async () => {
      if (!shouldProcess) return;
      
      try {
        console.log('Initializing client-side LLM worker...');
        await clientLLMWorkerService.initialize(LLM_CONFIG.CLIENT_MODEL);
        setIsInitialized(true);
        console.log('Client-side LLM worker initialized successfully');
      } catch (error) {
        console.error('Failed to initialize client-side LLM worker:', error);
      }
    };
    
    if (!isInitialized) {
      init();
    }

    // Cleanup on unmount
    return () => {
      if (shouldProcess) {
        // Don't destroy the worker completely, just stop processing
      }
    };
  }, [isInitialized, shouldProcess]);

  // Process pending requests
  useEffect(() => {
    const processRequests = async () => {
      if (!shouldProcess || !isInitialized || isProcessing || pendingRequests.length === 0) {
        return;
      }

      setIsProcessing(true);
      
      try {
        // Process requests one by one to avoid overwhelming the browser
        const maxRequests = Math.min(LLM_CONFIG.MAX_CONCURRENT_REQUESTS, pendingRequests.length);
        for (const request of pendingRequests.slice(0, maxRequests)) {
          console.log(`Processing client LLM request: ${request.operationId}`);
          
          try {
            let generatedText: string;
            const context = request.context;
            
            // Generate prompts for different conversation types
            let prompt: string;
            switch (request.type) {
              case 'start':
                prompt = `${context.playerName} (${context.playerIdentity}) meets ${context.otherPlayerName}. ${context.playerName} says: "`;
                break;
              case 'continue':
                const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
                prompt = `${context.playerName}: "${lastMessage}"\n${context.otherPlayerName} responds: "`;
                break;
              case 'leave':
                prompt = `${context.playerName} politely ends the conversation by saying: "`;
                break;
              default:
                throw new Error(`Unknown request type: ${request.type}`);
            }
            
            // Use the worker service to generate text (non-blocking)
            const rawText = await clientLLMWorkerService.generateText(prompt, 30);
            
            // Clean up the generated text
            generatedText = rawText.split('"')[0].trim();
            if (!generatedText) {
              generatedText = request.type === 'start' 
                ? "Hello there!" 
                : request.type === 'leave' 
                  ? "It was nice talking with you. See you later!" 
                  : "That's interesting.";
            }

            console.log(`Generated text for ${request.operationId}:`, generatedText);

            // Remove completed request from queue
            requestQueue = requestQueue.filter(r => r.id !== request.id);
            
            // Notify completion (in a real app this would trigger conversation continuation)
            window.dispatchEvent(new CustomEvent('llmRequestComplete', {
              detail: { requestId: request.id, generatedText, success: true }
            }));

          } catch (error) {
            console.error(`Failed to process request ${request.operationId}:`, error);
            
            // Remove failed request from queue
            requestQueue = requestQueue.filter(r => r.id !== request.id);
            
            // Notify failure
            window.dispatchEvent(new CustomEvent('llmRequestComplete', {
              detail: { requestId: request.id, generatedText: '', success: false }
            }));
          }
        }
      } catch (error) {
        console.error('Error processing client LLM requests:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    processRequests();
  }, [pendingRequests, isInitialized, isProcessing, shouldProcess]);

  const workerStatus = clientLLMWorkerService.getStatus();

  return {
    isInitialized,
    isProcessing,
    pendingRequestCount: pendingRequests?.length || 0,
    llmStatus: {
      isReady: workerStatus.isInitialized,
      isLoading: workerStatus.isInitializing,
      hasWorker: workerStatus.hasWorker,
    },
  };
}

export function ClientLLMProcessor({ worldId }: { worldId?: string }) {
  const { isInitialized, isProcessing, pendingRequestCount, llmStatus } = useClientLLMProcessor(worldId);

  // Only show anything if client-side LLM is enabled
  if (!shouldUseClientLLM()) {
    return null;
  }

  // This component runs the client LLM processing in the background
  // It can optionally show status information during development

  if (LLM_CONFIG.SHOW_CLIENT_STATUS) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg text-sm max-w-xs z-50">
        <div className="font-semibold mb-1">Client LLM Status</div>
        <div>Model: {LLM_CONFIG.CLIENT_MODEL.split('/').pop()}</div>
        <div>Ready: {llmStatus.isReady ? '✅' : '❌'}</div>
        <div>Loading: {llmStatus.isLoading ? '⏳' : '✅'}</div>
        <div>Processing: {isProcessing ? '⚙️' : '✅'}</div>
        <div>Pending: {pendingRequestCount}</div>
      </div>
    );
  }

  return null; // Hidden in production or when status display is disabled
}

// Helper function to add LLM requests for testing
export function addLLMRequest(type: 'start' | 'continue' | 'leave', context: ConversationContext): string {
  const id = `req_${++requestIdCounter}`;
  const request: LLMRequest = {
    id,
    type,
    context,
    operationId: `op_${id}`,
  };
  
  requestQueue.push(request);
  return id;
}