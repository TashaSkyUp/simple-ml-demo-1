import React from "react";
import { LossGraph } from "./LossGraph";
import { FeatureMapCanvas } from "./FeatureMapCanvas"; // For training data viz
import type { TrainingDataPoint } from "../types";

interface TrainingControlsProps {
  trainingData: TrainingDataPoint[];
  onClearTrainingData: () => void;
  onRemoveTrainingDataPoint: (id: number | string) => void;
  numEpochs: number;
  onNumEpochsChange: (epochs: number) => void;
  learningRate: number;
  onLearningRateChange: (lr: number) => void;
  batchSize: number;
  onBatchSizeChange: (bs: number) => void;
  maxBatchSize: number;
  onStartTraining: () => void;
  onResetAll: () => void;
  status:
    | "collecting"
    | "training"
    | "success"
    | "architecture-changed"
    | "error";
  epochsRun: number;
  lossHistory: number[];
  onSaveSession: () => void; // New prop
  onLoadSession: () => void; // New prop
}

export const TrainingControls: React.FC<TrainingControlsProps> = ({
  trainingData,
  onClearTrainingData,
  onRemoveTrainingDataPoint,
  numEpochs,
  onNumEpochsChange,
  learningRate,
  onLearningRateChange,
  batchSize,
  onBatchSizeChange,
  maxBatchSize,
  onStartTraining,
  onResetAll,
  status,
  epochsRun,
  lossHistory,
  onSaveSession, // Destructure new prop
  onLoadSession, // Destructure new prop
}) => {
  const canTrain = !(
    status === "training" ||
    trainingData.length < 2 ||
    !trainingData.some((d) => d.label === 0) ||
    !trainingData.some((d) => d.label === 1) ||
    batchSize <= 0 ||
    (trainingData.length > 0 && batchSize > trainingData.length)
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">
        3. Train & Predict
      </h2>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-300">
          Samples ({trainingData.length})
        </h3>
        <button
          onClick={onClearTrainingData}
          className="text-sm text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded px-2 py-1"
          disabled={trainingData.length === 0}
          aria-label="Clear all training samples"
        >
          Clear All Samples
        </button>
      </div>
      <div className="bg-gray-900/50 p-2 rounded-lg h-24 overflow-y-auto flex flex-wrap gap-2 mb-6 border border-gray-700 items-center justify-start">
        {trainingData.length === 0 && (
          <p className="text-gray-500 text-sm self-center mx-auto w-full text-center">
            Add samples to begin.
          </p>
        )}
        {trainingData.map((data) => (
          <div
            key={data.id}
            className="relative flex-shrink-0 group cursor-pointer"
            onClick={() => onRemoveTrainingDataPoint(data.id)}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ")
                onRemoveTrainingDataPoint(data.id);
            }}
            role="button"
            tabIndex={0}
            aria-label={`Remove sample for class ${data.label}, added at ${new Date(typeof data.id === "string" ? parseInt(data.id) : data.id).toLocaleTimeString()}`}
          >
            <FeatureMapCanvas mapData={data.grid} size={50} />
            <span
              className={`absolute bottom-0 right-0 px-1.5 py-0.5 text-xs font-bold rounded-tl-md ${data.label === 0 ? "bg-sky-500 text-white" : "bg-amber-500 text-white"}`}
            >
              {data.label}
            </span>
            <div className="absolute inset-0 bg-red-700 bg-opacity-0 group-hover:bg-opacity-75 flex items-center justify-center transition-opacity duration-150 rounded-md">
              <span className="text-white text-2xl font-bold opacity-0 group-hover:opacity-100">
                &times;
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-1">
        <div>
          <label htmlFor="epochs" className="text-sm text-gray-400">
            Epochs: {numEpochs}
          </label>
          <input
            id="epochs"
            type="range"
            min="10"
            max="10000"
            step="10"
            value={numEpochs}
            onChange={(e) => onNumEpochsChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1 accent-cyan-500"
          />
        </div>
        <div>
          <label htmlFor="lr" className="text-sm text-gray-400">
            Learning Rate: {learningRate.toExponential(1)}
          </label>
          <input
            id="lr"
            type="range"
            min="0.000001"
            max="0.1"
            step="0.000001"
            value={learningRate}
            onChange={(e) => onLearningRateChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1 accent-cyan-500"
          />
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="batchSize" className="text-sm text-gray-400">
          Batch Size: {batchSize}
        </label>
        <input
          id="batchSize"
          type="range"
          min="1"
          max={maxBatchSize}
          step="1"
          value={batchSize}
          onChange={(e) => onBatchSizeChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer mt-1 accent-cyan-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onStartTraining}
          disabled={!canTrain}
          className="w-full flex justify-center items-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded transition-colors text-lg disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Train
        </button>
        <button
          onClick={onResetAll}
          className="w-full flex justify-center items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded transition-colors text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          (Reset All)
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <button
          onClick={onSaveSession}
          className="w-full flex justify-center items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Save current session (architecture and training data) to a JSON file"
        >
          Save Session
        </button>
        <button
          onClick={onLoadSession}
          className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded transition-colors text-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          aria-label="Load session (architecture and training data) from a JSON file"
        >
          Load Session
        </button>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-400">Status</h3>
          <div
            className={`p-3 rounded-md text-center font-semibold ${status === "collecting" ? "bg-gray-700 text-gray-300" : status === "training" ? "bg-blue-800 text-blue-200 animate-pulse" : status === "architecture-changed" ? "bg-yellow-800 text-yellow-200" : status === "error" ? "bg-red-800 text-red-200" : "bg-green-800 text-green-200"}`}
          >
            {status === "collecting"
              ? "Ready..."
              : status === "training"
                ? `Training... Epoch: ${epochsRun}/${numEpochs}`
                : status === "architecture-changed"
                  ? "Arch changed. Retrain."
                  : status === "error"
                    ? "Error! Reset."
                    : `Training Complete!`}
          </div>
          {lossHistory.length > 0 ? (
            <LossGraph history={lossHistory} />
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm text-gray-500 bg-gray-900/50 rounded-md mt-2 border border-gray-700">
              Train for loss graph.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
