// Tests for WebGPU functionality fixes
import { BackendDetector } from '../lib/backendDetection';

describe('WebGPU Functionality Fixes', () => {
  let detector: BackendDetector;

  beforeEach(() => {
    detector = BackendDetector.getInstance();
  });

  test('should handle WebGPU not available in browser gracefully', async () => {
    // In Node.js test environment, WebGPU should not be available
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    expect(diagnostics.available).toBe(false);
    expect(diagnostics.error).toBeDefined();
    expect(typeof diagnostics.error).toBe('string');
  });

  test('should initialize transformers with fallback when WebGPU unavailable', async () => {
    // In Node.js environment without WebGPU, should handle gracefully
    const result = await detector.initializeWebGPUForTransformers();
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('WebGPU not available');
  });

  test('should validate basic WebGPU detection improvements', () => {
    // This test validates that our improvements are in place
    // by checking that the detection methods exist
    expect(typeof detector.getWebGPUDiagnostics).toBe('function');
    expect(typeof detector.initializeWebGPUForTransformers).toBe('function');
  });

  test('should have proper error handling structure', async () => {
    // Test that the error handling structure is in place
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    // Should have available boolean property
    expect(typeof diagnostics.available).toBe('boolean');
    
    // Should have error property when not available
    if (!diagnostics.available) {
      expect(diagnostics.error).toBeDefined();
      expect(typeof diagnostics.error).toBe('string');
    }
  });
});