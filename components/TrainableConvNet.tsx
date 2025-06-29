import React, { useState, useEffect, useCallback } from "react";
import type { LayerConfig, TrainingDataPoint } from "../types";
import { LayerType, ActivationFunction, PoolingType } from "../types";
// import { imageToGrid, drawGridToCanvas } from '../utils/cnnUtils'; // drawGridToCanvas not used here
import { TabbedInterface } from "./TabbedInterface";
import { TrainingTab } from "./TrainingTab";
import { InferenceTab } from "./InferenceTab";
import { useTFModel, ModelStatus as TFModelStatus } from "../hooks/useTFModel"; // The new TensorFlow.js hook
import {
  useCollapsibleSections,
  useResponsiveDefaults,
} from "../hooks/useCollapsibleSections";

const LOCAL_STORAGE_KEY_TRAINING_DATA = "cnnTrainerTrainingDataTF"; // Changed key for TF version

// Unique ID generator to prevent duplicate React keys
const generateUniqueId = (): string => {
  // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Define the expected status type for TrainingControls for clarity
type TrainingControlsStatus =
  | "collecting"
  | "training"
  | "success"
  | "architecture-changed"
  | "error";

interface AppSessionData {
  layers: LayerConfig[];
  trainingData: TrainingDataPoint[];
  modelWeights?: any[] | null;
  epochsRun?: number;
  lossHistory?: number[];
}

export const TrainableConvNet: React.FC = () => {
  const [layers, setLayers] = useState<LayerConfig[]>(() => [
    {
      id: generateUniqueId(),
      type: LayerType.Conv,
      filterSize: 3,
      numFilters: 8,
      activation: ActivationFunction.ReLU,
    },
    {
      id: generateUniqueId(),
      type: LayerType.Pool,
      poolSize: 2,
      poolingType: PoolingType.Max,
    },
    {
      id: generateUniqueId(),
      type: LayerType.Conv,
      filterSize: 3,
      numFilters: 16,
      activation: ActivationFunction.ReLU,
    },
    {
      id: generateUniqueId(),
      type: LayerType.Pool,
      poolSize: 2,
      poolingType: PoolingType.Max,
    },
    // Flatten and Dense layers will be implicitly added by useTFModel if not present before final output,
    // or user can add them explicitly.
    // { id: Date.now() + 5, type: LayerType.Flatten },
    // { id: Date.now() + 6, type: LayerType.Dense, units: 1, activation: ActivationFunction.Sigmoid }
  ]);
  const [trainingData, setTrainingData] = useState<TrainingDataPoint[]>(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY_TRAINING_DATA);
      return savedData ? JSON.parse(savedData) : [];
    } catch (error) {
      console.error("Failed to load training data from localStorage:", error);
      return [];
    }
  });
  const [numEpochs, setNumEpochs] = useState<number>(10); // Reduced default for faster TF.js iteration
  const [learningRate, setLearningRate] = useState<number>(0.001); // Common default for Adam
  const [batchSize, setBatchSize] = useState<number>(8);

  const [activeVizChannel, setActiveVizChannel] = useState<{
    [layerId: string]: number;
  }>({});

  // Augmentation states
  const [augmentFlip, setAugmentFlip] = useState<boolean>(false);
  const [augmentTranslate, setAugmentTranslate] = useState<boolean>(false);

  // Live camera pipeline mode
  const [liveCameraMode, setLiveCameraMode] = useState(false);
  const [isCameraStreaming, setIsCameraStreaming] = useState(false);

  // Collapsible sections management with responsive defaults
  const responsiveDefaults = useResponsiveDefaults();
  const { isSectionOpen, toggleSection } = useCollapsibleSections({
    defaultStates: responsiveDefaults,
    persistToLocalStorage: true,
    storageKey: "cnn-trainer-sections",
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "a":
            event.preventDefault();
            const sectionIds = [
              "network-architecture",
              "data-collection",
              "training-prediction",
              "gpu-performance",
              "neural-network-visualization",
            ];
            const allOpen = sectionIds.every((id) => isSectionOpen(id));
            if (allOpen) {
              sectionIds.forEach((id) => toggleSection(id));
            } else {
              sectionIds
                .filter((id) => !isSectionOpen(id))
                .forEach((id) => toggleSection(id));
            }
            break;
          case "1":
            event.preventDefault();
            toggleSection("network-architecture");
            break;
          case "2":
            event.preventDefault();
            toggleSection("data-collection");
            break;
          case "3":
            event.preventDefault();
            toggleSection("training-prediction");
            break;
          case "4":
            event.preventDefault();
            toggleSection("gpu-performance");
            break;
          case "5":
            event.preventDefault();
            toggleSection("neural-network-visualization");
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSectionOpen, toggleSection]);

  const {
    model, // This is now a tf.Sequential or null
    status: tfStatus, // Renamed to avoid conflict and to clarify its origin
    prediction,
    epochsRun,
    lossHistory,
    liveLayerOutputs,
    fcWeightsViz,
    gpuBenchmark,
    initializeModel, // To explicitly build/compile
    runPrediction,
    startTrainingLogic,
    resetModelTrainingState,
    runGPUBenchmark,
    saveModelWeights,
    loadModelWeights,
  } = useTFModel({
    initialLayers: layers,
    learningRate,
    // numEpochs and batchSize are passed directly to startTrainingLogic
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY_TRAINING_DATA,
        JSON.stringify(trainingData),
      );
    } catch (error) {
      console.error("Failed to save training data to localStorage:", error);
    }
  }, [trainingData]);

  const handleAddLayer = (layerTypeToAdd: LayerType) => {
    let newLayer: LayerConfig;
    const newId = generateUniqueId();
    switch (layerTypeToAdd) {
      case LayerType.Conv:
        newLayer = {
          id: newId,
          type: LayerType.Conv,
          filterSize: 3,
          numFilters: 8,
          activation: ActivationFunction.ReLU,
        };
        break;
      case LayerType.Pool:
        newLayer = {
          id: newId,
          type: LayerType.Pool,
          poolSize: 2,
          poolingType: PoolingType.Max,
        };
        break;
      case LayerType.Activation:
        newLayer = {
          id: newId,
          type: LayerType.Activation,
          func: ActivationFunction.ReLU,
        };
        break;
      case LayerType.Dropout:
        newLayer = { id: newId, type: LayerType.Dropout, rate: 0.25 };
        break;
      case LayerType.Flatten:
        newLayer = { id: newId, type: LayerType.Flatten };
        break;
      case LayerType.Dense:
        newLayer = {
          id: newId,
          type: LayerType.Dense,
          units: 10,
          activation: ActivationFunction.ReLU,
        };
        break;
      case LayerType.Reshape:
        newLayer = {
          id: newId,
          type: LayerType.Reshape,
          targetShape: [28, 28, 1],
        };
        break;
      default:
        console.error("Unhandled layer type:", layerTypeToAdd);
        return;
    }
    setLayers((prevLayers) => [...prevLayers, newLayer]);
  };

  const handleRemoveLayer = (id: number | string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
  };

  const handleUpdateLayer = (
    id: number | string,
    newConfig: Partial<LayerConfig>,
  ) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? ({ ...layer, ...newConfig } as LayerConfig) : layer,
      ),
    );
  };

  const handleReorderLayers = (dragIndex: number, hoverIndex: number) => {
    setLayers((prev) => {
      const draggedLayer = prev[dragIndex];
      const newLayers = [...prev];
      newLayers.splice(dragIndex, 1);
      newLayers.splice(hoverIndex, 0, draggedLayer);
      return newLayers;
    });
  };

  const handleAddTrainingData = (grid: number[][][], label: 0 | 1) => {
    setTrainingData((prev) => [
      ...prev,
      { id: generateUniqueId(), grid, label },
    ]);
  };

  const handleRemoveTrainingDataPoint = (id: number | string) => {
    setTrainingData((prev) => prev.filter((dataPoint) => dataPoint.id !== id));
  };

  const predictFromDataCollectionCanvas = useCallback(
    async (grid: number[][][]) => {
      await runPrediction(grid);
    },
    [runPrediction],
  );

  const handleStartTraining = async () => {
    if (trainingData.length === 0) {
      alert("Please add training samples.");
      return;
    }
    if (trainingData.length < batchSize) {
      alert(
        `Batch size (${batchSize}) cannot be greater than the number of training samples (${trainingData.length}). Please reduce batch size or add more samples.`,
      );
      return;
    }
    if (batchSize <= 0) {
      alert("Batch size must be greater than 0.");
      return;
    }
    if (
      !trainingData.some((d) => d.label === 0) ||
      !trainingData.some((d) => d.label === 1)
    ) {
      alert("Please add training examples for both class '0' and class '1'.");
      return;
    }
    await startTrainingLogic(trainingData, numEpochs, batchSize);
  };

  const handleClearTrainingData = () => {
    setTrainingData([]);
    setActiveVizChannel({});
  };

  const handleFullReset = useCallback(async () => {
    setTrainingData([]);
    await resetModelTrainingState();
    setLayers([
      {
        id: generateUniqueId(),
        type: LayerType.Conv,
        filterSize: 3,
        numFilters: 8,
        activation: ActivationFunction.ReLU,
      },
      {
        id: generateUniqueId(),
        type: LayerType.Pool,
        poolSize: 2,
        poolingType: PoolingType.Max,
      },
    ]);
    setActiveVizChannel({});
    // Prediction on empty grid will be triggered by DataCollection's clear via predictFromDataCollectionCanvas
  }, [resetModelTrainingState]);

  // Effect for auto-inference after training success (or on ready state)
  useEffect(() => {
    if (
      (tfStatus === "success" || tfStatus === "ready") &&
      trainingData.length > 0
    ) {
      const randomIndex = Math.floor(Math.random() * trainingData.length);
      const randomSampleGrid = trainingData[randomIndex].grid;
      runPrediction(randomSampleGrid);
    } else if (
      (tfStatus === "success" || tfStatus === "ready") &&
      trainingData.length === 0
    ) {
      // If model is ready but no data, predict on an empty grid (e.g. from data collection canvas)
      // This is typically handled by the onDrawEnd of useDrawingCanvas in DataCollection
    }
  }, [tfStatus, trainingData, runPrediction]);

  // Initial model initialization and prediction on mount/architecture change
  useEffect(() => {
    if (tfStatus === "uninitialized" || tfStatus === "architecture-changed") {
      initializeModel().then((m) => {
        if (m) {
          // If model is built successfully
          // Predict on an empty grid (will be triggered by DataCollection's initial clear)
        }
      });
    }
  }, [tfStatus, initializeModel, predictFromDataCollectionCanvas]);

  const maxBatchSize = trainingData.length > 0 ? trainingData.length : 32; // Batch size can be up to num samples

  const handleChannelCycle = (layerId: string, numTotalChannels: number) => {
    setActiveVizChannel((prev) => {
      const current = prev[layerId] || 0;
      return { ...prev, [layerId]: (current + 1) % numTotalChannels };
    });
  };

  const getTrainingControlsStatus = (
    s: TFModelStatus,
  ): TrainingControlsStatus => {
    if (
      s === "training" ||
      s === "success" ||
      s === "architecture-changed" ||
      s === "error"
    ) {
      return s;
    }
    // Maps uninitialized, initializing, building, compiling, ready to collecting
    return "collecting";
  };
  const mappedStatusForTrainingControls = getTrainingControlsStatus(tfStatus);

  const handleSaveSession = async () => {
    const saveButton = document.querySelector(
      '[aria-label="Save complete session (architecture, training data, and trained weights) to a JSON file"]',
    ) as HTMLButtonElement;

    try {
      // Show loading state
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
      }

      // Save model weights
      const weights = await saveModelWeights();

      if (weights === null && epochsRun > 0) {
        console.warn(
          "Failed to save model weights, but continuing with session save",
        );
      }

      const sessionData: AppSessionData = {
        layers: layers,
        trainingData: trainingData,
        modelWeights: weights,
        epochsRun: epochsRun,
        lossHistory: lossHistory,
      };

      const jsonString = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      a.download = `cnn_session_${timestamp}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const message = weights
        ? `Session saved successfully!\n• Architecture: ${layers.length} layers\n• Training data: ${trainingData.length} samples\n• Trained weights: Included\n• Epochs: ${epochsRun}\n• Loss history: ${lossHistory.length} points`
        : `Session saved successfully!\n• Architecture: ${layers.length} layers\n• Training data: ${trainingData.length} samples\n• Trained weights: Not available\n• Epochs: ${epochsRun}`;

      alert(message);
    } catch (error) {
      console.error("Error saving session:", error);
      alert(
        `Failed to save session data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      // Restore button state
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Session";
      }
    }
  };

  const handleLoadSession = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const result = event.target?.result;
            if (typeof result === "string") {
              const parsedData: AppSessionData = JSON.parse(result);
              // Basic validation
              if (
                parsedData &&
                Array.isArray(parsedData.layers) &&
                Array.isArray(parsedData.trainingData)
              ) {
                // Load layers and training data first
                setLayers(parsedData.layers);
                setTrainingData(parsedData.trainingData);

                // Wait a moment for model to re-initialize, then load weights
                setTimeout(async () => {
                  let message = `Session loaded successfully!\n• Architecture: ${parsedData.layers.length} layers\n• Training data: ${parsedData.trainingData.length} samples`;

                  if (
                    parsedData.modelWeights &&
                    parsedData.modelWeights.length > 0
                  ) {
                    const success = await loadModelWeights(
                      parsedData.modelWeights,
                    );
                    if (success) {
                      message += `\n• Trained weights: Restored (${parsedData.modelWeights.length} layers)`;
                      if (parsedData.epochsRun) {
                        message += `\n• Previous training: ${parsedData.epochsRun} epochs`;
                      }
                    } else {
                      message +=
                        "\n• Trained weights: Failed to restore (using random weights)";
                    }
                  } else {
                    message +=
                      "\n• Trained weights: None found (using random weights)";
                  }

                  alert(message);
                }, 1000); // Give model time to initialize
              } else {
                throw new Error("Invalid session file structure.");
              }
            } else {
              throw new Error("Failed to read file content as string.");
            }
          } catch (error: any) {
            console.error("Error loading session data:", error);
            alert(
              `Failed to load session data: ${error.message || "Unknown error"}`,
            );
          }
        };
        reader.onerror = () => {
          alert("Error reading file.");
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };

  const tabs = [
    {
      id: "training",
      label: "Training",
      icon: "🎯",
      badge: `${layers.length} layers, ${trainingData.length} samples`,
      content: (
        <TrainingTab
          // Architecture props
          layers={layers}
          onUpdateLayer={handleUpdateLayer}
          onRemoveLayer={handleRemoveLayer}
          onAddLayer={handleAddLayer}
          onReorderLayers={handleReorderLayers}
          // Data collection props
          trainingData={trainingData}
          onAddData={handleAddTrainingData}
          onClearTrainingData={handleClearTrainingData}
          onRemoveTrainingDataPoint={handleRemoveTrainingDataPoint}
          augmentFlip={augmentFlip}
          onAugmentFlipChange={setAugmentFlip}
          augmentTranslate={augmentTranslate}
          onAugmentTranslateChange={setAugmentTranslate}
          liveCameraMode={liveCameraMode}
          onLiveCameraModeChange={setLiveCameraMode}
          onCameraStreamingChange={setIsCameraStreaming}
          predictFromCanvas={predictFromDataCollectionCanvas}
          // Training props
          numEpochs={numEpochs}
          onNumEpochsChange={setNumEpochs}
          learningRate={learningRate}
          onLearningRateChange={setLearningRate}
          batchSize={batchSize}
          onBatchSizeChange={(val) => setBatchSize(Math.max(1, val))}
          maxBatchSize={maxBatchSize}
          onStartTraining={handleStartTraining}
          onResetAll={handleFullReset}
          trainingStatus={mappedStatusForTrainingControls}
          epochsRun={epochsRun}
          lossHistory={lossHistory}
          onSaveSession={handleSaveSession}
          onLoadSession={handleLoadSession}
          // GPU props
          gpuBenchmark={gpuBenchmark}
          onRunGPUBenchmark={runGPUBenchmark}
          // Sections state
          isSectionOpen={isSectionOpen}
          toggleSection={toggleSection}
        />
      ),
    },
    {
      id: "inference",
      label: "Live Inference",
      icon: "🔍",
      badge: liveCameraMode
        ? "LIVE"
        : prediction.label !== "?"
          ? prediction.label
          : undefined,
      content: (
        <InferenceTab
          modelReady={
            !!model &&
            (tfStatus === "ready" ||
              tfStatus === "success" ||
              tfStatus === "training")
          }
          prediction={prediction}
          onPredictFromCanvas={predictFromDataCollectionCanvas}
          liveCameraMode={liveCameraMode}
          onLiveCameraModeChange={setLiveCameraMode}
          onCameraStreamingChange={setIsCameraStreaming}
          isCameraStreaming={isCameraStreaming}
          liveLayerOutputs={liveLayerOutputs}
          fcWeightsViz={fcWeightsViz}
          activeVizChannel={activeVizChannel}
          onChannelCycle={handleChannelCycle}
          pipelineStatus={tfStatus}
          isSectionOpen={isSectionOpen}
          toggleSection={toggleSection}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <TabbedInterface
        tabs={tabs}
        defaultActiveTab="training"
        className="w-full"
        onTabChange={(tabId) => {
          console.log(`Switched to ${tabId} tab`);
        }}
      />
    </div>
  );
};
