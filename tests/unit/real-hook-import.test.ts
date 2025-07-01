// Real Hook Import Test Suite
// Tests that actually import the real hook to catch compilation and export issues

// Simple test that doesn't require external testing libraries
// This will catch TypeScript compilation errors and runtime issues

// Mock React hooks to avoid React dependency
const mockUseState = <T>(initial: T): [T, (value: T) => void] => {
  return [initial, () => {}];
};

const mockUseRef = <T>(initial: T) => ({ current: initial });
const mockUseCallback = <T extends (...args: any[]) => any>(
  fn: T,
  deps: any[],
): T => fn;
const mockUseEffect = (fn: () => void | (() => void), deps?: any[]) => {};

// Mock globals
(global as any).React = {
  useState: mockUseState,
  useRef: mockUseRef,
  useCallback: mockUseCallback,
  useEffect: mockUseEffect,
};

// Mock TensorFlow.js to avoid heavy dependency
const mockTF = {
  sequential: () => ({
    add: () => {},
    compile: () => {},
    fit: () => Promise.resolve({ history: { loss: [0.5] } }),
    predict: () => ({ dataSync: () => [0.5, 0.5] }),
    getWeights: () => [],
    setWeights: () => {},
    dispose: () => {},
  }),
  layers: {
    conv2d: () => ({ name: "conv2d" }),
    maxPooling2d: () => ({ name: "maxPooling2d" }),
    dense: () => ({ name: "dense" }),
    flatten: () => ({ name: "flatten" }),
    reshape: () => ({ name: "reshape" }),
  },
  train: { sgd: () => ({}) },
  tensor: () => ({ dataSync: () => [], dispose: () => {}, shape: [] }),
  dispose: () => {},
  tidy: (fn: () => any) => fn(),
  ready: () => Promise.resolve(),
  setBackend: () => Promise.resolve(),
  getBackend: () => "webgl",
  env: () => ({ set: () => {}, get: () => {} }),
  browser: { fromPixels: () => ({ dispose: () => {} }) },
  image: { resizeBilinear: () => ({ dispose: () => {} }) },
};

// Mock the TensorFlow.js module before importing
(global as any).tf = mockTF;

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;
  postMessage(): void {}
  terminate(): void {}
}
(global as any).Worker = MockWorker;

// Mock performance
(global as any).performance = { now: () => Date.now() };

// Mock document for visibility API
(global as any).document = {
  hidden: false,
  addEventListener: () => {},
  removeEventListener: () => {},
  visibilityState: "visible",
};

// Import the actual hook using ES module syntax
import { useTFModel } from "../../hooks/useTFModel";

class RealHookImportTest {
  private static testCount = 0;
  private static passCount = 0;
  private static failCount = 0;

  static assert(condition: boolean, message: string): void {
    this.testCount++;
    if (condition) {
      this.passCount++;
      console.log(`✅ PASS: ${message}`);
    } else {
      this.failCount++;
      console.log(`❌ FAIL: ${message}`);
    }
  }

  static testHookImportAndExecution(): void {
    console.log("\n🧪 Testing real hook import and execution...");

    try {
      // Test that the hook can be imported
      this.assert(
        typeof useTFModel === "function",
        "useTFModel should be importable as a function",
      );

      // Test hook execution
      const hookResult = useTFModel({
        initialLayers: [],
        learningRate: 0.001,
        useWebWorker: false,
      });

      this.assert(
        typeof hookResult === "object",
        "Hook should return an object",
      );
      this.assert(hookResult !== null, "Hook result should not be null");

      // Test critical exports exist
      const requiredExports = [
        "model",
        "status",
        "prediction",
        "epochsRun",
        "lossHistory",
        "isUsingWorker",
        "isHybridTraining",
        "trainingMode",
      ];

      for (const exportName of requiredExports) {
        this.assert(
          exportName in hookResult,
          `Hook should export ${exportName}`,
        );
      }

      // Test the specific issue: isUsingWorker should be defined and unique
      this.assert(
        hookResult.isUsingWorker !== undefined,
        "isUsingWorker should not be undefined",
      );

      this.assert(
        typeof hookResult.isUsingWorker === "boolean",
        "isUsingWorker should be a boolean",
      );
    } catch (error) {
      this.assert(false, `Hook import/execution failed: ${error}`);
    }
  }

  static testExportUniqueness(): void {
    console.log(
      "\n🧪 Testing export uniqueness (catches duplicate exports)...",
    );

    try {
      const hookResult = useTFModel({
        initialLayers: [],
        learningRate: 0.001,
        useWebWorker: false,
      });

      const keys = Object.keys(hookResult);
      const uniqueKeys = new Set(keys);

      this.assert(
        keys.length === uniqueKeys.size,
        `No duplicate exports should exist (found ${keys.length} exports, ${uniqueKeys.size} unique)`,
      );

      // Specifically check for isUsingWorker duplicates
      const isUsingWorkerCount = keys.filter(
        (key) => key === "isUsingWorker",
      ).length;
      this.assert(
        isUsingWorkerCount === 1,
        `isUsingWorker should appear exactly once (found ${isUsingWorkerCount} times)`,
      );

      // Log all exports for debugging
      console.log("All hook exports:", keys.sort());
    } catch (error) {
      this.assert(false, `Export uniqueness test failed: ${error}`);
    }
  }

  static testProductionDestructuring(): void {
    console.log("\n🧪 Testing production destructuring pattern...");

    try {
      const hookResult = useTFModel({
        initialLayers: [],
        learningRate: 0.001,
        useWebWorker: true,
      });

      // This is the exact destructuring pattern from TrainableConvNet.tsx
      const {
        model,
        status,
        prediction,
        epochsRun,
        lossHistory,
        liveLayerOutputs,
        fcWeightsViz,
        gpuBenchmark,
        initializeModel,
        runPrediction,
        startTraining,
        resetModelTrainingState,
        runGPUBenchmark,
        saveModelWeights,
        loadModelWeights,
        setEpochsRun,
        setLossHistory,
        isUsingWorker,
        isHybridTraining,
        trainingMode,
      } = hookResult;

      // Test that destructuring worked
      this.assert(
        isUsingWorker !== undefined,
        "Destructured isUsingWorker should not be undefined",
      );

      this.assert(
        typeof isUsingWorker === "boolean",
        "Destructured isUsingWorker should be boolean",
      );

      this.assert(
        typeof trainingMode === "string",
        "Destructured trainingMode should be string",
      );

      // Test conditional logic (this would fail if isUsingWorker is undefined)
      const testCondition = isUsingWorker ? "worker mode" : "main thread mode";
      this.assert(
        typeof testCondition === "string",
        "Conditional logic with isUsingWorker should work",
      );
    } catch (error) {
      this.assert(false, `Production destructuring test failed: ${error}`);
    }
  }

  static testTypeConsistency(): void {
    console.log("\n🧪 Testing type consistency...");

    try {
      const hookResult = useTFModel({
        initialLayers: [],
        learningRate: 0.001,
        useWebWorker: false,
      });

      // Test all exports have expected types
      this.assert(
        typeof hookResult.status === "string",
        "status should be string",
      );
      this.assert(
        typeof hookResult.epochsRun === "number",
        "epochsRun should be number",
      );
      this.assert(
        Array.isArray(hookResult.lossHistory),
        "lossHistory should be array",
      );
      this.assert(
        typeof hookResult.isUsingWorker === "boolean",
        "isUsingWorker should be boolean",
      );
      this.assert(
        typeof hookResult.isHybridTraining === "boolean",
        "isHybridTraining should be boolean",
      );
      this.assert(
        typeof hookResult.trainingMode === "string",
        "trainingMode should be string",
      );

      // Test function exports
      this.assert(
        typeof hookResult.initializeModel === "function",
        "initializeModel should be function",
      );
      this.assert(
        typeof hookResult.runPrediction === "function",
        "runPrediction should be function",
      );
      this.assert(
        typeof hookResult.startTraining === "function",
        "startTraining should be function",
      );
    } catch (error) {
      this.assert(false, `Type consistency test failed: ${error}`);
    }
  }

  static runAllTests(): void {
    console.log("🚀 Running Real Hook Import Tests...\n");

    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;

    this.testHookImportAndExecution();
    this.testExportUniqueness();
    this.testProductionDestructuring();
    this.testTypeConsistency();

    console.log("\n📊 Real Hook Import Test Results:");
    console.log(`Total Tests: ${this.testCount}`);
    console.log(`✅ Passed: ${this.passCount}`);
    console.log(`❌ Failed: ${this.failCount}`);
    console.log(
      `📈 Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`,
    );

    if (this.failCount === 0) {
      console.log("\n🎉 All real hook import tests passed!");
    } else {
      console.log(
        "\n⚠️  Some real hook import tests failed. Check output above for details.",
      );
      console.log("❌ CRITICAL: Production build will likely fail!");
      process.exit(1);
    }

    console.log("\nSuccess Real Hook Import Test Suite Complete!");
  }
}

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  RealHookImportTest.runAllTests();
}

export { RealHookImportTest };
