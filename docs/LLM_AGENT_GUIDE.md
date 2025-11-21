# LLM Agent Guide - Interactive CNN Trainer

**CRITICAL**: This document MUST be updated whenever you make changes to the codebase. Always update the "Last Updated" timestamp and relevant sections after any modifications.

**Last Updated**: 2024-12-19
**Project Status**: FULLY OPERATIONAL
**Node.js Version**: v22.17.0
**Primary Technology**: React + TypeScript + TensorFlow.js + Vite

## Quick Project Overview

### What This Is
Interactive CNN Trainer - A browser-based educational tool for learning Convolutional Neural Networks with real-time GPU acceleration, drag-and-drop architecture design, and complete session persistence including trained model weights.

### Key Capabilities
- ✅ Real-time CNN training with WebGPU/WebGL acceleration and automatic backend selection
- ✅ Interactive drawing canvas with camera capture for data collection
- ✅ Drag-and-drop neural network architecture builder with live validation
- ✅ Complete session save/load with serialized trained model weights
- ✅ Live visualization of layer outputs and training metrics
- ✅ Responsive collapsible interface with keyboard shortcuts and persistent state
- ✅ Automatic GPU vs CPU performance benchmarking with intelligent backend recommendation

## Detailed Architecture Analysis

### Core Application Structure

#### Main Application Component (`TrainableConvNet.tsx`)
- **Role**: Central orchestrator and state manager for the entire application
- **Key Responsibilities**:
  - Manages global application state (layers, training data, training progress)
  - Coordinates between all major subsystems (model, UI, data collection)
  - Handles session persistence (save/load functionality with weights)
  - Manages training lifecycle and progress tracking
  - Provides tabbed interface coordination between Training and Inference modes
- **State Management**: Uses React useState hooks for all global state
- **Integration Points**: Connects useTFModel hook, DataCollection, ArchitectureDefinition, and all UI components
- **Session Data Structure**: 
  - layers: LayerConfig array defining network architecture
  - trainingData: TrainingDataPoint array with RGB grids and labels
  - modelWeights: Serialized TensorFlow.js tensor data (optional)
  - epochsRun: Training progress counter
  - lossHistory: Array of loss values for visualization

#### TensorFlow.js Model Management (`hooks/useTFModel.ts`)
- **Role**: Complete abstraction layer for all TensorFlow.js operations
- **Key Features**:
  - **Backend Performance Comparison**: Automatically tests WebGPU, WebGL, and CPU backends with realistic workloads
  - **Model Building**: Converts LayerConfig array to TensorFlow.js Sequential model with full validation
  - **Training Management**: Handles training loop with progress callbacks and memory management
  - **Weight Serialization**: Complete save/load of trained weights using tf.tensor() reconstruction
  - **Live Inference**: Real-time prediction capabilities during and after training
  - **Memory Management**: Proper tensor disposal to prevent GPU memory leaks
- **Backend Selection Logic**: 
  - Tests each backend with 20 iterations of realistic CNN operations (conv2d + maxPool)
  - Measures operations per second for each backend
  - Automatically selects fastest backend with fallback hierarchy
  - Provides manual override capabilities for expert users
- **Model Architecture Support**:
  - Conv2D layers with configurable filters, kernel sizes, and activation functions
  - MaxPooling2D layers with configurable pool sizes and strides
  - Dense layers with configurable units and activation functions
  - Flatten layers for transitioning from convolutional to dense layers
  - Reshape layers for custom tensor dimension manipulation
  - Dropout layers for regularization (though not fully implemented in current version)

#### Data Collection System (`components/DataCollection.tsx`)
- **Role**: Multi-modal input system for gathering training samples
- **Input Modes**:
  - **Drawing Canvas**: 280x280 pixel canvas with 25px line width, integrated with useDrawingCanvas hook
  - **Camera Capture**: Real-time camera integration with live preview and capture functionality
  - **Live Camera Mode**: Continuous prediction mode for real-time inference demonstration
- **Data Processing Pipeline**:
  - Raw input → ImageData → RGB grid conversion (28x28x3)
  - Support for both grayscale and RGB data formats
  - Data augmentation options (horizontal flip, translation)
  - Automatic prediction triggering during inference mode
- **Integration**: Directly feeds processed data to main application state and prediction system

#### Architecture Definition System (`components/ArchitectureDefinition.tsx`)
- **Role**: Visual drag-and-drop interface for designing CNN architectures
- **Key Features**:
  - **Drag-and-Drop Reordering**: Full touch and mouse support with visual feedback
  - **Layer Parameter Editing**: Inline editing of all layer parameters with validation
  - **Real-time Validation**: Immediate feedback on invalid configurations
  - **Layer Type Support**: Complete support for all defined layer types in the system
  - **Preset Configurations**: Quick-setup buttons for common reshape configurations
- **Validation System**:
  - Basic parameter validation (positive integers, valid ranges)
  - Shape compatibility checking for reshape layers
  - Layer sequence validation (prevents invalid combinations like Dense → Conv2D)
  - Real-time feedback with color-coded indicators
- **User Experience**: Smooth animations, hover effects, and intuitive visual design language

### Type System Architecture (`types.ts`)

#### Layer Type Hierarchy
```
BaseLayerConfig (abstract)
├── ConvLayerConfig: filterSize (3|5), numFilters, optional activation
├── ActivationLayerConfig: func (ActivationFunction enum)
├── PoolLayerConfig: poolSize, poolingType (Max|Average)
├── DropoutLayerConfig: rate (0-1)
├── FlattenLayerConfig: (no additional parameters)
├── DenseLayerConfig: units, activation
└── ReshapeLayerConfig: targetShape (number array)
```

#### Data Flow Types
- **TrainingDataPoint**: id, grid (RGB 28x28x3), label (0|1)
- **PredictionState**: label (string), confidence (number)
- **LiveLayerOutput**: id, maps (feature maps), layerClassName, outputShape, config

#### Enumeration System
- **LayerType**: Conv, Activation, Pool, Dropout, Flatten, Dense, Reshape
- **ActivationFunction**: ReLU, Sigmoid, Tanh, Linear
- **PoolingType**: Max, Average

### User Interface Architecture

#### Tabbed Interface System (`components/TabbedInterface.tsx`)
- **Structure**: Flexible tab system supporting badges, icons, and dynamic content
- **Tabs**:
  - **Training Tab**: Primary workflow for data collection, architecture design, and training
  - **Inference Tab**: Dedicated space for model testing and layer visualization
- **State Management**: Independent tab state with callback system for parent coordination

#### Collapsible Sections System (`hooks/useCollapsibleSections.ts`)
- **Persistence**: Automatic localStorage persistence of section states across browser sessions
- **Responsive Behavior**: Different default states based on screen size detection
- **Keyboard Shortcuts**: 
  - Ctrl+A (Cmd+A): Toggle all sections
  - Ctrl+1-5 (Cmd+1-5): Toggle individual sections
- **Integration**: Used throughout the application for optimal screen real estate management

#### Section Organization (Training Tab)
1. **Network Architecture** (always open)
   - Badge: Current layer count
   - Content: ArchitectureDefinition component with drag-and-drop functionality
   
2. **Data Collection** (always open)
   - Badge: Current sample count
   - Content: DataCollection component with drawing canvas and camera options
   
3. **Training & Session Management** (always open)
   - Badge: Training progress (epochs) or completion status
   - Content: Training controls, hyperparameters, session save/load, predictions
   
4. **GPU Performance** (responsive - closed on mobile, open on desktop)
   - Badge: Current backend or performance metrics
   - Content: Backend comparison, performance benchmarking, manual overrides

#### Responsive Design System
- **Mobile (< 768px)**: Single column stack, essential sections only
- **Tablet (768px - 1024px)**: Two-column layout with selective section opening
- **Desktop (1024px - 1280px)**: Two-column with expanded sections
- **Wide (1280px - 1920px)**: Three-column optimized layout
- **Ultra-wide (> 1920px)**: Full three-column with maximum space utilization

### State Management Architecture

#### Global State Flow
```
TrainableConvNet (Root State)
├── layers: LayerConfig[] → ArchitectureDefinition
├── trainingData: TrainingDataPoint[] → DataCollection
├── isTraining: boolean → TrainingControls
├── epochsRun: number → Progress indicators
├── lossHistory: number[] → LossGraph
├── model: tf.Sequential → useTFModel hook
└── predictions: PredictionState → PredictionDisplay
```

#### Local State Management
- **Component-Level**: Each component manages its own UI state independently
- **Hook-Based**: Custom hooks encapsulate complex state logic (useTFModel, useCollapsibleSections, useDrawingCanvas)
- **Persistent State**: Section states and user preferences stored in localStorage
- **Session State**: Complete application state serializable to JSON for save/load functionality

#### Data Persistence Strategy
- **Local Storage**: UI preferences, section states
- **Session Files**: Complete application state including trained weights
- **Memory Management**: Proper cleanup of TensorFlow.js tensors and GPU resources

### TensorFlow.js Integration Architecture

#### Backend Management System
- **Multi-Backend Support**: WebGPU (primary), WebGL (fallback), CPU (last resort)
- **Performance Testing**: Automated benchmarking with realistic CNN operations
- **Smart Selection**: Automatic backend choice based on performance results
- **Manual Override**: Expert user controls for forcing specific backends
- **Fallback Chain**: Graceful degradation when preferred backends fail

#### Model Compilation Pipeline
1. **Layer Validation**: Check parameter validity and type compatibility
2. **Architecture Assembly**: Convert LayerConfig array to TensorFlow.js layers
3. **Model Creation**: Build Sequential model with proper input/output shapes
4. **Compilation**: Set optimizer, loss function, and metrics
5. **Verification**: Test model with dummy data to ensure functionality

#### Training System
- **Data Preparation**: Convert RGB grids to properly shaped tensors
- **Batch Processing**: Efficient batching for GPU acceleration
- **Progress Tracking**: Real-time epoch progress with loss monitoring
- **Memory Management**: Automatic tensor disposal and memory cleanup
- **Error Handling**: Comprehensive error catching with user-friendly messages

#### Weight Serialization System
- **Extraction**: Use model.getWeights() to get tensor objects
- **Serialization**: Convert tensors to plain JavaScript arrays with shape information
- **Storage**: Include in session JSON with proper metadata
- **Restoration**: Reconstruct tensors using tf.tensor() with original shapes
- **Validation**: Verify weight compatibility during loading process

### Utility System Architecture

#### Image Processing Pipeline (`utils/cnnUtils.ts`)
- **Canvas to Grid Conversion**: Multiple format support (grayscale, RGB)
- **Scaling and Normalization**: Automatic resize to 28x28 with proper normalization
- **Data Augmentation**: Horizontal flip and translation transforms
- **Format Conversion**: Seamless conversion between different data representations

#### Drawing Canvas System (`hooks/useDrawingCanvas.ts`)
- **Event Handling**: Mouse and touch support with proper coordinate transformation
- **Real-time Processing**: Immediate conversion to grid format during drawing
- **Integration**: Direct connection to prediction system for live inference

### Performance and Optimization Architecture

#### GPU Acceleration Strategy
- **WebGPU Priority**: Modern GPU API with best performance characteristics
- **WebGL Fallback**: Mature API with broad browser support
- **CPU Compatibility**: JavaScript/WASM execution for systems without GPU support
- **Automatic Selection**: Performance-based backend choice with user override options
- **Memory Optimization**: Proper tensor lifecycle management and cleanup

#### Memory Management System
- **Tensor Disposal**: Automatic cleanup of TensorFlow.js tensors
- **GPU Memory Monitoring**: Real-time tracking of GPU memory usage
- **Garbage Collection**: Strategic cleanup during training and inference
- **Resource Pooling**: Efficient reuse of common tensor operations

#### Performance Monitoring
- **Benchmarking Tools**: Built-in performance comparison between backends
- **Real-time Metrics**: Live monitoring of operations per second and memory usage
- **User Feedback**: Clear performance indicators and recommendations

### Error Handling and Validation Architecture

#### Validation Layers
1. **Input Validation**: Parameter range checking, type validation
2. **Architecture Validation**: Layer compatibility, sequence validation
3. **Runtime Validation**: TensorFlow.js compilation and execution validation
4. **Data Validation**: Training data format and consistency checking

#### Error Recovery System
- **Graceful Degradation**: Fallback to working configurations when possible
- **User Feedback**: Clear error messages with actionable solutions
- **State Recovery**: Preserve user work when non-critical errors occur
- **Logging System**: Comprehensive error logging for debugging

### Security and Privacy Architecture

#### Data Privacy
- **Local Processing**: All operations performed in browser, no external data transmission
- **No Server Dependency**: Complete functionality without external services
- **User Control**: Users maintain complete control over their data and models

#### Session Security
- **Local Storage Only**: Session files saved as local downloads
- **No External Access**: No network communication for core functionality
- **Input Validation**: Proper sanitization of user inputs and session files

## Critical Technical Implementation Details

### Session File Management

#### Large Session File Handling
- **Storage Method**: Browser downloads using Blob API with URL.createObjectURL()
- **File Size Strategy**: No built-in compression - files can range from 1MB (simple models) to 100MB+ (complex models with many parameters)
- **Download Prevention**: No specific mechanism to prevent browser "Save As" stalls - relies on browser's native download behavior
- **Memory Management**: Session creation happens in memory before download, so large sessions may temporarily consume significant RAM
- **Streaming**: No streaming JSON implementation - entire session serialized at once
- **Browser Limits**: Subject to browser memory limits and download size restrictions

#### Session JSON Schema
```typescript
interface AppSessionData {
  layers: LayerConfig[];                    // Network architecture definition
  trainingData: TrainingDataPoint[];       // Collected training samples  
  modelWeights?: ModelWeightData[] | null; // Serialized tensor weights (optional)
  epochsRun?: number;                      // Training progress counter
  lossHistory?: number[];                  // Loss curve data points
}

interface ModelWeightData {
  shape: number[];      // Tensor shape array [height, width, channels, filters]
  data: number[];       // Flattened weight values as plain numbers
}

interface TrainingDataPoint {
  id: number | string;  // Unique identifier (timestamp-based)
  grid: number[][][];   // RGB image data [28][28][3]  
  label: 0 | 1;        // Binary classification label
}
```

#### Versioning and Future-Proofing
- **No Explicit Versioning**: Current implementation lacks version fields in session format
- **Forward Compatibility**: New optional fields can be added without breaking old sessions
- **Backward Compatibility**: Missing fields are handled gracefully with fallback values
- **Migration Strategy**: No automated migration system - relies on optional field handling

### Concurrency and Training Management

#### Training Concurrency Control
- **Single Training Lock**: No explicit concurrency control for main thread training
- **Worker Training Protection**: Web worker implementation includes `isTraining` flag to prevent overlapping training
- **Double-Click Prevention**: No debouncing on training button - relies on training status checks
- **GPU Resource Contention**: No protection against multiple models attempting to use GPU simultaneously
- **Status Management**: Training status tracked via React state but not atomic across components

#### Concurrency Issues Identified
- **Race Conditions**: Rapid clicking of "Train" button can potentially start multiple training sessions
- **Resource Conflicts**: No protection against model building while training is in progress
- **State Inconsistency**: Training state updates may not be immediately consistent across all components

### Tensor Lifecycle Management

#### Tensor Disposal Strategy
- **Automatic Disposal**: useTFModel hook handles disposal of model tensors on model rebuilding
- **Manual Cleanup**: Weight serialization functions dispose of temporary tensors immediately after use
- **Memory Monitoring**: No active monitoring of tensor count or memory usage during runtime
- **Cleanup Triggers**: 
  - Model disposal when architecture changes
  - Temporary tensor cleanup after operations
  - Component unmount cleanup (partial implementation)

#### Dangling Reference Detection
- **No Active Detection**: No mechanism to detect unreferenced tensors
- **Manual Verification**: Relies on proper coding practices and manual verification
- **Browser Tab Handling**: No specific cleanup on tab switching or page unload
- **Memory Leak Prevention**: Depends on proper dispose() calls in component lifecycle

### Camera and Media Stream Management

#### Camera Resource Cleanup
- **Stream Termination**: CameraCapture component properly stops all media tracks on unmount
- **Permission Handling**: Requests camera permissions with proper error handling
- **Live Mode Cleanup**: Interval-based capture properly cleared when live mode disabled
- **Memory Management**: Video element srcObject set to null on cleanup
- **LED Indicator**: Webcam LED properly turned off when streams are stopped

#### Media Stream Lifecycle
```typescript
// Cleanup implementation in CameraCapture.tsx
const stopCamera = useCallback(() => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
  setIsStreaming(false);
  onStreamingChange?.(false);
}, []);

// Unmount cleanup
React.useEffect(() => {
  return () => {
    stopLiveMode();
    stopCamera();
  };
}, [stopCamera, stopLiveMode]);
```

### Dependency Management and Versioning

#### TensorFlow.js Version Management
- **Current Version**: @tensorflow/tfjs ^4.22.0
- **Version Pinning**: Uses caret (^) versioning allowing minor updates
- **Breaking Change Strategy**: No automated migration path for major version updates
- **Testing Strategy**: No automated testing against multiple TensorFlow.js versions
- **Deprecation Handling**: No systematic approach to handling deprecated APIs

#### Dependency Update Process
- **Manual Process**: Dependency updates require manual package.json modification
- **No CI Integration**: No automated dependency checking or vulnerability scanning
- **Compatibility Testing**: No automated testing of dependency compatibility
- **Security Updates**: No automated security patch application

### Testing and Quality Assurance

#### Current Testing Status
- **Comprehensive Test Suite**: Full testing infrastructure with unit, integration, and e2e test directories
- **Automated Testing**: npm test scripts for automated test execution
- **Testing Frameworks**: Jest globals, ts-node, and custom test runners configured
- **Manual and Automated**: Both manual testing procedures and automated test suites available
- **Browser Integration**: Real browser testing for WebGL/WebGPU functionality

#### Testing Infrastructure
- **tests/unit/**: Unit tests for individual components and utilities
  - Session management validation (`session_test.ts`)
  - CNN utilities testing (`cnn-utils.test.ts`)
  - Component-specific unit tests
- **tests/integration/**: Integration tests for system interactions
  - localStorage quota management testing
  - Web Worker communication validation
  - TensorFlow.js backend integration tests
- **tests/e2e/**: End-to-end test framework (ready for expansion)
- **Test Runner**: Automated test execution with `tests/run-tests.js`

#### Testing Capabilities
- **Hook Testing**: Utility functions and data processing pipelines tested
- **Component Integration**: Browser-based integration testing with real DOM
- **Backend Testing**: WebGL/WebGPU backend switching and performance validation
- **Session Management**: Comprehensive session serialization and validation testing
- **Error Handling**: localStorage quota, Web Worker failures, and enum serialization edge cases

### Backend Determinism and Consistency

#### Cross-Backend Consistency Issues
- **Floating-Point Variance**: No specific handling of floating-point differences between WebGPU/WebGL/CPU
- **Seeding Strategy**: No deterministic seeding for reproducible results
- **Backend-Specific Behavior**: No documentation or handling of backend-specific quirks
- **Loss Curve Variations**: Training loss may vary slightly between backends due to precision differences
- **Result Comparison**: No epsilon tolerance testing for cross-backend result validation

#### Determinism Implementation
- **Random Seeding**: No explicit random seed setting for TensorFlow.js operations
- **Weight Initialization**: Uses TensorFlow.js default random initialization without seeding
- **Training Reproducibility**: No guarantee of identical results across sessions or backends

### Error Reporting and Production Monitoring

#### Current Error Handling
- **Console Logging**: Comprehensive console logging for development debugging
- **User Notifications**: User-facing error messages through browser alerts
- **No External Reporting**: No integration with error reporting services (Sentry, Bugsnag, etc.)
- **Local-Only Errors**: All error information remains in browser console

#### Production Error Strategy
- **No Crash Reporting**: No automatic crash or error reporting to external services
- **User Dependency**: Relies on users to report issues manually
- **Debug Information**: No automatic collection of debug information (browser version, GPU details, session state)
- **Error Classification**: No systematic categorization of error types or severity levels

## Critical Integration Points

### Component Communication Flow
1. **User Interaction** → UI Component → State Update → Hook Execution → TensorFlow.js Operation
2. **Training Progress** → useTFModel Hook → State Callback → UI Update → User Feedback
3. **Architecture Change** → ArchitectureDefinition → Layer Validation → Model Recompilation → Status Update
4. **Data Collection** → DataCollection → Data Processing → State Update → Automatic Prediction (if enabled)

### State Synchronization Points
- **Model Architecture**: Changes trigger model recompilation and training reset
- **Training Data**: Addition triggers prediction updates and training availability
- **Training Progress**: Updates trigger UI refresh and persistence consideration
- **Backend Changes**: GPU/CPU switching triggers performance re-evaluation

### Critical Dependencies
- **TensorFlow.js**: Core ML functionality, version 4.x.x required
- **React**: UI framework, version 18.x.x for modern features
- **TypeScript**: Type safety, version 5.x.x for advanced type features
- **Vite**: Build system, version 4.x.x for modern JavaScript support

## Implementation Patterns and Best Practices

### React Patterns Used
- **Custom Hooks**: Encapsulation of complex stateful logic
- **Component Composition**: Building complex UI from simple, reusable components
- **Controlled Components**: All form inputs properly controlled with React state
- **Effect Management**: Proper useEffect usage for side effects and cleanup

### TypeScript Patterns Used
- **Discriminated Unions**: LayerConfig types with proper type narrowing
- **Interface Inheritance**: Hierarchical type system for different layer types
- **Generic Types**: Flexible type definitions for reusable components
- **Type Guards**: Runtime type checking for dynamic data

### TensorFlow.js Patterns Used
- **Resource Management**: Proper tensor disposal and memory cleanup
- **Async Operations**: Proper handling of asynchronous ML operations
- **Error Handling**: Comprehensive catching and handling of TF.js errors
- **Backend Abstraction**: Clean abstraction over different compute backends

## Deployment and GitHub Pages Integration

### Automated GitHub Pages Deployment

This project includes a complete GitHub Actions workflow for automated deployment to GitHub Pages.

#### GitHub Workflow Configuration (`.github/workflows/deploy.yml`)

The project includes an automated deployment pipeline that:

1. **Triggers**: Automatically deploys on pushes to `main` or `master` branches
2. **Build Process**: Uses Node.js 20, installs dependencies, runs `npm run build`
3. **Pages Setup**: Configures GitHub Pages with proper permissions and artifacts
4. **Deployment**: Deploys the built application to GitHub Pages

**Key workflow features:**
- **Node.js 20**: Latest LTS for optimal performance
- **Production Build**: Optimized Vite build with minification
- **Jekyll Bypass**: Includes `.nojekyll` file for proper SPA routing
- **Concurrent Safety**: Prevents deployment conflicts with cancellation policies
- **Manual Dispatch**: Allows manual deployment triggers via GitHub UI

#### Deployment Process

**Automatic Deployment:**
1. Push changes to main branch
2. GitHub Actions automatically triggers build
3. Build completes and deploys to GitHub Pages
4. Application available at `https://username.github.io/repository-name/`

**Manual Deployment:**
1. Go to repository → Actions tab
2. Select "Deploy CNN Trainer to GitHub Pages" workflow
3. Click "Run workflow" → "Run workflow"
4. Monitor deployment progress in Actions tab

#### Production Configuration

**GitHub Pages Settings Required:**
1. Repository Settings → Pages
2. Source: "GitHub Actions"
3. No custom domain configuration needed
4. HTTPS enabled by default

**Build Output:**
- Optimized JavaScript bundles
- Minified CSS and assets
- WebGPU/WebGL compatibility maintained
- Service worker ready (if implemented)

#### Deployment Status and Monitoring

**Live Application:**
- Current deployment: `https://tashaskyup.github.io/simple-ml-demo-1/`
- Status: Fully operational with all features
- Performance: WebGPU and WebGL acceleration enabled
- Compatibility: All modern browsers supported

**Monitoring Deployment:**
- GitHub Actions tab shows deployment status
- Green checkmark = successful deployment
- Red X = deployment failure (check logs)
- Yellow circle = deployment in progress

#### WebGPU and Production Considerations

**HTTPS Requirement:** GitHub Pages provides HTTPS by default, required for WebGPU
**Cross-Origin Isolation:** Not required for basic WebGPU functionality
**Performance:** Full GPU acceleration available in production
**Browser Support:** Chrome 113+, Edge 113+, Firefox (experimental), Safari 16.4+

#### Troubleshooting Deployment

**Common Issues:**
1. **Build Failures**: Check Node.js version in workflow (should be 20+)
2. **Dependency Issues**: Ensure `package-lock.json` is committed
3. **Pages Not Updating**: Clear browser cache, check deployment completion
4. **404 Errors**: Verify GitHub Pages source is set to "GitHub Actions"

**Debug Steps:**
1. Check Actions tab for detailed error logs
2. Verify `dist/` directory contains built assets
3. Ensure `index.html` exists in build output
4. Confirm repository visibility settings

#### Integration with Development Workflow

**Development → Production Pipeline:**
1. Local development with `npm run dev`
2. Testing with `npm test`
3. Build verification with `npm run build`
4. Commit and push to main branch
5. Automatic deployment via GitHub Actions
6. Production testing at GitHub Pages URL

**Branch Strategy:**
- `main`: Production-ready code, auto-deploys
- Feature branches: Development work, no auto-deploy
- `gh-pages`: Generated automatically by workflow (do not edit manually)

## MANDATORY UPDATE INSTRUCTIONS

**🚨 CRITICAL: When you make ANY changes to this codebase, you MUST:**

1. **Update the "Last Updated" timestamp** at the top of this file
2. **Update Architecture Analysis** if you modify core system architecture
3. **Update Component Descriptions** if you change component responsibilities
4. **Update State Flow** if you modify global or local state management
5. **Update Integration Points** if you change how components communicate
6. **Update Type System** if you modify interfaces or add new types
7. **Update Performance Characteristics** if you change algorithms or optimization
8. **Update Error Handling** if you modify validation or error recovery
9. **Update Dependencies** if you change package.json or add new libraries
10. **Update Implementation Patterns** if you introduce new architectural patterns
11. **Update Technical Implementation Details** if you modify session handling, concurrency, tensor management, camera handling, accessibility, versioning, testing, determinism, or error reporting

### Change Documentation Template
When making changes, add a section like this:
```markdown
**Change Log Entry**:
- **Date**: [YYYY-MM-DD]
- **Type**: [Architecture/Component/State/Integration/Type/Performance/Error/Dependency/Pattern/Technical]
- **Description**: [Detailed description of what changed]
- **Files Modified**: [List of modified files]
- **Impact**: [How this affects other parts of the system]
- **Testing Required**: [What needs to be validated after this change]
- **Technical Implications**: [Any changes to session handling, concurrency, memory management, etc.]
```

## Current Implementation Status

### Fully Implemented Features
- ✅ Complete TensorFlow.js model management with weight serialization
- ✅ Multi-backend GPU acceleration with automatic performance selection
- ✅ Drag-and-drop architecture builder with full layer type support
- ✅ Multi-modal data collection (drawing canvas + camera capture)
- ✅ Complete session persistence including trained model weights
- ✅ Responsive collapsible interface with keyboard shortcuts
- ✅ Real-time prediction and layer visualization capabilities
- ✅ Comprehensive error handling and validation systems
- ✅ Performance monitoring and benchmarking tools
- ✅ Proper camera resource cleanup and media stream management

### Partially Implemented Features
- 🔄 Dropout layers (type defined, but not fully integrated in training pipeline)
- 🔄 Advanced data augmentation (basic flip/translate implemented, more could be added)
- 🔄 Web Worker training (infrastructure exists but not fully utilized)

### Missing Critical Features
- ❌ Automated testing framework and test coverage
- ❌ Session file compression and streaming for large models
- ❌ Training concurrency control and race condition prevention
- ❌ Cross-backend determinism and reproducibility guarantees
- ❌ Production error reporting and monitoring
- ❌ Automated dependency management and security updates
- ❌ Session format versioning and migration system

### Architecture Strengths
- **Modularity**: Clean separation of concerns between components and hooks
- **Extensibility**: Easy to add new layer types and UI components
- **Performance**: Intelligent backend selection and resource management
- **User Experience**: Comprehensive state persistence and intuitive interface
- **Type Safety**: Complete TypeScript coverage with proper type relationships
- **Error Resilience**: Graceful handling of various failure modes
- **Resource Management**: Proper cleanup of camera streams and GPU resources

### Critical Architecture Weaknesses
- **Testing Coverage**: No automated testing infrastructure or test coverage
- **Concurrency Control**: Lack of protection against race conditions in training
- **Session Scalability**: No compression or streaming for large session files
- **Error Monitoring**: No production error tracking or automatic reporting
- **Determinism**: No guarantees of reproducible results across backends
- **Dependency Security**: No automated vulnerability scanning or updates

### Potential Architecture Improvements
- **State Management**: Could benefit from more sophisticated state management (Redux/Zustand) for complex applications
- **Testing Infrastructure**: Implement comprehensive testing with Jest/Vitest and Cypress/Playwright
- **Session Management**: Implement compression, streaming, and versioning for session files
- **Concurrency Safety**: Add proper locks and debouncing for training operations
- **Error Reporting**: Integrate with production error monitoring services
- **Deterministic Training**: Implement seeding and epsilon tolerance for reproducible results

---

**Remember**: This document serves as the definitive architectural reference for this codebase. Maintain its accuracy and comprehensiveness to ensure effective future development and maintenance. The technical implementation details section is critical for understanding the current limitations and areas requiring improvement.