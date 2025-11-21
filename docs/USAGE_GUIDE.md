# Interactive CNN Trainer - Usage Guide

This guide provides detailed instructions on how to use the advanced features of the Interactive CNN Trainer, including the reshape layer and drag-and-drop functionality.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Interface](#understanding-the-interface)
3. [Using Drag-and-Drop Architecture Builder](#using-drag-and-drop-architecture-builder)
4. [Working with the Reshape Layer](#working-with-the-reshape-layer)
5. [Best Practices](#best-practices)
6. [Common Use Cases](#common-use-cases)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Quick Setup

1. **Start the application**:
   ```bash
   ./start.sh  # Automated setup
   # OR
   python3 simple_server.py  # Use Python server for older Node.js versions
   ```

2. **Open your browser** and navigate to the provided URL (typically `http://localhost:8080`)

3. **Begin with data collection** - draw some samples on the canvas to get started

## Understanding the Interface

### Main Components

- **Drawing Canvas**: Left side - for creating training data
- **Architecture Builder**: Center - for designing your CNN
- **Training Controls**: Right side - for managing the training process
- **Visualizations**: Bottom - for monitoring training progress and results

### Architecture Builder Layout

The architecture builder displays your CNN layers in a vertical list, with each layer showing:
- **Layer type** (Conv, Pool, Activation, etc.)
- **Configuration parameters** (filters, size, activation function)
- **Drag handle** (⋮⋮) for reordering
- **Remove button** (×) for deletion

## Using Drag-and-Drop Architecture Builder

### Basic Drag-and-Drop Operations

1. **Reordering Layers**:
   - Look for the drag handle (⋮⋮) on the left side of each layer
   - Click and hold the drag handle
   - Drag the layer to its new position
   - Release to drop the layer in place

2. **Visual Feedback**:
   - **Dragging**: The layer becomes semi-transparent and scales down
   - **Drop zones**: Valid drop locations are highlighted
   - **Invalid drops**: The layer returns to its original position

### Advanced Drag-and-Drop Tips

1. **Layer Ordering Best Practices**:
   ```
   ✅ Good sequence:
   Input → Conv → Activation → Pool → Conv → Activation → Pool → Flatten → Dense → Output
   
   ❌ Avoid:
   Input → Dense → Conv (Dense layers can't be followed by Conv layers)
   Input → Flatten → Conv (Flattened data can't be convolved)
   ```

2. **Real-time Validation**:
   - The system automatically validates layer compatibility
   - Invalid combinations are highlighted with error messages
   - Training is paused when architecture becomes invalid

## Working with the Reshape Layer

### What is the Reshape Layer?

The Reshape layer transforms tensor dimensions without changing the data. It's useful for:
- Converting between different tensor formats
- Preparing data for specific layer requirements
- Implementing custom architectures

### Adding a Reshape Layer

1. **Click the "+" button** in the architecture builder
2. **Select "Reshape"** from the layer type buttons
3. **Configure the target shape** using the input fields

### Configuring Reshape Parameters

#### Target Shape Configuration

The reshape layer requires a **target shape** with three dimensions: `[Height, Width, Channels]`

```
Example configurations:
- [28, 28, 1] - Original MNIST format
- [14, 14, 8] - After pooling with 8 feature maps
- [7, 7, 16] - Smaller spatial dimensions, more channels
- [1, 1, 784] - Fully flattened to 1D (alternative to Flatten layer)
```

#### Using the Interface

1. **Manual Input**:
   - **Height field**: Set the height dimension
   - **Width field**: Set the width dimension  
   - **Channels field**: Set the number of channels
   - All values must be positive integers

2. **Preset Buttons**:
   - **28×28×1**: Original input format
   - **14×14×8**: Common after first pooling
   - **7×7×16**: Common after second pooling
   - Click any preset to instantly apply that configuration

3. **Validation Feedback**:
   - **Gray indicator**: Basic validation passed (positive dimensions)
   - **Red indicator**: ❌ Invalid dimensions (negative or zero values)
   - **Element count**: Shows total elements and shape for reference
   - **Compatibility**: Final validation happens during model compilation

### Understanding Reshape Validation

#### Element Conservation

The reshape operation must preserve the total number of elements from the previous layer's output. The exact compatibility is validated by TensorFlow.js during model compilation.

```
Basic validation:
- All dimensions must be positive integers
- The system shows total element count for reference
- TensorFlow.js validates actual compatibility during training

Example:
- Target shape [7, 7, 16] = 784 elements
- Compatibility depends on the actual output of the previous layer
```

## Best Practices

### Architecture Design

1. **Start Simple**:
   ```
   Input → Conv(8 filters) → Pool → Conv(16 filters) → Pool → Flatten → Dense → Output
   ```

2. **Use Reshape Strategically**:
   - **Before Dense layers**: Convert to 1D format
   - **Between Conv layers**: Adjust spatial dimensions
   - **For custom architectures**: Enable unique data flows

3. **Layer Sequencing**:
   - **Feature extraction**: Conv → Activation → Pool
   - **Classification**: Flatten → Dense → Output
   - **Custom processing**: Reshape → Custom layers

### Training Tips

1. **Monitor Validation**:
   - Watch for red validation indicators
   - Fix architecture issues before training
   - Use the health check: `node test-app.cjs`

2. **Performance Optimization**:
   - Smaller models train faster
   - Reduce filters/layers for quick experimentation
   - Use dropout to prevent overfitting

## Common Use Cases

### Use Case 1: Converting Between Formats

**Scenario**: Convert flattened data back to image format

```
Architecture:
Dense(784) → Reshape[28, 28, 1] → Conv(8) → Pool → Flatten → Dense(10)
```

**Steps**:
1. Add Dense layer with 784 units
2. Add Reshape layer with target shape [28, 28, 1]
3. Continue with convolutional layers
4. Use the preset button "28×28×1" for quick setup

### Use Case 2: Multi-Scale Processing

**Scenario**: Process the same data at different resolutions

```
Architecture:
Input[28, 28, 1] → 
├─ Branch 1: Conv(8) → Pool → Reshape[7, 7, 16]
├─ Branch 2: Reshape[14, 14, 2] → Conv(16) → Pool
└─ Merge → Dense → Output
```

**Steps**:
1. Design your main path with conv layers
2. Add reshape layer to create different spatial dimensions
3. Use drag-and-drop to arrange layers optimally

### Use Case 3: Dimension Debugging

**Scenario**: Understand tensor shapes throughout your network

```
Add Reshape layers as "probes":
Conv(8) → Reshape[same dimensions] → Pool → Reshape[expected dimensions]
```

**Benefits**:
- Verify expected tensor shapes
- Catch dimension mismatches early
- Learn how layers transform data

## Troubleshooting

### Common Issues

#### Drag-and-Drop Not Working

**Symptoms**: Layers don't move when dragged
**Solutions**:
- Ensure you're dragging from the drag handle (⋮⋮)
- Check that JavaScript is enabled
- Try refreshing the page
- Verify browser compatibility (Chrome 60+, Firefox 55+)

#### Reshape Validation Errors

**Symptoms**: Red validation indicator, model compilation fails
**Solutions**:
- Ensure all dimensions are positive integers
- Check the element count for reference
- Let TensorFlow.js validate actual compatibility during model compilation
- Use browser console to see specific TensorFlow.js error messages

#### Model Won't Train

**Symptoms**: Training button disabled, error messages
**Solutions**:
- Fix any red validation indicators
- Ensure you have training data (draw some samples)
- Check layer sequence makes sense
- Verify all required fields are filled

### Advanced Debugging

#### Using Browser Developer Tools

1. **Open Developer Tools** (F12)
2. **Check Console** for error messages
3. **Look for**:
   - TensorFlow.js errors
   - Shape mismatch warnings
   - Model compilation issues

#### Architecture Validation

```javascript
// Check in browser console:
console.log('Current layers:', layers);
console.log('Model status:', modelStatus);
```

### Performance Issues

#### Slow Training

**Causes & Solutions**:
- **Too many parameters**: Reduce filters, layers, or dense units
- **Large input size**: Use pooling layers more aggressively
- **Browser limitations**: Close other tabs, enable hardware acceleration

#### Memory Issues

**Symptoms**: Page becomes unresponsive, crashes
**Solutions**:
- Reduce batch size in training controls
- Simplify architecture (fewer layers/filters)
- Restart the browser
- Use smaller training datasets

### Getting Help

If you encounter persistent issues:

1. **Run health check**: `node test-app.cjs`
2. **Check browser compatibility**: Ensure WebGL 2.0 support
3. **Verify Node.js version**: 18+ recommended
4. **Review error messages**: Browser console provides detailed info
5. **Try incognito mode**: Eliminates extension conflicts

## Advanced Features

### Keyboard Shortcuts

- **Ctrl+Z**: Undo last architecture change (planned feature)
- **Delete**: Remove selected layer (when focused)
- **Space**: Pause/resume training

### Export/Import (Future)

- Save architecture as JSON
- Load pre-built architectures
- Share configurations with others

### API Integration

The application supports Google Gemini AI for:
- Architecture suggestions
- Performance insights
- Training recommendations

Configure your API key in `.env.local`:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

## Conclusion

The Interactive CNN Trainer provides powerful tools for learning and experimenting with convolutional neural networks. The drag-and-drop interface and reshape layer functionality make it easy to:

- **Design complex architectures** intuitively
- **Understand tensor transformations** through hands-on experience
- **Experiment rapidly** with different configurations
- **Learn CNN concepts** through immediate visual feedback

Take advantage of these features to deepen your understanding of deep learning and create more sophisticated models!

---

**Next Steps**: Try building a custom architecture using the reshape layer, or experiment with the drag-and-drop interface to understand how layer ordering affects model performance.