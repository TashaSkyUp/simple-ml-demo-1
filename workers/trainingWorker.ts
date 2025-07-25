/*
 * Training Web Worker - Background TensorFlow.js Processing
 * © 2024 Hopping Mad Games, LLC. All Rights Reserved.
 *
 * PROPRIETARY SOFTWARE - NOT FOR COMMERCIAL USE
 * This code is proprietary and confidential. Unauthorized copying,
 * distribution, or use is strictly prohibited.
 */

// Training Web Worker - Runs training in background thread
// This prevents browser tab throttling from pausing training

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import "@tensorflow/tfjs-backend-webgl";
import type { LayerConfig, TrainingDataPoint } from "../types";
import { LayerType, ActivationFunction } from "../types";

// Worker message types
export interface TrainingWorkerMessage {
  type:
    | "INIT_TRAINING"
    | "START_TRAINING"
    | "STOP_TRAINING"
    | "PREDICT"
    | "DISPOSE";
  payload?: any;
}

interface SerializedWeight {
  shape: number[];
  data: number[];
}

export interface TrainingWorkerResponse {
  type:
    | "TRAINING_PROGRESS"
    | "TRAINING_COMPLETE"
    | "TRAINING_ERROR"
    | "PREDICTION_RESULT"
    | "MODEL_READY";
  payload?: {
    modelWeights?: SerializedWeight[];
    [key: string]: any;
  };
}

// Global worker state
let model: tf.Sequential | null = null;
let isTraining = false;
let shouldStop = false;

// Initialize TensorFlow.js in worker
const initializeTensorFlow = async () => {
  try {
    console.log(" Initializing TensorFlow.js in worker context...");

    // Web Workers cannot access WebGL/WebGPU contexts
    // Force CPU backend for worker context
    await tf.setBackend("cpu");
    await tf.ready();

    const backend = tf.getBackend();
    console.log(
      ` Worker using ${backend} backend (WebGL/WebGPU not available in workers)`,
    );

    // Verify CPU backend is working
    const testTensor = tf.tensor([1, 2, 3, 4]);
    const result = await testTensor.data();
    testTensor.dispose();

    if (result.length === 4) {
      console.log(" CPU backend verified working in worker");
      return true;
    } else {
      throw new Error("CPU backend test failed");
    }
  } catch (error) {
    console.error("Error Failed to initialize TensorFlow.js in worker:", error);
    return false;
  }
};

// Map activation functions to match main thread
const mapActivationFunction = (activation?: ActivationFunction): string => {
  switch (activation) {
    case ActivationFunction.ReLU:
      return "relu";
    case ActivationFunction.Sigmoid:
      return "sigmoid";
    case ActivationFunction.Tanh:
      return "tanh";
    case ActivationFunction.SoftMax:
      return "softmax";
    default:
      return "relu";
  }
};

// Build model from layer configs - using same logic as main thread
const buildModel = (layers: LayerConfig[]): tf.Sequential => {
  const model = tf.sequential();

  console.log("Building model with layers:", layers);

  // Always add input layer first
  model.add(
    tf.layers.inputLayer({ inputShape: [28, 28, 3], name: "input_layer" }),
  );

  // Add all layers from config using main thread logic
  for (const layerConfig of layers) {
    switch (layerConfig.type) {
      case LayerType.Conv:
        model.add(
          tf.layers.conv2d({
            filters: layerConfig.numFilters || 8,
            kernelSize: layerConfig.filterSize || 3,
            activation: mapActivationFunction(layerConfig.activation) || "relu",
            padding: "valid", // Match main thread padding
          }),
        );
        break;

      case LayerType.Pool:
        if ((layerConfig as any).poolingType === "max") {
          model.add(
            tf.layers.maxPooling2d({
              poolSize: layerConfig.poolSize || 2,
              strides: layerConfig.poolSize || 2,
            }),
          );
        } else {
          model.add(
            tf.layers.averagePooling2d({
              poolSize: layerConfig.poolSize || 2,
              strides: layerConfig.poolSize || 2,
            }),
          );
        }
        break;

      case LayerType.Activation:
        model.add(
          tf.layers.activation({
            activation:
              mapActivationFunction((layerConfig as any).func) || "relu",
          }),
        );
        break;

      case LayerType.Dropout:
        model.add(
          tf.layers.dropout({
            rate: layerConfig.rate || 0.2,
          }),
        );
        break;

      case LayerType.Flatten:
        model.add(tf.layers.flatten());
        break;

      case LayerType.Dense:
        model.add(
          tf.layers.dense({
            units: layerConfig.units || 128,
            activation: mapActivationFunction(layerConfig.activation) || "relu",
          }),
        );
        break;

      case LayerType.Reshape:
        model.add(
          tf.layers.reshape({
            targetShape: (layerConfig as any).targetShape || [1],
          }),
        );
        break;

      default:
        console.warn(`Unknown layer type: ${layerConfig.type}`);
        break;
    }
  }

  // Add flatten layer before final dense if needed
  const flattenAdded = layers.some((layer) => layer.type === LayerType.Flatten);
  if (!flattenAdded) {
    model.add(tf.layers.flatten());
  }

  // Add final output layer if not present
  const hasDenseOutput = layers.some(
    (layer) =>
      layer.type === LayerType.Dense &&
      (layer.units === 1 || layer.units === undefined),
  );

  if (!hasDenseOutput) {
    model.add(
      tf.layers.dense({
        units: 1,
        activation: "sigmoid",
      }),
    );
  }

  return model;
};

// Compile model
const compileModel = (model: tf.Sequential, learningRate: number) => {
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
};

// Main training function
const trainModel = async (
  trainingData: TrainingDataPoint[],
  numEpochs: number,
  batchSize: number,
): Promise<void> => {
  if (!model) {
    throw new Error("Model not initialized");
  }

  isTraining = true;
  shouldStop = false;

  // Prepare training data
  const xsArray = trainingData.map((dp) => {
    if (Array.isArray(dp.grid[0][0])) {
      return dp.grid;
    } else {
      return dp.grid.map((row: any[]) =>
        row.map((val: number) => [val, val, val]),
      );
    }
  });

  const ysArray = trainingData.map((dp) => dp.label);

  const xs = tf.tensor(xsArray, [trainingData.length, 28, 28, 3], "float32");
  const ys = tf.tensor2d(ysArray, [trainingData.length, 1]);

  try {
    await model.fit(xs, ys, {
      epochs: numEpochs,
      batchSize: batchSize,
      shuffle: true,
      callbacks: {
        onEpochBegin: async () => {
          if (shouldStop) {
            throw new Error("Training stopped by user");
          }
        },
        onEpochEnd: async (epoch: number, logs: any) => {
          if (shouldStop) {
            throw new Error("Training stopped by user");
          }

          // Send progress update to main thread
          self.postMessage({
            type: "TRAINING_PROGRESS",
            payload: {
              epoch: epoch + 1,
              totalEpochs: numEpochs,
              loss: logs?.loss || 0,
              accuracy: logs?.acc || 0,
            },
          } as TrainingWorkerResponse);
        },
        onTrainEnd: async () => {
          isTraining = false;

          // Send completion message
          const serialized = await Promise.all(
            model!.getWeights().map(async (w) => ({
              shape: w.shape,
              data: Array.from(await w.data()),
            })),
          );

          self.postMessage({
            type: "TRAINING_COMPLETE",
            payload: { modelWeights: serialized },
          } as TrainingWorkerResponse);
        },
      },
    });
  } finally {
    xs.dispose();
    ys.dispose();
    isTraining = false;
  }
};

// Run prediction
const runPrediction = async (inputGrid: number[][][]): Promise<void> => {
  if (!model) {
    throw new Error("Model not initialized");
  }

  // Prepare input data
  let processedGrid: number[][][] = inputGrid;
  if (!Array.isArray(inputGrid[0][0])) {
    processedGrid = (inputGrid as any).map((row: number[]) =>
      row.map((val: number) => [val, val, val]),
    );
  }

  const inputTensor = tf.tensor([processedGrid], [1, 28, 28, 3], "float32");

  try {
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const predictionData = await prediction.data();
    const confidence = predictionData[0];
    const label = confidence > 0.5 ? "1" : "0";

    self.postMessage({
      type: "PREDICTION_RESULT",
      payload: {
        label,
        confidence: confidence > 0.5 ? confidence : 1 - confidence,
      },
    } as TrainingWorkerResponse);
  } finally {
    inputTensor.dispose();
  }
};

// Message handler
self.onmessage = async (event: MessageEvent<TrainingWorkerMessage>) => {
  const { type, payload } = event.data;

  console.log(`🔧 Worker received message: ${type}`);

  try {
    switch (type) {
      case "INIT_TRAINING":
        console.log("🚀 Initializing training worker...");

        const initialized = await initializeTensorFlow();
        if (!initialized) {
          throw new Error("Failed to initialize TensorFlow.js in worker");
        }

        console.log("🔧 Building model in worker...");
        const { layers, learningRate } = payload;

        try {
          model = buildModel(layers);
          compileModel(model, learningRate);
          console.log("✅ Model built and compiled successfully in worker");
        } catch (modelError) {
          console.error("❌ Model building failed:", modelError);
          throw new Error(`Model building failed: ${modelError.message}`);
        }

        self.postMessage({
          type: "MODEL_READY",
          payload: {
            success: true,
            backend: tf.getBackend(),
            message: "Worker initialized successfully",
          },
        } as TrainingWorkerResponse);
        break;

      case "START_TRAINING":
        const { trainingData, numEpochs, batchSize } = payload;

        if (isTraining) {
          throw new Error("Training already in progress");
        }

        console.log(
          ` Starting training: ${numEpochs} epochs, batch size: ${batchSize}`,
        );
        await trainModel(trainingData, numEpochs, batchSize);
        break;

      case "STOP_TRAINING":
        console.log(" Stopping training...");
        shouldStop = true;
        isTraining = false;
        break;

      case "PREDICT":
        await runPrediction(payload.inputGrid);
        break;

      case "DISPOSE":
        console.log(" Disposing worker resources...");
        if (model) {
          model.dispose();
          model = null;
        }
        shouldStop = true;
        isTraining = false;
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error("Error Worker error:", error);
    self.postMessage({
      type: "TRAINING_ERROR",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    } as TrainingWorkerResponse);
  }
};

// Handle worker termination
self.addEventListener("beforeunload", () => {
  if (model) {
    model.dispose();
  }
});

// Global error handler for worker
self.addEventListener("error", (error) => {
  console.error("🚨 Worker global error:", error);
  self.postMessage({
    type: "TRAINING_ERROR",
    payload: {
      error: `Worker error: ${error.message || error}`,
    },
  } as TrainingWorkerResponse);
});

// Handle unhandled promise rejections
self.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Worker unhandled promise rejection:", event.reason);
  self.postMessage({
    type: "TRAINING_ERROR",
    payload: {
      error: `Worker promise rejection: ${event.reason}`,
    },
  } as TrainingWorkerResponse);
});

// Add startup logging
console.log("🔧 Training worker script loaded");
