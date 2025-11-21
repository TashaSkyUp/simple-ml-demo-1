import React, { useState, useCallback, useRef } from "react";
import {
  imageDataToRGBGrid,
  flipRGBGridHorizontal,
  translateRGBGrid,
} from "../utils/cnnUtils";
import { CameraCapture, CameraCaptureHandle } from "./CameraCapture";

interface DataCollectionProps {
  onAddData: (grid: number[][][], label: 0 | 1) => void;
  predict?: (grid: number[][][]) => void;
  augmentFlip: boolean;
  onAugmentFlipChange: (value: boolean) => void;
  augmentTranslate: boolean;
  onAugmentTranslateChange: (value: boolean) => void;
  liveCameraMode?: boolean;
  onLiveCameraModeChange?: (enabled: boolean) => void;
  onCameraStreamingChange?: (streaming: boolean) => void;
  inferenceMode?: boolean;
}

export const DataCollection: React.FC<DataCollectionProps> = ({
  onAddData,
  predict,
  augmentFlip,
  onAugmentFlipChange,
  augmentTranslate,
  onAugmentTranslateChange,
  liveCameraMode = false,
  onLiveCameraModeChange,
  onCameraStreamingChange,
  inferenceMode = false,
}) => {
  const [lastCapturedData, setLastCapturedData] = useState<number[][][] | null>(
    null,
  );
  const [isCameraStreaming, setIsCameraStreaming] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<"camera" | "draw">("camera");

  const cameraRef = useRef<CameraCaptureHandle | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const handleDrawingPredict = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && predict) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const processedData = imageDataToRGBGrid(imageData, 28, 28);
        predict(processedData);
      }
    }
  }, [predict]);

  const handleCameraCapture = useCallback(
    (imageData: ImageData) => {
      const processedData = imageDataToRGBGrid(imageData, 28, 28);

      // Store and predict
      setLastCapturedData(processedData);
      if (predict) {
        predict(processedData);
      }
    },
    [predict],
  );

  const handleLiveModeChange = useCallback(
    (enabled: boolean) => {
      setIsCameraStreaming(enabled);
      onLiveCameraModeChange?.(enabled);
    },
    [onLiveCameraModeChange],
  );

  const handleStreamingChange = useCallback(
    (streaming: boolean) => {
      setIsCameraStreaming(streaming);
      onCameraStreamingChange?.(streaming);
    },
    [onCameraStreamingChange],
  );

  const addGridData = useCallback(
    (grid: number[][][], label: 0 | 1) => {
      const gridsToSubmit: number[][][][] = [];
      const NUM_TRANSLATIONS_PER_BASE = 2;

      gridsToSubmit.push(grid);

      if (augmentFlip && augmentTranslate) {
        const flippedGrid: number[][][] = flipRGBGridHorizontal(grid as any);
        gridsToSubmit.push(flippedGrid);

        for (let i = 0; i < NUM_TRANSLATIONS_PER_BASE; i++) {
          let dx = 0,
            dy = 0;
          do {
            dx = Math.floor(Math.random() * 5) - 2;
            dy = Math.floor(Math.random() * 5) - 2;
          } while (dx === 0 && dy === 0);

          const translatedGrid: number[][][] = translateRGBGrid(
            grid as any,
            dx,
            dy,
          );
          gridsToSubmit.push(translatedGrid);
        }

        for (let i = 0; i < NUM_TRANSLATIONS_PER_BASE; i++) {
          let dx = 0,
            dy = 0;
          do {
            dx = Math.floor(Math.random() * 5) - 2;
            dy = Math.floor(Math.random() * 5) - 2;
          } while (dx === 0 && dy === 0);

          const translatedFlippedGrid: number[][][] = translateRGBGrid(
            flippedGrid as any,
            dx,
            dy,
          );
          gridsToSubmit.push(translatedFlippedGrid);
        }
      } else if (augmentFlip) {
        const flippedGrid: number[][][] = flipRGBGridHorizontal(grid as any);
        gridsToSubmit.push(flippedGrid);
      } else if (augmentTranslate) {
        for (let i = 0; i < NUM_TRANSLATIONS_PER_BASE; i++) {
          let dx = 0,
            dy = 0;
          do {
            dx = Math.floor(Math.random() * 5) - 2;
            dy = Math.floor(Math.random() * 5) - 2;
          } while (dx === 0 && dy === 0);

          const translatedGrid: number[][][] = translateRGBGrid(
            grid as any,
            dx,
            dy,
          );
          gridsToSubmit.push(translatedGrid);
        }
      }

      for (const g of gridsToSubmit) {
        onAddData(g as number[][][], label);
      }
    },
    [augmentFlip, augmentTranslate, onAddData],
  );

  const handleCaptureAndAdd = useCallback(
    (label: 0 | 1) => {
      if (!cameraRef.current) {
        alert("Camera not ready");
        return;
      }
      const result = cameraRef.current.capture();
      if (!result) {
        alert("Capture failed");
        return;
      }
      const { imageData } = result;
      const grid = imageDataToRGBGrid(imageData, 28, 28);
      setLastCapturedData(grid);
      if (predict) {
        predict(grid);
      }
      addGridData(grid, label);
    },
    [addGridData, predict],
  );

  const handleAddData = (label: 0 | 1) => {
    if (lastCapturedData) {
      const originalGrid = lastCapturedData;
      const isEmpty = originalGrid.flat(2).every((pixel) => pixel < 0.01);

      if (isEmpty) {
        alert("Please capture a photo before adding.");
        return;
      }

      addGridData(originalGrid, label);
    } else {
      alert("Please capture a photo first.");
      return;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">
          Input Mode
        </h3>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setInputMode("draw")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${inputMode === "draw"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            Draw
          </button>
          <button
            onClick={() => setInputMode("camera")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${inputMode === "camera"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            Camera
          </button>
        </div>
      </div>

      {/* Camera Section */}
      {inputMode === "camera" && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">
            Camera Capture
          </h3>
          <CameraCapture
            ref={cameraRef}
            onImageCapture={handleCameraCapture}
            onStreamingChange={handleStreamingChange}
            onLiveModeChange={handleLiveModeChange}
            liveModeEnabled={liveCameraMode}
            onError={(error) => console.error("Camera error:", error)}
            width={224}
            height={224}
          />
          {(isCameraStreaming || lastCapturedData) && (
            <div className="w-full max-w-[280px] mx-auto mt-4">
              {isCameraStreaming ? (
                <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3 mb-3">
                  <p className="text-blue-300 text-sm text-center">
                    Camera active -{" "}
                    {inferenceMode
                      ? "live inference running"
                      : "press a button to capture"}
                  </p>
                </div>
              ) : (
                !inferenceMode && (
                  <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 mb-3">
                    <p className="text-green-300 text-sm text-center">
                      Photo captured! Add it as a training sample:
                    </p>
                  </div>
                )
              )}
              {!inferenceMode && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() =>
                      isCameraStreaming
                        ? handleCaptureAndAdd(0)
                        : handleAddData(0)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    Add as Class 0
                  </button>
                  <button
                    onClick={() =>
                      isCameraStreaming
                        ? handleCaptureAndAdd(1)
                        : handleAddData(1)
                    }
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    Add as Class 1
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drawing Section - Now common for manual and AI generated images */}
      {inputMode === "draw" && (
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-300">
            Drawing & Generation Canvas
          </h3>
          <div className="flex flex-col items-center mb-4">
            {" "}
            {/* Reduced mb for AI section */}
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="bg-gray-900 rounded-lg shadow-inner cursor-crosshair touch-none border-2 border-gray-700 w-[280px] h-[280px]"
              aria-label="Drawing canvas for image samples"
            />
            <div className="w-full max-w-[280px] mt-3 space-y-2">
              {!inferenceMode && (
                <div className="flex items-center justify-start gap-x-4">
                  <label className="flex items-center text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={augmentFlip}
                      onChange={(e) => onAugmentFlipChange(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-600"
                    />
                    <span className="ml-2">Augment: Flip</span>
                  </label>
                  <label className="flex items-center text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={augmentTranslate}
                      onChange={(e) =>
                        onAugmentTranslateChange(e.target.checked)
                      }
                      className="form-checkbox h-4 w-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-600"
                    />
                    <span className="ml-2">Augment: Translate</span>
                  </label>
                </div>
              )}
              <button
                onClick={clearCanvas}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Clear Canvas
              </button>
            </div>
            {!inferenceMode && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <button
                  onClick={() => handleAddData(0)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Add as Class 0
                </button>
                <button
                  onClick={() => handleAddData(1)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Add as Class 1
                </button>
              </div>
            )}
            {inferenceMode && (
              <div className="w-full max-w-[280px] mt-3">
                <button
                  onClick={handleDrawingPredict}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Predict Drawing
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
