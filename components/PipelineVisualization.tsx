import React from 'react';
import { FeatureMapCanvas } from './FeatureMapCanvas';
import type { LiveLayerOutput, PredictionState } from '../types';
// LayerType from types is not directly used here for TF.js layer class names

interface PipelineVisualizationProps {
    liveLayerOutputs: LiveLayerOutput[];
    fcWeightsViz: number[][] | null;
    prediction: PredictionState;
    // model prop (tf.Sequential) is not directly used here, info comes from liveLayerOutputs
    activeVizChannel: { [layerId: string]: number }; // layerId is now layer.name
    onChannelCycle: (layerId: string, numTotalChannels: number) => void;
    status: string; // Broader status from useTFModel
}

export const PipelineVisualization: React.FC<PipelineVisualizationProps> = ({
    liveLayerOutputs,
    fcWeightsViz,
    prediction,
    activeVizChannel,
    onChannelCycle,
    status
}) => {
    // Show pipeline if we have outputs and model is ready/trained or architecture changed (meaning new outputs pending)
    if (liveLayerOutputs.length === 0 || !(status === 'ready' || status === 'success' || status === 'training' || status === 'architecture-changed')) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-8">
                <h2 className="text-2xl font-bold mb-4 text-cyan-400">Live Pipeline Visualization</h2>
                <div className="flex flex-nowrap gap-4 items-center justify-center bg-gray-900/50 p-4 rounded-lg overflow-x-auto border border-gray-700 min-h-[150px]">
                    <p className="text-gray-500">
                        {status === 'uninitialized' || status === 'initializing' || status === 'building' || status === 'compiling' 
                         ? 'Model is initializing...' 
                         : 'Draw on the canvas or train the model to see the pipeline.'}
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-8">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Live Pipeline Visualization</h2>
            <div className="flex flex-nowrap gap-4 items-start bg-gray-900/50 p-4 rounded-lg overflow-x-auto border border-gray-700" role="region" aria-label="CNN Layer Outputs">
                {liveLayerOutputs.map((output, index) => {
                    const numMaps = output.maps?.length || 0;
                    const displayedChannel = activeVizChannel[output.id] || 0;
                    
                    let mapToDisplay: number[][] = []; // Default to an empty map
                    if (output.maps && numMaps > 0) {
                        if (output.maps[displayedChannel] && output.maps[displayedChannel].length > 0) {
                            mapToDisplay = output.maps[displayedChannel];
                        } else if (output.maps[0] && output.maps[0].length > 0) {
                             mapToDisplay = output.maps[0]; // Fallback to first channel
                        }
                    }
                    
                    const mapDimensions = output.outputShape.slice(1).join('x') || 'N/A'; // Exclude batch

                    let layerDetailLabel = output.layerClassName;
                    if (output.config) {
                        if (output.layerClassName.includes('Conv2D')) {
                            layerDetailLabel += ` (${output.config.kernelSize[0]}x${output.config.kernelSize[1]}, ${output.config.filters}f, ${output.config.activation})`;
                        } else if (output.layerClassName.includes('Pooling2D')) {
                            layerDetailLabel += ` (${output.config.poolSize[0]}x${output.config.poolSize[1]})`;
                        } else if (output.layerClassName === 'Activation') {
                            layerDetailLabel += ` (${output.config.activation})`;
                        } else if (output.layerClassName === 'Dropout') {
                            layerDetailLabel += ` (${output.config.rate.toFixed(2)} rate)`;
                        }
                    }
                    
                    const labelBase = output.id.startsWith('input-') ? `Input` : `L${index}: ${layerDetailLabel.replace(/([A-Z])/g, ' $1').trim().split(' ').pop()}`; // Attempt to get a short name
                    const titleFull = output.id.startsWith('input-') ? `Input (${mapDimensions})` : `L${index}: ${layerDetailLabel} (Output: ${mapDimensions})`;
                    
                    const channelLabel = numMaps > 1 ? ` (Ch ${displayedChannel + 1}/${numMaps})` : "";
                    const shortLabel = `${labelBase}${channelLabel}`;

                    const isClickable = numMaps > 1;

                    return (
                        <div key={output.id} 
                             className={`flex flex-col items-center flex-shrink-0 w-36 ${isClickable ? 'cursor-pointer' : ''} p-1`}
                             onClick={isClickable ? () => onChannelCycle(output.id, numMaps) : undefined}
                             title={titleFull}
                             role="group"
                             aria-label={`Layer ${index}: ${layerDetailLabel}, Output Shape: ${mapDimensions}${numMaps > 1 ? `, ${numMaps} feature maps` : ''}`}
                        >
                            <h4 className="text-xs font-semibold text-gray-300 mb-1 truncate w-full text-center h-8 leading-tight flex items-center justify-center">{shortLabel}</h4>
                            <FeatureMapCanvas mapData={output.maps} channelIndexToDisplay={displayedChannel} size={100} label={mapToDisplay.length > 0 ? '' : 'No Output'} />
                            <p className="text-xs text-gray-500 mt-1">
                                {mapDimensions}
                                {numMaps > 1 ? ` (${numMaps} maps)` : numMaps === 1 && mapToDisplay.length > 0 ? ' (1 map)' : ''}
                            </p>
                        </div>
                    );
                })}
                {fcWeightsViz && (status === 'success' || status === 'ready') && (
                    <div className="flex flex-col items-center flex-shrink-0 w-36 p-1" role="group" aria-label="Fully Connected Layer Weights Visualization">
                        <h4 className="text-xs font-semibold text-gray-300 mb-1 truncate w-full text-center h-8 leading-tight flex items-center justify-center" title="Learned Template (FC Weights)">FC Weights</h4>
                        <FeatureMapCanvas mapData={fcWeightsViz} size={100} label="FC Weights"/>
                        <p className="text-xs text-gray-500 mt-1">{fcWeightsViz.length > 0 && fcWeightsViz[0] ? `${fcWeightsViz.length}x${fcWeightsViz[0].length}` : 'N/A'}</p>
                    </div>
                )}
                 {liveLayerOutputs.length > 0 && ( // Show prediction at the end of pipeline if there are outputs
                    <div className="flex flex-col items-center flex-shrink-0 w-36 p-1" role="group" aria-label="Final Prediction">
                        <h4 className="text-xs font-semibold text-gray-300 mb-1 truncate w-full text-center h-8 leading-tight flex items-center justify-center">Prediction</h4>
                        <div className="w-[100px] h-[100px] flex items-center justify-center bg-gray-900 rounded-md border-2 border-cyan-500">
                            <p className="text-6xl font-bold text-cyan-400" aria-live="polite">{prediction.label}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{(prediction.confidence * 100).toFixed(1)}% Conf.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};
