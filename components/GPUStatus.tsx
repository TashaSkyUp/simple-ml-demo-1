import React, { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";

interface GPUInfo {
  backend: string;
  isGPUAccelerated: boolean;
  gpuVendor?: string;
  gpuRenderer?: string;
  maxTextureSize?: number;
  memoryInfo?: {
    numTensors: number;
    numDataBuffers: number;
    numBytes: number;
  };
  benchmark?: {
    opsPerSecond: number;
    isRunning: boolean;
    lastRun: Date | null;
    webglSpeed?: number;
    cpuSpeed?: number;
    currentBackend?: string;
  };
}

interface GPUStatusProps {
  className?: string;
  onRunBenchmark?: () => Promise<void>;
  benchmarkData?: {
    opsPerSecond: number;
    isRunning: boolean;
    lastRun: Date | null;
    webglSpeed?: number;
    cpuSpeed?: number;
    webgpuSpeed?: number;
    currentBackend?: string;
  };
}

export const GPUStatus: React.FC<GPUStatusProps> = ({
  className = "",
  onRunBenchmark,
  benchmarkData,
}) => {
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);

  const switchBackend = async (targetBackend: string) => {
    setSwitching(true);
    try {
      await tf.setBackend(targetBackend);
      console.log(` Switched to ${targetBackend} backend`);
      // Refresh GPU info after switch
      const newBackend = tf.getBackend();
      setGpuInfo((prev) =>
        prev
          ? {
              ...prev,
              backend: newBackend,
              isGPUAccelerated:
                newBackend === "webgl" || newBackend === "webgpu",
            }
          : null,
      );
    } catch (error) {
      console.error(`Failed to switch to ${targetBackend}:`, error);
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    const detectGPUInfo = async () => {
      try {
        await tf.ready();

        const backend = tf.getBackend();
        const isGPUAccelerated = backend === "webgl" || backend === "webgpu";

        // Check WebGPU capabilities
        let webgpuSupported = false;
        if (navigator.gpu) {
          try {
            const adapter = await navigator.gpu.requestAdapter();
            webgpuSupported = !!adapter;
            console.log(" WebGPU adapter detected:", !!adapter);
          } catch (error) {
            console.warn("WebGPU detection failed:", error);
          }
        } else {
          console.log("Error: navigator.gpu not available");
        }

        let gpuVendor: string | undefined;
        let gpuRenderer: string | undefined;
        let maxTextureSize: number | undefined;

        if (backend === "webgl") {
          try {
            const webglBackend = tf.backend() as any;
            const gl = webglBackend?.gpgpu?.gl || webglBackend?.gl;

            if (gl) {
              gpuVendor = gl.getParameter(gl.VENDOR);
              gpuRenderer = gl.getParameter(gl.RENDERER);
              maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            }
          } catch (error) {
            console.warn("Could not get WebGL info:", error);
          }
        } else if (backend === "webgpu") {
          try {
            // WebGPU info gathering
            gpuVendor = "WebGPU";
            gpuRenderer = "WebGPU Accelerated";
            maxTextureSize = 16384; // WebGPU typical max

            // Try to get adapter info if available
            if (navigator.gpu) {
              const adapter = await navigator.gpu.requestAdapter();
              if (adapter) {
                // WebGPU adapter.info is experimental and may not be available
                const info = (adapter as any).info || adapter;
                if (info.vendor) gpuVendor = String(info.vendor);
                if (info.device) gpuRenderer = String(info.device);
                if (info.description) gpuRenderer = String(info.description);
                // Fallback for basic adapter info
                if (!gpuVendor && info.architecture)
                  gpuVendor = String(info.architecture);
              }
            }
          } catch (error) {
            console.warn("Could not get WebGPU info:", error);
          }
        }

        const memoryInfo = tf.memory();

        setGpuInfo({
          backend,
          isGPUAccelerated,
          gpuVendor,
          gpuRenderer,
          maxTextureSize,
          memoryInfo,
        });
      } catch (error) {
        console.error("Error: detecting GPU info:", error);
        setGpuInfo({
          backend: "unknown",
          isGPUAccelerated: false,
        });
      } finally {
        setLoading(false);
      }
    };

    detectGPUInfo();

    // Update memory info periodically
    const interval = setInterval(() => {
      if (gpuInfo) {
        setGpuInfo((prev) =>
          prev
            ? {
                ...prev,
                memoryInfo: tf.memory(),
              }
            : null,
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300">Detecting GPU...</span>
        </div>
      </div>
    );
  }

  if (!gpuInfo) {
    return (
      <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-300">GPU detection failed</span>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (gpuInfo.isGPUAccelerated) return "text-green-400";
    return "text-yellow-400";
  };

  const getStatusIcon = () => {
    if (gpuInfo.backend === "webgpu") return "";
    if (gpuInfo.isGPUAccelerated) return "";
    return "";
  };

  const getBackendDisplayName = (backend: string) => {
    switch (backend) {
      case "webgpu":
        return "WebGPU (Next-Gen)";
      case "webgl":
        return "WebGL";
      case "cpu":
        return "CPU";
      default:
        return backend;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {gpuInfo.backend === "webgpu"
                ? "WebGPU Accelerated"
                : gpuInfo.isGPUAccelerated
                  ? "GPU Accelerated"
                  : "CPU Mode"}
            </div>
            <div className="text-xs text-gray-400">
              Backend: {getBackendDisplayName(gpuInfo.backend)}
            </div>
          </div>
        </div>
        <div className="text-gray-400">{expanded ? "−" : "+"}</div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="space-y-2 text-xs">
            {gpuInfo.gpuVendor && (
              <div>
                <span className="text-gray-400">GPU Vendor:</span>
                <span className="ml-2 text-gray-200">{gpuInfo.gpuVendor}</span>
              </div>
            )}

            {gpuInfo.gpuRenderer && (
              <div>
                <span className="text-gray-400">GPU:</span>
                <span className="ml-2 text-gray-200">
                  {gpuInfo.gpuRenderer}
                </span>
              </div>
            )}

            {gpuInfo.maxTextureSize && (
              <div>
                <span className="text-gray-400">Max Texture:</span>
                <span className="ml-2 text-gray-200">
                  {gpuInfo.maxTextureSize}px
                </span>
              </div>
            )}

            {gpuInfo.memoryInfo && (
              <div className="pt-2 border-t border-gray-700">
                <div className="text-gray-400 mb-1">TensorFlow.js Memory:</div>
                <div className="pl-2 space-y-1">
                  <div>
                    <span className="text-gray-400">Tensors:</span>
                    <span className="ml-2 text-gray-200">
                      {gpuInfo.memoryInfo.numTensors}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Buffers:</span>
                    <span className="ml-2 text-gray-200">
                      {gpuInfo.memoryInfo.numDataBuffers}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Usage:</span>
                    <span className="ml-2 text-gray-200">
                      {formatBytes(gpuInfo.memoryInfo.numBytes)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {benchmarkData && (
              <div className="pt-2 border-t border-gray-700">
                <div className="text-gray-400 mb-1">Performance:</div>
                <div className="pl-2 space-y-1">
                  {benchmarkData.opsPerSecond > 0 && (
                    <div>
                      <span className="text-gray-400">Current:</span>
                      <span className="ml-2 text-gray-200">
                        {benchmarkData.opsPerSecond.toLocaleString()} ops/sec (
                        {benchmarkData.currentBackend || tf.getBackend()})
                      </span>
                    </div>
                  )}
                  {(benchmarkData.webgpuSpeed || benchmarkData.webglSpeed) &&
                    benchmarkData.cpuSpeed && (
                      <>
                        {benchmarkData.webgpuSpeed && (
                          <div>
                            <span className="text-gray-400">WebGPU:</span>
                            <span className="ml-2 text-gray-200">
                              {benchmarkData.webgpuSpeed.toLocaleString()}{" "}
                              ops/sec
                            </span>
                          </div>
                        )}
                        {benchmarkData.webglSpeed && (
                          <div>
                            <span className="text-gray-400">WebGL:</span>
                            <span className="ml-2 text-gray-200">
                              {benchmarkData.webglSpeed.toLocaleString()}{" "}
                              ops/sec
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">CPU:</span>
                          <span className="ml-2 text-gray-200">
                            {benchmarkData.cpuSpeed.toLocaleString()} ops/sec
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-400">Best:</span>
                          <span className="ml-2 text-green-300">
                            {(() => {
                              const speeds = [
                                {
                                  name: "WebGPU",
                                  speed: benchmarkData.webgpuSpeed || 0,
                                },
                                {
                                  name: "WebGL",
                                  speed: benchmarkData.webglSpeed || 0,
                                },
                                {
                                  name: "CPU",
                                  speed: benchmarkData.cpuSpeed || 0,
                                },
                              ];
                              const fastest = speeds.reduce((prev, current) =>
                                current.speed > prev.speed ? current : prev,
                              );
                              const secondFastest = speeds
                                .filter((s) => s !== fastest)
                                .reduce((prev, current) =>
                                  current.speed > prev.speed ? current : prev,
                                );
                              const ratio = (
                                fastest.speed / secondFastest.speed
                              ).toFixed(1);
                              return `${fastest.name} (${ratio}x faster)`;
                            })()}
                          </span>
                        </div>
                      </>
                    )}
                  {benchmarkData.lastRun && (
                    <div>
                      <span className="text-gray-400">Last Test:</span>
                      <span className="ml-2 text-gray-200">
                        {benchmarkData.lastRun.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
                {onRunBenchmark && (
                  <button
                    onClick={onRunBenchmark}
                    disabled={benchmarkData.isRunning}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                  >
                    {benchmarkData.isRunning
                      ? "Running..."
                      : "Compare Backends"}
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-400 mb-2 text-xs">Backend Control:</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => switchBackend("webgpu")}
                  disabled={switching || tf.getBackend() === "webgpu"}
                  className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700 text-white"
                >
                  WebGPU
                </button>
                <button
                  onClick={() => switchBackend("webgl")}
                  disabled={switching || tf.getBackend() === "webgl"}
                  className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white"
                >
                  WebGL
                </button>
                <button
                  onClick={() => switchBackend("cpu")}
                  disabled={switching || tf.getBackend() === "cpu"}
                  className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
                >
                  CPU
                </button>
                {switching && (
                  <span className="text-xs text-yellow-400 self-center">
                    Switching...
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-400 text-xs">
                {gpuInfo.backend === "webgpu"
                  ? "Training will use next-generation WebGPU acceleration"
                  : gpuInfo.isGPUAccelerated
                    ? "Training will use GPU acceleration"
                    : "Training will use CPU (slower but still functional)"}
              </div>
              {(benchmarkData?.webgpuSpeed || benchmarkData?.webglSpeed) &&
                benchmarkData?.cpuSpeed && (
                  <div className="text-gray-400 text-xs mt-1">
                    {(() => {
                      const webgpuSpeed = benchmarkData.webgpuSpeed || 0;
                      const webglSpeed = benchmarkData.webglSpeed || 0;
                      const cpuSpeed = benchmarkData.cpuSpeed || 0;

                      if (webgpuSpeed > cpuSpeed && webgpuSpeed > webglSpeed) {
                        return " WebGPU provides the best performance for your system";
                      } else if (webglSpeed > cpuSpeed) {
                        return " WebGL acceleration is beneficial for your system";
                      } else {
                        return " Tip: Your CPU outperforms GPU for small models";
                      }
                    })()}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
