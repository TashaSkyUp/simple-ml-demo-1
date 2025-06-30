// Session Management Test and Type Validation
// This file demonstrates and validates the session management functionality

interface LayerConfig {
  id: number;
  type: 'conv2d' | 'maxPooling2d' | 'dense' | 'flatten' | 'reshape';
  [key: string]: any;
}

interface TrainingDataPoint {
  image: number[];
  label: string;
  timestamp: number;
}

interface ModelWeightData {
  shape: number[];
  data: number[];
}

interface AppSessionData {
  layers: LayerConfig[];
  trainingData: TrainingDataPoint[];
  modelWeights?: ModelWeightData[] | null;
  epochsRun?: number;
  lossHistory?: number[];
}

// Example session data structure
const exampleSession: AppSessionData = {
  layers: [
    {
      id: Date.now(),
      type: 'conv2d',
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      inputShape: [28, 28, 1]
    },
    {
      id: Date.now() + 1,
      type: 'maxPooling2d',
      poolSize: 2,
      strides: 2
    },
    {
      id: Date.now() + 2,
      type: 'flatten'
    },
    {
      id: Date.now() + 3,
      type: 'dense',
      units: 10,
      activation: 'softmax'
    }
  ],
  trainingData: [
    {
      image: new Array(784).fill(0).map(() => Math.random()),
      label: 'circle',
      timestamp: Date.now()
    },
    {
      image: new Array(784).fill(0).map(() => Math.random()),
      label: 'square',
      timestamp: Date.now() + 1000
    }
  ],
  modelWeights: [
    {
      shape: [3, 3, 1, 32],
      data: new Array(3 * 3 * 1 * 32).fill(0).map(() => Math.random() - 0.5)
    },
    {
      shape: [32],
      data: new Array(32).fill(0).map(() => Math.random() - 0.5)
    },
    {
      shape: [13 * 13 * 32, 10],
      data: new Array(13 * 13 * 32 * 10).fill(0).map(() => Math.random() - 0.5)
    },
    {
      shape: [10],
      data: new Array(10).fill(0).map(() => Math.random() - 0.5)
    }
  ],
  epochsRun: 15,
  lossHistory: [2.3, 1.8, 1.4, 1.1, 0.9, 0.7, 0.6, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2]
};

// Test functions for session management
class SessionManagerTest {
  static validateSessionData(sessionData: AppSessionData): boolean {
    try {
      // Validate required fields
      if (!Array.isArray(sessionData.layers) || sessionData.layers.length === 0) {
        console.error('Invalid layers data');
        return false;
      }

      if (!Array.isArray(sessionData.trainingData)) {
        console.error('Invalid training data');
        return false;
      }

      // Validate layer structure
      for (const layer of sessionData.layers) {
        if (!layer.id || !layer.type) {
          console.error('Layer missing required fields:', layer);
          return false;
        }
      }

      // Validate training data structure
      for (const dataPoint of sessionData.trainingData) {
        if (!Array.isArray(dataPoint.image) || !dataPoint.label || !dataPoint.timestamp) {
          console.error('Training data point missing required fields:', dataPoint);
          return false;
        }
      }

      // Validate weights if present
      if (sessionData.modelWeights) {
        for (const weight of sessionData.modelWeights) {
          if (!Array.isArray(weight.shape) || !Array.isArray(weight.data)) {
            console.error('Model weight missing required fields:', weight);
            return false;
          }

          // Validate that data length matches shape
          const expectedLength = weight.shape.reduce((a, b) => a * b, 1);
          if (weight.data.length !== expectedLength) {
            console.error('Weight data length mismatch:', {
              expected: expectedLength,
              actual: weight.data.length,
              shape: weight.shape
            });
            return false;
          }
        }
      }

      console.log('Success Session data validation passed');
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  static serializeSession(sessionData: AppSessionData): string {
    try {
      return JSON.stringify(sessionData, null, 2);
    } catch (error) {
      console.error('Failed to serialize session:', error);
      throw error;
    }
  }

  static deserializeSession(jsonString: string): AppSessionData {
    try {
      const parsed = JSON.parse(jsonString);
      if (this.validateSessionData(parsed)) {
        return parsed;
      } else {
        throw new Error('Invalid session data structure');
      }
    } catch (error) {
      console.error('Failed to deserialize session:', error);
      throw error;
    }
  }

  static calculateSessionSize(sessionData: AppSessionData): {
    layers: number;
    trainingDataPoints: number;
    weightParameters: number;
    epochsRun: number;
    estimatedFileSize: string;
  } {
    const weightParameters = sessionData.modelWeights
      ? sessionData.modelWeights.reduce((total, weight) => total + weight.data.length, 0)
      : 0;

    const jsonString = this.serializeSession(sessionData);
    const fileSizeBytes = new Blob([jsonString]).size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

    return {
      layers: sessionData.layers.length,
      trainingDataPoints: sessionData.trainingData.length,
      weightParameters,
      epochsRun: sessionData.epochsRun || 0,
      estimatedFileSize: `${fileSizeMB} MB`
    };
  }

  static runTests(): void {
    console.log('Test Running Session Management Tests...\n');

    // Test 1: Validate example session
    console.log('Test 1: Validating example session');
    const isValid = this.validateSessionData(exampleSession);
    console.log(`Result: ${isValid ? 'Success PASS' : 'Error FAIL'}\n`);

    // Test 2: Serialize and deserialize
    console.log('Test 2: Serialize/Deserialize cycle');
    try {
      const serialized = this.serializeSession(exampleSession);
      const deserialized = this.deserializeSession(serialized);
      console.log('Result: Success PASS - Serialize/deserialize successful\n');
    } catch (error) {
      console.log('Result: Error FAIL - Serialize/deserialize failed:', error, '\n');
    }

    // Test 3: Calculate session statistics
    console.log('Test 3: Session statistics');
    const stats = this.calculateSessionSize(exampleSession);
    console.log('Session Statistics:', stats);
    console.log('Result: Success PASS - Statistics calculated\n');

    // Test 4: Invalid session handling
    console.log('Test 4: Invalid session handling');
    const invalidSession = { layers: null, trainingData: [] } as any;
    const invalidResult = this.validateSessionData(invalidSession);
    console.log(`Result: ${!invalidResult ? 'Success PASS' : 'Error FAIL'} - Invalid session properly rejected\n`);

    console.log('Complete Session Management Tests Complete!');
  }
}

// Export for use in other modules
export {
  AppSessionData,
  LayerConfig,
  TrainingDataPoint,
  ModelWeightData,
  SessionManagerTest,
  exampleSession
};

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  SessionManagerTest.runTests();
}
