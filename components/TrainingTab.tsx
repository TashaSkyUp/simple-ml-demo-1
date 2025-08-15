import React from "react";
import { LayerConfig, TrainingDataPoint, LayerType } from "../types";
import { CollapsibleSection } from "./CollapsibleSection";
import { ArchitectureDefinition } from "./ArchitectureDefinition";
import { DataCollection } from "./DataCollection";
import { TrainingControls } from "./TrainingControls";
import { GPUStatus } from "./GPUStatus";

interface TrainingTabProps {
  // Architecture props
  layers: LayerConfig[];
  onUpdateLayer: (id: string | number, updates: Partial<LayerConfig>) => void;
  onRemoveLayer: (id: string | number) => void;
  onAddLayer: (layerType: LayerType) => void;
  onReorderLayers: (startIndex: number, endIndex: number) => void;

  // Data collection props
  trainingData: TrainingDataPoint[];
  onAddData: (grid: number[][][], label: 0 | 1) => void;
  onClearTrainingData: () => void;
  onRemoveTrainingDataPoint: (id: number | string) => void;
  augmentFlip: boolean;
  onAugmentFlipChange: (value: boolean) => void;
  augmentTranslate: boolean;
  onAugmentTranslateChange: (value: boolean) => void;
  liveCameraMode: boolean;
  onLiveCameraModeChange: (enabled: boolean) => void;
  onCameraStreamingChange?: (streaming: boolean) => void;
  predict: (grid: number[][][]) => Promise<void>;

  // Training props
  numEpochs: number;
  onNumEpochsChange: (value: number) => void;
  learningRate: number;
  onLearningRateChange: (value: number) => void;
  batchSize: number;
  onBatchSizeChange: (value: number) => void;
  maxBatchSize: number;
  onStartTraining: () => void;
  onResetAll: () => void;
  trainingStatus: string;
  epochsRun: number;
  lossHistory: number[];
  onSaveSession: () => void;
  onLoadSession: () => void;

  // Training mode props
  isUsingBackgroundWorker?: boolean;
  isHybridTraining?: boolean;
  trainingMode?: string;

  // GPU props
  gpuBenchmark: {
    opsPerSecond: number;
    isRunning: boolean;
    lastRun: Date | null;
    webglSpeed?: number;
    cpuSpeed?: number;
    webgpuSpeed?: number;
    currentBackend?: string;
  };
  onRunGPUBenchmark: () => Promise<void>;

  // Collapsible sections state
  isSectionOpen: (sectionId: string) => boolean;
  toggleSection: (sectionId: string) => void;
}

export const TrainingTab: React.FC<TrainingTabProps> = ({
  // Architecture
  layers,
  onUpdateLayer,
  onRemoveLayer,
  onAddLayer,
  onReorderLayers,

  // Data collection
  trainingData,
  onAddData,
  onClearTrainingData,
  onRemoveTrainingDataPoint,
  augmentFlip,
  onAugmentFlipChange,
  augmentTranslate,
  onAugmentTranslateChange,
  liveCameraMode,
  onLiveCameraModeChange,
  onCameraStreamingChange,
  predict,

  // Training
  numEpochs,
  onNumEpochsChange,
  learningRate,
  onLearningRateChange,
  batchSize,
  onBatchSizeChange,
  maxBatchSize,
  onStartTraining,
  onResetAll,
  trainingStatus,
  epochsRun,
  lossHistory,
  onSaveSession,
  onLoadSession,

  // Training mode props
  isUsingBackgroundWorker,
  isHybridTraining,
  trainingMode,

  // GPU
  gpuBenchmark,
  onRunGPUBenchmark,

  // Sections
  isSectionOpen,
  toggleSection,
}) => {
  return (
    <div className="space-y-3">
      {/* Training Tab Header */}
      <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl"></span>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">
                Training Mode
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">
                {layers.length} layers configured
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">
                {trainingData.length} samples collected
              </span>
            </div>
            {epochsRun > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">
                  {epochsRun} epochs trained
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-3">
        {/* Architecture Section */}
        <div className="xl:col-span-1">
          <CollapsibleSection
            title="Network Architecture"
            icon=""
            badge={layers.length}
            sectionId="training-architecture"
            isOpen={isSectionOpen("training-architecture")}
            onToggle={toggleSection}
            className="h-fit hover-lift"
          >
            <ArchitectureDefinition
              layers={layers}
              updateLayer={onUpdateLayer}
              removeLayer={onRemoveLayer}
              addLayer={onAddLayer}
              reorderLayers={onReorderLayers}
            />
          </CollapsibleSection>

          {/* GPU Performance Section */}
          <div className="mt-3">
            <CollapsibleSection
              title="GPU Performance"
              icon=""
              badge={
                gpuBenchmark.currentBackend?.toUpperCase() ||
                (gpuBenchmark.opsPerSecond > 0
                  ? `${Math.round(gpuBenchmark.opsPerSecond)} ops/s`
                  : undefined)
              }
              sectionId="training-gpu-performance"
              isOpen={isSectionOpen("training-gpu-performance")}
              onToggle={toggleSection}
              className="h-fit hover-lift"
            >
              <GPUStatus
                benchmarkData={gpuBenchmark}
                onRunBenchmark={onRunGPUBenchmark}
              />
            </CollapsibleSection>
          </div>
        </div>

        {/* Data Collection Section */}
        <div className="xl:col-span-1">
          <CollapsibleSection
            title="Data Collection"
            icon=""
            badge={trainingData.length}
            sectionId="training-data-collection"
            isOpen={isSectionOpen("training-data-collection")}
            onToggle={toggleSection}
            className="h-fit hover-lift"
          >
            <DataCollection
              onAddData={onAddData}
              predict={predict}
              augmentFlip={augmentFlip}
              onAugmentFlipChange={onAugmentFlipChange}
              augmentTranslate={augmentTranslate}
              onAugmentTranslateChange={onAugmentTranslateChange}
              liveCameraMode={liveCameraMode}
              onLiveCameraModeChange={onLiveCameraModeChange}
              onCameraStreamingChange={onCameraStreamingChange}
              inferenceMode={false}
            />
          </CollapsibleSection>
        </div>

        {/* Training Controls Section */}
        <div className="xl:col-span-1 lg:col-span-2 xl:col-span-1">
          <CollapsibleSection
            title="Training & Session Management"
            icon=""
            badge={
              trainingStatus === "training"
                ? `Training ${epochsRun}/${numEpochs}`
                : epochsRun > 0
                  ? `${epochsRun} epochs`
                  : undefined
            }
            sectionId="training-controls"
            isOpen={isSectionOpen("training-controls")}
            onToggle={toggleSection}
            className="h-fit hover-lift"
          >
            <TrainingControls
              trainingData={trainingData}
              onClearTrainingData={onClearTrainingData}
              onRemoveTrainingDataPoint={onRemoveTrainingDataPoint}
              numEpochs={numEpochs}
              onNumEpochsChange={onNumEpochsChange}
              learningRate={learningRate}
              onLearningRateChange={onLearningRateChange}
              batchSize={batchSize}
              onBatchSizeChange={onBatchSizeChange}
              maxBatchSize={maxBatchSize}
              onStartTraining={onStartTraining}
              onResetAll={onResetAll}
              status={
                trainingStatus as
                  | "collecting"
                  | "training"
                  | "success"
                  | "architecture-changed"
                  | "error"
              }
              epochsRun={epochsRun}
              lossHistory={lossHistory}
              onSaveSession={onSaveSession}
              onLoadSession={onLoadSession}
              isUsingWorker={isUsingBackgroundWorker}
              isHybridTraining={isHybridTraining}
              trainingMode={trainingMode}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
};

export default TrainingTab;
