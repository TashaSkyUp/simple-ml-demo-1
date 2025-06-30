import React, { useState, useEffect, useRef } from "react";

interface TestResult {
  test: string;
  status: "pending" | "pass" | "fail";
  message: string;
  duration?: number;
}

export const WebWorkerTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const updateTestResult = (testName: string, status: TestResult["status"], message: string, duration?: number) => {
    setTestResults(prev => prev.map(test =>
      test.test === testName
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);

    // Initialize test results
    const initialTests: TestResult[] = [
      { test: "Web Worker Creation", status: "pending", message: "Creating worker..." },
      { test: "TensorFlow.js in Worker", status: "pending", message: "Waiting..." },
      { test: "Backend Selection", status: "pending", message: "Waiting..." },
      { test: "Model Creation", status: "pending", message: "Waiting..." },
      { test: "Training Test", status: "pending", message: "Waiting..." },
      { test: "Message Passing", status: "pending", message: "Waiting..." },
    ];

    setTestResults(initialTests);

    try {
      // Test 1: Web Worker Creation
      const startTime = performance.now();

      try {
        workerRef.current = new Worker(
          new URL('../workers/trainingWorker.ts', import.meta.url),
          { type: 'module' }
        );

        updateTestResult("Web Worker Creation", "pass", "Worker created successfully", performance.now() - startTime);
      } catch (error) {
        updateTestResult("Web Worker Creation", "fail", `Failed to create worker: ${error}`);
        setIsRunning(false);
        return;
      }

      // Test 2-6: Set up message handler and run tests
      let testTimeouts: NodeJS.Timeout[] = [];

      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'MODEL_READY':
            updateTestResult("TensorFlow.js in Worker", "pass", "TensorFlow.js initialized successfully");
            updateTestResult("Backend Selection", "pass", `Backend: ${payload.backend || 'Unknown'}`);
            updateTestResult("Model Creation", "pass", "Model built and compiled");

            // Test 5: Start a quick training test
            const testData = [
              {
                grid: Array(28).fill(null).map(() => Array(28).fill(null).map(() => [0.1, 0.1, 0.1])),
                label: 0
              },
              {
                grid: Array(28).fill(null).map(() => Array(28).fill(null).map(() => [0.9, 0.9, 0.9])),
                label: 1
              }
            ];

            workerRef.current?.postMessage({
              type: 'START_TRAINING',
              payload: {
                trainingData: testData,
                numEpochs: 2,
                batchSize: 2,
                learningRate: 0.01
              }
            });
            break;

          case 'TRAINING_PROGRESS':
            updateTestResult("Training Test", "pass", `Epoch ${payload.epoch}/2 - Loss: ${payload.loss?.toFixed(4) || 'N/A'}`);
            updateTestResult("Message Passing", "pass", "Progress messages working");
            break;

          case 'TRAINING_COMPLETE':
            updateTestResult("Training Test", "pass", "Training completed successfully");
            updateTestResult("Message Passing", "pass", "All message types working");
            setIsRunning(false);
            break;

          case 'TRAINING_ERROR':
            updateTestResult("Training Test", "fail", `Training error: ${payload.error}`);
            setIsRunning(false);
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        updateTestResult("Web Worker Creation", "fail", `Worker error: ${error.message}`);
        updateTestResult("TensorFlow.js in Worker", "fail", "Worker crashed");
        setIsRunning(false);
      };

      // Test timeout
      const overallTimeout = setTimeout(() => {
        updateTestResult("TensorFlow.js in Worker", "fail", "Timeout - Worker initialization took too long");
        setIsRunning(false);
      }, 10000);

      testTimeouts.push(overallTimeout);

      // Initialize worker
      workerRef.current.postMessage({
        type: 'INIT_TRAINING',
        payload: {
          layers: [
            { id: '1', type: 'Conv', filterSize: 3, numFilters: 4, activation: 'ReLU' },
            { id: '2', type: 'Pool', poolSize: 2, poolingType: 'Max' },
            { id: '3', type: 'Flatten' },
            { id: '4', type: 'Dense', units: 1, activation: 'Sigmoid' }
          ],
          learningRate: 0.01
        }
      });

    } catch (error) {
      updateTestResult("Web Worker Creation", "fail", `Unexpected error: ${error}`);
      setIsRunning(false);
    }
  };

  const cleanup = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'DISPOSE' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "pass": return "text-green-400";
      case "fail": return "text-red-400";
      case "pending": return "text-yellow-400";
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pass": return "✅";
      case "fail": return "❌";
      case "pending": return "⏳";
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">🧪 Web Worker Test Suite</h2>
        <p className="text-gray-300 text-sm mb-4">
          This test verifies that the Web Worker training implementation is working correctly.
          Run this test to diagnose any issues with background training.
        </p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={runTests}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isRunning
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isRunning ? "Running Tests..." : "Run Tests"}
          </button>

          <button
            onClick={cleanup}
            disabled={isRunning}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600 disabled:text-gray-400"
          >
            Cleanup
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {testResults.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            Click "Run Tests" to start the Web Worker test suite
          </div>
        ) : (
          testResults.map((result, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getStatusIcon(result.status)}</span>
                <div>
                  <div className="font-medium text-white">{result.test}</div>
                  <div className={`text-sm ${getStatusColor(result.status)}`}>
                    {result.message}
                  </div>
                </div>
              </div>

              {result.duration && (
                <div className="text-gray-400 text-sm">
                  {result.duration.toFixed(0)}ms
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="font-medium text-white mb-2">💡 Debugging Tips:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Open browser DevTools Console to see detailed logs</li>
          <li>• Look for messages like "🔧 TensorFlow.js initialized in worker"</li>
          <li>• If tests fail, try refreshing the page and running again</li>
          <li>• Web Workers require HTTPS in production (GitHub Pages provides this)</li>
          <li>• Check Network tab for worker file loading issues</li>
        </ul>
      </div>
    </div>
  );
};
