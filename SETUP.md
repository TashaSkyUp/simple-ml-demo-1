# Setup Guide - Interactive CNN Trainer

This guide provides multiple options for setting up and running the Interactive CNN Trainer application, depending on your system configuration and Node.js version.

## 🚀 Quick Setup Options

### Option 1: Modern Node.js (18+) - Recommended
If you have Node.js 18 or higher, use the full development setup:

```bash
./start.sh
```

This script will:
- Check your Node.js version
- Install all dependencies
- Set up environment variables
- Start the Vite development server
- Open the app at `http://localhost:5173`

### Option 2: Older Node.js or Python Fallback
If you have Node.js 12-17 or prefer a simpler setup:

```bash
./start-simple.sh
```

This script will:
- Use Python's built-in HTTP server
- Create a standalone HTML version
- Process environment variables
- Open the app at `http://localhost:8080/index-standalone.html`

### Option 3: Manual Setup
For complete control or troubleshooting:

1. **Install dependencies** (Node.js 18+ required):
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.local.template .env.local
   # Edit .env.local with your Gemini API key
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

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

### Minimum Requirements
- **Browser**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **WebGL**: 2.0 support required
- **Internet**: For CDN resources (React, TensorFlow.js, Tailwind)

### Recommended Requirements
- **Node.js**: 18+ for full development features
- **RAM**: 4GB+ for comfortable training
- **GPU**: Dedicated graphics card for better performance

### Alternative Requirements (Simple Mode)
- **Python**: 2.7+ or 3.x for HTTP server
- **Browser**: Same as above
- **Node.js**: Not required for simple mode

## 📁 Project Structure After Setup

```
simple-ml-demo-1/
├── 📁 components/           # React components
├── 📁 hooks/               # Custom React hooks  
├── 📁 utils/               # Utility functions
├── 📁 node_modules/        # Dependencies (after npm install)
├── 📄 .env.local           # Environment variables (you create this)
├── 📄 .env.local.template  # Environment template
├── 📄 env.js              # Generated environment file (simple mode)
├── 📄 index-standalone.html # Standalone version (simple mode)
├── 📄 index.html          # Main HTML template
├── 📄 index.css           # Global styles
├── 📄 package.json        # Dependencies and scripts
├── 📄 README.md           # Comprehensive documentation
├── 📄 SETUP.md            # This setup guide
├── 📄 start.sh            # Main startup script
├── 📄 start-simple.sh     # Simple startup script
└── 📄 vite.config.ts      # Vite configuration
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Node.js Version Problems
**Error**: `SyntaxError: Unexpected reserved word`
**Solution**: Use `./start-simple.sh` or upgrade to Node.js 18+

#### 2. Dependencies Won't Install
**Error**: `npm install` fails
**Solutions**:
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Use `./start-simple.sh` as alternative

#### 3. Port Already in Use
**Error**: `EADDRINUSE: address already in use`
**Solutions**:
- The scripts automatically find available ports
- Manually specify port: `npm run dev -- --port 3000`
- Kill existing processes: `lsof -ti:5173 | xargs kill`

#### 4. WebGL Not Supported
**Error**: TensorFlow.js WebGL errors
**Solutions**:
- Update your browser
- Enable hardware acceleration
- Try a different browser
- Check `chrome://gpu` for WebGL status

#### 5. API Key Issues
**Error**: Gemini API failures
**Solutions**:
- Verify API key is correct
- Check `.env.local` file exists and has correct format
- Ensure API key has proper permissions
- App works without API key (some features disabled)

### Getting Help

If problems persist:
1. Check browser console for error messages
2. Verify file permissions on scripts: `chmod +x *.sh`
3. Ensure internet connection for CDN resources
4. Try incognito/private browsing mode
5. Check system requirements are met

## 🎯 Next Steps

After successful setup:

1. **Learn the Interface**: Explore the drawing canvas, architecture builder, and training controls
2. **Create Training Data**: Draw samples and label them with different classes
3. **Design Your Network**: Configure CNN layers and parameters
4. **Train Your Model**: Start training and watch the visualizations
5. **Experiment**: Try different architectures and hyperparameters

## 📚 Additional Resources

- **TensorFlow.js Documentation**: https://www.tensorflow.org/js
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com

## 🤝 Support

This is an educational demo application. For issues:
- Check the troubleshooting section above
- Review browser console for error messages
- Ensure all requirements are met
- Try the alternative setup methods

Happy learning with CNNs! 🧠✨