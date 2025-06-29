# CNN Architecture Examples

This document provides practical examples of CNN architectures using the Interactive CNN Trainer, with special focus on the reshape layer and drag-and-drop functionality.

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Reshape Layer Examples](#reshape-layer-examples)
3. [Advanced Architectures](#advanced-architectures)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting Examples](#troubleshooting-examples)

## Basic Examples

### Example 1: Simple MNIST Classifier

**Purpose**: Basic handwritten digit recognition
**Architecture**:
```
Input [28, 28, 1]
├─ Conv2D (8 filters, 3×3) + ReLU
├─ MaxPool2D (2×2) 
├─ Conv2D (16 filters, 3×3) + ReLU
├─ MaxPool2D (2×2)
├─ Flatten
├─ Dense (10 units) + ReLU
└─ Dense (1 unit) + Sigmoid
```

**Expected Tensor Shapes**:
- After Conv1: [26, 26, 8]
- After Pool1: [13, 13, 8]
- After Conv2: [11, 11, 16]
- After Pool2: [5, 5, 16] = 400 elements
- After Flatten: [400]
- Final Output: [1]

**How to Build**:
1. Start with default architecture
2. Adjust filter counts using the interface
3. Add additional dense layer if needed
4. Train with drawn digits

### Example 2: Feature Visualization Network

**Purpose**: Understanding what features the network learns
**Architecture**:
```
Input [28, 28, 1]
├─ Conv2D (4 filters, 5×5) + ReLU
├─ Flatten
├─ Dense (64 units) + ReLU
├─ Dense (1 unit) + Sigmoid
```

**Benefits**:
- Larger filters (5×5) capture more complex patterns
- Fewer filters (4) make visualization clearer
- Simple architecture for easy interpretation

## Reshape Layer Examples

### Example 3: Dimension Restoration

**Purpose**: Convert flattened features back to spatial format
**Architecture**:
```
Input [28, 28, 1]
├─ Flatten → [784]
├─ Dense (392 units) + ReLU
├─ Reshape [14, 14, 2] ← Key reshape operation
├─ Conv2D (8 filters, 3×3) + ReLU
├─ MaxPool2D (2×2) → [6, 6, 8]
├─ Flatten → [288]
├─ Dense (1 unit) + Sigmoid
```

**Key Points**:
- Dense layer outputs 392 values
- Reshape converts to [14, 14, 2] = 392 elements ✅
- Enables further convolutional processing
- Demonstrates dense-to-conv transition

**Configuration Steps**:
1. Add Flatten layer after input
2. Add Dense layer with 392 units
3. Add Reshape layer:
   - Height: 14
   - Width: 14
   - Channels: 2
4. Continue with Conv layers

### Example 4: Multi-Resolution Processing

**Purpose**: Process the same data at different scales
**Architecture**:
```
Input [28, 28, 1]
├─ Branch A: Conv2D (8 filters, 3×3) → [26, 26, 8]
│              ├─ MaxPool2D (2×2) → [13, 13, 8]
│              └─ Reshape [13, 13, 8] → [1352] (verification)
├─ Branch B: Reshape [14, 14, 2] → Different spatial resolution
│              ├─ Conv2D (4 filters, 3×3) → [12, 12, 4]
│              └─ MaxPool2D (2×2) → [6, 6, 4] → [144]
└─ Merge: Concatenate and process
```

**Reshape Calculations**:
- Original: 28 × 28 × 1 = 784 elements
- Branch B: 14 × 14 × 2 = 392 elements (need to adjust)
- Better: Use 28 × 28 × 1 → 14 × 14 × 4 = 784 elements ✅

**Corrected Branch B**:
```
Input [28, 28, 1]
├─ Reshape [14, 14, 4] ← 784 elements preserved
├─ Conv2D (8 filters, 3×3) → [12, 12, 8]
└─ MaxPool2D (2×2) → [6, 6, 8]
```

### Example 5: Autoencoder with Reshape

**Purpose**: Compress and reconstruct input data
**Architecture**:
```
Encoder:
Input [28, 28, 1] → 784 elements
├─ Conv2D (16 filters, 3×3) → [26, 26, 16]
├─ MaxPool2D (2×2) → [13, 13, 16]
├─ Conv2D (8 filters, 3×3) → [11, 11, 8]
├─ MaxPool2D (2×2) → [5, 5, 8] = 200 elements
├─ Flatten → [200]
└─ Dense (50 units) ← Bottleneck

Decoder:
├─ Dense (200 units)
├─ Reshape [5, 5, 8] ← Restore spatial structure
├─ Conv2D (8 filters, 3×3) → [7, 7, 8] (with padding)
├─ UpSampling → [14, 14, 8]
├─ Conv2D (16 filters, 3×3) → [16, 16, 16] (with padding)
├─ UpSampling → [32, 32, 16]
├─ Conv2D (1 filter, 3×3) → [30, 30, 1]
└─ Crop/Resize → [28, 28, 1]
```

**Note**: This example shows the concept; the actual implementation would require custom layers for upsampling.

## Advanced Architectures

### Example 6: Residual-like Connection with Reshape

**Purpose**: Implement skip connections using reshape operations
**Architecture**:
```
Input [28, 28, 1]
├─ Main Path:
│  ├─ Conv2D (8 filters, 3×3) → [26, 26, 8]
│  ├─ MaxPool2D (2×2) → [13, 13, 8]
│  ├─ Conv2D (16 filters, 3×3) → [11, 11, 16]
│  └─ MaxPool2D (2×2) → [5, 5, 16] = 400 elements
├─ Skip Path:
│  ├─ MaxPool2D (4×4, stride=4) → [7, 7, 1] = 49 elements
│  ├─ Dense (400 units) ← Match main path
│  └─ Reshape [5, 5, 16] ← Same shape as main path
└─ Combine: Element-wise addition (conceptual)
```

**Implementation Notes**:
- Skip connection requires careful dimension matching
- Reshape ensures compatible tensor shapes
- Would need custom combination layer in practice

### Example 7: Attention-like Mechanism

**Purpose**: Focus on important spatial locations
**Architecture**:
```
Input [28, 28, 1]
├─ Feature Extraction:
│  ├─ Conv2D (8 filters, 3×3) → [26, 26, 8]
│  └─ MaxPool2D (2×2) → [13, 13, 8]
├─ Attention Map:
│  ├─ Conv2D (1 filter, 1×1) → [13, 13, 1] ← Attention weights
│  ├─ Flatten → [169]
│  ├─ Dense (169 units) + Sigmoid ← Normalize attention
│  └─ Reshape [13, 13, 1] ← Restore spatial structure
└─ Apply Attention:
   ├─ Multiply feature maps with attention
   ├─ GlobalAveragePooling → [8]
   └─ Dense (1 unit) + Sigmoid
```

## Common Patterns

### Pattern 1: Dimension Verification

**Use Case**: Debugging tensor shapes
**Implementation**:
```
Any Layer → Reshape [same dimensions] → Next Layer
```

**Example**:
```
Conv2D (8 filters, 3×3) → [26, 26, 8]
├─ Reshape [26, 26, 8] ← Verification step
└─ MaxPool2D (2×2) → [13, 13, 8]
```

**Benefits**:
- Confirms expected tensor shapes
- Catches dimension mismatches early
- Helps understand data flow

### Pattern 2: Format Conversion

**Use Case**: Converting between different tensor formats
**Patterns**:

**2D to 1D (Alternative to Flatten)**:
```
Conv2D → [H, W, C] → Reshape [1, 1, H*W*C] → Dense
```

**1D to 2D (Inverse of Flatten)**:
```
Dense → [N] → Reshape [√N, √N, 1] → Conv2D
```

**Channel Redistribution**:
```
[H, W, C] → Reshape [H/2, W/2, C*4] ← Half spatial, quadruple channels
```

### Pattern 3: Data Augmentation via Reshape

**Use Case**: Creating different views of the same data
**Implementation**:
```
Input [28, 28, 1]
├─ View 1: Original → [28, 28, 1]
├─ View 2: Reshape [14, 14, 4] ← Quarter resolution, more channels
├─ View 3: Reshape [7, 7, 16] ← Eighth resolution, many channels
└─ Process each view differently
```

## Troubleshooting Examples

### Problem 1: Element Count Mismatch

**Error**: TensorFlow.js compilation error about incompatible shapes

**Example**:
```
❌ Runtime Error:
Conv2D → outputs shape [null, 26, 26, 8]
Reshape [20, 20, 10] ← TensorFlow.js will reject this during compilation
```

**Solution**:
```
✅ Let TensorFlow.js guide you:
1. Try the reshape configuration
2. Check browser console for TensorFlow.js error messages
3. Adjust dimensions based on the actual error
```

**How to Fix**:
1. The UI shows element count for reference only
2. TensorFlow.js will provide specific error messages
3. Use browser console to see exact shape mismatches
4. Adjust reshape dimensions based on actual error feedback

### Problem 2: Invalid Layer Sequence

**Error**: "Cannot add convolutional layer after flatten"

**Example**:
```
❌ Wrong sequence:
Conv2D → MaxPool2D → Flatten → Conv2D ← Error!
```

**Solution**:
```
✅ Correct sequence:
Conv2D → MaxPool2D → Conv2D → Flatten
```

**Or with Reshape**:
```
✅ Alternative:
Conv2D → MaxPool2D → Flatten → Dense → Reshape → Conv2D
```

### Problem 3: Dimension Compatibility

**Error**: "Layer input shape incompatible with previous layer output"

**Example**:
```
❌ Runtime Error:
Dense (100 units) → outputs [null, 100]
Reshape [10, 10, 2] ← TensorFlow.js error during compilation
```

**Solution**:
```
✅ Check TensorFlow.js error message:
1. Look at browser console for exact error
2. Adjust reshape dimensions accordingly
3. The UI validation is just for basic sanity checking
```

**Or adjust based on actual error**:
```
✅ Example fix:
Dense (100 units) → [null, 100]
Reshape [10, 10, 1] ← Adjust based on TensorFlow.js feedback
```

## Performance Considerations

### Efficient Reshape Usage

**Good Practices**:
1. **Minimize reshapes**: Each reshape operation has computational cost
2. **Strategic placement**: Use reshapes at architectural boundaries
3. **Batch processing**: Reshape works on entire batches efficiently

**Example Optimization**:
```
❌ Too many reshapes:
Conv → Reshape → Conv → Reshape → Conv → Reshape

✅ Strategic reshapes:
Conv → Conv → Conv → Reshape → Dense → Dense
```

### Memory Efficiency

**Consideration**: Reshape doesn't copy data, just changes view
**Benefit**: Very memory efficient
**Usage**: Safe to use for dimension manipulation

## Validation Checklist

Before training your model, verify:

- [ ] All reshape layers show basic validation passed (no red indicators)
- [ ] Layer sequence makes logical sense
- [ ] No red error indicators in the interface
- [ ] Architecture follows standard CNN patterns
- [ ] Model compiles successfully (check browser console for TensorFlow.js errors)
- [ ] Total parameter count is reasonable for your dataset

## Next Steps

1. **Try the basic examples** to understand fundamental concepts
2. **Experiment with reshape layers** using the preset configurations
3. **Use drag-and-drop** to reorder layers and see how it affects the model
4. **Monitor validation indicators** to catch issues early
5. **Create your own architectures** combining different patterns

Remember: The best way to learn is through experimentation. Start with simple examples and gradually increase complexity as you become more comfortable with the tools.