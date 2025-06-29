# Session Management Guide

## Overview

The Interactive CNN Trainer includes powerful session management capabilities that allow you to save and restore complete training sessions, including your model architecture, training data, and most importantly - your trained model weights.

## What Gets Saved

When you save a session, the following data is preserved:

### 🏗️ **Network Architecture**
- Complete layer configuration (Conv2D, MaxPooling, Dense, Reshape, etc.)
- Layer parameters (filters, kernel sizes, activation functions, etc.)
- Layer order and connections

### 📊 **Training Data**
- All collected samples (drawings or camera captures)
- Associated labels for each sample
- Timestamps for data collection tracking

### 🧠 **Trained Model Weights** ⭐ **NEW!**
- Complete neural network weights and biases
- All layer parameters learned during training
- Preserves your model's learning progress

### 📈 **Training Metrics**
- Number of epochs completed
- Complete loss history curve
- Training progress indicators

## How to Save a Session

1. **Train Your Model**: Collect data and train your CNN as usual
2. **Click "Save Session"**: Located in the Training Controls panel
3. **Wait for Processing**: The system will serialize model weights (may take a few seconds)
4. **Download Automatically**: A timestamped JSON file will be downloaded

### Save Process Details
- **Progress Feedback**: Button shows "Saving..." during weight serialization
- **Automatic Naming**: Files are named `cnn_session_YYYY-MM-DD-HHMMSS.json`
- **Comprehensive Summary**: Success message shows what was saved

## How to Load a Session

1. **Click "Load Session"**: Located in the Training Controls panel
2. **Select File**: Choose a previously saved session JSON file
3. **Automatic Processing**: 
   - Architecture loads immediately
   - Model reinitializes with new architecture
   - Weights restore after 1-second delay (for model initialization)
4. **Continue Training**: Pick up exactly where you left off

### Load Process Details
- **Validation**: File structure is validated before loading
- **Graceful Fallback**: If weights fail to load, model uses random weights
- **Status Updates**: Clear messages indicate what was successfully restored

## Session File Format

Session files are human-readable JSON with the following structure:

```json
{
  "layers": [
    {
      "id": 1640995200000,
      "type": "conv2d",
      "filters": 32,
      "kernelSize": 3,
      "activation": "relu",
      "inputShape": [28, 28, 1]
    }
    // ... more layers
  ],
  "trainingData": [
    {
      "image": [0.1, 0.2, 0.3, ...],
      "label": "circle",
      "timestamp": 1640995200000
    }
    // ... more samples
  ],
  "modelWeights": [
    {
      "shape": [3, 3, 1, 32],
      "data": [0.123, -0.456, 0.789, ...]
    }
    // ... weights for each layer
  ],
  "epochsRun": 25,
  "lossHistory": [2.3026, 1.8456, 1.2345, ...]
}
```

## Best Practices

### 📁 **File Organization**
- **Timestamp Names**: Files are automatically timestamped for easy sorting
- **Descriptive Storage**: Create folders for different projects or experiments
- **Version Control**: Keep multiple saves during long training sessions

### 💾 **When to Save**
- **After Successful Training**: When you achieve good performance
- **Before Architecture Changes**: Save current state before experimenting
- **Regular Checkpoints**: During long training sessions
- **Before Closing Browser**: Always save your work!

### 🔄 **Sharing Sessions**
- **Complete Portability**: Sessions work across different devices and browsers
- **Collaboration**: Share trained models with teammates or students
- **Reproducibility**: Others can load your exact training state

## Technical Details

### Model Weight Serialization
- **TensorFlow.js Integration**: Uses native `model.getWeights()` and `model.setWeights()`
- **Memory Management**: Properly disposes of tensor objects to prevent memory leaks
- **Format**: Weights stored as arrays with shape information for reconstruction

### Error Handling
- **Graceful Degradation**: If weights fail to load, model continues with random initialization
- **User Feedback**: Clear error messages and success confirmations
- **Validation**: File structure validation before processing

### Performance Considerations
- **Async Operations**: Weight saving/loading is asynchronous to prevent UI blocking
- **File Size**: Large models may create substantial JSON files (expected behavior)
- **Loading Time**: Complex models may take a few seconds to fully restore

## Troubleshooting

### Common Issues

**"Failed to save model weights"**
- Ensure model has been initialized and trained
- Check browser memory availability
- Try saving after training completion

**"Failed to restore trained weights"**
- File may be corrupted or from incompatible version
- Model will continue with random weights
- Architecture and training data should still load

**Large File Sizes**
- Expected for complex models with many parameters
- Consider training simpler architectures if storage is limited
- Weights data scales with model complexity

**Slow Loading**
- Large models take time to deserialize weights
- Wait for "Session loaded successfully" message
- Don't interrupt the loading process

### Getting Help

If you encounter persistent issues:
1. Check browser console for detailed error messages
2. Verify JSON file isn't corrupted (should be valid JSON)
3. Try loading with a fresh browser session
4. Report issues with session file examples if possible

## Advanced Usage

### Manual Session Editing
Since sessions are JSON files, advanced users can:
- Modify training data programmatically  
- Adjust architecture parameters
- Combine training data from multiple sessions
- Analyze weight distributions

⚠️ **Warning**: Manual editing may break session compatibility. Always backup original files.

### Batch Processing
For researchers or advanced users:
- Scripts can process multiple session files
- Extract weights for analysis in other tools
- Automate session validation and conversion

## Future Enhancements

Planned improvements include:
- Session compression for smaller file sizes
- Session comparison tools
- Batch session operations
- Integration with cloud storage services

---

**Note**: Session management requires modern browser features. Ensure you're using an up-to-date browser for best compatibility.