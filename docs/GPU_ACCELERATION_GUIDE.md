# GPU Acceleration Guide for Interactive CNN Trainer

This guide explains how to enable, optimize, and troubleshoot GPU acceleration in the Interactive CNN Trainer using TensorFlow.js.

## Table of Contents

1. [Overview](#overview)
2. [GPU Acceleration Basics](#gpu-acceleration-basics)
3. [Enabling GPU Acceleration](#enabling-gpu-acceleration)
4. [Performance Optimization](#performance-optimization)
5. [Troubleshooting](#troubleshooting)
6. [Benchmarking](#benchmarking)
7. [Browser Compatibility](#browser-compatibility)

## Overview

GPU acceleration can dramatically improve training speed for neural networks. The Interactive CNN Trainer automatically detects and uses the best available backend for your system:

- **WebGL** (Primary): Uses your graphics card via WebGL
- **WebGPU** (Future): Next-generation GPU API (experimental)
- **CPU** (Fallback): Software-only computation

## GPU Acceleration Basics

### What is GPU Acceleration?

GPU acceleration uses your graphics card's parallel processing power to perform neural network computations much faster than a CPU alone. This is especially beneficial for:

- **Matrix operations** (convolutions, dense layers)
- **Training large models** with many parameters
- **Real-time inference** during interactive use

### Performance Gains

Typical speedup with GPU acceleration:
- **Training**: 5-20x faster than CPU
- **Inference**: 3-10x faster than CPU
- **Memory efficiency**: Better utilization of available VRAM

## Enabling GPU Acceleration

### Automatic Detection

The application automatically:
1. Detects available backends
2. Attempts WebGL first (best GPU support)
3. Falls back to CPU if GPU unavailable
4. Displays current backend in GPU Status panel

### Manual Configuration

If you need to force a specific backend:

```javascript
// Force WebGL backend
await tf.setBackend('webgl');

// Force CPU backend (for debugging)
await tf.setBackend('cpu');

// Check current backend
console.log('Current backend:', tf.getBackend());
```

### GPU Status Panel

The application includes a GPU Status panel that shows:
- **Current backend** (WebGL, CPU, etc.)
- **GPU information** (vendor, model, capabilities)
- **Memory usage** (tensors, buffers, total memory)
- **Performance benchmark** results

Click the "+" button to expand detailed information.

## Performance Optimization

### Browser Settings

#### Chrome/Edge
1. **Enable Hardware Acceleration**:
   - Settings → Advanced → System
   - Enable "Use hardware acceleration when available"

2. **GPU Process**:
   - Visit `chrome://gpu/` to verify GPU is active
   - Look for "Graphics Feature Status" - should show "Hardware accelerated"

3. **WebGL**:
   - Visit `chrome://settings/content/webgl`
   - Ensure WebGL is not blocked

#### Firefox
1. **Hardware Acceleration**:
   - Preferences → General → Performance
   - Uncheck "Use recommended performance settings"
   - Check "Use hardware acceleration when available"

2. **WebGL**:
   - Visit `about:config`
   - Set `webgl.force-enabled` to `true`

#### Safari
1. **Hardware Acceleration**:
   - Safari → Preferences → Advanced
   - Check "Use GPU when available"

### System Optimization

#### Graphics Drivers
- **NVIDIA**: Use latest GeForce drivers
- **AMD**: Use latest Radeon drivers
- **Intel**: Use latest graphics drivers

#### Power Settings
- Set power plan to "High Performance" or "Balanced"
- Ensure discrete GPU is active (not integrated)

#### Memory
- Close unnecessary browser tabs
- Ensure sufficient system RAM (8GB+ recommended)

### Application Settings

The trainer automatically enables several optimizations:

```javascript
// Automatic optimizations enabled:
tf.env().set('WEBGL_PACK', true);                    // Pack operations for efficiency
tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);     // Use 16-bit textures
tf.env().set('WEBGL_RENDER_FLOAT32_CAPABLE', true); // 32-bit float support
tf.env().set('WEBGL_PACK_NORMALIZATION', true);     // Pack normalization ops
tf.env().set('WEBGL_PACK_CLIP', true);              // Pack clipping ops
tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);     // Pack depthwise convolutions
tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0.5); // Texture cleanup threshold
```

## Troubleshooting

### Common Issues

#### GPU Not Detected

**Symptoms**:
- GPU Status shows "CPU Mode"
- Training is very slow
- Browser console shows WebGL errors

**Solutions**:
1. **Update Graphics Drivers**:
   - Download latest drivers from manufacturer
   - Restart browser after installation

2. **Check Browser Support**:
   - Visit [WebGL Report](https://webglreport.com/)
   - Ensure WebGL 2.0 is supported

3. **Enable Hardware Acceleration**:
   - Check browser settings (see above)
   - Restart browser after changes

4. **Disable Extensions**:
   - Try incognito/private mode
   - Disable ad blockers and security extensions

#### WebGL Context Lost

**Symptoms**:
- Training stops unexpectedly
- Error: "WebGL context lost"
- GPU Status shows connection issues

**Solutions**:
1. **Reduce Model Size**:
   - Use fewer layers
   - Reduce filter counts
   - Lower batch size

2. **Memory Management**:
   - Close other tabs
   - Restart browser
   - Check available GPU memory

3. **Browser Reset**:
   - Clear browser cache
   - Reset WebGL settings
   - Try different browser

#### Poor Performance

**Symptoms**:
- GPU detected but training still slow
- High memory usage warnings
- Frequent garbage collection

**Solutions**:
1. **Optimize Architecture**:
   - Use smaller models for experimentation
   - Reduce batch size if memory constrained
   - Use dropout instead of very large layers

2. **System Optimization**:
   - Close background applications
   - Ensure adequate cooling
   - Check GPU utilization in task manager

### Error Messages

#### "WebGL not supported"
- **Cause**: Browser doesn't support WebGL
- **Fix**: Update browser, enable WebGL in settings

#### "GPU memory exceeded"
- **Cause**: Model too large for available VRAM
- **Fix**: Reduce model size, lower batch size

#### "Backend initialization failed"
- **Cause**: Graphics driver issue
- **Fix**: Update drivers, restart system

### Debugging Tools

#### Browser Developer Tools
```javascript
// Check TensorFlow.js backend
console.log('Backend:', tf.getBackend());

// Check WebGL context
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
console.log('WebGL available:', !!gl);

// Monitor memory usage
setInterval(() => {
  console.log('Memory:', tf.memory());
}, 5000);
```

#### GPU Status Monitoring
- Use built-in GPU Status panel
- Run performance benchmark
- Monitor memory usage over time

## Benchmarking

### Built-in Benchmark

The application includes a GPU benchmark tool:

1. **Access**: Expand GPU Status panel
2. **Run**: Click "Run Benchmark" button
3. **Results**: Shows operations per second (ops/sec)

### Performance Targets

Typical benchmark results:
- **High-end GPU**: 10,000+ ops/sec
- **Mid-range GPU**: 5,000-10,000 ops/sec
- **Integrated GPU**: 1,000-5,000 ops/sec
- **CPU only**: 100-1,000 ops/sec

### Manual Benchmarking

```javascript
// Simple matrix multiplication benchmark
const runBenchmark = async () => {
  const size = 512;
  const iterations = 100;
  
  const a = tf.randomNormal([size, size]);
  const b = tf.randomNormal([size, size]);
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = tf.matMul(a, b);
    await result.data();
    result.dispose();
  }
  const end = performance.now();
  
  const opsPerSec = iterations / ((end - start) / 1000);
  console.log(`Benchmark: ${opsPerSec.toFixed(0)} ops/sec`);
  
  a.dispose();
  b.dispose();
};
```

## Browser Compatibility

### WebGL Support

| Browser | WebGL 1.0 | WebGL 2.0 | Notes |
|---------|-----------|-----------|-------|
| Chrome 60+ | ✅ | ✅ | Best performance |
| Firefox 55+ | ✅ | ✅ | Good performance |
| Safari 11+ | ✅ | ✅ | Mac/iOS only |
| Edge 79+ | ✅ | ✅ | Chromium-based |

### GPU Compatibility

#### NVIDIA GPUs
- **GeForce**: GTX 900+ series recommended
- **Quadro**: All modern cards supported
- **RTX**: Excellent performance

#### AMD GPUs
- **Radeon**: R9 series and newer
- **Vega**: Very good performance
- **RDNA**: Excellent performance

#### Intel GPUs
- **HD Graphics**: Basic support
- **Iris/Xe**: Good performance
- **Arc**: Excellent performance (when available)

### Mobile Support

#### iOS
- **Safari**: WebGL 2.0 support
- **Performance**: Limited by thermal throttling
- **Recommendation**: Use for inference, not training

#### Android
- **Chrome**: WebGL 2.0 support varies by device
- **Performance**: Depends on GPU (Adreno, Mali, etc.)
- **Recommendation**: High-end devices only

## Best Practices

### Model Design
1. **Start Small**: Begin with simple architectures
2. **Scale Gradually**: Add complexity as needed
3. **Monitor Memory**: Watch GPU memory usage
4. **Use Efficient Layers**: Prefer conv2d over dense when possible

### Training Strategy
1. **Batch Size**: Start with 8-16, adjust based on memory
2. **Epochs**: Use early stopping to avoid overtraining
3. **Learning Rate**: Start with 0.001, adjust as needed
4. **Validation**: Monitor both loss and memory usage

### Development Workflow
1. **Profile First**: Run benchmark to understand performance
2. **Iterate Fast**: Use small models for quick testing
3. **Scale Up**: Move to larger models once architecture is validated
4. **Monitor Always**: Keep GPU Status panel visible

## Advanced Configuration

### Custom Backend Selection

```javascript
// Force specific backend with error handling
const setOptimalBackend = async () => {
  const backends = ['webgl', 'webgpu', 'cpu'];
  
  for (const backend of backends) {
    try {
      await tf.setBackend(backend);
      if (tf.getBackend() === backend) {
        console.log(`✅ Using ${backend} backend`);
        break;
      }
    } catch (error) {
      console.warn(`❌ ${backend} backend failed:`, error);
    }
  }
};
```

### Memory Management

```javascript
// Custom memory cleanup
const cleanupGPUMemory = () => {
  // Dispose unused tensors
  tf.disposeVariables();
  
  // Force garbage collection (if available)
  if (window.gc) {
    window.gc();
  }
  
  // Log memory status
  console.log('GPU Memory after cleanup:', tf.memory());
};
```

### Performance Monitoring

```javascript
// Continuous performance monitoring
const monitorPerformance = () => {
  setInterval(() => {
    const memory = tf.memory();
    if (memory.numBytes > 100 * 1024 * 1024) { // 100MB threshold
      console.warn('High GPU memory usage:', memory);
    }
  }, 10000);
};
```

## Conclusion

GPU acceleration can dramatically improve your experience with the Interactive CNN Trainer. The application automatically handles most optimization, but understanding these concepts will help you:

- **Troubleshoot** performance issues
- **Optimize** your system for best results
- **Design** efficient neural network architectures
- **Monitor** resource usage effectively

For the best experience:
1. Ensure your system supports WebGL 2.0
2. Keep graphics drivers updated
3. Use the built-in GPU Status panel to monitor performance
4. Start with smaller models and scale up gradually

Happy training! 🚀