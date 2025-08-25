import React, { useEffect, useState } from 'react';
import { backendDetector, BenchmarkResults, BackendCapabilities } from '../lib/backendDetection';

interface BackendInfoProps {
  className?: string;
}

export default function BackendInfo({ className = '' }: BackendInfoProps) {
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Auto-run benchmarks on component mount
    runBenchmarks();
  }, []);

  const runBenchmarks = async () => {
    setIsLoading(true);
    try {
      const results = await backendDetector.benchmarkFlops();
      setBenchmarkResults(results);
    } catch (error) {
      console.error('Backend benchmarking failed:', error);
    } finally {
      setIsLoading(false);
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
        <div className="flex items-center gap-2 text-yellow-400">
          <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
          <span>Benchmarking backends...</span>
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
                onClick={runBenchmarks}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                {isLoading ? 'Running...' : 'Re-run Benchmarks'}
              </button>
            </div>
          )}
        </>
      )}

      {!benchmarkResults && !isLoading && (
        <button
          onClick={runBenchmarks}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          Run Performance Tests
        </button>
      )}
    </div>
  );
}