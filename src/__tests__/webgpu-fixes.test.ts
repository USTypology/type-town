// Tests for WebGPU functionality fixes
import { BackendDetector } from '../lib/backendDetection';

describe('WebGPU Functionality Fixes', () => {
  let detector: BackendDetector;
  let originalNavigator: any;

  beforeEach(() => {
    detector = BackendDetector.getInstance();
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('should handle WebGPU not available in browser', async () => {
    // Mock navigator without WebGPU
    global.navigator = {
      ...originalNavigator,
      // No 'gpu' property
    } as any;
    
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    expect(diagnostics.available).toBe(false);
    expect(diagnostics.error).toContain('WebGPU not available in this browser');
  });

  test('should handle WebGPU adapter creation failure gracefully', async () => {
    // Mock navigator with GPU that returns no adapter
    global.navigator = {
      ...originalNavigator,
      gpu: {
        requestAdapter: async () => null
      }
    } as any;
    
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    expect(diagnostics.available).toBe(false);
    expect(diagnostics.error).toContain('No WebGPU adapter available');
  });

  test('should handle WebGPU device creation failure gracefully', async () => {
    // Mock adapter that fails device creation
    const mockAdapter = {
      requestDevice: async () => {
        throw new Error('Device creation failed');
      },
      info: { vendor: 'Mock' },
      features: new Set(),
      limits: {}
    };
    
    global.navigator = {
      ...originalNavigator,
      gpu: {
        requestAdapter: async () => mockAdapter
      }
    } as any;
    
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    expect(diagnostics.available).toBe(false);
    expect(diagnostics.error).toContain('WebGPU device creation failed');
  });

  test('should detect WebGPU successfully when everything works', async () => {
    // Mock successful WebGPU setup
    let deviceDestroyed = false;
    const mockDevice = {
      queue: {},
      destroy: () => { deviceDestroyed = true; }
    };
    
    const mockAdapter = {
      requestDevice: async () => mockDevice,
      info: {
        vendor: 'MockVendor',
        architecture: 'MockArch',
        device: 'MockDevice',
        description: 'MockDescription'
      },
      features: new Set(['texture-compression-bc']),
      limits: {
        maxTextureDimension2D: 8192,
        maxBufferSize: 268435456
      }
    };
    
    global.navigator = {
      ...originalNavigator,
      gpu: {
        requestAdapter: async () => mockAdapter
      }
    } as any;
    
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    expect(diagnostics.available).toBe(true);
    expect(diagnostics.adapter).toBeDefined();
    expect(diagnostics.adapter.vendor).toBe('MockVendor');
    expect(diagnostics.features).toContain('texture-compression-bc');
    expect(deviceDestroyed).toBe(true); // Should clean up test device
  });

  test('should handle non-functional device gracefully', async () => {
    // Mock device without queue
    let deviceDestroyed = false;
    const brokenDevice = { 
      destroy: () => { deviceDestroyed = true; }
    };
    
    const mockAdapter = {
      requestDevice: async () => brokenDevice,
      info: { vendor: 'Mock' },
      features: new Set(),
      limits: {}
    };
    
    global.navigator = {
      ...originalNavigator,
      gpu: {
        requestAdapter: async () => mockAdapter
      }
    } as any;
    
    const diagnostics = await detector.getWebGPUDiagnostics();
    
    expect(diagnostics.available).toBe(false);
    expect(diagnostics.error).toContain('non-functional');
    expect(deviceDestroyed).toBe(true); // Should still clean up
  });

  test('should initialize transformers with fallback when WebGPU unavailable', async () => {
    // Mock no WebGPU support
    global.navigator = {
      ...originalNavigator
      // No 'gpu' property
    } as any;
    
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
});