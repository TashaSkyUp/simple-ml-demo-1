export enum ActivationFunction {
  ReLU = "relu",
  Sigmoid = "sigmoid",
  Tanh = "tanh",
  Linear = "linear", // Added for potential use, TF.js default for some layers if not specified
}

export enum LayerType {
  Conv = "conv",
  Activation = "activation",
  Pool = "pool",
  Dropout = "dropout",
  Flatten = "flatten", // Added for TF.js
  Dense = "dense", // Added for TF.js
  Reshape = "reshape", // Added for 3D reshaping
}

export enum PoolingType {
  Max = "max",
  Average = "average",
}

interface BaseLayerConfig {
  id: number | string;
  type: LayerType;
}

export interface ConvLayerConfig extends BaseLayerConfig {
  type: LayerType.Conv;
  filterSize: 3 | 5;
  numFilters: number;
  activation?: ActivationFunction; // Activation can be part of conv layer in TF.js
}

export interface ActivationLayerConfig extends BaseLayerConfig {
  type: LayerType.Activation;
  func: ActivationFunction;
}

export interface PoolLayerConfig extends BaseLayerConfig {
  type: LayerType.Pool;
  poolSize: number;
  poolingType: PoolingType;
}

export interface DropoutLayerConfig extends BaseLayerConfig {
  type: LayerType.Dropout;
  rate: number;
}

export interface FlattenLayerConfig extends BaseLayerConfig {
  type: LayerType.Flatten;
}

export interface DenseLayerConfig extends BaseLayerConfig {
  type: LayerType.Dense;
  units: number;
  activation: ActivationFunction;
}

export interface ReshapeLayerConfig extends BaseLayerConfig {
  type: LayerType.Reshape;
  targetShape: number[]; // Target shape for reshaping, e.g., [7, 7, 16] or [28, 28, 1]
}

export type LayerConfig =
  | ConvLayerConfig
  | ActivationLayerConfig
  | PoolLayerConfig
  | DropoutLayerConfig
  | FlattenLayerConfig
  | DenseLayerConfig
  | ReshapeLayerConfig;

export interface TrainingDataPoint {
  id: number | string;
  grid: number[][][]; // Training samples are stored as RGB grids
  label: 0 | 1;
}

export interface PredictionState {
  label: string;
  confidence: number;
}

export interface LiveLayerOutput {
  id: string; // Layer name from TF.js model or a unique ID like "input-0"
  maps: number[][][]; // Multiple feature maps (channels last from TF.js)
  layerClassName: string; // e.g., "Conv2D", "InputLayer", "MaxPooling2D"
  outputShape: number[]; // e.g. [null, 14, 14, 8]
  config?: any; // Store layer.getConfig() for details
}

// Model internal representation and pass information types are no longer needed
// as TensorFlow.js handles this.
