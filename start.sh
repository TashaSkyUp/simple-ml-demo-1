#!/bin/bash

# Interactive CNN Trainer Startup Script with Node.js Environment Management
# This script sets up the proper Node.js environment and starts the development server

echo "🚀 Interactive CNN Trainer with TensorFlow.js"
echo "=============================================="

# Load NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "📦 Loading Node Version Manager..."
    \. "$NVM_DIR/nvm.sh"

    # Load nvm bash_completion
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
else
    echo "❌ NVM not found. Please install Node Version Manager first."
    echo "   Run: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    exit 1
fi

# Check if we have the right Node.js version
REQUIRED_NODE_VERSION="18"
CURRENT_NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)

if [ -z "$CURRENT_NODE_VERSION" ] || [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    echo "🔧 Node.js $REQUIRED_NODE_VERSION+ required. Current: ${CURRENT_NODE_VERSION:-"not found"}"
    echo "   Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
    echo "✅ Node.js LTS installed and activated"
else
    echo "✅ Node.js version $(node --version) is compatible"
fi

# Display current environment
echo "🌐 Environment:"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo "   Working directory: $(pwd)"

# Check if node_modules exists
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

# Check if .env.local exists and create safe default if not
if [ ! -f ".env.local" ]; then
    echo "⚙️  Creating default environment configuration..."
    cat > .env.local << EOF
# Gemini API Key - Get this from https://makersuite.google.com/app/apikey
# Replace with your actual API key to enable AI features
VITE_GEMINI_API_KEY=API_KEY_NOT_CONFIGURED
GEMINI_API_KEY=API_KEY_NOT_CONFIGURED

# The app will work without the API key - AI features will be disabled
EOF
    echo "✅ Created .env.local with safe defaults"
    echo "   To enable AI features, edit .env.local and add your Gemini API key"
    echo "   Get your key from: https://makersuite.google.com/app/apikey"
else
    echo "✅ Environment file found"
fi

# Check for any diagnostics/errors
echo "🔍 Checking project health..."
if npm run build --dry-run >/dev/null 2>&1; then
    echo "✅ Project configuration looks good"
else
    echo "⚠️  There might be some configuration issues, but attempting to start anyway..."
fi

# Check system requirements for WebGPU
echo "🔍 Checking WebGPU system requirements..."

# Check GPU info
if command -v lspci >/dev/null 2>&1; then
    GPU_INFO=$(lspci | grep -i vga | head -1)
    echo "   GPU: ${GPU_INFO:-"Not detected"}"
else
    echo "   GPU: Cannot detect (lspci not available)"
fi

# Check graphics drivers
if command -v glxinfo >/dev/null 2>&1; then
    GL_RENDERER=$(glxinfo | grep "OpenGL renderer" | cut -d: -f2 | xargs)
    GL_VERSION=$(glxinfo | grep "OpenGL version" | cut -d: -f2 | xargs)
    echo "   OpenGL Renderer: ${GL_RENDERER:-"Not detected"}"
    echo "   OpenGL Version: ${GL_VERSION:-"Not detected"}"
else
    echo "   ⚠️  glxinfo not available (install mesa-utils for GPU diagnostics)"
fi

# Check Vulkan support
if command -v vulkaninfo >/dev/null 2>&1; then
    if vulkaninfo --summary >/dev/null 2>&1; then
        echo "   ✅ Vulkan support detected"
    else
        echo "   ❌ Vulkan not working properly"
    fi
else
    echo "   ⚠️  vulkaninfo not available (install vulkan-tools for Vulkan diagnostics)"
fi

# Start the development server in the background
echo ""
echo "🌟 Starting development server..."
echo "   The app will be available at: http://localhost:5173"
echo "   WebGPU diagnostic tool: http://localhost:5173/webgpu-test.html"
echo "   "
echo "   Features available:"
echo "   ✅ Interactive drawing canvas"
echo "   ✅ Real-time CNN training with TensorFlow.js"
echo "   ✅ Live predictions and visualizations"
echo "   ✅ Customizable network architecture"
echo "   ✅ Training data management"
echo "   ✅ Session save/load functionality"
if grep -q "API_KEY_NOT_CONFIGURED" .env.local 2>/dev/null; then
    echo "   ⚠️  AI image generation (disabled - add API key to enable)"
else
    echo "   ✅ AI image generation with Gemini"
fi
echo "   🌟 WebGPU acceleration (enabled via browser flags)"
echo "   "

# Start dev server in background
npm run dev &
DEV_SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Determine WebGPU flags based on detected GPU
WEBGPU_FLAGS="--enable-unsafe-webgpu"

# Add Vulkan support if available
if command -v vulkaninfo >/dev/null 2>&1 && vulkaninfo --summary >/dev/null 2>&1; then
    WEBGPU_FLAGS="$WEBGPU_FLAGS --enable-features=Vulkan"
    echo "🔥 Vulkan support detected - using enhanced WebGPU flags"
else
    echo "⚠️  Vulkan not available - using basic WebGPU flags"
fi

# Add additional stability flags for Linux
WEBGPU_FLAGS="$WEBGPU_FLAGS --disable-features=VizDisplayCompositor --use-gl=desktop"

# Launch browser with WebGPU diagnostic tool first
if command -v brave-browser >/dev/null 2>&1; then
    echo "🌟 Launching Brave Browser with WebGPU diagnostic tool..."
    echo "   Flags: $WEBGPU_FLAGS"
    echo "   "
    brave-browser $WEBGPU_FLAGS http://localhost:5173/webgpu-test.html >/dev/null 2>&1 &
    BROWSER_PID=$!

    # Also open performance diagnostic in a new tab after 2 seconds
    sleep 2
    brave-browser $WEBGPU_FLAGS http://localhost:5173/webgpu-perf-debug.html >/dev/null 2>&1 &

    echo "✅ Brave Browser launched with WebGPU support"
    echo "   🔍 WebGPU diagnostic tool opened - test your GPU capabilities"
    echo "   ⚡ Performance diagnostic tool also opened"
    echo "   📱 Main app available at: http://localhost:5173"
elif command -v google-chrome >/dev/null 2>&1; then
    echo "🌟 Launching Chrome with WebGPU diagnostic tool..."
    echo "   Flags: $WEBGPU_FLAGS"
    echo "   "
    google-chrome $WEBGPU_FLAGS http://localhost:5173/webgpu-test.html >/dev/null 2>&1 &
    BROWSER_PID=$!

    # Also open performance diagnostic in a new tab after 2 seconds
    sleep 2
    google-chrome $WEBGPU_FLAGS http://localhost:5173/webgpu-perf-debug.html >/dev/null 2>&1 &

    echo "✅ Chrome launched with WebGPU support"
    echo "   🔍 WebGPU diagnostic tool opened - test your GPU capabilities"
    echo "   ⚡ Performance diagnostic tool also opened"
    echo "   📱 Main app available at: http://localhost:5173"
else
    echo "⚠️  Brave or Chrome not found. Please manually open:"
    echo "   http://localhost:5173/webgpu-test.html (diagnostic tool)"
    echo "   http://localhost:5173/webgpu-perf-debug.html (performance diagnostic)"
    echo "   http://localhost:5173 (main app)"
    echo "   "
    echo "   For WebGPU support, launch your browser with:"
    echo "   brave-browser $WEBGPU_FLAGS"
    echo "   "
fi

echo ""
echo "🎯 WebGPU Setup Complete!"
echo "   "
echo "   🔍 FIRST: Test WebGPU compatibility with the diagnostic tool"
echo "   ⚡ THEN: Run performance analysis to understand WebGPU vs WebGL speeds"
echo "   📊 Check all tests pass before using the main app"
echo "   🐛 If WebGPU is slower than expected, use the performance diagnostic"
echo "   🔄 Try different browser flags if needed"
echo "   "
echo "   💡 GTX 980 Ti specific notes:"
echo "   - Your GPU supports WebGPU but may perform better with WebGL for small operations"
echo "   - WebGPU overhead can make it slower than WebGL for simple CNN models"
echo "   - Larger models or batch sizes may show WebGPU advantages"
echo "   - Performance diagnostic will help identify the optimal backend"
echo "   "
echo "   🔗 Tools opened:"
echo "   - Basic WebGPU compatibility test"
echo "   - Advanced performance diagnostic"
echo "   - Visit brave://gpu/ to check WebGPU status</parameter>
</invoke>
echo ""
echo "   Press Ctrl+C to stop the development server"
echo ""

# Wait for the dev server and clean up on exit
trap "echo 'Stopping development server...'; kill $DEV_SERVER_PID 2>/dev/null; exit 0" INT TERM

# Wait for dev server to finish
wait $DEV_SERVER_PID
