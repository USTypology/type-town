import React, { useEffect, useState } from 'react';
import { BenchmarkResults, BackendCapabilities } from '../lib/backendDetection';
import { backendDetectionWorkerService } from '../lib/backendDetectionWorkerService';

interface BackendInfoProps {
  className?: string;
}

interface WebGPUDiagnostics {
  available: boolean;
  adapter?: any;
  device?: any;
  features?: string[];
  limits?: any;
  error?: string;
}

export default function BackendInfo({ className = '' }: BackendInfoProps) {
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults | null>(null);
  const [webgpuDiagnostics, setWebgpuDiagnostics] = useState<WebGPUDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check for cached results first
    const cachedResults = backendDetectionWorkerService.getCachedResults();
    if (cachedResults) {
      setBenchmarkResults(cachedResults);
      runWebGPUDiagnostics(); // Still get fresh WebGPU diagnostics
    } else {
      // Auto-run benchmarks on component mount
      runBenchmarks();
      runWebGPUDiagnostics();
    }
  }, []);

  const runBenchmarks = async () => {
    if (!backendDetectionWorkerService.isWorkerAvailable()) {
      setLoadingMessage('Worker not available, using main thread...');
    } else {
      setLoadingMessage('Initializing backend detection worker...');
    }
    
    setIsLoading(true);
    setBenchmarkProgress(0);
    
    try {
      const results = await backendDetectionWorkerService.benchmarkFlops((progress) => {
        setBenchmarkProgress(progress);
        
        if (progress < 20) {
          setLoadingMessage('Detecting hardware capabilities...');
        } else if (progress < 50) {
          setLoadingMessage('Benchmarking WebGPU performance...');
        } else if (progress < 80) {
          setLoadingMessage('Testing WASM and JavaScript...');
        } else if (progress < 100) {
          setLoadingMessage('Analyzing results...');
        } else {
          setLoadingMessage('Complete!');
        }
      });
      
      setBenchmarkResults(results);
      setLoadingMessage('Benchmarks completed successfully');
    } catch (error) {
      console.error('Backend benchmarking failed:', error);
      setLoadingMessage(`Benchmarking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setBenchmarkProgress(100);
    }
  };

  const runWebGPUDiagnostics = async () => {
    try {
      const diagnostics = await backendDetectionWorkerService.getWebGPUDiagnostics();
      setWebgpuDiagnostics(diagnostics);
    } catch (error) {
      console.error('WebGPU diagnostics failed:', error);
    }
  };

  const initializeWebGPU = async () => {
    try {
      // Import the original backend detector for WebGPU initialization
      const { backendDetector } = await import('../lib/backendDetection');
      const result = await backendDetector.initializeWebGPUForTransformers();
      alert(`WebGPU Initialization: ${result.message}`);
      if (result.success) {
        runBenchmarks(); // Re-run benchmarks after successful initialization
      }
    } catch (error) {
      alert(`WebGPU initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatFlops = (flops: number): string => {
    if (flops === 0) return '0 FLOPS';
    if (flops < 1000) return `${flops.toFixed(0)} FLOPS`;
    if (flops < 1000000) return `${(flops / 1000).toFixed(1)}K FLOPS`;
    if (flops < 1000000000) return `${(flops / 1000000).toFixed(1)}M FLOPS`;
    return `${(flops / 1000000000).toFixed(1)}G FLOPS`;
  };

  const getCapabilityIcon = (supported: boolean) => supported ? '✅' : '❌';

  return (
    <div className={`bg-slate-800 text-white rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Backend Performance</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
            <span>{loadingMessage}</span>
          </div>
          {benchmarkProgress > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-yellow-400 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${benchmarkProgress}%` }}
              ></div>
            </div>
          )}
          <div className="text-xs text-gray-400">
            Running in background worker - UI remains responsive
          </div>
        </div>
      )}

      {benchmarkResults && (
        <>
          <div className="mb-3">
            <div className="text-sm opacity-80 mb-1">Recommended Backend:</div>
            <div className="text-green-400 font-bold">{benchmarkResults.recommendedBackend}</div>
          </div>

          {showDetails && (
            <div className="space-y-4">
              {/* Capability Detection */}
              <div>
                <h4 className="font-semibold mb-2">Hardware Capabilities</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>WebNN {getCapabilityIcon(benchmarkResults.capabilities.webnn)}</div>
                  <div>WebGPU {getCapabilityIcon(benchmarkResults.capabilities.webgpu)}</div>
                  <div>WASM {getCapabilityIcon(benchmarkResults.capabilities.wasm)}</div>
                  <div>WebGL {getCapabilityIcon(benchmarkResults.capabilities.webgl)}</div>
                  <div>SIMD {getCapabilityIcon(benchmarkResults.capabilities.simd)}</div>
                  <div>Threads {getCapabilityIcon(benchmarkResults.capabilities.threads)}</div>
                </div>
              </div>

              {/* FLOPS Results */}
              <div>
                <h4 className="font-semibold mb-2">Performance Results</h4>
                <div className="space-y-2">
                  {benchmarkResults.flopsResults
                    .sort((a, b) => b.flopsPerSecond - a.flopsPerSecond)
                    .map((result, index) => (
                      <div key={result.backend} className={`flex justify-between items-center p-2 rounded ${
                        result.backend === benchmarkResults.recommendedBackend 
                          ? 'bg-green-800 bg-opacity-30 border border-green-600' 
                          : 'bg-slate-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            result.backend === benchmarkResults.recommendedBackend ? 'text-green-400' : 'text-white'
                          }`}>
                            {result.backend}
                          </span>
                          {result.error && (
                            <span className="text-red-400 text-xs">({result.error})</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`font-mono text-sm ${
                            result.backend === benchmarkResults.recommendedBackend ? 'text-green-300' : 'text-gray-300'
                          }`}>
                            {formatFlops(result.flopsPerSecond)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {result.duration.toFixed(1)}ms
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* WebGPU Diagnostics */}
              {webgpuDiagnostics && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    WebGPU Diagnostics
                    {webgpuDiagnostics.available && (
                      <button
                        onClick={initializeWebGPU}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-xs rounded"
                      >
                        Initialize for LLM
                      </button>
                    )}
                  </h4>
                  {webgpuDiagnostics.available ? (
                    <div className="space-y-2 text-sm">
                      {webgpuDiagnostics.adapter && (
                        <div className="bg-slate-700 p-2 rounded">
                          <div className="font-medium text-green-400">Adapter Available</div>
                          <div className="text-xs text-gray-400">
                            <div>Vendor: {webgpuDiagnostics.adapter.vendor}</div>
                            <div>Device: {webgpuDiagnostics.adapter.device}</div>
                            <div>Architecture: {webgpuDiagnostics.adapter.architecture}</div>
                          </div>
                        </div>
                      )}
                      {webgpuDiagnostics.features && webgpuDiagnostics.features.length > 0 && (
                        <div className="bg-slate-700 p-2 rounded">
                          <div className="font-medium">Features:</div>
                          <div className="text-xs text-gray-400">
                            {webgpuDiagnostics.features.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-800 bg-opacity-30 border border-red-600 p-2 rounded">
                      <div className="text-red-400 text-sm">
                        {webgpuDiagnostics.error || 'WebGPU not available'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Device Info */}
              <div>
                <h4 className="font-semibold mb-2">Device Information</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>CPU Cores: {benchmarkResults.deviceInfo.hardwareConcurrency}</div>
                  {benchmarkResults.deviceInfo.memory && (
                    <div>Memory: {Math.round(benchmarkResults.deviceInfo.memory / 1024 / 1024)}MB</div>
                  )}
                  <div className="truncate max-w-full">
                    UA: {benchmarkResults.deviceInfo.userAgent.substring(0, 50)}...
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  backendDetectionWorkerService.forceRefresh((progress) => {
                    setBenchmarkProgress(progress);
                    if (progress < 20) {
                      setLoadingMessage('Detecting hardware capabilities...');
                    } else if (progress < 50) {
                      setLoadingMessage('Benchmarking WebGPU performance...');
                    } else if (progress < 80) {
                      setLoadingMessage('Testing WASM and JavaScript...');
                    } else if (progress < 100) {
                      setLoadingMessage('Analyzing results...');
                    } else {
                      setLoadingMessage('Complete!');
                    }
                  }).then(results => {
                    setBenchmarkResults(results);
                    setIsLoading(false);
                    setLoadingMessage('Benchmarks completed successfully');
                  }).catch(error => {
                    console.error('Re-benchmark failed:', error);
                    setIsLoading(false);
                    setLoadingMessage(`Re-benchmark failed: ${error.message}`);
                  });
                  setIsLoading(true);
                  runWebGPUDiagnostics();
                }}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                {isLoading ? `Running... (${benchmarkProgress}%)` : 'Re-run Benchmarks'}
              </button>
            </div>
          )}
        </>
      )}

      {!benchmarkResults && !isLoading && (
        <button
          onClick={() => {
            runBenchmarks();
            runWebGPUDiagnostics();
          }}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          Run Performance Tests (Background Worker)
        </button>
      )}
    </div>
  );
}