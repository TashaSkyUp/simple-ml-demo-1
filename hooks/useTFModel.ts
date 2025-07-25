import { useState, useRef, useCallback, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import "@tensorflow/tfjs-backend-webgl";
import type {
  LayerConfig,
  TrainingDataPoint,
  PredictionState,
  LiveLayerOutput,
  ConvLayerConfig,
  PoolLayerConfig,
  ActivationLayerConfig,
  DropoutLayerConfig,
  DenseLayerConfig,
  FlattenLayerConfig,
  ReshapeLayerConfig,
} from "../types";
import {
  LayerType,
  ActivationFunction as AppActivationFunction,
} from "../types"; // Renamed to avoid tf.ActivationFunction
import { createMatrix } from "../utils/cnnUtils"; // For FC weights viz

// Web Worker integration
interface TrainingWorkerMessage {
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

interface TrainingWorkerResponse {
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

// Backend performance comparison
const compareBackendPerformance = async (): Promise<{
  webglSpeed: number;
  cpuSpeed: number;
  webgpuSpeed: number;
  recommendation: string;
}> => {
  console.log("🏁 Running backend performance comparison...");

  const testOp = async (backend: string): Promise<number> => {
    try {
      await tf.setBackend(backend);
      await tf.ready();

      // Small model test (realistic for this app)
      const iterations = 20;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const a = tf.randomNormal([28, 28, 1]);
        const conv = tf.conv2d(
          a.expandDims(0) as tf.Tensor4D,
          tf.randomNormal([3, 3, 1, 8]) as tf.Tensor4D,
          1,
          "same",
        );
        const pool = tf.maxPool(conv, 2, 2, "valid");
        await pool.data();
        a.dispose();
        conv.dispose();
        pool.dispose();
      }

      const endTime = performance.now();
      return iterations / ((endTime - startTime) / 1000);
    } catch (error) {
      console.warn(`Backend ${backend} test failed:`, error);
      return 0;
    }
  };

  const webgpuSpeed = await testOp("webgpu");
  const webglSpeed = await testOp("webgl");
  const cpuSpeed = await testOp("cpu");

  // Find the fastest backend
  const backends = [
    { name: "webgpu", speed: webgpuSpeed },
    { name: "webgl", speed: webglSpeed },
    { name: "cpu", speed: cpuSpeed },
  ].filter((b) => b.speed > 0);

  const fastest = backends.reduce((prev, current) =>
    current.speed > prev.speed ? current : prev,
  );

  let recommendation = fastest.name;

  if (fastest.name === "webgpu") {
    console.log(` WebGPU is fastest at ${fastest.speed.toFixed(1)} ops/sec`);
  } else if (fastest.name === "webgl") {
    const ratio = webglSpeed / cpuSpeed;
    console.log(` WebGL is ${ratio.toFixed(1)}x faster - using GPU`);
  } else {
    const webglRatio = cpuSpeed / (webglSpeed || 1);
    console.log(` CPU is ${webglRatio.toFixed(1)}x faster - using CPU`);
  }

  return { webglSpeed, cpuSpeed, webgpuSpeed, recommendation };
};

// Enhanced GPU acceleration setup
const initializeGPUAcceleration = async () => {
  await tf.ready();

  // Check all backend availability without changing current backend
  console.log(" Checking backend availability...");

  const availability: { [key: string]: boolean } = {
    webgpu: false,
    webgl: false,
    cpu: true, // CPU is always available
  };

  // Check WebGPU availability
  try {
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      availability.webgpu = true;
      console.log(`Success WEBGPU: Available`);
    } else {
      console.log(`Info WEBGPU: Not supported by browser`);
    }
  } catch (error) {
    console.log(`Error WEBGPU: Not available - ${error}`);
  }

  // Check WebGL availability
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      availability.webgl = true;
      console.log(`Success WEBGL: Available`);
    } else {
      console.log(`Error WEBGL: Context creation failed`);
    }
  } catch (error) {
    console.log(`Error WEBGL: Not available - ${error}`);
  }

  // Log detailed availability report
  console.log(" Backend Availability Report:");
  if (availability.webgpu) {
    console.log("   WebGPU: Next-generation GPU API available (experimental)");
  }
  if (availability.webgl) {
    console.log("   WebGL: Standard GPU acceleration available");
  }
  console.log("   CPU: Always available as fallback");

  // Backend selection with WebGPU prioritization
  let selectedBackend = "cpu";
  let backendReason = "fallback";

  // Prioritize WebGPU for best performance when available
  if (availability.webgpu) {
    selectedBackend = "webgpu";
    backendReason = "next-generation GPU performance";
    console.log(" Selecting WebGPU as primary backend (best performance)");
  } else if (availability.webgl) {
    selectedBackend = "webgl";
    backendReason = "stable GPU acceleration";
    console.log(
      " Selecting WebGL as fallback backend (stable GPU acceleration)",
    );
  } else {
    console.log(" Falling back to CPU backend");
  }

  // Set the selected backend with robust error handling
  const trySetBackend = async (
    backend: string,
    retries = 3,
  ): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      try {
        await tf.setBackend(backend);
        await tf.ready();

        // Verify backend actually switched
        if (tf.getBackend() !== backend) {
          throw new Error(
            `Backend switch failed: expected ${backend}, got ${tf.getBackend()}`,
          );
        }

        // Test with a simple operation
        const testTensor = tf.zeros([2, 2]);
        await testTensor.data();
        testTensor.dispose();

        console.log(
          `Success TensorFlow.js using ${backend} backend (${backendReason})`,
        );
        return true;
      } catch (error) {
        console.warn(
          `Attempt ${i + 1}/${retries} failed for ${backend}:`,
          error,
        );
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
    return false;
  };

  // Try to set the selected backend with fallbacks
  let backendSet = false;
  const fallbackOrder =
    selectedBackend === "webgpu"
      ? ["webgpu", "webgl", "cpu"]
      : selectedBackend === "webgl"
        ? ["webgl", "cpu"]
        : ["cpu"];

  console.log(`🎯 Backend fallback order:`, fallbackOrder);
  console.log(`🔍 Backend availability:`, availability);

  for (const backend of fallbackOrder) {
    if (availability[backend]) {
      console.log(`🚀 Attempting to initialize ${backend} backend...`);
      backendSet = await trySetBackend(backend);
      if (backendSet) {
        selectedBackend = backend;
        console.log(`🎉 Successfully using ${backend} backend!`);
        break;
      } else {
        console.warn(
          `⚠️ ${backend} backend failed despite being marked as available`,
        );
      }
    } else {
      console.log(`⏭️ Skipping ${backend} backend (not available)`);
    }
  }

  if (!backendSet) {
    console.error(
      "🚨 CRITICAL: Failed to initialize any backend, forcing CPU as last resort",
    );
    try {
      await tf.setBackend("cpu");
      await tf.ready();
      selectedBackend = "cpu";
      console.log("✅ CPU backend forced successfully");
    } catch (error) {
      console.error("💥 FATAL: Even CPU backend failed:", error);
      throw new Error("TensorFlow.js completely failed to initialize");
    }
  }

  // Configure backend-specific optimizations
  try {
    if (selectedBackend === "webgpu") {
      console.log(" WebGPU backend configured (experimental)");
      // WebGPU is still experimental, minimal config
    } else if (selectedBackend === "webgl") {
      // Conservative settings for better compatibility
      tf.env().set("WEBGL_PACK", true);
      tf.env().set("WEBGL_RENDER_FLOAT32_CAPABLE", true);
      tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0.5);

      // Log GPU info
      try {
        const gpuInfo = await (tf.backend() as any).getGPGPUContext?.();
        if (gpuInfo) {
          console.log(" GPU acceleration active");
          console.log("GPU Info:", {
            vendor: gpuInfo.gl?.getParameter(gpuInfo.gl.VENDOR),
            renderer: gpuInfo.gl?.getParameter(gpuInfo.gl.RENDERER),
          });
        }
      } catch (error) {
        console.warn("Could not get GPU info:", error);
      }
    }

    // Warm up the backend
    const warmupTensor = tf.zeros([1, 1]);
    await warmupTensor.data();
    warmupTensor.dispose();

    // Additional stabilization wait
    await new Promise((resolve) => setTimeout(resolve, 200));
  } catch (error) {
    console.warn("Backend configuration error:", error);
  }

  console.log(` Backend initialized: ${selectedBackend.toUpperCase()}`);
};

// GPU acceleration will be initialized on-demand during model initialization
let gpuInitialized = false;

interface UseTFModelProps {
  initialLayers: LayerConfig[];
  learningRate: number;
  useWebWorker?: boolean; // Enable Web Worker for background training
  // numEpochs and batchSizeProp will be passed directly to startTrainingLogic
}

export type ModelStatus =
  | "uninitialized"
  | "initializing"
  | "building"
  | "compiling"
  | "ready"
  | "training"
  | "success"
  | "architecture-changed"
  | "error";

// Helper to map app's activation function enum to TF.js string
const mapActivation = (
  func?: AppActivationFunction,
): AppActivationFunction | undefined => {
  if (!func) return undefined;
  // AppActivationFunction values are string literals like 'relu', 'sigmoid', etc.
  // These string literals are directly assignable to tf.layers.ActivationIdentifier.
  return func;
};

export const useTFModel = ({
  initialLayers,
  learningRate,
  useWebWorker = true,
}: UseTFModelProps) => {
  const modelRef = useRef<tf.Sequential | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<ModelStatus>("uninitialized");
  const [workerStatus, setWorkerStatus] = useState<
    "uninitialized" | "initializing" | "ready" | "error"
  >("uninitialized");
  const [prediction, setPrediction] = useState<PredictionState>({
    label: "?",
    confidence: 0,
  });
  const [epochsRun, setEpochsRun] = useState<number>(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [liveLayerOutputs, setLiveLayerOutputs] = useState<LiveLayerOutput[]>(
    [],
  );
  const [fcWeightsViz, setFcWeightsViz] = useState<number[][] | null>(null);
  const [isUsingBackgroundWorker, setIsUsingBackgroundWorker] =
    useState<boolean>(false);
  const isUsingBackgroundWorkerRef = useRef<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);
  const [isHybridTraining, setIsHybridTraining] = useState<boolean>(false);
  const [hybridTrainingState, setHybridTrainingState] = useState<{
    totalEpochs: number;
    currentEpoch: number;
    trainingData: TrainingDataPoint[];
    batchSize: number;
    isActive: boolean;
  } | null>(null);
  const [gpuBenchmark, setGpuBenchmark] = useState<{
    opsPerSecond: number;
    isRunning: boolean;
    lastRun: Date | null;
    webglSpeed?: number;
    cpuSpeed?: number;
    webgpuSpeed?: number;
    currentBackend?: string;
  }>({
    opsPerSecond: 0,
    isRunning: false,
    lastRun: null,
  });

  const currentLayersConfigRef = useRef<LayerConfig[]>(initialLayers);
  const currentLearningRateRef = useRef<number>(learningRate);
  const prevLearningRatePropRef = useRef(learningRate);

  // Enhanced benchmark function with backend comparison
  const runGPUBenchmark = useCallback(async () => {
    if (gpuBenchmark.isRunning) return;

    setGpuBenchmark((prev) => ({ ...prev, isRunning: true }));

    try {
      console.log("🏁 Running comprehensive backend benchmark...");

      // Test available backends with realistic CNN operations
      const testBackend = async (backend: string): Promise<number> => {
        try {
          await tf.setBackend(backend);
          await tf.ready();

          // Verify backend actually switched
          if (tf.getBackend() !== backend) {
            console.warn(
              `Failed to switch to ${backend}, using ${tf.getBackend()}`,
            );
            return 0;
          }
        } catch (error) {
          console.warn(`Backend ${backend} not available:`, error);
          return 0;
        }

        const iterations = 50;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          // Realistic CNN operations for this app
          const input = tf.randomNormal([1, 28, 28, 1]);
          const conv1 = tf.conv2d(
            input as tf.Tensor4D,
            tf.randomNormal([3, 3, 1, 8]) as tf.Tensor4D,
            1,
            "same",
          );
          const pool1 = tf.maxPool(conv1, 2, 2, "valid");
          const conv2 = tf.conv2d(
            pool1 as tf.Tensor4D,
            tf.randomNormal([3, 3, 8, 16]) as tf.Tensor4D,
            1,
            "same",
          );
          const pool2 = tf.maxPool(conv2, 2, 2, "valid");
          const flattened = tf.reshape(pool2, [1, -1]);
          const dense = tf.matMul(
            flattened,
            tf.randomNormal([flattened.shape[1] || 1, 1]),
          );

          await dense.data();

          input.dispose();
          conv1.dispose();
          pool1.dispose();
          conv2.dispose();
          pool2.dispose();
          flattened.dispose();
          dense.dispose();
        }

        const endTime = performance.now();
        return iterations / ((endTime - startTime) / 1000);
      };

      // Test WebGPU first (if available)
      const webgpuSpeed = await testBackend("webgpu");
      console.log(`WebGPU speed: ${webgpuSpeed.toFixed(1)} ops/sec`);

      // Test WebGL
      const webglSpeed = await testBackend("webgl");
      console.log(`WebGL speed: ${webglSpeed.toFixed(1)} ops/sec`);

      // Test CPU
      const cpuSpeed = await testBackend("cpu");
      console.log(`CPU speed: ${cpuSpeed.toFixed(1)} ops/sec`);

      // Determine best backend
      const currentBackend = tf.getBackend();
      const speeds = [
        { name: "webgpu", speed: webgpuSpeed },
        { name: "webgl", speed: webglSpeed },
        { name: "cpu", speed: cpuSpeed },
      ].filter((b) => b.speed > 0);

      const fastest = speeds.reduce((prev, current) =>
        current.speed > prev.speed ? current : prev,
      );

      let optimalBackend = fastest.name;

      if (fastest.name === "webgpu") {
        console.log(
          ` WebGPU is fastest at ${fastest.speed.toFixed(1)} ops/sec`,
        );
      } else if (fastest.name === "webgl") {
        const ratio = webglSpeed / cpuSpeed;
        console.log(` WebGL is ${ratio.toFixed(1)}x faster than CPU`);
      } else {
        const webglRatio = cpuSpeed / (webglSpeed || 1);
        console.log(` CPU is ${webglRatio.toFixed(1)}x faster - recommend CPU`);
      }

      // Switch to optimal backend if different
      if (currentBackend !== optimalBackend) {
        await tf.setBackend(optimalBackend);
        console.log(
          ` Switched to ${optimalBackend} backend for better performance`,
        );
      }

      setGpuBenchmark({
        opsPerSecond: Math.round(fastest.speed),
        webglSpeed: Math.round(webglSpeed),
        cpuSpeed: Math.round(cpuSpeed),
        webgpuSpeed: webgpuSpeed > 0 ? Math.round(webgpuSpeed) : undefined,
        currentBackend: tf.getBackend(),
        isRunning: false,
        lastRun: new Date(),
      });
    } catch (error) {
      console.error("Benchmark failed:", error);
      setGpuBenchmark((prev) => ({ ...prev, isRunning: false }));
    }
  }, [gpuBenchmark.isRunning]);

  useEffect(() => {
    // Handles changes to layers config
    currentLayersConfigRef.current = initialLayers;
    setStatus("architecture-changed");
    // No modelRef.current.dispose() here; buildAndCompileModel will handle it.
  }, [initialLayers]);

  useEffect(() => {
    // Handles changes to learningRate prop
    currentLearningRateRef.current = learningRate;

    if (prevLearningRatePropRef.current !== learningRate) {
      if (modelRef.current && (status === "ready" || status === "success")) {
        // Only recompile with new learning rate, don't rebuild the entire model
        try {
          modelRef.current.compile({
            optimizer: tf.train.adam(currentLearningRateRef.current),
            loss: "binaryCrossentropy",
            metrics: ["accuracy"],
          });
          console.log(
            ` Model recompiled with new learning rate: ${learningRate}`,
          );
        } catch (error) {
          console.error(
            "Failed to recompile model with new learning rate:",
            error,
          );
        }
      }
    }
    prevLearningRatePropRef.current = learningRate;
  }, [learningRate, status]);

  const buildAndCompileModel = useCallback(async () => {
    setStatus("building");
    if (modelRef.current) {
      modelRef.current.dispose();
      modelRef.current = null;
    }

    const newModel = tf.sequential();
    newModel.add(
      tf.layers.inputLayer({ inputShape: [28, 28, 3], name: "input_layer" }),
    );

    try {
      for (const currentItem of currentLayersConfigRef.current) {
        const layerConfig: LayerConfig = currentItem;
        switch (layerConfig.type) {
          case LayerType.Conv:
            const convConfig = layerConfig as ConvLayerConfig;
            newModel.add(
              tf.layers.conv2d({
                filters: convConfig.numFilters,
                kernelSize: convConfig.filterSize,
                activation:
                  mapActivation(convConfig.activation) ??
                  AppActivationFunction.ReLU,
                padding: "valid",
              }),
            );
            break;
          case LayerType.Pool:
            const poolConfig = layerConfig as PoolLayerConfig;
            if (poolConfig.poolingType === "max") {
              newModel.add(
                tf.layers.maxPooling2d({
                  poolSize: poolConfig.poolSize,
                  strides: poolConfig.poolSize,
                }),
              );
            } else {
              newModel.add(
                tf.layers.averagePooling2d({
                  poolSize: poolConfig.poolSize,
                  strides: poolConfig.poolSize,
                }),
              );
            }
            break;
          case LayerType.Activation:
            const activationConfig = layerConfig as ActivationLayerConfig;
            newModel.add(
              tf.layers.activation({
                activation:
                  mapActivation(activationConfig.func) ??
                  AppActivationFunction.ReLU,
              }),
            );
            break;
          case LayerType.Dropout:
            const dropoutConfig = layerConfig as DropoutLayerConfig;
            newModel.add(tf.layers.dropout({ rate: dropoutConfig.rate }));
            break;
          case LayerType.Flatten:
            newModel.add(tf.layers.flatten());
            break;
          case LayerType.Dense:
            const denseConfig = layerConfig as DenseLayerConfig;
            newModel.add(
              tf.layers.dense({
                units: denseConfig.units,
                activation:
                  mapActivation(denseConfig.activation) ??
                  AppActivationFunction.ReLU,
              }),
            );
            break;
          case LayerType.Reshape:
            const reshapeConfig = layerConfig as ReshapeLayerConfig;
            newModel.add(
              tf.layers.reshape({ targetShape: reshapeConfig.targetShape }),
            );
            break;
          default:
            console.warn("Unsupported layer type:", (layerConfig as any).type);
        }
      }

      // Revised final layer logic:
      // After adding all user-defined layers...
      let currentLastLayer = newModel.layers[newModel.layers.length - 1];
      let outputShapeArray = currentLastLayer.outputShape as number[];

      // Ensure Flatten if output is not 2D (batch, features)
      // The input layer has outputShape [null, 28, 28, 1], so length is 4.
      // A Flatten layer's output is [null, features], length 2.
      // A Dense layer's output is [null, units], length 2.
      if (outputShapeArray.length > 2) {
        newModel.add(tf.layers.flatten({ name: "auto_flatten" }));
        currentLastLayer = newModel.layers[newModel.layers.length - 1];
      }

      // Ensure final Dense(1, 'sigmoid') layer for binary classification
      let needsFinalDenseOutputLayer = true;
      if (currentLastLayer.getClassName() === "Dense") {
        const denseConfig = currentLastLayer.getConfig() as any;
        if (denseConfig.units === 1 && denseConfig.activation === "sigmoid") {
          needsFinalDenseOutputLayer = false;
        }
      }

      if (needsFinalDenseOutputLayer) {
        newModel.add(
          tf.layers.dense({
            units: 1,
            activation: "sigmoid",
            name: "auto_dense_output",
          }),
        );
      }

      setStatus("compiling");
      newModel.compile({
        optimizer: tf.train.adam(currentLearningRateRef.current),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      newModel.summary(undefined, undefined, (message: string) =>
        console.log(message),
      );
      modelRef.current = newModel;
      setStatus("ready");
      return newModel;
    } catch (error) {
      console.error("Error building or compiling model:", error);
      setStatus("error");
      if (newModel) newModel.dispose();
      modelRef.current = null;
      return null;
    }
  }, []);

  const initializeModel = useCallback(async () => {
    if (
      status === "building" ||
      status === "compiling" ||
      status === "initializing"
    )
      return modelRef.current;

    setStatus("initializing");

    // Initialize GPU acceleration if not already done
    if (!gpuInitialized) {
      try {
        console.log(" Initializing GPU acceleration...");
        await initializeGPUAcceleration();
        gpuInitialized = true;
        console.log("Success GPU acceleration initialized successfully");
      } catch (error) {
        console.error("Error GPU acceleration initialization failed:", error);
        console.log(" Falling back to CPU backend...");
        try {
          await tf.setBackend("cpu");
          await tf.ready();
          gpuInitialized = true;
        } catch (fallbackError) {
          console.error("Error CPU fallback failed:", fallbackError);
          setStatus("error");
          return null;
        }
      }
    }

    return await buildAndCompileModel();
  }, [buildAndCompileModel, status]);

  const generateLiveLayerOutputs = useCallback(
    async (
      inputGrid: number[][] | number[][][],
      modelInstanceForThisCall: tf.Sequential,
    ) => {
      if (
        !modelRef.current ||
        modelRef.current !== modelInstanceForThisCall ||
        status === "architecture-changed" ||
        status === "building" ||
        status === "compiling" ||
        status === "initializing" ||
        status === "error" ||
        status === "uninitialized"
      ) {
        console.warn(
          "generateLiveLayerOutputs: Model is stale or status is unstable. Skipping generation of live outputs.",
        );
        return [];
      }

      const currentModel = modelInstanceForThisCall;

      if (!currentModel.inputs || !currentModel.inputs[0]) {
        console.warn(
          "generateLiveLayerOutputs: Current model has no inputs. Skipping.",
        );
        return [];
      }

      const outputs: LiveLayerOutput[] = [];
      let inputTensorForMultiOutputModel: tf.Tensor | null = null;
      let rawPredictionOutputTensors: tf.Tensor[] | tf.Tensor | null = null;
      let clonedPredictionOutputTensors: tf.Tensor[] = [];
      let tempMultiOutputModel: tf.LayersModel | null = null;

      try {
        // Handle both grayscale and RGB inputs for layer visualization
        let inputTensorForMultiOutputModel: tf.Tensor;
        if (Array.isArray(inputGrid[0][0])) {
          // RGB input
          inputTensorForMultiOutputModel = tf
            .tensor(inputGrid, [28, 28, 3], "float32")
            .expandDims(0);
        } else {
          // Grayscale input, convert to RGB
          const rgbGrid = (inputGrid as number[][]).map((row) =>
            row.map((val) => [val, val, val]),
          );
          inputTensorForMultiOutputModel = tf
            .tensor(rgbGrid, [28, 28, 3], "float32")
            .expandDims(0);
        }

        // For input layer visualization, convert data to proper format
        let inputMaps: number[][][];
        if (Array.isArray(inputGrid[0][0])) {
          // RGB input: convert to individual channel maps for visualization
          const rgbGrid = inputGrid as number[][][];
          const rChannel = rgbGrid.map((row: number[][]) =>
            row.map((pixel: number[]) => pixel[0]),
          );
          const gChannel = rgbGrid.map((row: number[][]) =>
            row.map((pixel: number[]) => pixel[1]),
          );
          const bChannel = rgbGrid.map((row: number[][]) =>
            row.map((pixel: number[]) => pixel[2]),
          );
          inputMaps = [rChannel, gChannel, bChannel];
        } else {
          // Grayscale input: convert to RGB format
          const grayGrid = inputGrid as unknown as number[][];
          inputMaps = [grayGrid, grayGrid, grayGrid];
        }

        outputs.push({
          id: currentModel.inputs[0].name,
          maps: inputMaps,
          layerClassName: "InputLayer",
          outputShape: [28, 28, 3],
          config: { inputShape: [28, 28, 3] },
        });

        const symbolicOutputs = currentModel.layers.map(
          (layer: any) => layer.output as tf.SymbolicTensor,
        );
        if (symbolicOutputs.length === 0) {
          if (inputTensorForMultiOutputModel)
            tf.dispose(inputTensorForMultiOutputModel);
          return outputs;
        }

        tempMultiOutputModel = tf.model({
          inputs: currentModel.inputs[0],
          outputs: symbolicOutputs,
        });

        // Re-check model validity before prediction on temp model
        if (
          modelRef.current !== modelInstanceForThisCall ||
          (status !== "ready" && status !== "success" && status !== "training")
        ) {
          console.warn(
            "generateLiveLayerOutputs: Model became stale just before temp model prediction. Aborting.",
          );
          if (inputTensorForMultiOutputModel)
            tf.dispose(inputTensorForMultiOutputModel);
          // tempMultiOutputModel is based on shared layers, so if original is stale, this is too.
          // Disposing tempMultiOutputModel here is safe as it doesn't own layers exclusively if modelInstanceForThisCall is valid.
          // If modelInstanceForThisCall is already disposed, its layers are gone, so tempMultiOutputModel is also effectively gone.
          if (tempMultiOutputModel) tempMultiOutputModel.dispose();
          return outputs;
        }

        rawPredictionOutputTensors = tempMultiOutputModel.predict(
          inputTensorForMultiOutputModel,
        );

        clonedPredictionOutputTensors = Array.isArray(
          rawPredictionOutputTensors,
        )
          ? rawPredictionOutputTensors.map((t) => t.clone())
          : [rawPredictionOutputTensors.clone()];

        if (rawPredictionOutputTensors) {
          tf.dispose(rawPredictionOutputTensors);
          rawPredictionOutputTensors = null;
        }

        for (let i = 0; i < currentModel.layers.length; i++) {
          const layer = currentModel.layers[i];
          const outputTensor = clonedPredictionOutputTensors[i];

          let transposedMaps: number[][][] = [];

          if (!outputTensor) {
            outputs.push({
              id: layer.name,
              maps: [],
              layerClassName: layer.getClassName(),
              outputShape: layer.outputShape.slice() as number[],
              config: layer.getConfig(),
            });
            continue;
          }

          const outputArrDataUnknown: unknown = await outputTensor.array();
          const actualShape = outputTensor.shape;

          if (
            Array.isArray(outputArrDataUnknown) &&
            outputArrDataUnknown.length > 0
          ) {
            const firstSampleOutput = outputArrDataUnknown[0];

            if (firstSampleOutput) {
              if (actualShape.length === 4) {
                const sampleData3D = firstSampleOutput as number[][][];
                const H = actualShape[1]!;
                const W = actualShape[2]!;
                const C = actualShape[3]!;
                if (
                  H > 0 &&
                  W > 0 &&
                  C > 0 &&
                  sampleData3D &&
                  sampleData3D[0] &&
                  sampleData3D[0][0]
                ) {
                  for (let c_idx = 0; c_idx < C; c_idx++) {
                    const map2D: number[][] = createMatrix(H, W);
                    for (let h_idx = 0; h_idx < H; h_idx++) {
                      for (let w_idx = 0; w_idx < W; w_idx++) {
                        if (sampleData3D[h_idx] && sampleData3D[h_idx][w_idx]) {
                          map2D[h_idx][w_idx] =
                            sampleData3D[h_idx][w_idx][c_idx];
                        }
                      }
                    }
                    transposedMaps.push(map2D);
                  }
                }
              } else if (actualShape.length === 3) {
                const sampleData2D = firstSampleOutput as number[][];
                if (
                  sampleData2D &&
                  sampleData2D.length > 0 &&
                  Array.isArray(sampleData2D[0]) &&
                  sampleData2D[0].length > 0
                ) {
                  transposedMaps.push(sampleData2D);
                }
              } else if (actualShape.length === 2) {
                const sampleData1D = firstSampleOutput as number[];
                if (sampleData1D && sampleData1D.length > 0) {
                  transposedMaps.push([sampleData1D]);
                }
              } else {
                console.warn(
                  `Unhandled output shape ${actualShape} for layer ${layer.name}`,
                );
              }
            }
          }

          outputs.push({
            id: layer.name,
            maps: transposedMaps,
            layerClassName: layer.getClassName(),
            outputShape: layer.outputShape.slice() as number[],
            config: layer.getConfig(),
          });
        }
      } catch (e: any) {
        if (e.message && e.message.toLowerCase().includes("disposed")) {
          console.warn(
            "generateLiveLayerOutputs: Error likely due to disposed layer during operation:",
            e.message,
          );
          return outputs.length > 1 ? outputs : [];
        }
        console.error("Error generating live layer outputs:", e);
      } finally {
        if (inputTensorForMultiOutputModel)
          tf.dispose(inputTensorForMultiOutputModel);
        if (
          clonedPredictionOutputTensors &&
          clonedPredictionOutputTensors.length > 0
        )
          tf.dispose(clonedPredictionOutputTensors);
        // DO NOT dispose tempMultiOutputModel IF currentModel (modelInstanceForThisCall) is still valid,
        // as it shares layers. If currentModel was disposed, tempMultiOutputModel is also implicitly invalid.
        // The dispose() call for tempMultiOutputModel if modelInstanceForThisCall became stale is handled above.
      }
      return outputs;
    },
    [status],
  );

  const runPrediction = useCallback(
    async (grid: number[][] | number[][][]) => {
      let activeModel = modelRef.current;
      if (
        !activeModel ||
        status === "architecture-changed" ||
        status === "uninitialized" ||
        status === "error"
      ) {
        activeModel = await initializeModel();
        if (!activeModel) {
          setPrediction({ label: "?", confidence: 0 });
          setLiveLayerOutputs([]);
          return;
        }
      }

      if (
        status === "building" ||
        status === "compiling" ||
        status === "initializing"
      ) {
        console.warn("Prediction called while model is initializing.");
        return;
      }

      // Handle both grayscale (2D) and RGB (3D) inputs
      let inputTensor: tf.Tensor;
      if (Array.isArray(grid[0][0])) {
        // RGB input: grid is number[][][]
        inputTensor = tf.tensor(grid, [28, 28, 3], "float32").expandDims(0);
      } else {
        // Grayscale input: grid is number[][], convert to RGB by duplicating channels
        const rgbGrid = (grid as number[][]).map((row) =>
          row.map((val) => [val, val, val]),
        );
        inputTensor = tf.tensor(rgbGrid, [28, 28, 3], "float32").expandDims(0);
      }
      try {
        if (!activeModel) {
          setPrediction({ label: "?", confidence: 0 });
          setLiveLayerOutputs([]);
          tf.dispose(inputTensor);
          return;
        }
        const resultTensor = activeModel.predict(inputTensor) as tf.Tensor;
        const predictionValue = (await resultTensor.data())[0];
        tf.dispose(resultTensor);

        setPrediction({
          label: predictionValue > 0.5 ? "1" : "0",
          confidence:
            predictionValue > 0.5 ? predictionValue : 1 - predictionValue,
        });
      } catch (e: any) {
        console.error("Error during prediction:", e);
        if (e.message && e.message.toLowerCase().includes("disposed")) {
          console.warn(
            "Prediction failed, likely due to a disposed layer. Model may be resetting.",
          );
          setPrediction({ label: "ERR", confidence: 0 });
          if (status !== "error" && status !== "architecture-changed")
            setStatus("error");
        } else {
          setPrediction({ label: "ERR", confidence: 0 });
        }
      } finally {
        tf.dispose(inputTensor);
      }

      if (activeModel && modelRef.current === activeModel) {
        // Ensure activeModel is still the current one before generating outputs
        const liveOutputs = await generateLiveLayerOutputs(grid, activeModel);
        setLiveLayerOutputs(liveOutputs);
      } else if (activeModel && modelRef.current !== activeModel) {
        console.warn(
          "runPrediction: Model changed during prediction; live outputs might be stale or skipped.",
        );
        setLiveLayerOutputs([]); // Clear outputs if model changed
      }
    },
    [initializeModel, status, generateLiveLayerOutputs],
  );

  // Initialize Web Worker
  const initializeWorker = useCallback(async () => {
    if (!useWebWorker || workerRef.current) return;

    try {
      setWorkerStatus("initializing");
      console.log(" Initializing training worker...");

      workerRef.current = new Worker(
        new URL("../workers/trainingWorker.ts", import.meta.url),
        { type: "module" },
      );

      // Set up message handler
      workerRef.current.onmessage = (
        event: MessageEvent<TrainingWorkerResponse>,
      ) => {
        const { type, payload } = event.data;

        switch (type) {
          case "MODEL_READY":
            console.log("Success Training worker model ready");
            setWorkerStatus("ready");
            setIsUsingBackgroundWorker(true);
            isUsingBackgroundWorkerRef.current = true;
            break;

          case "TRAINING_PROGRESS":
            setEpochsRun(payload.epoch);
            setLossHistory((prev) => [
              ...prev.slice(0, payload.epoch - 1),
              payload.loss,
            ]);
            console.log(
              `🔧 CPU Worker Training - Epoch ${payload.epoch}/${payload.totalEpochs} - Loss: ${payload.loss.toFixed(4)} - Accuracy: ${(payload.accuracy || 0).toFixed(4)}`,
            );
            break;

          case "TRAINING_COMPLETE":
            console.log("Complete Training completed in worker");
            if (payload && Array.isArray(payload.modelWeights)) {
              loadModelWeights(payload.modelWeights);
            }
            setStatus("success");
            setIsUsingBackgroundWorker(false);
            isUsingBackgroundWorkerRef.current = false;
            setIsHybridTraining(false);
            setHybridTrainingState(null);
            break;

          case "PREDICTION_RESULT":
            setPrediction(payload);
            break;

          case "TRAINING_ERROR":
            console.error("Error Training worker error:", payload.error);
            setStatus("error");
            setIsUsingBackgroundWorker(false);
            isUsingBackgroundWorkerRef.current = false;
            break;
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error("Error Worker error:", error);
        setWorkerStatus("error");
        setIsUsingBackgroundWorker(false);
        isUsingBackgroundWorkerRef.current = false;
      };

      // Initialize the model in the worker
      console.log("Sending layers to worker:", currentLayersConfigRef.current);
      console.log(
        "Layer types being sent:",
        currentLayersConfigRef.current.map((l) => ({
          id: l.id,
          type: l.type,
          typeOf: typeof l.type,
        })),
      );

      const message: TrainingWorkerMessage = {
        type: "INIT_TRAINING",
        payload: {
          layers: currentLayersConfigRef.current,
          learningRate: currentLearningRateRef.current,
        },
      };

      workerRef.current.postMessage(message);
    } catch (error) {
      console.error("Error Failed to initialize training worker:", error);
      setWorkerStatus("error");
      // Continue with main thread training
    }
  }, [useWebWorker]);

  const startTrainingLogic = useCallback(
    async (
      trainingData: TrainingDataPoint[],
      numEpochsToRun: number,
      batchSize: number,
    ) => {
      // Start hybrid training mode
      setIsHybridTraining(true);
      setHybridTrainingState({
        totalEpochs: numEpochsToRun,
        currentEpoch: 0,
        trainingData,
        batchSize,
        isActive: true,
      });

      console.log("🔀 Starting hybrid GPU/CPU training", {
        pageVisible: isPageVisible,
        useWebWorker,
        workerReady: workerStatus === "ready",
      });

      // Start with appropriate method based on tab visibility
      if (isPageVisible) {
        return startMainThreadTraining(trainingData, numEpochsToRun, batchSize);
      } else if (
        useWebWorker &&
        workerRef.current &&
        workerStatus === "ready"
      ) {
        return startWorkerTraining(trainingData, numEpochsToRun, batchSize);
      } else {
        // Fallback to main thread if worker not available
        return startMainThreadTraining(trainingData, numEpochsToRun, batchSize);
      }
    },
    [isPageVisible, useWebWorker, workerStatus],
  );

  const startWorkerTraining = useCallback(
    async (
      trainingData: TrainingDataPoint[],
      numEpochsToRun: number,
      batchSize: number,
    ) => {
      if (!workerRef.current || workerStatus !== "ready") return;
      if (status === "training" && isUsingBackgroundWorkerRef.current) return; // Already training in worker

      console.log("🔧 Starting CPU worker training (slower but continuous)");
      setStatus("training");
      setIsUsingBackgroundWorker(true);
      isUsingBackgroundWorkerRef.current = true;

      const message: TrainingWorkerMessage = {
        type: "START_TRAINING",
        payload: {
          trainingData,
          numEpochs: numEpochsToRun,
          batchSize,
          learningRate: currentLearningRateRef.current,
        },
      };

      workerRef.current.postMessage(message);
    },
    [workerStatus, status],
  );

  const startMainThreadTraining = useCallback(
    async (
      trainingData: TrainingDataPoint[],
      numEpochsToRun: number,
      batchSize: number,
    ) => {
      if (status === "training" && !isUsingBackgroundWorkerRef.current) return; // Already training on main thread

      console.log("🚀 Starting GPU main thread training (fast but pausable)");
      setStatus("training");
      setIsUsingBackgroundWorker(false);
      isUsingBackgroundWorkerRef.current = false;
      let activeModel = modelRef.current;
      if (
        !activeModel ||
        status === "architecture-changed" ||
        status === "uninitialized" ||
        status === "error"
      ) {
        activeModel = await initializeModel();
        if (!activeModel) {
          setStatus("error");
          console.error("Failed to initialize model before training.");
          return;
        }
      }
      if (
        status === "building" ||
        status === "compiling" ||
        status === "initializing"
      ) {
        console.warn("Training called while model is initializing.");
        alert("Model is still initializing. Please wait and try again.");
        return;
      }

      setStatus("training");

      const xsArray = trainingData.map((dp) => {
        // Handle both grayscale and RGB inputs
        if (Array.isArray(dp.grid[0][0])) {
          // RGB input: grid is number[][][]
          return dp.grid;
        } else {
          // Grayscale input: grid is number[][], convert to RGB by duplicating channels
          return (dp.grid as unknown as number[][]).map((row) =>
            row.map((val) => [val, val, val]),
          );
        }
      });
      const ysArray = trainingData.map((dp) => dp.label);

      const xs = tf.tensor(
        xsArray,
        [trainingData.length, 28, 28, 3],
        "float32",
      );
      const ys = tf.tensor2d(ysArray, [trainingData.length, 1]);

      try {
        if (!activeModel)
          throw new Error("Model is not available for training.");
        await activeModel.fit(xs, ys, {
          epochs: numEpochsToRun,
          batchSize: batchSize,
          shuffle: true,
          callbacks: {
            onEpochBegin: async (epoch: number) => {
              if (epoch === 0 && status !== "training") {
                setLossHistory([]);
              }
            },
            onEpochEnd: async (epoch: number, logs: any) => {
              if (logs && typeof logs.loss === "number") {
                setEpochsRun((prevEpochsRun) => prevEpochsRun + 1);
                setLossHistory((prev) => [...prev, logs.loss!]);
                console.log(
                  `Epoch ${epoch + 1}/${numEpochsToRun} - Loss: ${logs.loss.toFixed(4)}${logs.acc ? ` - Acc: ${logs.acc.toFixed(4)}` : ""}`,
                );
              }
              await tf.nextFrame();
            },
            onTrainBegin: () => {
              setEpochsRun(0);
            },
            onTrainEnd: async () => {
              setStatus("success");
              const currentTrainedModel = modelRef.current;
              if (currentTrainedModel) {
                const denseLayers = currentTrainedModel.layers.filter(
                  (l: any) => (l as tf.layers.Layer).getClassName() === "Dense",
                );
                if (denseLayers && denseLayers.length > 0) {
                  const lastDenseOutputLayer = denseLayers.find((l: any) => {
                    const config = l.getConfig() as any;
                    return (
                      config.units === 1 && config.activation === "sigmoid"
                    );
                  });
                  const targetLayerForWeights =
                    lastDenseOutputLayer || denseLayers[denseLayers.length - 1];

                  const originalWeightsTensors =
                    targetLayerForWeights.getWeights();
                  let clonedWeightsTensors: tf.Tensor[] = [];

                  try {
                    if (
                      originalWeightsTensors &&
                      originalWeightsTensors.length > 0 &&
                      originalWeightsTensors[0]
                    ) {
                      clonedWeightsTensors = originalWeightsTensors.map(
                        (t: any) => t.clone(),
                      );
                      const kernel = clonedWeightsTensors[0];
                      const kernelShape = kernel.shape;

                      if (kernelShape.length === 2 && kernelShape[1] === 1) {
                        const flatWeights = (
                          (await kernel.array()) as number[][]
                        ).flat();
                        const numInputFeatures = kernelShape[0];
                        const side = Math.sqrt(numInputFeatures);
                        if (Number.isInteger(side) && side > 0) {
                          const weights2D: number[][] = [];
                          for (let r = 0; r < side; r++) {
                            weights2D.push(
                              flatWeights.slice(r * side, (r + 1) * side),
                            );
                          }
                          setFcWeightsViz(weights2D);
                        } else {
                          setFcWeightsViz(null); // Not a square kernel input
                        }
                      } else {
                        // Kernel not for final 1-unit output, or not 2D.
                        setFcWeightsViz(null);
                      }
                    } else {
                      setFcWeightsViz(null); // No weights in the target dense layer
                    }
                  } finally {
                    if (clonedWeightsTensors.length > 0)
                      tf.dispose(clonedWeightsTensors);
                  }
                } else {
                  setFcWeightsViz(null); // No dense layers found
                }
              } else {
                setFcWeightsViz(null); // Model became null
              }

              if (trainingData.length > 0 && modelRef.current) {
                await runPrediction(
                  trainingData[Math.floor(Math.random() * trainingData.length)]
                    .grid,
                );
              }
            },
          },
        });
      } catch (error: any) {
        console.error("Error during training:", error);
        if (error.message && error.message.toLowerCase().includes("disposed")) {
          console.warn(
            "Training failed, likely due to a disposed layer. Model may be resetting.",
          );
          setStatus("error");
        } else {
          setStatus("error");
        }
      } finally {
        tf.dispose([xs, ys]);
      }
    },
    [initializeModel, status, runPrediction],
  );

  const switchToWorkerTraining = useCallback(async () => {
    if (!hybridTrainingState || !hybridTrainingState.isActive) return;
    if (!useWebWorker || !workerRef.current || workerStatus !== "ready") return;
    if (isUsingBackgroundWorkerRef.current || status !== "training") return; // Already using worker or not training

    console.log(
      "🔀 Switching to CPU worker training (tab hidden) - Training will continue in background",
    );

    // Calculate remaining epochs
    const remainingEpochs = hybridTrainingState.totalEpochs - epochsRun;
    if (remainingEpochs <= 0) return;

    // Add delay to ensure any previous transitions complete
    setTimeout(async () => {
      if (!hybridTrainingState?.isActive || isUsingBackgroundWorkerRef.current)
        return;
      await startWorkerTraining(
        hybridTrainingState.trainingData,
        remainingEpochs,
        hybridTrainingState.batchSize,
      );
    }, 300);
  }, [
    hybridTrainingState,
    useWebWorker,
    workerStatus,
    epochsRun,
    startWorkerTraining,
  ]);

  const switchToMainThreadTraining = useCallback(async () => {
    if (!hybridTrainingState || !hybridTrainingState.isActive) return;
    if (!isUsingBackgroundWorkerRef.current || status !== "training") return; // Already using main thread or not training

    console.log(
      "🔀 Switching to GPU main thread training (tab visible) - Training will be faster now",
    );

    // Stop worker training with proper wait
    if (workerRef.current) {
      const message: TrainingWorkerMessage = { type: "STOP_TRAINING" };
      workerRef.current.postMessage(message);
      setIsUsingBackgroundWorker(false);
      isUsingBackgroundWorkerRef.current = false;
    }

    // Calculate remaining epochs
    const remainingEpochs = hybridTrainingState.totalEpochs - epochsRun;
    if (remainingEpochs <= 0) return;

    // Longer delay to ensure worker fully stops
    setTimeout(async () => {
      if (!hybridTrainingState?.isActive || isUsingBackgroundWorkerRef.current)
        return;
      await startMainThreadTraining(
        hybridTrainingState.trainingData,
        remainingEpochs,
        hybridTrainingState.batchSize,
      );
    }, 500);
  }, [hybridTrainingState, epochsRun, startMainThreadTraining, status]);

  const resetModelTrainingState = useCallback(async () => {
    // Clean up worker (only if it exists and isn't already being disposed)
    if (workerRef.current && workerStatus !== "uninitialized") {
      console.log(
        "🗑️ resetModelTrainingState: Disposing worker",
        new Error().stack,
      );
      const message: TrainingWorkerMessage = { type: "DISPOSE" };
      workerRef.current.postMessage(message);
      workerRef.current.terminate();
      workerRef.current = null;
      setWorkerStatus("uninitialized");
    }
    setIsUsingBackgroundWorker(false);
    isUsingBackgroundWorkerRef.current = false;

    if (modelRef.current) {
      modelRef.current.dispose();
      modelRef.current = null;
    }
    setStatus("uninitialized");
    console.log("🗑️ Worker status reset to uninitialized");
    setPrediction({ label: "?", confidence: 0 });
    setLiveLayerOutputs([]);
    setFcWeightsViz(null);
    setLossHistory([]);
    setEpochsRun(0);
    setIsHybridTraining(false);
    setHybridTrainingState(null);
  }, [workerStatus]);

  // Save model weights to a serializable format
  const saveModelWeights = useCallback(async (): Promise<any[] | null> => {
    if (!modelRef.current) {
      console.warn("No model available to save weights from");
      return null;
    }

    try {
      const weights = modelRef.current.getWeights();
      const weightsData = await Promise.all(
        weights.map(async (weight) => {
          const data = await weight.data();
          return {
            shape: weight.shape,
            data: Array.from(data),
          };
        }),
      );

      // Dispose of the weight tensors to free memory
      weights.forEach((weight) => weight.dispose());

      return weightsData;
    } catch (error) {
      console.error("Failed to save model weights:", error);
      return null;
    }
  }, []);

  // Load model weights from serialized format
  const loadModelWeights = useCallback(
    async (weightsData: any[]): Promise<boolean> => {
      if (!modelRef.current || !weightsData) {
        console.warn("No model available or no weights data to load");
        return false;
      }

      try {
        // Convert the serialized data back to tensors
        const weightTensors = weightsData.map((weightData) => {
          return tf.tensor(weightData.data, weightData.shape);
        });

        // Set the weights on the model
        modelRef.current.setWeights(weightTensors);

        console.log("Model weights loaded successfully");
        return true;
      } catch (error) {
        console.error("Failed to load model weights:", error);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    if (status === "uninitialized") {
      initializeModel();
    }
  }, [status, initializeModel]);

  // Initialize worker when model is ready
  useEffect(() => {
    if (
      status === "ready" &&
      useWebWorker &&
      workerStatus === "uninitialized"
    ) {
      initializeWorker();
    }
  }, [status, useWebWorker, workerStatus, initializeWorker]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log("🗑️ Component unmount: Disposing worker");
        const message: TrainingWorkerMessage = { type: "DISPOSE" };
        workerRef.current.postMessage(message);
        workerRef.current.terminate();
      }
    };
  }, []);

  // Page Visibility API for hybrid training with debouncing
  useEffect(() => {
    let switchTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsPageVisible(visible);

      if (!isHybridTraining || !hybridTrainingState?.isActive) return;

      // Clear any pending switches to avoid race conditions
      if (switchTimeout) clearTimeout(switchTimeout);

      // Debounce the switch to prevent rapid toggling
      switchTimeout = setTimeout(() => {
        if (visible) {
          // Tab became visible - switch to GPU if currently using worker
          console.log(
            "👁️ Tab became visible - preparing to switch to GPU training...",
          );
          switchToMainThreadTraining();
        } else {
          // Tab became hidden - switch to worker if currently using main thread
          console.log(
            "🫥 Tab became hidden - preparing to switch to CPU worker training...",
          );
          switchToWorkerTraining();
        }
      }, 200);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (switchTimeout) clearTimeout(switchTimeout);
    };
  }, [
    isHybridTraining,
    hybridTrainingState,
    switchToMainThreadTraining,
    switchToWorkerTraining,
  ]);

  // Update hybrid training state when training completes
  useEffect(() => {
    if (status === "success" || status === "error") {
      setIsHybridTraining(false);
      setHybridTrainingState(null);
      setIsUsingBackgroundWorker(false);
      isUsingBackgroundWorkerRef.current = false;
    }
  }, [status]);

  // Create return object using function construction
  const createReturnObject = () => {
    const workerFlag = isUsingBackgroundWorker;
    const hybridFlag = isHybridTraining;
    const mode = workerFlag ? "CPU Worker" : "GPU Main Thread";

    return {
      model: modelRef.current,
      status,
      prediction,
      epochsRun,
      lossHistory,
      liveLayerOutputs,
      fcWeightsViz,
      gpuBenchmark,
      initializeModel,
      runPrediction,
      startTraining: startTrainingLogic,
      resetModelTrainingState,
      runGPUBenchmark,
      saveModelWeights,
      isUsingWorker: workerFlag,
      isHybridTraining: hybridFlag,
      trainingMode: mode,
      loadModelWeights,
      setEpochsRun,
      setLossHistory,
    };
  };

  return createReturnObject();
};
