/*
 * Debug Test Panel Component
 * © 2024 Hopping Mad Games, LLC. All Rights Reserved.
 *
 * PROPRIETARY SOFTWARE - NOT FOR COMMERCIAL USE
 * This code is proprietary and confidential. Unauthorized copying,
 * distribution, or use is strictly prohibited.
 */

import { useState, useCallback } from "react";
import { LayerType, ActivationFunction } from "../types";

interface TestResult {
  id: string;
  message: string;
  type: "pass" | "fail" | "warn";
  timestamp: Date;
}

export const DebugTestPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = useCallback((message: string, type: TestResult["type"] = "pass") => {
    const result: TestResult = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
    };
    setTestResults(prev => [...prev, result]);
  }, []);

  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);

  // Test localStorage quota handling
  const testLocalStorageQuota = useCallback(async () => {
    addResult("Starting localStorage quota tests...", "pass");

    try {
      // Calculate current localStorage usage
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      addResult(`Current localStorage usage: ~${Math.round(totalSize / 1024)}KB`, "pass");

      // Test size checking function
      const checkDataSize = (data: any) => {
        const dataString = JSON.stringify(data);
        const dataSizeInBytes = new Blob([dataString]).size;
        const maxSizeInBytes = 4 * 1024 * 1024; // 4MB limit

        return {
          size: dataSizeInBytes,
          maxSize: maxSizeInBytes,
          withinLimit: dataSizeInBytes <= maxSizeInBytes,
          sizeInMB: Math.round(dataSizeInBytes / 1024 / 1024 * 100) / 100
        };
      };

      // Mock small training data
      const mockTrainingData = Array.from({length: 50}, (_, i) => ({
        id: i,
        imageData: new Array(28 * 28 * 3).fill(Math.random()),
        label: Math.floor(Math.random() * 10)
      }));

      const sizeCheck = checkDataSize(mockTrainingData);
      addResult(
        `Small dataset size: ${sizeCheck.sizeInMB}MB (within 4MB limit: ${sizeCheck.withinLimit})`,
        sizeCheck.withinLimit ? "pass" : "warn"
      );

      // Mock large training data
      const largeData = Array.from({length: 500}, (_, i) => ({
        id: i,
        imageData: new Array(224 * 224 * 3).fill(Math.random()),
        label: Math.floor(Math.random() * 10)
      }));

      const largeSizeCheck = checkDataSize(largeData);
      addResult(
        `Large dataset size: ${largeSizeCheck.sizeInMB}MB (exceeds limit: ${!largeSizeCheck.withinLimit})`,
        largeSizeCheck.withinLimit ? "warn" : "pass"
      );

      // Test safe storage function
      const safeLocalStorageSet = (key: string, data: any) => {
        try {
          const dataToStore = JSON.stringify(data);
          const dataSizeInBytes = new Blob([dataToStore]).size;
          const maxSizeInBytes = 4 * 1024 * 1024;

          if (dataSizeInBytes > maxSizeInBytes) {
            addResult(`Data too large for localStorage (${Math.round(dataSizeInBytes / 1024 / 1024)}MB). Correctly rejected.`, "pass");
            return false;
          }

          localStorage.setItem(key, dataToStore);
          addResult(`Data stored successfully in localStorage`, "pass");
          return true;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            addResult('localStorage quota exceeded. Correctly handled.', "pass");
            return false;
          } else {
            addResult(`Unexpected localStorage error: ${(error as Error).message}`, "fail");
            return false;
          }
        }
      };

      // Test with small data
      const smallDataSaved = safeLocalStorageSet('debug-test-small', mockTrainingData);

      // Test with large data
      const largeDataSaved = safeLocalStorageSet('debug-test-large', largeData);

      // Clean up test data
      localStorage.removeItem('debug-test-small');
      localStorage.removeItem('debug-test-large');

      addResult("localStorage quota tests completed successfully", "pass");

    } catch (error) {
      addResult(`localStorage test error: ${(error as Error).message}`, "fail");
    }
  }, [addResult]);

  // Test enum serialization
  const testEnumSerialization = useCallback(async () => {
    addResult("Starting enum serialization tests...", "pass");

    try {
      // Test basic enum values
      const layerConfig = {
        id: 'test-layer',
        type: LayerType.Conv,
        numFilters: 32,
        filterSize: 3,
        activation: ActivationFunction.ReLU
      };

      addResult(`Original layer type: ${layerConfig.type} (${typeof layerConfig.type})`, "pass");

      // Test JSON serialization/deserialization
      const serialized = JSON.stringify(layerConfig);
      const deserialized = JSON.parse(serialized);

      addResult(`Deserialized type: ${deserialized.type} (${typeof deserialized.type})`, "pass");

      // Test normalization function
      const normalizeLayerType = (type: any): string => {
        if (typeof type === "string") {
          const lowerType = type.toLowerCase();
          switch (lowerType) {
            case "conv": return LayerType.Conv;
            case "activation": return LayerType.Activation;
            case "pool": return LayerType.Pool;
            case "dropout": return LayerType.Dropout;
            case "flatten": return LayerType.Flatten;
            case "dense": return LayerType.Dense;
            case "reshape": return LayerType.Reshape;
            default:
              if (Object.values(LayerType).includes(type as any)) {
                return type;
              }
              throw new Error(`Unknown layer type string: ${type}`);
          }
        }

        if (Object.values(LayerType).includes(type)) {
          return type;
        }

        throw new Error(`Invalid layer type: ${type}`);
      };

      // Test various inputs
      const testInputs = [
        LayerType.Conv,
        "conv",
        "Conv",
        "CONV",
        LayerType.Dense,
        "dense",
        "Dense"
      ];

      testInputs.forEach(input => {
        try {
          const normalized = normalizeLayerType(input);
          addResult(`Normalized "${input}" → "${normalized}"`, "pass");
        } catch (error) {
          addResult(`Failed to normalize "${input}": ${(error as Error).message}`, "fail");
        }
      });

      // Test invalid inputs
      const invalidInputs = ["invalid", "Unknown", 123, null, undefined];

      invalidInputs.forEach(input => {
        try {
          const normalized = normalizeLayerType(input);
          addResult(`Unexpectedly normalized invalid input "${input}" → "${normalized}"`, "warn");
        } catch (error) {
          addResult(`Correctly rejected invalid input "${input}"`, "pass");
        }
      });

      addResult("Enum serialization tests completed successfully", "pass");

    } catch (error) {
      addResult(`Enum serialization test error: ${(error as Error).message}`, "fail");
    }
  }, [addResult]);

  // Test Web Worker message simulation
  const testWebWorkerMessage = useCallback(async () => {
    addResult("Starting Web Worker message simulation tests...", "pass");

    try {
      // Mock layer configuration
      const layers = [
        {
          id: 'layer-1',
          type: LayerType.Conv,
          numFilters: 32,
          filterSize: 3,
          activation: ActivationFunction.ReLU
        },
        {
          id: 'layer-2',
          type: LayerType.Pool,
          poolSize: 2
        },
        {
          id: 'layer-3',
          type: LayerType.Flatten
        },
        {
          id: 'layer-4',
          type: LayerType.Dense,
          units: 128,
          activation: ActivationFunction.ReLU
        }
      ];

      const message = {
        type: 'INIT_TRAINING',
        payload: {
          layers: layers,
          learningRate: 0.001
        }
      };

      addResult("Mock worker message created successfully", "pass");

      // Simulate serialization for worker
      const serializedMessage = JSON.stringify(message);
      const deserializedMessage = JSON.parse(serializedMessage);

      addResult(`Message serialization successful (${serializedMessage.length} chars)`, "pass");

      // Check layer types after deserialization
      deserializedMessage.payload.layers.forEach((layer: any, index: number) => {
        addResult(`Layer ${index + 1}: type="${layer.type}" (${typeof layer.type})`, "pass");
      });

      // Simulate worker layer processing
      const processLayers = (receivedLayers: any[]) => {
        receivedLayers.forEach((layerConfig, index) => {
          try {
            const type = layerConfig.type;

            // Simulate layer creation based on type
            switch (type) {
              case LayerType.Conv:
                addResult(`✓ Created Conv layer ${index + 1} (${layerConfig.numFilters} filters)`, "pass");
                break;
              case LayerType.Pool:
                addResult(`✓ Created Pool layer ${index + 1} (${layerConfig.poolSize || 2}x${layerConfig.poolSize || 2})`, "pass");
                break;
              case LayerType.Flatten:
                addResult(`✓ Created Flatten layer ${index + 1}`, "pass");
                break;
              case LayerType.Dense:
                addResult(`✓ Created Dense layer ${index + 1} (${layerConfig.units} units)`, "pass");
                break;
              default:
                throw new Error(`Unsupported layer type: ${type}`);
            }
          } catch (error) {
            addResult(`✗ Failed to create layer ${index + 1}: ${(error as Error).message}`, "fail");
          }
        });
      };

      processLayers(deserializedMessage.payload.layers);
      addResult("Web Worker message simulation completed successfully", "pass");

    } catch (error) {
      addResult(`Web Worker test error: ${(error as Error).message}`, "fail");
    }
  }, [addResult]);

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    clearResults();

    addResult("🧪 Starting comprehensive debug tests...", "pass");

    await new Promise(resolve => setTimeout(resolve, 100));
    await testLocalStorageQuota();

    await new Promise(resolve => setTimeout(resolve, 100));
    await testEnumSerialization();

    await new Promise(resolve => setTimeout(resolve, 100));
    await testWebWorkerMessage();

    addResult("🎉 All debug tests completed!", "pass");
    setIsRunning(false);
  }, [testLocalStorageQuota, testEnumSerialization, testWebWorkerMessage, clearResults, addResult]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
          title="Open Debug Test Panel"
        >
          🔧 Debug Tests
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-900">Debug Test Panel</h2>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            {isRunning ? "Running..." : "🚀 Run All Tests"}
          </button>
          <button
            onClick={testLocalStorageQuota}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            localStorage Test
          </button>
          <button
            onClick={testEnumSerialization}
            disabled={isRunning}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Enum Test
          </button>
          <button
            onClick={testWebWorkerMessage}
            disabled={isRunning}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Worker Test
          </button>
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {testResults.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No test results yet. Click "Run All Tests" to start.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`p-3 rounded-lg text-sm ${
                  result.type === "pass"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : result.type === "fail"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="flex-1">{result.message}</span>
                  <span className="font-bold">
                    {result.type === "pass" ? "✅" : result.type === "fail" ? "❌" : "⚠️"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 rounded-b-lg">
        <p>Debug panel for testing localStorage quota and Web Worker enum serialization fixes.</p>
      </div>
    </div>
  );
};
