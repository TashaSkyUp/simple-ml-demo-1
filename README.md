# Interactive CNN Trainer with TensorFlow.js

An interactive web application for training Convolutional Neural Networks (CNNs) directly in the browser using TensorFlow.js. This application allows you to draw samples, define network architectures, and train models in real-time with visual feedback.

## Features

### 🆕 **Camera Capture (NEW!)**
- 📸 **Real-time Camera Input**: Capture photos directly from your device camera
- 🎯 **RGB Image Processing**: Full 3-channel (RGB) image support for realistic training
- 📱 **Mobile Optimized**: Automatic camera selection (front/back) and responsive design
- 🔄 **Dual Input Modes**: Seamlessly switch between drawing and camera capture

### 🧠 **Machine Learning**
- 🎨 **Interactive Drawing Canvas**: Draw samples directly in the browser
- 🧠 **Real-time CNN Training**: Train neural networks with TensorFlow.js
- 📊 **Live Visualizations**: Watch training progress, loss curves, and feature maps
- 🏗️ **Customizable Architecture**: Define your own CNN layers and parameters
- 🔄 **Drag-and-Drop Layer Management**: Reorder CNN layers with intuitive drag-and-drop
- 🔧 **3D Reshape Layer**: Advanced layer for reshaping tensor dimensions

### ⚡ **Performance & Compatibility**
- 🚀 **GPU Acceleration**: Automatic WebGL/WebGPU acceleration for faster training
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🌈 **RGB Processing**: Full-color image processing (upgraded from grayscale)
- 🔒 **Privacy First**: All processing happens locally in your browser

## Prerequisites

- **Node.js 18+** (recommended) - The app may work with older versions but performance and compatibility are not guaranteed
- **Modern Web Browser** with WebGL support (Chrome, Firefox, Safari, Edge)
- **Gemini API Key** (optional) - For AI-powered features

## Quick Start

### Option 1: Using the Startup Script (Recommended)

1. **Clone or extract the project files**
2. **Run the startup script**:
   ```bash
   ./start.sh
   ```
   The script will:
   - Check your Node.js version
   - Install dependencies automatically
   - Guide you through environment setup
   - Start the development server

### Option 2: Manual Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.local.template .env.local
   ```
   Edit `.env.local` and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env.local` file

**Note**: The application will work without the API key, but AI-powered features will be disabled.

## How to Use

### 1. Data Collection
- Use the drawing canvas to create training samples
- Draw different shapes, letters, or patterns
- Label your drawings with different classes
- Collect multiple samples for each class

### 2. Architecture Definition
- Configure your CNN layers (Conv2D, MaxPooling, Dense, Reshape, etc.)
- **Drag and drop** to reorder layers in your architecture
- Adjust parameters like filters, kernel size, activation functions
- Use the **Reshape layer** to transform tensor dimensions
- Preview your network architecture with real-time validation

### 3. Training
- Start training with your collected data
- Watch the loss curve in real-time
- Monitor training metrics and accuracy
- Adjust hyperparameters as needed

### 4. Visualization
- View feature maps from different layers
- See how your network processes input data
- Analyze prediction confidence scores
- Explore the training pipeline visualization

## Layer Types

### Available Layer Types
- **Convolutional (Conv2D)**: Feature extraction with learnable filters
- **Pooling (MaxPool/AvgPool)**: Spatial downsampling to reduce dimensions
- **Activation**: Non-linear activation functions (ReLU, sigmoid, tanh)
- **Dropout**: Regularization to prevent overfitting
- **Flatten**: Convert multi-dimensional data to 1D for dense layers
- **Dense (Fully Connected)**: Traditional neural network layers
- **Reshape**: Transform tensor dimensions (e.g., from 1D back to 3D)

### Reshape Layer Features
The Reshape layer is particularly useful for:
- Converting between different tensor formats
- Preparing data for specific layer requirements
- Implementing custom architectures with dimension transformations
- **Built-in validation** ensures dimension compatibility
- **Preset buttons** for common reshape configurations (28×28×1, 14×14×8, 7×7×16)
- **Real-time feedback** on element count and compatibility

### Drag-and-Drop Architecture Builder
- **Visual layer management**: See your architecture at a glance
- **Intuitive reordering**: Drag layers to rearrange your network
- **Live validation**: Get immediate feedback on layer compatibility
- **Custom drag handles**: Clear visual indicators for dragable elements

## Project Structure

```
simple-ml-demo-1/
├── components/                 # React components
│   ├── ArchitectureDefinition.tsx
│   ├── DataCollection.tsx
│   ├── FeatureMapCanvas.tsx
│   ├── LossGraph.tsx
│   ├── PipelineVisualization.tsx
│   ├── PredictionDisplay.tsx
│   ├── TrainableConvNet.tsx
│   └── TrainingControls.tsx
├── hooks/                      # Custom React hooks
│   ├── useCNNModel.ts
│   ├── useDrawingCanvas.ts
│   └── useTFModel.ts
├── utils/                      # Utility functions
│   └── cnnUtils.ts
├── App.tsx                     # Main application component
├── index.tsx                   # Application entry point
├── index.html                  # HTML template
├── index.css                   # Global styles
├── types.ts                    # TypeScript type definitions
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── start.sh                    # Startup script
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technology Stack

- **Frontend**: React 19, TypeScript
- **ML Framework**: TensorFlow.js 4.22+
- **GPU Acceleration**: WebGL backend with automatic fallback
- **Build Tool**: Vite 6.0+
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini API
- **Unique ID Generation**: Custom collision-resistant ID system

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

**GPU Acceleration Requirements:**
- WebGL 2.0 support (for optimal performance)
- Hardware acceleration enabled in browser
- Updated graphics drivers
- Sufficient GPU memory for larger models

WebGL support is required for TensorFlow.js to work properly.

## Performance Tips

### GPU Acceleration
- **Automatic Detection**: The app automatically uses GPU when available
- **GPU Status Panel**: Monitor acceleration status in the interface
- **Benchmark Tool**: Test your system's performance with built-in benchmark
- **Memory Monitoring**: Real-time GPU memory usage tracking

### System Optimization
- **Graphics Drivers**: Keep GPU drivers updated for best performance
- **Hardware Acceleration**: Enable in browser settings (Chrome/Firefox/Safari)
- **Dedicated GPU**: Use discrete graphics card when available
- **Power Settings**: Set to "High Performance" mode for training

### Model Optimization
- **Start Small**: Begin with simple architectures, scale up gradually
- **Monitor Memory**: Watch GPU memory usage to avoid crashes
- **Batch Size**: Adjust based on available GPU memory
- **Close Tabs**: Free up GPU resources by closing unnecessary browser tabs

### Performance Expectations
- **GPU Accelerated**: 5-20x faster training than CPU
- **CPU Fallback**: Still functional but slower
- **Real-time Feedback**: Immediate visual updates during training

## Troubleshooting

### Common Issues

1. **"Failed to compile" errors**
   - Ensure you're using Node.js 18+
   - Try deleting `node_modules` and running `npm install` again

3. **TensorFlow.js errors**
   - Check GPU Status panel for acceleration info
   - Verify WebGL 2.0 support at [webglreport.com](https://webglreport.com/)
   - Update graphics drivers
   - Enable hardware acceleration in browser settings
   - Try refreshing the page

4. **Slow training performance**
   - Check GPU Status panel - ensure GPU acceleration is active
   - Run built-in benchmark to test system performance
   - Reduce model complexity (fewer layers/filters)
   - Lower the batch size to reduce memory usage
   - Close other browser tabs to free GPU resources
   - Update graphics drivers
   - Enable hardware acceleration in browser settings

4. **API key issues**
   - Verify your Gemini API key is correct
   - Check that the key has proper permissions
   - Ensure the `.env.local` file is in the root directory

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify all dependencies are installed correctly
3. Ensure your Node.js version meets requirements
4. Try running the application in an incognito/private browser window

## Educational Use

This application is perfect for:
- Learning about Convolutional Neural Networks
- Understanding how CNNs process image data
- Experimenting with different architectures
- **Understanding tensor reshaping** and dimension transformations
- **Learning layer sequencing** through drag-and-drop interface
- Visualizing the training process
- Teaching machine learning concepts
- Exploring the relationship between layer order and model performance

### Advanced Features for Learning
- **Interactive Architecture Building**: Understand how layer order affects network behavior
- **Dimension Validation**: Learn about tensor compatibility between layers
- **Real-time Feedback**: See immediate results of architectural changes
- **Visual Layer Management**: Better comprehension of network structure

## License

This project is for educational and demonstration purposes. Please check the licenses of individual dependencies for commercial use.

## Contributing

This is a demo application, but feedback and suggestions are welcome! Feel free to experiment with the code and adapt it for your own learning purposes.