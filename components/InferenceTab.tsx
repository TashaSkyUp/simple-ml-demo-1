import React, { useState, useEffect, useRef } from "react";
import { PredictionState, LiveLayerOutput } from "../types";
import { CollapsibleSection } from "./CollapsibleSection";
import { PredictionDisplay } from "./PredictionDisplay";
import { PipelineVisualization } from "./PipelineVisualization";
import { DataCollection } from "./DataCollection";

interface InferenceTabProps {
  // Model state
  modelReady: boolean;
  prediction: PredictionState;

  // Live inference props
  onPredictFromCanvas: (grid: number[][][]) => Promise<void>;
  liveCameraMode: boolean;
  onLiveCameraModeChange: (enabled: boolean) => void;
  onCameraStreamingChange?: (streaming: boolean) => void;
  isCameraStreaming: boolean;

  // Pipeline visualization
  liveLayerOutputs: LiveLayerOutput[];
  fcWeightsViz: number[][] | null;
  activeVizChannel: { [layerId: string]: number };
  onChannelCycle: (layerId: string, numTotalChannels: number) => void;
  pipelineStatus: string;

  // Collapsible sections state
  isSectionOpen: (sectionId: string) => boolean;
  toggleSection: (sectionId: string) => void;
}

export const InferenceTab: React.FC<InferenceTabProps> = ({
  modelReady,
  prediction,
  onPredictFromCanvas,
  liveCameraMode,
  onLiveCameraModeChange,
  onCameraStreamingChange,
  isCameraStreaming,
  liveLayerOutputs,
  fcWeightsViz,
  activeVizChannel,
  onChannelCycle,
  pipelineStatus,
  isSectionOpen,
  toggleSection,
}) => {
  // Audio alerts state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [class0ChimeUrl, setClass0ChimeUrl] = useState("");
  const [class1ChimeUrl, setClass1ChimeUrl] = useState("");
  const [volume, setVolume] = useState(0.5);
  const [lastPlayedPrediction, setLastPlayedPrediction] = useState<
    string | null
  >(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play chime when prediction changes
  useEffect(() => {
    if (!audioEnabled || !modelReady || prediction.confidence < 0.7) return;

    const currentPrediction = prediction.label;
    if (currentPrediction === lastPlayedPrediction || currentPrediction === "?")
      return;

    let chimeUrl = "";
    if (currentPrediction === "Class 0" && class0ChimeUrl) {
      chimeUrl = class0ChimeUrl;
    } else if (currentPrediction === "Class 1" && class1ChimeUrl) {
      chimeUrl = class1ChimeUrl;
    }

    if (chimeUrl && audioRef.current) {
      audioRef.current.src = chimeUrl;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(console.error);
      setLastPlayedPrediction(currentPrediction);
    }
  }, [
    prediction.label,
    prediction.confidence,
    audioEnabled,
    class0ChimeUrl,
    class1ChimeUrl,
    volume,
    lastPlayedPrediction,
    modelReady,
  ]);
  return (
    <div className="space-y-6">
      {/* Inference Tab Header */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-100">
                Live Inference
              </h2>
              <p className="text-sm text-gray-400">
                Test your trained model with real-time predictions and
                visualization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  modelReady ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-gray-300">
                Model {modelReady ? "Ready" : "Not Ready"}
              </span>
            </div>
            {liveCameraMode && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Live Camera Active</span>
              </div>
            )}
            {liveLayerOutputs.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300">
                  {liveLayerOutputs.length} layers visualizing
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Status Warning */}
      {!modelReady && (
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-yellow-300">
                Model Not Ready
              </h3>
              <p className="text-yellow-200">
                Please train your model in the Training tab before using
                inference features. A trained model is required for predictions
                and visualization.
              </p>
              <button
                onClick={() => {
                  // This would need to be passed as a prop to switch tabs
                  console.log("Switch to training tab");
                }}
                className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors text-sm"
              >
                Go to Training Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input & Prediction Section */}
        <div className="space-y-6">
          <CollapsibleSection
            title="Input & Prediction"
            icon="🎯"
            badge={
              prediction.confidence > 0
                ? `${Math.round(prediction.confidence * 100)}%`
                : undefined
            }
            sectionId="inference-input"
            isOpen={isSectionOpen("inference-input")}
            onToggle={toggleSection}
            className="h-fit hover-lift"
          >
            <div className="space-y-6">
              {/* Input Methods */}
              <DataCollection
                onAddData={() => {}} // No data collection in inference mode
                predictFromCanvas={onPredictFromCanvas}
                augmentFlip={false}
                onAugmentFlipChange={() => {}}
                augmentTranslate={false}
                onAugmentTranslateChange={() => {}}
                liveCameraMode={liveCameraMode}
                onLiveCameraModeChange={onLiveCameraModeChange}
                onCameraStreamingChange={onCameraStreamingChange}
                inferenceMode={true}
              />

              {/* Live Camera Controls */}
              {liveCameraMode && (
                <div className="bg-red-900 border border-red-600 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-red-300">
                      Live Camera Mode
                    </h3>
                  </div>
                  <p className="text-red-200 text-sm mb-3">
                    Camera is streaming live predictions. The model processes
                    each frame in real-time and updates the visualization
                    pipeline.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-red-300">Status:</span>
                      <span className="text-red-100">
                        {isCameraStreaming ? "Streaming" : "Stopped"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-300">FPS:</span>
                      <span className="text-red-100">~10-30</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Prediction Results */}
          <CollapsibleSection
            title="Prediction Results"
            icon="📊"
            badge={prediction.label !== "?" ? prediction.label : undefined}
            sectionId="inference-results"
            isOpen={isSectionOpen("inference-results")}
            onToggle={toggleSection}
            className="h-fit hover-lift"
          >
            <PredictionDisplay
              prediction={prediction}
              modelReady={modelReady}
            />

            {/* Prediction History */}
            <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-300 mb-3">
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Current Prediction:</span>
                  <div className="text-cyan-400 font-medium">
                    {prediction.label}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Confidence:</span>
                  <div className="text-green-400 font-medium">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Model Status:</span>
                  <div
                    className={`font-medium ${modelReady ? "text-green-400" : "text-red-400"}`}
                  >
                    {modelReady ? "Ready" : "Not Ready"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Live Mode:</span>
                  <div
                    className={`font-medium ${liveCameraMode ? "text-red-400" : "text-gray-400"}`}
                  >
                    {liveCameraMode ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Audio Alerts */}
        <div>
          <CollapsibleSection
            title="Audio Alerts"
            icon="🔊"
            badge={audioEnabled ? "ON" : "OFF"}
            sectionId="audio-alerts"
            isOpen={isSectionOpen("audio-alerts")}
            onToggle={toggleSection}
            className="h-fit hover-lift"
          >
            <div className="space-y-4">
              {/* Master Enable */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-300">
                    🔊 Enable Audio Alerts
                  </h3>
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      audioEnabled
                        ? "bg-green-600 hover:bg-green-500 text-white"
                        : "bg-gray-600 hover:bg-gray-500 text-gray-300"
                    }`}
                  >
                    {audioEnabled ? "ON" : "OFF"}
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Play custom sounds when classes are detected with high
                  confidence (≥70%)
                </p>
              </div>

              {/* Volume Control */}
              {audioEnabled && (
                <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">
                    🎚️ Volume Control
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-blue-200 min-w-[40px]">
                      🔈
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500"
                    />
                    <span className="text-sm text-blue-200 min-w-[40px]">
                      🔊
                    </span>
                    <span className="text-sm text-blue-200 min-w-[40px]">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Class 0 Chime */}
              {audioEnabled && (
                <div className="bg-green-900 border border-green-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-300 mb-3">
                    🎵 Class 0 Chime
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="Enter URL for Class 0 sound (mp3, wav, ogg)"
                      value={class0ChimeUrl}
                      onChange={(e) => setClass0ChimeUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (class0ChimeUrl && audioRef.current) {
                            audioRef.current.src = class0ChimeUrl;
                            audioRef.current.volume = volume;
                            audioRef.current.play().catch(console.error);
                          }
                        }}
                        disabled={!class0ChimeUrl}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded text-sm transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => setClass0ChimeUrl("")}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs text-green-200">
                      Example:
                      https://www.soundjay.com/misc/sounds/bell-ringing-05.wav
                    </p>
                  </div>
                </div>
              )}

              {/* Class 1 Chime */}
              {audioEnabled && (
                <div className="bg-purple-900 border border-purple-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3">
                    🎶 Class 1 Chime
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="Enter URL for Class 1 sound (mp3, wav, ogg)"
                      value={class1ChimeUrl}
                      onChange={(e) => setClass1ChimeUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (class1ChimeUrl && audioRef.current) {
                            audioRef.current.src = class1ChimeUrl;
                            audioRef.current.volume = volume;
                            audioRef.current.play().catch(console.error);
                          }
                        }}
                        disabled={!class1ChimeUrl}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded text-sm transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => setClass1ChimeUrl("")}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs text-purple-200">
                      Example:
                      https://www.soundjay.com/misc/sounds/chime-sound.wav
                    </p>
                  </div>
                </div>
              )}

              {/* Status Info */}
              {audioEnabled && (
                <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                    📊 Alert Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-yellow-200">Class 0 Sound:</span>
                      <div
                        className={`font-medium ${class0ChimeUrl ? "text-green-400" : "text-red-400"}`}
                      >
                        {class0ChimeUrl ? "Configured" : "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-200">Class 1 Sound:</span>
                      <div
                        className={`font-medium ${class1ChimeUrl ? "text-green-400" : "text-red-400"}`}
                      >
                        {class1ChimeUrl ? "Configured" : "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-200">Last Played:</span>
                      <div className="text-cyan-400 font-medium">
                        {lastPlayedPrediction || "None"}
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-200">
                        Trigger Threshold:
                      </span>
                      <div className="text-green-400 font-medium">≥70%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Neural Network Visualization - Full Width */}
      <CollapsibleSection
        title="Neural Network Visualization"
        icon="🧠"
        badge={
          liveLayerOutputs.length > 0
            ? `${liveLayerOutputs.length} layers`
            : undefined
        }
        sectionId="inference-visualization"
        isOpen={isSectionOpen("inference-visualization")}
        onToggle={toggleSection}
        className="w-full hover-lift"
      >
        <div className="space-y-4">
          {!modelReady ? (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">🤖</span>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                Model Visualization Not Available
              </h3>
              <p className="text-gray-400">
                Train your model first to see the neural network visualization
              </p>
            </div>
          ) : liveLayerOutputs.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">🎯</span>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                Make a Prediction to See Visualization
              </h3>
              <p className="text-gray-400">
                Draw something or use the camera to activate the neural network
                visualization
              </p>
            </div>
          ) : (
            <PipelineVisualization
              liveLayerOutputs={liveLayerOutputs}
              fcWeightsViz={fcWeightsViz}
              prediction={prediction}
              activeVizChannel={activeVizChannel}
              onChannelCycle={onChannelCycle}
              status={pipelineStatus}
              liveCameraMode={liveCameraMode}
              onLiveCameraModeChange={onLiveCameraModeChange}
              isCameraStreaming={isCameraStreaming}
            />
          )}
        </div>
      </CollapsibleSection>

      {/* Performance Monitor */}
      <CollapsibleSection
        title="Performance Monitor"
        icon="⚡"
        sectionId="inference-performance"
        isOpen={isSectionOpen("inference-performance")}
        onToggle={toggleSection}
        className="w-full hover-lift"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">
              ⚡ Inference Speed
            </h3>
            <div className="text-2xl font-bold text-white mb-1">
              {liveCameraMode ? "~30ms" : "< 100ms"}
            </div>
            <p className="text-sm text-gray-400">Average prediction time</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-2">
              🧠 Model Complexity
            </h3>
            <div className="text-2xl font-bold text-white mb-1">
              {liveLayerOutputs.length}
            </div>
            <p className="text-sm text-gray-400">Active layers</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">
              📊 Accuracy
            </h3>
            <div className="text-2xl font-bold text-white mb-1">
              {prediction.confidence > 0
                ? `${(prediction.confidence * 100).toFixed(0)}%`
                : "N/A"}
            </div>
            <p className="text-sm text-gray-400">
              Current prediction confidence
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Hidden audio element for playing chimes */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
};

export default InferenceTab;
