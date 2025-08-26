# AI Model Selection & Performance Guide

This guide helps you choose the optimal AI model for your device and understand the performance characteristics of each supported model in AI Town.

## 🎯 Quick Model Selection

### For Best Performance
1. **Run the built-in benchmark**: The system automatically detects your hardware and recommends the optimal model
2. **Check your specs**: Compare your device against the requirements below
3. **Start conservative**: Begin with a smaller model and upgrade if performance allows

## 📊 Detailed Model Comparison

### Llama 3.2 3B Instruct (Premium)
**`onnx-community/Llama-3.2-3B-Instruct`**

**Performance Characteristics:**
- 🧠 **Intelligence**: Excellent reasoning and context understanding
- 💬 **Conversation Quality**: Superior natural dialogue and instruction following
- 📝 **Response Length**: Can generate longer, more detailed responses
- ⚡ **Speed**: 500-1000 tokens/sec (WebGPU), 50-100 tokens/sec (CPU fallback)

**Hardware Requirements:**
- **Minimum**: 8GB system RAM, WebGPU-capable GPU
- **Optimal**: 16GB+ RAM, RTX 3060+ or M1 Pro+, Chrome 113+
- **Storage**: 2GB for model cache
- **Network**: 1.9GB initial download

**Supported Browsers:**
- Chrome 113+ (recommended)
- Edge 113+
- Firefox Nightly (experimental)

**Best For:**
- Complex reasoning tasks
- Advanced conversational AI
- Instruction-following scenarios
- Users with high-end hardware

---

### Llama 3.2 1B Instruct (Recommended)
**`onnx-community/Llama-3.2-1B-Instruct`**

**Performance Characteristics:**
- 🧠 **Intelligence**: Good reasoning with efficient processing
- 💬 **Conversation Quality**: High-quality natural dialogue
- 📝 **Response Length**: Balanced response length and coherence
- ⚡ **Speed**: 1000-2000 tokens/sec (WebGPU), 100-200 tokens/sec (CPU)

**Hardware Requirements:**
- **Minimum**: 4GB system RAM, WebGPU-capable GPU
- **Optimal**: 8GB+ RAM, GTX 1660+ or M1 Air+, Chrome 113+
- **Storage**: 1GB for model cache
- **Network**: 637MB initial download

**Supported Browsers:**
- Chrome 113+ (recommended)
- Edge 113+
- Firefox Nightly (experimental)

**Best For:**
- Most users seeking high-quality AI
- Balanced performance and capability
- Mid-range to high-end devices
- Production use cases

---

### LaMini-GPT 774M (Balanced)
**`Xenova/LaMini-GPT-774M`**

**Performance Characteristics:**
- 🧠 **Intelligence**: Good general knowledge and reasoning
- 💬 **Conversation Quality**: Natural conversational abilities
- 📝 **Response Length**: Moderate, focused responses
- ⚡ **Speed**: 150-300 tokens/sec (SIMD), 50-150 tokens/sec (standard)

**Hardware Requirements:**
- **Minimum**: 2GB system RAM, SIMD-capable browser
- **Optimal**: 4GB+ RAM, modern CPU with SIMD support
- **Storage**: 512MB for model cache
- **Network**: 310MB initial download

**Supported Browsers:**
- Chrome 91+ (SIMD support)
- Firefox 89+
- Safari 16+
- Edge 91+

**Best For:**
- Users without WebGPU support
- Mid-range devices and laptops
- Good balance of performance and quality
- Mobile devices with sufficient RAM

---

### GPT-2 (Reliable)
**`Xenova/gpt2`**

**Performance Characteristics:**
- 🧠 **Intelligence**: Solid general knowledge base
- 💬 **Conversation Quality**: Coherent but sometimes less focused
- 📝 **Response Length**: Variable, can be verbose
- ⚡ **Speed**: 200-500 tokens/sec (SIMD), 100-300 tokens/sec (standard)

**Hardware Requirements:**
- **Minimum**: 1GB system RAM
- **Optimal**: 2GB+ RAM, any modern browser
- **Storage**: 256MB for model cache
- **Network**: 124MB initial download

**Supported Browsers:**
- All modern browsers
- Chrome 60+, Firefox 60+, Safari 12+, Edge 79+

**Best For:**
- Older devices or limited resources
- Reliable baseline performance
- Compatibility testing
- Educational purposes

---

### DistilGPT-2 (Universal)
**`Xenova/distilgpt2`**

**Performance Characteristics:**
- 🧠 **Intelligence**: Basic conversational abilities
- 💬 **Conversation Quality**: Simple but coherent responses
- 📝 **Response Length**: Short to moderate responses
- ⚡ **Speed**: 200-500 tokens/sec (optimized for speed)

**Hardware Requirements:**
- **Minimum**: 512MB available RAM
- **Optimal**: Any modern device
- **Storage**: 128MB for model cache
- **Network**: 82MB initial download

**Supported Browsers:**
- Universal compatibility
- Chrome 60+, Firefox 60+, Safari 12+, Edge 79+

**Best For:**
- Very constrained devices
- Fast initial setup
- Testing and development
- Guaranteed compatibility

## 🔧 Hardware Compatibility Checker

### WebGPU Availability
Check if your browser supports WebGPU (required for Llama models):

```javascript
// Run in browser console
console.log('WebGPU available:', 'gpu' in navigator);
```

**WebGPU-Compatible Browsers:**
- Chrome 113+ (stable)
- Edge 113+ (stable)
- Firefox Nightly (experimental flag required)

### SIMD Support
Check WebAssembly SIMD support (improves all model performance):

```javascript
// Run in browser console
WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
```

### Memory Estimation
Check available memory:

```javascript
// Run in browser console  
console.log('JS Heap Size:', Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), 'MB');
console.log('Hardware Concurrency:', navigator.hardwareConcurrency, 'cores');
```

## 🎮 Device-Specific Recommendations

### Desktop Workstations
**RTX 4090, RTX 4080, RTX 4070**
- **Recommended**: Llama 3.2 3B Instruct
- **Expected Performance**: 800-1200 tokens/sec
- **Memory Usage**: ~6GB VRAM + 4GB system RAM

**RTX 3080, RTX 3070, RTX 3060**  
- **Recommended**: Llama 3.2 1B Instruct
- **Expected Performance**: 600-1000 tokens/sec
- **Memory Usage**: ~3GB VRAM + 2GB system RAM

**GTX 1660, GTX 1650, older cards**
- **Recommended**: LaMini-GPT 774M (CPU inference)
- **Expected Performance**: 150-300 tokens/sec
- **Memory Usage**: ~1GB system RAM

### Apple Silicon Macs
**M3 Max, M2 Max, M1 Max**
- **Recommended**: Llama 3.2 3B Instruct
- **Expected Performance**: 400-800 tokens/sec
- **Memory Usage**: ~4GB unified memory

**M3, M2, M1 Air/Pro base models**
- **Recommended**: Llama 3.2 1B Instruct
- **Expected Performance**: 300-600 tokens/sec  
- **Memory Usage**: ~2GB unified memory

**Intel Macs**
- **Recommended**: LaMini-GPT 774M
- **Expected Performance**: 100-250 tokens/sec
- **Memory Usage**: ~1GB system RAM

### Gaming Laptops
**RTX 4070/4060 Mobile, RTX 3070/3060 Mobile**
- **Recommended**: Llama 3.2 1B Instruct
- **Expected Performance**: 400-800 tokens/sec
- **Memory Usage**: ~3GB VRAM + 2GB system RAM

**GTX 1660 Ti Mobile and lower**
- **Recommended**: LaMini-GPT 774M
- **Expected Performance**: 100-200 tokens/sec
- **Memory Usage**: ~1GB system RAM

### Chromebooks & Ultrabooks
**Modern Chromebooks (8GB+ RAM)**
- **Recommended**: LaMini-GPT 774M
- **Expected Performance**: 100-200 tokens/sec
- **Memory Usage**: ~1GB system RAM

**Budget devices (4GB RAM)**
- **Recommended**: DistilGPT-2
- **Expected Performance**: 150-300 tokens/sec
- **Memory Usage**: ~512MB system RAM

### Mobile Devices
**High-End Phones (12GB+ RAM)**
- **Recommended**: LaMini-GPT 774M (with caution)
- **Expected Performance**: 50-150 tokens/sec
- **Memory Usage**: ~1GB RAM

**Standard Phones (6-8GB RAM)**
- **Recommended**: DistilGPT-2
- **Expected Performance**: 100-200 tokens/sec
- **Memory Usage**: ~512MB RAM

## ⚡ Performance Optimization Tips

### Browser Settings
1. **Enable WebGPU** in Chrome: `chrome://flags/#enable-unsafe-webgpu`
2. **Increase memory limit**: Close unnecessary tabs and applications
3. **Use Chrome/Edge**: Best WebGPU and SIMD support
4. **Enable hardware acceleration**: Chrome Settings > Advanced > System

### System Optimization
1. **Close memory-intensive applications** before loading large models
2. **Use dedicated GPU** if available (NVIDIA/AMD with WebGPU support)
3. **Ensure adequate cooling** for sustained performance
4. **Use wired internet** for faster model downloads

### Model-Specific Tips
- **Llama models**: Require WebGPU for optimal performance
- **SIMD models**: Benefit from multi-core CPUs
- **All models**: Cache locally after first download
- **Switch dynamically**: Change models based on current system load

## 🚨 Troubleshooting Guide

### Model Loading Issues
```
Error: WebGPU not available
Solution: Use Chrome 113+ or fallback to LaMini-GPT 774M
```

```
Error: Insufficient memory
Solution: Close applications or switch to smaller model
```

```  
Error: Model download timeout
Solution: Check internet connection or try smaller model first
```

### Performance Issues
```
Slow inference (< 50 tokens/sec)
Solutions:
1. Close unnecessary browser tabs
2. Switch to smaller model
3. Enable hardware acceleration
4. Check for background applications
```

### Browser Compatibility
```
WebGPU errors in Firefox
Solution: Use Chrome/Edge or enable experimental WebGPU flag
```

```
SIMD not working
Solution: Update browser to latest version or use fallback model
```

## 📈 Benchmarking Your Setup

AI Town includes built-in benchmarking tools. Access them through the developer console:

```javascript
// Get automatic model recommendation
import { clientLLM } from './src/lib/clientLLM';
const recommended = await clientLLM.getRecommendedModel();
console.log('Recommended model:', recommended);

// Run hardware benchmark
import { backendDetector } from './src/lib/backendDetection';
const benchmark = await backendDetector.benchmarkFlops();
console.log('Performance results:', benchmark);
```

## 🔮 Future Model Support

**Coming Soon:**
- **Quantized Llama models**: 4-bit and 8-bit versions for better performance
- **Specialized models**: Task-specific models for different NPC roles
- **Streaming inference**: Real-time token generation for longer responses
- **Multi-modal models**: Vision and audio capabilities

**Experimental:**
- **WebNN API**: Native neural network acceleration
- **Model composition**: Multiple models working together
- **Dynamic loading**: Load model components as needed

---

*This guide is regularly updated as new models and browser features become available. Check the [GitHub repository](https://github.com/USTypology/ustypology.github.io) for the latest information.*