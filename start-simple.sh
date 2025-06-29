#!/bin/bash

# Simple HTTP Server for Interactive CNN Trainer
# This script provides an alternative for older Node.js versions

echo "🚀 Interactive CNN Trainer - Simple Server Mode"
echo "==============================================="

# Check if Python is available for HTTP server
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python is not available for HTTP server"
    echo "   Please install Python or upgrade Node.js to 18+"
    exit 1
fi

# Check if .env.local exists and create safe default if not
if [ ! -f ".env.local" ]; then
    echo "⚠️  Environment file not found!"
    echo "   Creating safe .env.local with placeholder values..."
    cat > .env.local << EOF
# Gemini API Key - Get this from https://makersuite.google.com/app/apikey
VITE_GEMINI_API_KEY=API_KEY_NOT_CONFIGURED
GEMINI_API_KEY=API_KEY_NOT_CONFIGURED
EOF
    echo "   ✅ Created .env.local with safe defaults"
    echo "   "
    echo "   To enable AI features, edit .env.local and replace API_KEY_NOT_CONFIGURED"
    echo "   with your actual API key from: https://makersuite.google.com/app/apikey"
    echo "   "
fi

# Remove any existing problematic files
echo "🧹 Cleaning up potentially conflicting files..."
if [ -f "index.tsx" ]; then
    mv index.tsx index.tsx.backup
fi
if [ -f "App.tsx" ]; then
    mv App.tsx App.tsx.backup
fi

# Create a simple index.html that works without Vite
echo "📝 Creating standalone HTML file..."
cat > index-standalone.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive CNN with TensorFlow.js</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@^19.1.0",
        "react-dom/": "https://esm.sh/react-dom@^19.1.0/",
        "react/": "https://esm.sh/react@^19.1.0/",
        "@tensorflow/tfjs": "https://esm.sh/@tensorflow/tfjs@^4.22.0",
        "@google/genai": "https://esm.sh/@google/genai@^1.6.0"
      }
    }
    </script>
    <style>
      /* Custom scrollbar for better aesthetics */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #1f2937;
      }
      ::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }
      body {
        overscroll-behavior-y: contain;
      }
      .loading-spinner {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div id="root">
        <div class="bg-gray-900 text-white min-h-screen font-sans">
            <header class="bg-gray-800 shadow-md p-4 sticky top-0 z-50">
                <h1 class="text-3xl font-bold text-center text-cyan-400">Interactive CNN with TensorFlow.js</h1>
            </header>
            <main class="p-2 md:p-8">
                <div class="max-w-7xl mx-auto">
                    <div class="text-center p-8">
                        <div class="loading-spinner inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mb-4"></div>
                        <p class="text-xl text-gray-300">Loading Interactive CNN Trainer...</p>
                        <p class="text-sm text-gray-500 mt-2">Initializing TensorFlow.js and React components</p>
                    </div>

                    <!-- Fallback content if modules fail to load -->
                    <div id="fallback-content" style="display: none;" class="text-center p-8">
                        <h2 class="text-2xl font-bold text-red-400 mb-4">⚠️ Module Loading Failed</h2>
                        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto text-left">
                            <h3 class="text-lg font-semibold mb-3 text-cyan-400">Possible Solutions:</h3>
                            <ul class="list-disc list-inside space-y-2 text-gray-300">
                                <li>Use a modern browser (Chrome 80+, Firefox 72+, Safari 13.1+)</li>
                                <li>Check your internet connection for CDN access</li>
                                <li>Try using the Vite development server with Node.js 18+</li>
                                <li>Enable JavaScript if it's disabled</li>
                            </ul>
                            <div class="mt-4 p-3 bg-gray-700 rounded">
                                <p class="text-sm text-cyan-400">For development with modern tooling:</p>
                                <code class="text-xs text-gray-300">npm install && npm run dev</code>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script type="module">
        try {
            // Set up environment variables from .env.local if available
            window.process = window.process || {};
            window.process.env = window.process.env || {};

            // Try to load environment variables (this would need server-side processing in production)
            const envScript = document.createElement('script');
            envScript.src = './env.js';
            envScript.onerror = () => {
                console.warn('Environment file not loaded - some features may not work');
            };
            document.head.appendChild(envScript);

            // Import and initialize the app
            import('./index.tsx');
        } catch (error) {
            console.error('Failed to load application:', error);
            document.getElementById('fallback-content').style.display = 'block';
            document.querySelector('.loading-spinner').style.display = 'none';
        }
    </script>
</body>
</html>
EOF

# Create environment JavaScript file from .env.local
echo "🔧 Processing environment variables..."
echo "window.process = window.process || {};" > env.js
echo "window.process.env = window.process.env || {};" >> env.js

if [ -f ".env.local" ]; then
    # Parse .env.local and convert to JavaScript
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ ! "$key" =~ ^[[:space:]]*# ]] && [[ -n "$key" ]]; then
            # Remove any quotes from value and handle empty values
            value=$(echo "$value" | sed 's/^"//;s/"$//')
            if [[ -z "$value" ]]; then
                value="API_KEY_NOT_CONFIGURED"
            fi
            echo "window.process.env['$key'] = '$value';" >> env.js
        fi
    done < .env.local
else
    echo "// Safe fallback environment" >> env.js
    echo "window.process.env['VITE_GEMINI_API_KEY'] = 'API_KEY_NOT_CONFIGURED';" >> env.js
    echo "window.process.env['GEMINI_API_KEY'] = 'API_KEY_NOT_CONFIGURED';" >> env.js
    echo "window.process.env['API_KEY'] = 'API_KEY_NOT_CONFIGURED';" >> env.js
fi

# Find available port
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo "✅ Setup complete!"
echo "🌐 Starting simple HTTP server on port $PORT..."
echo "   Open your browser and navigate to:"
echo "   "
echo "   http://localhost:$PORT/index-standalone.html"
echo "   "
echo "   Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
if [[ "$PYTHON_CMD" == "python3" ]]; then
    $PYTHON_CMD -m http.server $PORT
else
    # Python 2 syntax
    $PYTHON_CMD -m SimpleHTTPServer $PORT
fi
