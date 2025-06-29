import React, { useState, useCallback, useRef } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import {
  imageToRGBGrid,
  imageDataToRGBGrid,
  flipRGBGridHorizontal,
  translateRGBGrid,
} from "../utils/cnnUtils"; // base64ToGrid no longer needed here
import { CameraCapture, CameraCaptureHandle } from "./CameraCapture";
// import { GoogleGenAI } from "@google/genai"; // Import for Gemini API - Disabled for compatibility

interface DataCollectionProps {
  onAddData: (grid: number[][][], label: 0 | 1) => void;
  predictFromCanvas?: (grid: number[][][]) => void;
  augmentFlip: boolean;
  onAugmentFlipChange: (value: boolean) => void;
  augmentTranslate: boolean;
  onAugmentTranslateChange: (value: boolean) => void;
  liveCameraMode?: boolean;
  onLiveCameraModeChange?: (enabled: boolean) => void;
  inferenceMode?: boolean;
}

export const DataCollection: React.FC<DataCollectionProps> = ({
  onAddData,
  predictFromCanvas,
  augmentFlip,
  onAugmentFlipChange,
  augmentTranslate,
  onAugmentTranslateChange,
  liveCameraMode = false,
  onLiveCameraModeChange,
  inferenceMode = false,
}) => {
  const { canvasRef, clearCanvas } = useDrawingCanvas({
    onDrawEnd: (grid) => {
      // Clear captured image data when drawing
      setLastCapturedData(null);

      if (predictFromCanvas) {
        const rgbGrid = grid.map((row) => row.map((val) => [val, val, val]));
        predictFromCanvas(rgbGrid);
      }
    },
    canvasWidth: 280,
    canvasHeight: 280,
    lineWidth: 25,
  });

  const [aiPrompt, setAiPrompt] = useState<string>(
    "a simple line drawing of the number 0",
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"draw" | "camera">("draw");
  const [lastCapturedData, setLastCapturedData] = useState<number[][][] | null>(
    null,
  );
  const [isCameraStreaming, setIsCameraStreaming] = useState<boolean>(false);

  const cameraRef = useRef<CameraCaptureHandle | null>(null);

  const handleCameraCapture = useCallback(
    (imageData: ImageData, canvas: HTMLCanvasElement) => {
      const processedData = imageDataToRGBGrid(imageData, 28, 28);

      // Store and predict
      setLastCapturedData(processedData);
      if (predictFromCanvas) {
        predictFromCanvas(processedData);
      }
    },
    [predictFromCanvas],
  );

  const handleLiveModeChange = useCallback(
    (enabled: boolean) => {
      setIsCameraStreaming(enabled);
      onLiveCameraModeChange?.(enabled);
    },
    [onLiveCameraModeChange],
  );

  const addGridData = useCallback(
    (grid: number[][][], label: 0 | 1) => {
      const gridsToSubmit: number[][][] = [];
      const NUM_TRANSLATIONS_PER_BASE = 2;

      gridsToSubmit.push(grid);

      if (augmentFlip && augmentTranslate) {
        // @ts-ignore - Type assertion needed for augmentation functions
        const flippedGrid: number[][][] = flipRGBGridHorizontal(
          grid as number[][][],
        );
        gridsToSubmit.push(flippedGrid);

        for (let i = 0; i < NUM_TRANSLATIONS_PER_BASE; i++) {
          let dx = 0,
            dy = 0;
          do {
            dx = Math.floor(Math.random() * 5) - 2;
            dy = Math.floor(Math.random() * 5) - 2;
          } while (dx === 0 && dy === 0);

          // @ts-ignore - Type assertion needed for augmentation functions
          const translatedGrid: number[][][] = translateRGBGrid(
            grid as number[][][],
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

          // @ts-ignore - Type assertion needed for augmentation functions
          const translatedFlippedGrid: number[][][] = translateRGBGrid(
            flippedGrid as number[][][],
            dx,
            dy,
          );
          gridsToSubmit.push(translatedFlippedGrid);
        }
      } else if (augmentFlip) {
        // @ts-ignore - Type assertion needed for augmentation functions
        const flippedGrid: number[][][] = flipRGBGridHorizontal(
          grid as number[][][],
        );
        gridsToSubmit.push(flippedGrid);
      } else if (augmentTranslate) {
        for (let i = 0; i < NUM_TRANSLATIONS_PER_BASE; i++) {
          let dx = 0,
            dy = 0;
          do {
            dx = Math.floor(Math.random() * 5) - 2;
            dy = Math.floor(Math.random() * 5) - 2;
          } while (dx === 0 && dy === 0);

          // @ts-ignore - Type assertion needed for augmentation functions
          const translatedGrid: number[][][] = translateRGBGrid(
            grid as number[][][],
            dx,
            dy,
          );
          gridsToSubmit.push(translatedGrid);
        }
      }

      for (const g of gridsToSubmit) {
        // @ts-ignore - Grid data is correctly typed as RGB
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
      if (predictFromCanvas) {
        predictFromCanvas(grid);
      }
      addGridData(grid, label);
    },
    [addGridData, predictFromCanvas],
  );

  const handleAddData = (label: 0 | 1) => {
    let originalGrid: number[][][];
    let isEmpty: boolean;

    // Use captured camera data if in camera mode and available
    if (inputMode === "camera" && lastCapturedData) {
      originalGrid = lastCapturedData as number[][][];
      isEmpty = originalGrid.flat(2).every((pixel) => pixel < 0.01);
    } else if (inputMode === "draw" && canvasRef.current) {
      // Use canvas data for drawing mode
      originalGrid = imageToRGBGrid(canvasRef.current);
      isEmpty = originalGrid.flat(2).every((pixel) => pixel < 0.01);
    } else {
      alert(
        inputMode === "camera"
          ? "Please capture a photo first."
          : "Please draw something or capture a photo first.",
      );
      return;
    }

    if (isEmpty) {
      alert(
        "Please draw something, capture a photo, or generate an image before adding.",
      );
      return;
    }

    addGridData(originalGrid, label);

    if (inputMode === "draw") {
      clearCanvas();
    }
    // Don't clear captured data for camera mode - allow multiple samples from same photo
  };

  const handleGenerateImage = useCallback(async () => {
    if (!aiPrompt.trim()) {
      setGenerationError("Please enter a prompt for image generation.");
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);

    // Clear canvas first, this will also trigger prediction with an empty grid.
    if (canvasRef.current) {
      clearCanvas();
    }

    try {
      // Google Gemini AI generation temporarily disabled for deployment compatibility
      setGenerationError(
        "AI image generation is temporarily disabled. Please use the drawing canvas to create training data manually.",
      );
      return;

      /*
      if (
        !process.env.API_KEY ||
        process.env.API_KEY === "your_gemini_api_key_here" ||
        process.env.API_KEY === "your_api_key_here" ||
        process.env.API_KEY === "PLACEHOLDER_API_KEY" ||
        process.env.API_KEY === "API_KEY_NOT_CONFIGURED"
      ) {
        setGenerationError(
          "Gemini API key not configured. Please set your API key in .env.local to use AI image generation. Get your key from: https://makersuite.google.com/app/apikey",
        );
        return;
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: aiPrompt,
        config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
      });

      if (
        response.generatedImages &&
        response.generatedImages.length > 0 &&
        response.generatedImages[0]?.image?.imageBytes
      ) {
        const base64Bytes = response.generatedImages[0].image.imageBytes;
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              // Ensure canvas is clear before drawing new image (already done by clearCanvas above, but good practice)
              ctx.fillStyle = "#111827"; // Match useDrawingCanvas clear color
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // Manually trigger prediction after drawing programmatically
              if (predictFromCanvas) {
                const grid = imageToRGBGrid(canvas);
                predictFromCanvas!(grid);
              }
            }
          }
        };
        img.onerror = () => {
          setGenerationError("Failed to load generated image onto canvas.");
          // Ensure predictFromCanvas is called with an empty grid if image load fails after clearing
          if (predictFromCanvas && canvasRef.current) {
            const grid = imageToRGBGrid(canvasRef.current); // Will be empty or whatever state it's in
            predictFromCanvas(grid);
          }
        };
        img.src = `data:image/jpeg;base64,${base64Bytes}`;
      } else {
        throw new Error("No image data received from API.");
      }
      */
    } catch (error: any) {
      console.error("Error generating image:", error);
      setGenerationError(
        error.message || "Failed to generate image. Check console for details.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, canvasRef, clearCanvas, predictFromCanvas]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">
        {inferenceMode ? "Live Inference Input" : "2. Collect Data"}
      </h2>

      {/* Input Mode Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">
          Input Method
        </h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setInputMode("draw")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inputMode === "draw"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setInputMode("camera")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inputMode === "camera"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            📸 Camera
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
            onStreamingChange={setIsCameraStreaming}
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
                    📸 Camera active -{" "}
                    {inferenceMode
                      ? "live inference running"
                      : "press a button to capture"}
                  </p>
                </div>
              ) : (
                !inferenceMode && (
                  <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 mb-3">
                    <p className="text-green-300 text-sm text-center">
                      ✅ Photo captured! Add it as a training sample:
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
              <div className="w-full max-w-[280px] grid grid-cols-2 gap-4 mt-3">
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
                  🔍 Predict Drawing
                </button>
              </div>
            )}
          </div>

          {/* AI Generation Section - Controls */}
          {!inferenceMode && (
            <>
              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-300">
                Generate Sample via AI (onto Canvas)
              </h3>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-full max-w-md">
                  <label
                    htmlFor="ai-prompt"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Image Prompt
                  </label>
                  <input
                    type="text"
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., a simple line drawing of the number 1"
                    className="w-full bg-gray-800 text-white p-2 rounded-md border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <button
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="w-full max-w-md bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors text-base focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-500 disabled:cursor-wait"
                >
                  {isGenerating ? "Generating..." : "Generate & Draw on Canvas"}
                </button>
                {generationError && (
                  <p className="text-red-400 text-sm mt-2 w-full max-w-md text-center">
                    {generationError}
                  </p>
                )}

                {/* Removed separate generated image display and add buttons */}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
