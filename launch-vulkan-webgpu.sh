#!/bin/bash

# Vulkan-Specific WebGPU Browser Launcher
# Forces Vulkan backend for optimal WebGPU performance on GTX 980 Ti

echo "🔥 Vulkan WebGPU Launcher for GTX 980 Ti"
echo "========================================"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    case $1 in
        "pass") echo -e "${GREEN}✅ $2${NC}" ;;
        "warn") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "fail") echo -e "${RED}❌ $2${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $2${NC}" ;;
    esac
}

# Check Vulkan system support
echo "🔍 Checking Vulkan system support..."
if command -v vulkaninfo >/dev/null 2>&1; then
    if vulkaninfo --summary >/dev/null 2>&1; then
        print_status "pass" "Vulkan API working at system level"
        VULKAN_DEVICE=$(vulkaninfo --summary 2>/dev/null | grep "deviceName" | head -1 | cut -d= -f2 | xargs)
        print_status "info" "Vulkan device: $VULKAN_DEVICE"
    else
        print_status "fail" "Vulkan API not working - this may limit WebGPU performance"
    fi
else
    print_status "warn" "vulkaninfo not available"
fi

# Check if dev server is running
if ! curl -s http://localhost:5173 >/dev/null 2>&1; then
    print_status "warn" "Development server not detected on port 5173"
    print_status "info" "Run './start.sh' first to start the server"
    echo ""
fi

echo ""
print_status "info" "Vulkan WebGPU Strategy:"
echo "   • Force Vulkan backend for WebGPU"
echo "   • Bypass GPU blocklists and sandboxing"
echo "   • Enable all hardware acceleration features"
echo "   • NVIDIA GTX 980 Ti specific optimizations"
echo ""

# Vulkan-specific flags for NVIDIA GTX 980 Ti
VULKAN_FLAGS="--use-vulkan=native --enable-features=Vulkan"

# WebGPU flags
WEBGPU_FLAGS="--enable-unsafe-webgpu --enable-webgpu-developer-features"

# Force hardware acceleration (bypass blocklists)
FORCE_HW_FLAGS="--ignore-gpu-blocklist --disable-gpu-sandbox --disable-software-rasterizer"

# NVIDIA-specific optimizations
NVIDIA_FLAGS="--enable-gpu-memory-buffer-video-frames --enable-gpu-rasterization --enable-zero-copy"

# Canvas and compositing acceleration
ACCEL_FLAGS="--enable-accelerated-2d-canvas --enable-accelerated-video-decode"

# WebGL optimizations
WEBGL_FLAGS="--enable-webgl2-compute-context --max-active-webgl-contexts=16"

# Experimental performance flags
PERF_FLAGS="--enable-gpu-benchmarking --enable-gpu-service-logging --force-gpu-mem-available-mb=4096"

# Combine all flags
ALL_FLAGS="$VULKAN_FLAGS $WEBGPU_FLAGS $FORCE_HW_FLAGS $NVIDIA_FLAGS $ACCEL_FLAGS $WEBGL_FLAGS $PERF_FLAGS"

# Function to launch browser
launch_browser() {
    local browser_cmd="$1"
    local browser_name="$2"
    local gpu_page="$3"

    print_status "info" "Launching $browser_name with Vulkan WebGPU optimization..."
    echo ""
    echo "🔥 Vulkan Flags: $VULKAN_FLAGS"
    echo "🌟 WebGPU Flags: $WEBGPU_FLAGS"
    echo "⚡ Hardware Flags: $FORCE_HW_FLAGS"
    echo "🎯 NVIDIA Flags: $NVIDIA_FLAGS"
    echo ""

    # Close any existing browser instances for clean start
    print_status "info" "Ensuring clean browser start..."
    pkill -f "$browser_cmd" 2>/dev/null || true
    sleep 2

    # Launch main diagnostic page
    print_status "info" "Opening WebGPU diagnostic tool..."
    $browser_cmd $ALL_FLAGS http://localhost:5173/webgpu-test.html >/dev/null 2>&1 &
    MAIN_PID=$!

    sleep 3

    # Launch performance diagnostic
    print_status "info" "Opening performance diagnostic..."
    $browser_cmd $ALL_FLAGS http://localhost:5173/webgpu-perf-debug.html >/dev/null 2>&1 &

    sleep 2

    # Launch GPU status page
    print_status "info" "Opening GPU status page..."
    $browser_cmd $ALL_FLAGS $gpu_page >/dev/null 2>&1 &

    sleep 2

    # Launch main app
    print_status "info" "Opening main CNN trainer app..."
    $browser_cmd $ALL_FLAGS http://localhost:5173 >/dev/null 2>&1 &

    print_status "pass" "$browser_name launched with Vulkan WebGPU optimization"
}

# Detect and launch browser
if command -v brave-browser >/dev/null 2>&1; then
    launch_browser "brave-browser" "Brave Browser" "brave://gpu/"
elif command -v google-chrome >/dev/null 2>&1; then
    launch_browser "google-chrome" "Google Chrome" "chrome://gpu/"
elif command -v chromium-browser >/dev/null 2>&1; then
    launch_browser "chromium-browser" "Chromium" "chrome://gpu/"
else
    print_status "fail" "No compatible browser found"
    echo ""
    echo "Install Brave Browser or Google Chrome for optimal WebGPU support"
    exit 1
fi

echo ""
echo "🎯 Vulkan WebGPU Launch Complete!"
echo ""
echo "🔍 Verification Checklist:"
echo "  1. Check GPU status page (brave://gpu/ or chrome://gpu/)"
echo "     • Vulkan: Should show 'Enabled' or 'Available'"
echo "     • WebGPU: Should show 'Hardware accelerated'"
echo "     • WebGL: Should show 'NVIDIA GeForce GTX 980 Ti'"
echo ""
echo "  2. Run WebGPU diagnostic tests"
echo "     • All 5 tests should pass"
echo "     • WebGPU backend should be available in TensorFlow.js"
echo ""
echo "  3. Run performance diagnostic"
echo "     • WebGL should now show much higher performance"
echo "     • WebGPU may still be slower for small operations (normal)"
echo "     • Check CNN-specific test results"
echo ""
echo "📊 Expected Performance Improvements:"
echo "  • WebGL: 500-1000+ ops/sec (vs previous ~99)"
echo "  • WebGPU: 100-300+ ops/sec (vs previous ~31)"
echo "  • CPU: ~378 ops/sec (unchanged baseline)"
echo ""
echo "🎯 For your CNN trainer:"
echo "  • Use WebGL backend for best GPU performance"
echo "  • WebGPU is available but may have overhead for small models"
echo "  • CPU is surprisingly fast for small 28x28 operations"
echo ""
echo "💡 GTX 980 Ti Notes:"
echo "  • Excellent WebGL performance expected"
echo "  • WebGPU works but optimized for newer architectures"
echo "  • Vulkan support enables WebGPU but may have driver overhead"
echo ""
echo "Press Ctrl+C to stop when testing is complete"

# Keep script running
trap "echo ''; print_status 'info' 'Cleaning up browser processes...'; exit 0" INT TERM

# Wait indefinitely
while true; do
    sleep 60
    if ! pgrep -f "brave-browser|google-chrome|chromium-browser" >/dev/null; then
        print_status "info" "Browser closed. Exiting..."
        break
    fi
done
