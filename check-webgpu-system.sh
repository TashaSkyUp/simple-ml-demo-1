#!/bin/bash

# WebGPU System Readiness Checker
# Checks if your Linux system is ready for WebGPU acceleration

echo "🔍 WebGPU System Readiness Check"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored status
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
    esac
}

# Check 1: GPU Hardware Detection
echo "1. GPU Hardware Detection"
echo "------------------------"
if command -v lspci >/dev/null 2>&1; then
    GPU_INFO=$(lspci | grep -i vga)
    if [ -n "$GPU_INFO" ]; then
        print_status "PASS" "GPU hardware detected"
        echo "   $GPU_INFO"

        # Check for specific GPU vendors
        if echo "$GPU_INFO" | grep -i nvidia >/dev/null; then
            print_status "INFO" "NVIDIA GPU detected"
        elif echo "$GPU_INFO" | grep -i amd >/dev/null; then
            print_status "INFO" "AMD GPU detected"
        elif echo "$GPU_INFO" | grep -i intel >/dev/null; then
            print_status "INFO" "Intel GPU detected"
        fi
    else
        print_status "FAIL" "No GPU hardware detected"
    fi
else
    print_status "WARN" "lspci not available - cannot detect GPU hardware"
fi
echo ""

# Check 2: Graphics Drivers
echo "2. Graphics Drivers"
echo "------------------"
if command -v glxinfo >/dev/null 2>&1; then
    GL_RENDERER=$(glxinfo | grep "OpenGL renderer" | cut -d: -f2 | xargs)
    GL_VERSION=$(glxinfo | grep "OpenGL version" | cut -d: -f2 | xargs)

    if [ -n "$GL_RENDERER" ]; then
        print_status "PASS" "OpenGL drivers working"
        echo "   Renderer: $GL_RENDERER"
        echo "   Version: $GL_VERSION"

        # Check if using software rendering
        if echo "$GL_RENDERER" | grep -i "llvmpipe\|software\|swrast" >/dev/null; then
            print_status "WARN" "Using software rendering - hardware acceleration may not work"
        else
            print_status "PASS" "Hardware-accelerated rendering detected"
        fi
    else
        print_status "FAIL" "OpenGL drivers not working properly"
    fi
else
    print_status "WARN" "glxinfo not available - install mesa-utils to check OpenGL drivers"
    echo "   Run: sudo apt install mesa-utils"
fi
echo ""

# Check 3: Vulkan Support
echo "3. Vulkan Support"
echo "----------------"
if command -v vulkaninfo >/dev/null 2>&1; then
    if vulkaninfo --summary >/dev/null 2>&1; then
        print_status "PASS" "Vulkan API is working"

        # Get Vulkan details
        VULKAN_DRIVER=$(vulkaninfo --summary 2>/dev/null | grep "driverName" | head -1 | cut -d= -f2 | xargs)
        VULKAN_VERSION=$(vulkaninfo --summary 2>/dev/null | grep "apiVersion" | head -1 | cut -d= -f2 | xargs)

        if [ -n "$VULKAN_DRIVER" ]; then
            echo "   Driver: $VULKAN_DRIVER"
        fi
        if [ -n "$VULKAN_VERSION" ]; then
            echo "   API Version: $VULKAN_VERSION"
        fi
    else
        print_status "FAIL" "Vulkan API not working - WebGPU may not function"
        echo "   Try installing Vulkan drivers for your GPU"
    fi
else
    print_status "WARN" "vulkaninfo not available - install vulkan-tools to check Vulkan support"
    echo "   Run: sudo apt install vulkan-tools"
fi
echo ""

# Check 4: Browser Availability
echo "4. Browser Support"
echo "-----------------"
BROWSER_FOUND=false

if command -v brave-browser >/dev/null 2>&1; then
    BRAVE_VERSION=$(brave-browser --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    print_status "PASS" "Brave Browser found (version: $BRAVE_VERSION)"
    BROWSER_FOUND=true
fi

if command -v google-chrome >/dev/null 2>&1; then
    CHROME_VERSION=$(google-chrome --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    print_status "PASS" "Google Chrome found (version: $CHROME_VERSION)"
    BROWSER_FOUND=true
fi

if command -v chromium-browser >/dev/null 2>&1; then
    CHROMIUM_VERSION=$(chromium-browser --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    print_status "PASS" "Chromium found (version: $CHROMIUM_VERSION)"
    BROWSER_FOUND=true
fi

if [ "$BROWSER_FOUND" = false ]; then
    print_status "FAIL" "No compatible browser found"
    echo "   Install Brave, Chrome, or Chromium for WebGPU support"
fi
echo ""

# Check 5: System Requirements
echo "5. System Requirements"
echo "---------------------"

# Check kernel version
KERNEL_VERSION=$(uname -r | cut -d. -f1-2)
KERNEL_MAJOR=$(echo $KERNEL_VERSION | cut -d. -f1)
KERNEL_MINOR=$(echo $KERNEL_VERSION | cut -d. -f2)

if [ "$KERNEL_MAJOR" -gt 5 ] || ([ "$KERNEL_MAJOR" -eq 5 ] && [ "$KERNEL_MINOR" -ge 4 ]); then
    print_status "PASS" "Kernel version $KERNEL_VERSION is compatible"
else
    print_status "WARN" "Kernel version $KERNEL_VERSION may have limited WebGPU support"
fi

# Check memory
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
if [ "$TOTAL_MEM" -ge 4096 ]; then
    print_status "PASS" "Sufficient RAM: ${TOTAL_MEM}MB"
else
    print_status "WARN" "Low RAM: ${TOTAL_MEM}MB - WebGPU may be limited"
fi

# Check if running in VM
if [ -f /proc/cpuinfo ] && grep -q "hypervisor" /proc/cpuinfo; then
    print_status "WARN" "Running in virtual machine - WebGPU may not work properly"
fi

echo ""

# Summary and Recommendations
echo "📊 Summary and Recommendations"
echo "=============================="
echo ""

# Generate overall assessment
CRITICAL_ISSUES=0
WARNINGS=0

# Check critical issues
if ! command -v glxinfo >/dev/null 2>&1 || [ -z "$(glxinfo 2>/dev/null | grep 'OpenGL renderer')" ]; then
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if ! command -v vulkaninfo >/dev/null 2>&1 || ! vulkaninfo --summary >/dev/null 2>&1; then
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if [ "$BROWSER_FOUND" = false ]; then
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

echo "Critical Issues: $CRITICAL_ISSUES"
echo "Warnings: $WARNINGS"
echo ""

if [ "$CRITICAL_ISSUES" -eq 0 ]; then
    print_status "PASS" "Your system should support WebGPU!"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Run the WebGPU diagnostic tool: ./start.sh"
    echo "   2. Open http://localhost:5173/webgpu-test.html"
    echo "   3. Run all diagnostic tests"
    echo "   4. If tests pass, enjoy WebGPU acceleration!"
else
    print_status "FAIL" "Your system has issues that may prevent WebGPU from working"
    echo ""
    echo "🔧 Recommended Fixes:"

    if ! command -v glxinfo >/dev/null 2>&1; then
        echo "   • Install mesa-utils: sudo apt install mesa-utils"
    fi

    if ! command -v vulkaninfo >/dev/null 2>&1; then
        echo "   • Install vulkan-tools: sudo apt install vulkan-tools"
    fi

    if ! vulkaninfo --summary >/dev/null 2>&1; then
        echo "   • Install Vulkan drivers for your GPU:"
        echo "     - NVIDIA: sudo apt install nvidia-driver-* vulkan-utils"
        echo "     - AMD: sudo apt install mesa-vulkan-drivers vulkan-utils"
        echo "     - Intel: sudo apt install intel-media-va-driver vulkan-utils"
    fi

    if [ "$BROWSER_FOUND" = false ]; then
        echo "   • Install a compatible browser:"
        echo "     - Brave: sudo apt install brave-browser"
        echo "     - Chrome: Download from google.com/chrome"
    fi
fi

echo ""
echo "💡 Additional Tips:"
echo "   • Update your graphics drivers to the latest version"
echo "   • Enable hardware acceleration in your browser settings"
echo "   • Try the diagnostic tool even if some checks fail"
echo "   • WebGPU is still experimental - fallback to WebGL/CPU is normal"
echo ""
echo "🔗 Useful Commands:"
echo "   • Check GPU: lspci | grep -i vga"
echo "   • Check OpenGL: glxinfo | grep renderer"
echo "   • Check Vulkan: vulkaninfo --summary"
echo "   • Check browser GPU: brave://gpu/ or chrome://gpu/"
