import { useRef, useCallback, useEffect, useState } from "react";
import type { LayerConfig, TrainingDataPoint, PredictionState } from "../types";

// Worker message types (must match worker definitions)
interface TrainingWorkerMessage {
  type: 'INIT_TRAINING' | 'START_TRAINING' | 'STOP_TRAINING' | 'PREDICT' | 'DISPOSE';
  payload?: any;
}

interface SerializedWeight {
  shape: number[];
  data: number[];
}

interface TrainingWorkerResponse {
  type: 'TRAINING_PROGRESS' | 'TRAINING_COMPLETE' | 'TRAINING_ERROR' | 'PREDICTION_RESULT' | 'MODEL_READY';
  payload?: {
    modelWeights?: SerializedWeight[];
    [key: string]: any;
  };
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
}

export type WorkerStatus =
  | "uninitialized"
  | "initializing"
  | "ready"
  | "training"
  | "error";

interface UseTrainingWorkerProps {
  layers: LayerConfig[];
  learningRate: number;
  onTrainingProgress?: (progress: TrainingProgress) => void;
  onTrainingComplete?: (modelWeights: SerializedWeight[]) => void;
  onPredictionResult?: (prediction: PredictionState) => void;
  onError?: (error: string) => void;
}

export const useTrainingWorker = ({
  layers,
  learningRate,
  onTrainingProgress,
  onTrainingComplete,
  onPredictionResult,
  onError,
}: UseTrainingWorkerProps) => {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("uninitialized");
  const [currentProgress, setCurrentProgress] = useState<TrainingProgress | null>(null);

  // Initialize worker
  const initializeWorker = useCallback(async () => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setStatus("initializing");

    try {
      // Create worker from the training worker file
      workerRef.current = new Worker(
        new URL('../workers/trainingWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      workerRef.current.onmessage = (event: MessageEvent<TrainingWorkerResponse>) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'MODEL_READY':
            console.log('Success Training worker model ready');
            setStatus("ready");
            break;

          case 'TRAINING_PROGRESS':
            const progress = payload as TrainingProgress;
            setCurrentProgress(progress);
            onTrainingProgress?.(progress);
            break;

          case 'TRAINING_COMPLETE':
            console.log('Complete Training completed in worker');
            setStatus("ready");
            setCurrentProgress(null);
            onTrainingComplete?.(payload.modelWeights || []);
            break;

          case 'PREDICTION_RESULT':
            onPredictionResult?.(payload);
            break;

          case 'TRAINING_ERROR':
            console.error('Error Training worker error:', payload.error);
            setStatus("error");
            setCurrentProgress(null);
            onError?.(payload.error);
            break;

          default:
            console.warn('Unknown worker message type:', type);
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('Error Worker error:', error);
        setStatus("error");
        onError?.(`Worker error: ${error.message}`);
      };

      // Initialize the model in the worker
      const message: TrainingWorkerMessage = {
        type: 'INIT_TRAINING',
        payload: { layers, learningRate },
      };

      workerRef.current.postMessage(message);

    } catch (error) {
      console.error('Error Failed to initialize training worker:', error);
      setStatus("error");
      onError?.(`Failed to initialize worker: ${error}`);
    }
  }, [layers, learningRate, onTrainingProgress, onTrainingComplete, onPredictionResult, onError]);

  // Start training
  const startTraining = useCallback((
    trainingData: TrainingDataPoint[],
    numEpochs: number,
    batchSize: number
  ) => {
    if (!workerRef.current || status !== "ready") {
      console.warn('Worker not ready for training');
      onError?.('Worker not ready for training');
      return;
    }

    console.log(` Starting background training: ${numEpochs} epochs`);
    setStatus("training");

    const message: TrainingWorkerMessage = {
      type: 'START_TRAINING',
      payload: {
        trainingData,
        numEpochs,
        batchSize,
        learningRate,
      },
    };

    workerRef.current.postMessage(message);
  }, [status, learningRate, onError]);

  // Stop training
  const stopTraining = useCallback(() => {
    if (!workerRef.current) return;

    console.log(' Stopping background training');

    const message: TrainingWorkerMessage = {
      type: 'STOP_TRAINING',
    };

    workerRef.current.postMessage(message);
    setStatus("ready");
    setCurrentProgress(null);
  }, []);

  // Run prediction
  const predict = useCallback((inputGrid: number[][][]) => {
    if (!workerRef.current || status === "training") {
      console.warn('Worker not available for prediction');
      return;
    }

    const message: TrainingWorkerMessage = {
      type: 'PREDICT',
      payload: { inputGrid },
    };

    workerRef.current.postMessage(message);
  }, [status]);

  // Cleanup worker on unmount or when dependencies change
  useEffect(() => {
    initializeWorker();

    return () => {
      if (workerRef.current) {
        const message: TrainingWorkerMessage = {
          type: 'DISPOSE',
        };
        workerRef.current.postMessage(message);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [initializeWorker]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    status,
    currentProgress,
    startTraining,
    stopTraining,
    predict,
    isTraining: status === "training",
    isReady: status === "ready",
  };
};
