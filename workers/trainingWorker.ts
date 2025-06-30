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

export interface TrainingWorkerResponse {
  type:
    | "TRAINING_PROGRESS"
    | "TRAINING_COMPLETE"
    | "TRAINING_ERROR"
    | "PREDICTION_RESULT"
    | "MODEL_READY";
  payload?: any;
}

// Global worker state
let model: tf.Sequential | null = null;
let isTraining = false;
let shouldStop = false;

// Initialize TensorFlow.js in worker
const initializeTensorFlow = async () => {
  try {
    await tf.ready();
    console.log(" TensorFlow.js initialized in worker");

    // Try backends in order of preference: WebGPU > WebGL > CPU
    try {
      await tf.setBackend("webgpu");
      await tf.ready();
      if (tf.getBackend() === "webgpu") {
        console.log(" Worker using WebGPU backend (best performance)");
        return true;
      }
    } catch (webgpuError) {
      console.log(" WebGPU not available in worker, trying WebGL...");
    }

    // Fallback to WebGL
    try {
      const webglVersion = tf.ENV.get("WEBGL_VERSION");
      if (typeof webglVersion === "number" && webglVersion > 0) {
        await tf.setBackend("webgl");
        await tf.ready();
        if (tf.getBackend() === "webgl") {
          console.log(" Worker using WebGL backend");
          return true;
        }
      }
    } catch (webglError) {
      console.log(" WebGL not available in worker, using CPU...");
    }

    // Final fallback to CPU
    await tf.setBackend("cpu");
    console.log(" Worker using CPU backend");
    return true;
  } catch (error) {
    console.error("Error Failed to initialize TensorFlow.js in worker:", error);
    return false;
  }
};

// Convert layer config to TensorFlow.js layer
const createTFLayer = (layerConfig: LayerConfig): tf.layers.Layer => {
  // Debug logging to understand the serialization issue
  console.log("Creating layer with config:", layerConfig);
  console.log("Layer type received:", layerConfig.type);
  console.log("LayerType enum values:", LayerType);

  // Normalize the layer type to handle serialization issues
  const normalizedType = normalizeLayerType(layerConfig.type);
  console.log("Normalized layer type:", normalizedType);

  switch (normalizedType) {
    case LayerType.Conv:
      return tf.layers.conv2d({
        filters: layerConfig.numFilters || 8,
        kernelSize: layerConfig.filterSize || 3,
        activation: mapActivationFunction(layerConfig.activation) as any,
        padding: "same",
      });

    case LayerType.Pool:
      return tf.layers.maxPooling2d({
        poolSize: layerConfig.poolSize || 2,
        strides: layerConfig.poolSize || 2,
      });

    case LayerType.Flatten:
      return tf.layers.flatten();

    case LayerType.Dense:
      return tf.layers.dense({
        units: layerConfig.units || 128,
        activation: mapActivationFunction(layerConfig.activation) as any,
      });

    case LayerType.Dropout:
      return tf.layers.dropout({
        rate: layerConfig.rate || 0.2,
      });

    default:
      throw new Error(
        `Unsupported layer type: ${layerConfig.type} (normalized: ${normalizedType})`,
      );
  }
};

// Helper function to normalize layer types from serialization
const normalizeLayerType = (type: any): LayerType => {
  // Handle both string and enum values
  if (typeof type === "string") {
    // Convert string to lowercase and map to enum
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case "conv":
        return LayerType.Conv;
      case "activation":
        return LayerType.Activation;
      case "pool":
        return LayerType.Pool;
      case "dropout":
        return LayerType.Dropout;
      case "flatten":
        return LayerType.Flatten;
      case "dense":
        return LayerType.Dense;
      case "reshape":
        return LayerType.Reshape;
      default:
        // If it's already the correct enum value, return it
        if (Object.values(LayerType).includes(type as LayerType)) {
          return type as LayerType;
        }
        throw new Error(`Unknown layer type string: ${type}`);
    }
  }

  // If it's already a LayerType enum value, return it
  if (Object.values(LayerType).includes(type)) {
    return type;
  }

  throw new Error(`Invalid layer type: ${type}`);
};

// Map activation functions
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

// Build model from layer configs
const buildModel = (layers: LayerConfig[]): tf.Sequential => {
  const model = tf.sequential();

  // Add input layer for 28x28x3 images
  let isFirstLayer = true;

  console.log("Building model with layers:", layers);

  for (const layerConfig of layers) {
    const layer = createTFLayer(layerConfig);
    const normalizedType = normalizeLayerType(layerConfig.type);

    if (isFirstLayer && normalizedType === LayerType.Conv) {
      model.add(
        tf.layers.conv2d({
          filters: layerConfig.numFilters || 8,
          kernelSize: layerConfig.filterSize || 3,
          activation: mapActivationFunction(layerConfig.activation) as any,
          padding: "same",
          inputShape: [28, 28, 3],
        }),
      );
      isFirstLayer = false;
    } else {
      model.add(layer);
    }
  }

  // Ensure we have flatten and output layers
  const lastLayer = layers[layers.length - 1];
  if (lastLayer?.type !== LayerType.Flatten) {
    model.add(tf.layers.flatten());
  }

  // Add final dense layer if not present
  if (lastLayer?.type !== LayerType.Dense) {
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
          self.postMessage({
            type: "TRAINING_COMPLETE",
            payload: {
              modelWeights: await model!.getWeights().map((w) => w.dataSync()),
            },
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

  try {
    switch (type) {
      case "INIT_TRAINING":
        console.log(" Initializing training worker...");

        const initialized = await initializeTensorFlow();
        if (!initialized) {
          throw new Error("Failed to initialize TensorFlow.js");
        }

        const { layers, learningRate } = payload;
        model = buildModel(layers);
        compileModel(model, learningRate);

        self.postMessage({
          type: "MODEL_READY",
          payload: { success: true },
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
