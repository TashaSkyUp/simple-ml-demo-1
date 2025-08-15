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

  const cameraRef = useRef<CameraCaptureHandle | null>(null);

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
      const gridsToSubmit: number[][][] = [];
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
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">
        {inferenceMode ? "Live Inference Input" : "2. Collect Data"}
      </h2>

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
    </div>
  );
};
