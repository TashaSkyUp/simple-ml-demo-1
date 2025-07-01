# Setup Guide - Interactive CNN Trainer

This guide provides setup instructions for the Interactive CNN Trainer application with its modern Node.js v22 environment.

## 🚀 Quick Setup (Recommended)

### Option 1: Automated Setup Script
The simplest way to get started with Node.js 18+ (v22.17.0 currently installed):

```bash
./start.sh
```

This script will:
- ✅ Check your Node.js version (requires 18+)
- ✅ Install all dependencies automatically
- ✅ Set up environment variables
- ✅ Start the Vite development server
- ✅ Display the app URL (typically `http://localhost:5173` or `http://localhost:5174`)

**Current Status**: ✅ Fully working with Node.js v22.17.0

### Option 2: Manual Setup
For complete control or troubleshooting:

1. **Verify Node.js version** (18+ required, v22.17.0 recommended):
   ```bash
   node --version  # Should show v18.0.0 or higher
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional for AI features):
   ```bash
   cp .env.local.template .env.local
   # Edit .env.local with your Gemini API key if desired
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**: Visit the URL shown in terminal (usually `http://localhost:5173`)

## 🔑 Environment Setup

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env.local` file:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
GEMINI_API_KEY=your_actual_api_key_here
```

**Note**: The app works without the API key, but AI features will be disabled.

### Environment Variables

The application supports both formats:
- `VITE_GEMINI_API_KEY` - Vite convention (recommended)
- `GEMINI_API_KEY` - Alternative format

## 🔧 System Requirements

### Current Environment (Verified Working)
- **Node.js**: v22.17.0 (currently installed and working)
- **npm**: v10.9.2+ (included with Node.js 22)
- **Browser**: Chrome 113+ (WebGPU), Firefox 110+, Safari 16.4+, Edge 113+
- **GPU**: WebGL 2.0 and/or WebGPU support for acceleration

### Minimum Requirements
- **Node.js**: 18.0.0+ (required for Vite and modern JavaScript features)
- **Browser**: Modern browser with WebGL 2.0 support
- **RAM**: 4GB+ for comfortable training
- **Internet**: For initial dependency download only

### Recommended for Best Performance
- **Node.js**: v22.17.0 (current LTS, fully tested)
- **Browser**: Chrome 113+ or Edge 113+ (best WebGPU support)
- **GPU**: Dedicated graphics card (NVIDIA RTX/GTX, AMD RDNA, Intel Arc)
- **RAM**: 8GB+ for complex models and visualizations

## 📁 Project Structure After Setup

```
simple-ml-demo-1/
├── 📁 components/           # React components
├── 📁 hooks/               # Custom React hooks  
├── 📁 utils/               # Utility functions
├── 📁 tests/               # Test files and suites
│   ├── 📁 unit/            # Unit tests
│   ├── 📁 integration/     # Integration tests
│   ├── 📁 e2e/            # End-to-end tests
│   ├── 📄 README.md       # Testing documentation
│   └── 📄 run-tests.js    # Test runner script
├── 📁 docs/               # Documentation
├── 📁 node_modules/        # Dependencies (after npm install)
├── 📄 .env.local           # Environment variables (you create this)
├── 📄 .env.local.template  # Environment template
├── 📄 env.js              # Generated environment file (simple mode)
├── 📄 index.html          # Main HTML template
├── 📄 index.css           # Global styles
├── 📄 package.json        # Dependencies and scripts
├── 📄 README.md           # Comprehensive documentation
├── 📄 SETUP.md            # This setup guide
├── 📄 start.sh            # Main startup script
└── 📄 vite.config.ts      # Vite configuration
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Node.js Version Problems
**Error**: `SyntaxError: Unexpected reserved word` or `ERR_REQUIRE_ESM`
**Solution**: 
- Check version: `node --version` (must be 18.0.0+)
- Current working version: v22.17.0
- Upgrade if needed: Visit [nodejs.org](https://nodejs.org/) or use nvm

#### 2. Dependencies Won't Install
**Error**: `npm install` fails or shows conflicts
**Solutions**:
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Ensure Node.js version is 18+
- Check internet connection for package downloads

#### 3. Port Already in Use
**Error**: `EADDRINUSE: address already in use :::5173`
**Solutions**:
- ✅ Vite automatically finds available ports (5173, 5174, etc.)
- Manual port: `npm run dev -- --port 3000`
- Kill process: `lsof -ti:5173 | xargs kill` (macOS/Linux)

#### 4. GPU Acceleration Issues
**Error**: Poor performance or WebGL/WebGPU errors
**Solutions**:
- Update graphics drivers
- Check browser GPU support: visit `chrome://gpu/`
- Enable hardware acceleration in browser settings
- Try different browser (Chrome 113+ recommended for WebGPU)

#### 5. Build or Runtime Errors
**Error**: TypeScript compilation errors or runtime failures
**Solutions**:
- Ensure all dependencies installed: `npm install`
- Clear build cache: `rm -rf dist .vite`
- Check browser console for detailed error messages
- Verify browser supports modern JavaScript features

### Getting Help

If problems persist:
1. Check browser console for error messages
2. Verify file permissions on scripts: `chmod +x *.sh`
3. Ensure internet connection for CDN resources
4. Try incognito/private browsing mode
5. Check system requirements are met

## 🎯 Next Steps

After successful setup:

1. **Explore the Interface**: 
   - Use collapsible sections for optimal workflow
   - Try keyboard shortcuts (Ctrl+1-5 for quick navigation)
   - Check GPU Performance section for acceleration status

2. **Create Training Data**: 
   - Draw samples on the canvas with different classes
   - Use data augmentation options for better training
   - Collect 10+ samples per class for good results

3. **Design Your Network**: 
   - Use drag-and-drop layer reordering
   - Experiment with different architectures
   - Try the reshape layer for custom tensor transformations

4. **Train Your Model**: 
   - Watch real-time GPU/CPU performance metrics
   - Monitor training progress and loss curves
   - Use session save/load to preserve your work

5. **Advanced Features**:
   - Test WebGPU vs WebGL performance
   - Explore live layer visualizations
   - Save complete sessions with trained weights

## 🧪 Testing

### Running Tests
After setup is complete, you can run the test suite to verify everything is working correctly:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Get integration test instructions
npm run test:integration
```

### Test Types Available

1. **Unit Tests** (`tests/unit/`):
   - Session management functionality
   - Utility function validation
   - Data processing pipelines

2. **Integration Tests** (`tests/integration/`):
   - localStorage quota handling
   - Web Worker communication
   - TensorFlow.js backend integration
   - Component interaction testing

3. **End-to-End Tests** (`tests/e2e/`):
   - Complete user workflows
   - Cross-browser compatibility
   - Performance benchmarking

### Running Integration Tests
Integration tests run in the browser:

1. Start the development server: `npm run dev`
2. Open: `http://localhost:5173/tests/integration/fixes-test.html`
3. Click "Run Tests" to execute all browser-based tests
4. Check browser console for detailed results

### Test Documentation
For detailed testing information, see:
- `tests/README.md` - Comprehensive testing guide
- `TESTING_GUIDE.md` - Manual testing procedures
- Individual test files for specific functionality

## 📚 Additional Resources

- **TensorFlow.js Documentation**: https://www.tensorflow.org/js
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com

## 📚 Additional Documentation

### Available Guides
- **SESSION_MANAGEMENT.md**: Complete guide to saving/loading training sessions
- **GPU_ACCELERATION_GUIDE.md**: WebGPU and WebGL optimization
- **INTERFACE_GUIDE.md**: Collapsible sections and responsive design
- **USAGE_GUIDE.md**: Advanced features and best practices
- **EXAMPLES.md**: Architecture examples and common patterns
- **tests/README.md**: Complete testing documentation and guidelines
- **TESTING_GUIDE.md**: Manual testing procedures and validation

### 🤝 Support

This is a fully functional educational application. For issues:
- Check the troubleshooting section above
- Review browser console for detailed error messages
- Ensure Node.js 18+ is installed
- Verify browser supports WebGL 2.0 or WebGPU
- Check the comprehensive documentation in the `docs/` folder

### 🚀 Current Status
- ✅ **Fully Operational**: All features working with Node.js v22.17.0
- ✅ **GPU Accelerated**: WebGPU and WebGL support verified
- ✅ **Production Ready**: Stable and optimized for learning
- ✅ **Well Documented**: Complete implementation guides available

Happy learning with CNNs! 🧠✨