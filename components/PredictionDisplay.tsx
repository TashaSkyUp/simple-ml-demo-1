
import React from 'react';
import type { PredictionState } from '../types';

interface PredictionDisplayProps {
    prediction: PredictionState;
    modelReady: boolean; // To indicate if a model is loaded and can predict
}

export const PredictionDisplay: React.FC<PredictionDisplayProps> = ({ prediction, modelReady }) => {
    if (!modelReady) {
        return (
             <div>
                <h3 className="text-lg font-semibold text-gray-400">Live Prediction</h3>
                <div className="bg-gray-900/50 mt-2 p-4 rounded-lg flex items-center justify-center gap-6 border border-gray-700 min-h-[100px]">
                    <p className="text-gray-500">Define architecture or train a model to see predictions.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-400">Live Prediction</h3>
            <div className="bg-gray-900/50 mt-2 p-4 rounded-lg flex items-center justify-center gap-6 border border-gray-700">
                <p className="text-8xl font-bold text-cyan-400">{prediction.label}</p>
                <div className="text-left">
                    <p className="text-gray-400">Confidence</p>
                    <p className="text-3xl font-mono text-white">{(prediction.confidence * 100).toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
};
