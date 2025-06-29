#!/bin/bash

# Enhanced WebGPU Browser Launcher with Hardware Acceleration Fixes
# This script launches browsers with specific flags to enable proper GPU acceleration

echo "🔧 WebGPU Hardware Acceleration Fixer"
echo "====================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    case $1 in
        "pass") echo -e "${GREEN}✅ $2${NC}" ;;
        "warn") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "fail") echo -e "${RED}❌ $2${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $2${NC}" ;;
    esac
}

# Check if dev server is running
if ! curl -s http://localhost:5173 >/dev/null 2>&1; then
    print_status "warn" "Development server not detected on port 5173"
    print_status "info" "Make sure to run './start.sh' first to start the server"
    echo ""
fi

# Detect GPU vendor for optimized flags
GPU_VENDOR="unknown"
if command -v lspci >/dev/null 2>&1; then
    GPU_INFO=$(lspci | grep -i vga | head -1)
    if echo "$GPU_INFO" | grep -i nvidia >/dev/null; then
        GPU_VENDOR="nvidia"
        print_status "pass" "NVIDIA GPU detected: Using NVIDIA-optimized flags"
    elif echo "$GPU_INFO" | grep -i amd >/dev/null; then
        GPU_VENDOR="amd"
        print_status "pass" "AMD GPU detected: Using AMD-optimized flags"
    elif echo "$GPU_INFO" | grep -i intel >/dev/null; then
        GPU_VENDOR="intel"
        print_status "pass" "Intel GPU detected: Using Intel-optimized flags"
    fi
fi

# Base WebGPU flags
BASE_FLAGS="--enable-unsafe-webgpu --enable-webgpu-developer-features"

# Hardware acceleration flags
ACCEL_FLAGS="--enable-accelerated-2d-canvas --enable-gpu-rasterization --enable-zero-copy"

# Force hardware acceleration (critical for fixing WebKit WebGL issue)
FORCE_HW_FLAGS="--ignore-gpu-blocklist --disable-gpu-sandbox --enable-gpu-benchmarking"

# GPU vendor specific optimizations
case $GPU_VENDOR in
    "nvidia")
        VENDOR_FLAGS="--enable-features=Vulkan --use-vulkan=native --enable-gpu-memory-buffer-video-frames"
        ;;
    "amd")
        VENDOR_FLAGS="--enable-features=Vulkan --use-vulkan=native --enable-oop-rasterization"
        ;;
    "intel")
        VENDOR_FLAGS="--enable-features=Vulkan --use-angle=vulkan"
        ;;
    *)
        VENDOR_FLAGS="--enable-features=Vulkan"
        print_status "warn" "Unknown GPU vendor - using generic flags"
        ;;
esac

# Debugging and performance flags
DEBUG_FLAGS="--enable-logging=stderr --log-level=0 --enable-gpu-service-logging"

# Combine all flags
ALL_FLAGS="$BASE_FLAGS $ACCEL_FLAGS $FORCE_HW_FLAGS $VENDOR_FLAGS"

echo ""
print_status "info" "Hardware Acceleration Fix Strategy:"
echo "   1. Force GPU hardware acceleration"
echo "   2. Bypass GPU blocklists that might disable your GTX 980 Ti"
echo "   3. Enable Vulkan backend for WebGPU"
echo "   4. Force 2D canvas acceleration"
echo "   5. Enable GPU rasterization"
echo ""

# Function to launch browser and verify GPU status
launch_browser() {
    local browser_cmd="$1"
    local browser_name="$2"

    print_status "info" "Launching $browser_name with hardware acceleration flags..."
    echo "   Flags: $ALL_FLAGS"
    echo ""

    # Launch browser with all flags
    $browser_cmd $ALL_FLAGS http://localhost:5173/webgpu-test.html >/dev/null 2>&1 &
    BROWSER_PID=$!

    # Wait and launch additional diagnostic tools
    sleep 3
    $browser_cmd $ALL_FLAGS http://localhost:5173/webgpu-perf-debug.html >/dev/null 2>&1 &

    # Launch GPU status page
    sleep 2
    if [[ "$browser_name" == "Brave" ]]; then
        $browser_cmd $ALL_FLAGS brave://gpu/ >/dev/null 2>&1 &
    else
        $browser_cmd $ALL_FLAGS chrome://gpu/ >/dev/null 2>&1 &
    fi

    print_status "pass" "$browser_name launched with hardware acceleration fixes"
    echo ""
    print_status "info" "Verification steps:"
    echo "   1. Check brave://gpu/ (or chrome://gpu/) - look for 'Hardware accelerated'"
    echo "   2. WebGL should show 'NVIDIA GeForce GTX 980 Ti' (not 'WebKit WebGL')"
    echo "   3. WebGPU status should show 'Available' and 'Hardware accelerated'"
    echo "   4. Run the performance diagnostic again"
    echo ""
}

# Launch appropriate browser
if command -v brave-browser >/dev/null 2>&1; then
    launch_browser "brave-browser" "Brave"
elif command -v google-chrome >/dev/null 2>&1; then
    launch_browser "google-chrome" "Chrome"
elif command -v chromium-browser >/dev/null 2>&1; then
    launch_browser "chromium-browser" "Chromium"
else
    print_status "fail" "No compatible browser found"
    echo ""
    echo "Please install one of the following browsers:"
    echo "  • Brave Browser"
    echo "  • Google Chrome"
    echo "  • Chromium"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "🎯 Hardware Acceleration Fix Applied!"
echo ""
echo "Expected improvements after fix:"
echo "  • WebGL should now show: 'NVIDIA GeForce GTX 980 Ti'"
echo "  • WebGL performance should increase dramatically"
echo "  • WebGPU should perform better (though may still be slower for small ops)"
echo "  • Overall GPU acceleration should be working properly"
echo ""
echo "If WebGL still shows 'WebKit WebGL':"
echo "  1. Close ALL browser instances completely"
echo "  2. Run this script again"
echo "  3. Check brave://settings/ → 'Use hardware acceleration when available'"
echo "  4. Your GPU drivers may need updating"
echo ""
echo "🔗 Diagnostic URLs opened:"
echo "  • WebGPU compatibility test"
echo "  • Performance diagnostic tool"
echo "  • GPU status page (brave://gpu/ or chrome://gpu/)"
echo ""
echo "Press Ctrl+C to stop when done testing"

# Keep script running to maintain browser processes
trap "echo 'Stopping browser processes...'; kill $BROWSER_PID 2>/dev/null; exit 0" INT TERM

wait
