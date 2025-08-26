# AI Model Testing & Validation Guide

This guide provides comprehensive testing procedures to ensure Llama 3B and 1B models work correctly with WebGPU/SIMD optimizations in AI Town.

## 🧪 Automated Testing Framework

### Browser Compatibility Tests

#### WebGPU Availability Test
```javascript
// Test WebGPU support and functionality
async function testWebGPUSupport() {
  const tests = {
    'WebGPU API Available': 'gpu' in navigator,
    'Adapter Request': false,
    'Device Creation': false,
    'Compute Shader': false
  };
  
  try {
    if (tests['WebGPU API Available']) {
      const adapter = await navigator.gpu.requestAdapter();
      tests['Adapter Request'] = !!adapter;
      
      if (adapter) {
        const device = await adapter.requestDevice();
        tests['Device Creation'] = !!device;
        
        // Test basic compute shader
        const computeShader = device.createShaderModule({
          code: `
            @compute @workgroup_size(1)
            fn main() {
              // Basic compute test
            }
          `
        });
        tests['Compute Shader'] = !!computeShader;
      }
    }
  } catch (error) {
    console.error('WebGPU test failed:', error);
  }
  
  return tests;
}
```

#### SIMD Capability Test
```javascript
// Test WebAssembly SIMD support
function testSIMDSupport() {
  try {
    // Simple SIMD bytecode validation
    const simdCode = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // magic
      0x01, 0x00, 0x00, 0x00, // version
      0x01, 0x05, 0x01, 0x60, // type section
      0x00, 0x01, 0x7b,       // v128 result
    ]);
    
    return WebAssembly.validate(simdCode);
  } catch {
    return false;
  }
}
```

### Model Loading Tests

#### Llama 3B Model Test
```javascript
// Test Llama 3.2 3B Instruct model loading and inference
async function testLlama3B() {
  const testResults = {
    'Model Download': false,
    'Initialization': false,
    'WebGPU Backend': false,
    'Basic Inference': false,
    'Response Quality': false,
    'Performance': null
  };
  
  try {
    const { clientLLMWorkerService } = await import('./src/lib/clientLLMWorkerService');
    
    // Test model loading
    console.time('Llama3B-Load');
    await clientLLMWorkerService.initialize('onnx-community/Llama-3.2-3B-Instruct');
    console.timeEnd('Llama3B-Load');
    testResults['Model Download'] = true;
    testResults['Initialization'] = true;
    
    // Check backend
    const status = clientLLMWorkerService.getStatus();
    testResults['WebGPU Backend'] = status.capabilities.webGPU;
    
    // Test basic inference
    console.time('Llama3B-Inference');
    const response = await clientLLMWorkerService.generateText(
      'Hello, my name is Alice and I love exploring new places. What should I do today?',
      50
    );
    const inferenceTime = console.timeEnd('Llama3B-Inference');
    
    testResults['Basic Inference'] = response.length > 0;
    testResults['Response Quality'] = evaluateResponseQuality(response);
    testResults['Performance'] = inferenceTime;
    
  } catch (error) {
    console.error('Llama 3B test failed:', error);
    testResults.error = error.message;
  }
  
  return testResults;
}
```

## 🎯 Manual Testing Procedures

### Interactive Model Testing

#### Step 1: Hardware Capability Check
```javascript
// Run in browser console on AI Town page
(async () => {
  const { backendDetector } = await import('./src/lib/backendDetection');
  const capabilities = await backendDetector.detectCapabilities();
  const benchmark = await backendDetector.benchmarkFlops();
  
  console.log('Device Capabilities:', capabilities);
  console.log('Performance Benchmark:', benchmark);
  console.log('Recommended Model:', await clientLLM.getRecommendedModel());
})();
```

## ✅ Validation Checklist

### Pre-Deployment Testing
- [ ] **Hardware detection** works correctly across devices
- [ ] **Model loading** succeeds for all supported models
- [ ] **WebGPU acceleration** activates when available
- [ ] **SIMD optimization** works on compatible browsers
- [ ] **Fallback systems** handle unsupported configurations
- [ ] **Memory management** prevents browser crashes
- [ ] **Model switching** works seamlessly
- [ ] **Response quality** meets expectations for each model
- [ ] **Performance benchmarks** show expected speeds
- [ ] **Error handling** provides useful feedback

## Test Structure

### Unit Tests

#### 1. Static Database Layer (`src/__tests__/lib/staticDb.test.ts`)
- **Purpose**: Tests the browser-only database implementation using DuckDB-WASM
- **Coverage**:
  - Database initialization and connection
  - Schema type definitions (World, WorldStatus, etc.)
  - Error handling and resilience
  - WebAssembly integration
  - Connection lifecycle management

#### 2. Static Convex Replacement (`src/__tests__/lib/staticConvexReplaceSimple.test.tsx`)
- **Purpose**: Tests the React hooks that replace Convex functionality
- **Coverage**:
  - `useQuery` hook behavior and data loading
  - `useMutation` hook functionality 
  - `useConvex` hook compatibility
  - Type definitions (Id, Doc, GameId)
  - Error handling and fallbacks
  - Integration with StaticDataProvider

### Component Tests

#### 3. StaticDataProvider (`src/__tests__/components/StaticDataProvider.test.tsx`)
- **Purpose**: Tests the React context provider for static data management
- **Coverage**:
  - Context initialization and state management
  - `useStaticData` hook functionality
  - `useStaticQuery` hook with dependency tracking
  - Database initialization lifecycle
  - Error boundaries and graceful failures
  - Component unmounting and cleanup

#### 4. AppStatic Component (`src/__tests__/components/AppStatic.test.tsx`)
- **Purpose**: Tests the main static application component
- **Coverage**:
  - Component rendering and structure
  - Modal functionality for migration information
  - Static architecture demonstration
  - Accessibility compliance
  - Performance characteristics

### Integration Tests

#### 5. Static Migration (`src/__tests__/integration/staticMigration.test.tsx`)
- **Purpose**: End-to-end verification of the migration
- **Coverage**:
  - Convex to Static API compatibility
  - Database layer integration
  - Offline functionality verification
  - Performance characteristics
  - API interface compatibility
  - Error handling and resilience
  - Static deployment readiness

#### 6. Build and Deployment (`src/__tests__/build/deployment.test.ts`)
- **Purpose**: Verifies production readiness
- **Coverage**:
  - Build process validation
  - Static asset generation
  - Bundle size optimization
  - GitHub Pages compatibility
  - Convex removal verification
  - Static hosting readiness

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Categories
```bash
# Unit tests only
npm test -- --testPathPattern="lib/"

# Component tests only  
npm test -- --testPathPattern="components/"

# Integration tests only
npm test -- --testPathPattern="integration/"

# Build verification tests only
npm test -- --testPathPattern="build/"
```

### Run Individual Test Files
```bash
# Static database tests
npm test -- --testPathPattern="staticDb.test.ts"

# Static hooks tests
npm test -- --testPathPattern="staticConvexReplaceSimple.test.tsx"

# Data provider tests
npm test -- --testPathPattern="StaticDataProvider.test.tsx"

# Full migration integration tests
npm test -- --testPathPattern="staticMigration.test.tsx"
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Configuration

### Jest Setup
- **Environment**: jsdom (for DOM testing)
- **TypeScript**: Full ESM support with tsx transformation
- **Mocking**: Browser APIs, WebAssembly, Worker, localStorage
- **Timeout**: 30 seconds for database initialization tests

### Mocked Dependencies
- `@duckdb/duckdb-wasm`: Mocked for unit testing
- `@electric-sql/pglite`: Mocked for isolation
- `Worker`: Browser API mock
- `WebAssembly`: Browser API mock
- `localStorage/sessionStorage`: In-memory mock
- Static assets: File path mocks

## Key Test Scenarios

### 1. **Migration Completeness**
- ✅ All Convex references removed
- ✅ Static database layer functional
- ✅ React hooks provide same API
- ✅ Build generates static assets only

### 2. **Offline Functionality** 
- ✅ Works without network connectivity
- ✅ Data persists across browser sessions
- ✅ No external API calls required
- ✅ Local storage and caching functional

### 3. **Performance Verification**
- ✅ Fast initialization (< 1 second)
- ✅ Reasonable bundle size (< 5MB)
- ✅ Minimal memory footprint
- ✅ Quick render times

### 4. **Static Deployment Readiness**
- ✅ GitHub Pages compatible
- ✅ No server-side requirements
- ✅ Relative asset paths
- ✅ Client-side rendering only

### 5. **API Compatibility**
- ✅ Same interface as Convex hooks
- ✅ Components don't need modification
- ✅ Type compatibility maintained
- ✅ Error handling preserved

## Expected Test Results

When all tests pass, you'll see output similar to:
```
Test Suites: 6 passed, 6 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        12.345s
```

## Key Metrics Verified

1. **Bundle Size**: < 5MB total JavaScript
2. **Initialization Time**: < 1 second for static database setup
3. **Memory Usage**: < 10MB increase during operation
4. **Build Time**: < 60 seconds for complete static build
5. **Test Coverage**: > 80% of migration-related code

## Troubleshooting

### Common Issues

#### 1. **WebAssembly Mock Failures**
```bash
# If you see WebAssembly errors
npm test -- --testPathPattern="basic.test.ts" --verbose
```

#### 2. **ESM Module Issues**
```bash
# Clear Jest cache
npm test -- --clearCache
```

#### 3. **Asset Loading Failures**
```bash
# Check module name mapping in jest.config.ts
# Verify __mocks__/fileMock.js exists
```

#### 4. **TypeScript Errors**
```bash
# Run type checking separately
npx tsc --noEmit
```

## Test Coverage Goals

- **Static Database Layer**: 100%
- **Static Convex Replacement**: 95%
- **StaticDataProvider**: 90%
- **Integration Scenarios**: 85%
- **Build Verification**: 100%

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Mock external dependencies appropriately
3. Include both happy path and error scenarios
4. Verify static deployment compatibility
5. Maintain performance benchmarks

## Future Enhancements

Potential additional test scenarios:

- [ ] Browser compatibility testing (Chrome, Firefox, Safari)
- [ ] Large dataset performance testing
- [ ] Concurrent user simulation
- [ ] Progressive Web App features
- [ ] Service worker integration
- [ ] Cross-origin resource sharing

---

**Result**: The test suite provides comprehensive coverage of the static migration, ensuring the application maintains full functionality while operating as a serverless, browser-only solution compatible with GitHub Pages deployment.