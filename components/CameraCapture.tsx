import React, {
  useState,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";

export interface CameraCaptureHandle {
  capture: () => { imageData: ImageData; canvas: HTMLCanvasElement } | null;
  startLiveMode: () => void;
  stopLiveMode: () => void;
}

interface CameraCaptureProps {
  onImageCapture: (imageData: ImageData, canvas: HTMLCanvasElement) => void;
  onError?: (error: string) => void;
  onStreamingChange?: (streaming: boolean) => void;
  onLiveModeChange?: (enabled: boolean) => void;
  liveModeEnabled?: boolean;
  width?: number;
  height?: number;
}

export const CameraCapture = forwardRef<
  CameraCaptureHandle,
  CameraCaptureProps
>(
  (
    {
      onImageCapture,
      onError,
      onStreamingChange,
      onLiveModeChange,
      liveModeEnabled = false,
      width = 280,
      height = 280,
    },
    ref,
  ) => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string>("");
    const [isLiveMode, setIsLiveMode] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleError = useCallback(
      (errorMessage: string) => {
        setError(errorMessage);
        onError?.(errorMessage);
      },
      [onError],
    );

    const startCamera = useCallback(async () => {
      try {
        setError("");

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported in this browser");
        }

        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: "environment", // Prefer back camera on mobile
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsStreaming(true);
          setHasPermission(true);
          onStreamingChange?.(true);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setHasPermission(false);

        if (err.name === "NotAllowedError") {
          handleError(
            "Camera access denied. Please allow camera permissions and try again.",
          );
        } else if (err.name === "NotFoundError") {
          handleError("No camera found on this device.");
        } else if (err.name === "NotSupportedError") {
          handleError("Camera access is not supported in this browser.");
        } else {
          handleError(`Camera error: ${err.message || "Unknown error"}`);
        }
      }
    }, [width, height, handleError]);

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

    const captureImage = useCallback((): {
      imageData: ImageData;
      canvas: HTMLCanvasElement;
    } | null => {
      if (!videoRef.current || !canvasRef.current) {
        handleError("Camera or canvas not ready");
        return null;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        handleError("Could not get canvas context");
        return null;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);

      // Get image data (RGB)
      const imageData = ctx.getImageData(0, 0, width, height);

      // Call the callback with the captured image
      onImageCapture(imageData, canvas);
      return { imageData, canvas };
    }, [width, height, onImageCapture, handleError]);

    const startLiveMode = useCallback(() => {
      if (!isStreaming) {
        handleError("Camera must be streaming to start live mode");
        return;
      }

      setIsLiveMode(true);
      onLiveModeChange?.(true);

      // Capture frames every 500ms for live pipeline updates
      liveIntervalRef.current = setInterval(() => {
        captureImage();
      }, 500);
    }, [isStreaming, captureImage, onLiveModeChange, handleError]);

    const stopLiveMode = useCallback(() => {
      setIsLiveMode(false);
      onLiveModeChange?.(false);

      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    }, [onLiveModeChange]);

    // Auto-start/stop live mode based on liveModeEnabled prop
    React.useEffect(() => {
      if (liveModeEnabled && isStreaming && !isLiveMode) {
        startLiveMode();
      } else if (!liveModeEnabled && isLiveMode) {
        stopLiveMode();
      }
    }, [liveModeEnabled, isStreaming, isLiveMode, startLiveMode, stopLiveMode]);

    useImperativeHandle(ref, () => ({
      capture: captureImage,
      startLiveMode,
      stopLiveMode,
    }));

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        stopLiveMode();
        stopCamera();
      };
    }, [stopCamera, stopLiveMode]);

    return (
      <div className="camera-capture bg-gray-800 p-4 rounded-lg">
        <div className="flex flex-col items-center space-y-4">
          {/* Camera Controls */}
          <div className="flex flex-col items-center space-y-3">
            {!isStreaming ? (
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors text-lg font-semibold"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Start Camera</span>
              </button>
            ) : (
              <>
                <button
                  onClick={captureImage}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors text-xl font-bold shadow-lg"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span> Capture</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={isLiveMode ? stopLiveMode : startLiveMode}
                    className={`px-4 py-2 ${
                      isLiveMode
                        ? "bg-orange-600 hover:bg-orange-700 live-toggle"
                        : "bg-purple-600 hover:bg-purple-700"
                    } text-white rounded-lg flex items-center space-x-2 transition-colors`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isLiveMode ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 9v6m4-6v6"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v5a2 2 0 002 2h2a2 2 0 002-2v-5"
                        />
                      )}
                    </svg>
                    <span>{isLiveMode ? "🔴 Stop Live" : "🟣 Go Live"}</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span>Stop</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Camera Preview */}
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`rounded-lg border-2 ${
                isLiveMode
                  ? "camera-live-border"
                  : isStreaming
                    ? "border-green-500"
                    : "border-gray-600"
              }`}
              style={{ width, height }}
              onLoadedMetadata={() => {
                // Ensure video is playing
                if (videoRef.current) {
                  videoRef.current.play().catch(console.error);
                }
              }}
            />

            {!isStreaming && (
              <div
                className="absolute inset-0 bg-gray-700 rounded-lg flex items-center justify-center"
                style={{ width, height }}
              >
                <div className="text-center text-gray-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p>Camera Preview</p>
                </div>
              </div>
            )}

            {/* Live Mode Indicator */}
            {isLiveMode && (
              <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold live-indicator">
                🔴 LIVE
              </div>
            )}
          </div>

          {/* Hidden canvas for image capture */}
          <canvas
            ref={canvasRef}
            className="hidden"
            width={width}
            height={height}
          />

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 max-w-md">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Permission Status */}
          {hasPermission === false && (
            <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 max-w-md">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-yellow-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="text-yellow-300 text-sm">
                  <p className="font-semibold">Camera Permission Required</p>
                  <p>Please allow camera access to capture training images.</p>
                </div>
              </div>
            </div>
          )}

          {/* Usage Instructions */}
          {isStreaming && !isLiveMode && (
            <div className="text-center text-green-400 text-sm max-w-md bg-green-900/20 p-3 rounded-lg border border-green-600">
              <p className="font-semibold">📹 Camera Active</p>
              <p className="mt-1">
                Position your subject and tap the capture button or go live for
                pipeline visualization
              </p>
            </div>
          )}

          {isLiveMode && (
            <div className="text-center text-red-400 text-sm max-w-md bg-red-900/20 p-3 rounded-lg border border-red-600 live-pulse">
              <p className="font-semibold">🔴 Live Pipeline Mode</p>
              <p className="mt-1">
                CNN pipeline is updating in real-time with camera feed
              </p>
            </div>
          )}

          {!isStreaming && (
            <div className="text-center text-gray-400 text-sm max-w-md">
              <p> Capture photos to use as training samples</p>
              <p className="mt-1">
                 Make sure your subject is well-lit and clearly visible
              </p>
              <p className="mt-1">
                🟣 Use "Go Live" mode to see real-time CNN pipeline
                visualization
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);
