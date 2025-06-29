#!/bin/bash

# Interactive CNN Trainer Startup Script
# Simple and clean startup for the TensorFlow.js demo

echo "🚀 Interactive CNN Trainer with TensorFlow.js"
echo "=============================================="

# Check Node.js version - REQUIRED
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js 18+ REQUIRED. Current: $(node --version)"
        echo ""
        echo "   This version will NOT work due to ES module compatibility."
        echo "   Please upgrade Node.js before continuing."
        echo ""
        echo "   Quick upgrade with NVM:"
        echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "   source ~/.bashrc"
        echo "   nvm install 18"
        echo "   nvm use 18"
        echo ""
        echo "   Or download from: https://nodejs.org/"
        exit 1
    else
        echo "✅ Node.js $(node --version) detected"
    fi
else
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo ""
    echo "   Download from: https://nodejs.org/"
    echo "   Or use NVM: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

# Create environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "⚙️  Creating environment configuration..."
    cat > .env.local << EOF
# Gemini API Key - Get from https://makersuite.google.com/app/apikey
# The app works without this - AI features will be disabled
VITE_GEMINI_API_KEY=your_api_key_here
EOF
    echo "✅ Created .env.local - edit it to add your Gemini API key (optional)"
    echo "   Get your key from: https://makersuite.google.com/app/apikey"
fi

echo ""
echo "🌟 Starting development server..."
echo "   Available at: http://localhost:5173"
echo "   Features:"
echo "   ✅ Interactive CNN training with TensorFlow.js"
echo "   ✅ Real-time drawing canvas and camera capture"
echo "   ✅ GPU-accelerated computations (WebGL/WebGPU)"
echo "   ✅ Live visualizations and predictions"
if grep -q "your_api_key_here" .env.local 2>/dev/null; then
    echo "   ⚠️  AI features disabled (add API key to enable)"
else
    echo "   ✅ AI features enabled"
fi
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
