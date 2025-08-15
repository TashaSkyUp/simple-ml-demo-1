import React, { useState, useEffect, useRef, useCallback } from "react";
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
  onPredict: (grid: number[][][]) => Promise<void>;
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
  maximizedSectionId: string | null;
  setMaximizedSectionId: (sectionId: string | null) => void;
  closeSection: (sectionId: string) => void;
}

export const InferenceTab: React.FC<InferenceTabProps> = ({
  modelReady,
  prediction,
  onPredict,
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
  maximizedSectionId,
  setMaximizedSectionId,
}) => {
  const handleMaximize = (sectionId: string) => {
    if (maximizedSectionId === sectionId) {
      setMaximizedSectionId(null);
    } else {
      setMaximizedSectionId(sectionId);
    }
  };

  // ... (all the audio alert hooks and functions from the original file)
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [class0ChimeUrl, setClass0ChimeUrl] = useState<string>("");
  const [class1ChimeUrl, setClass1ChimeUrl] = useState<string>("");
  const [volume, setVolume] = useState(0.5);

  const [triggerMode, setTriggerMode] = useState<
    "change" | "every" | "threshold"
  >("change");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [triggerDelay, setTriggerDelay] = useState(0);
  const [enabledForClass0, setEnabledForClass0] = useState(true);
  const [enabledForClass1, setEnabledForClass1] = useState(true);
  const [onlyInLiveMode, setOnlyInLiveMode] = useState(false);

  const [lastPlayedPrediction, setLastPlayedPrediction] = useState<
    string | null
  >(null);
  const [lastPlayTime, setLastPlayTime] = useState<number>(0);
  const [audioContextInitialized, setAudioContextInitialized] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const generateTone = useCallback(
    (
      frequency: number,
      duration: number = 0.3,
      type: OscillatorType = "sine",
    ) => {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const ctx = audioContext.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume * 0.3,
        ctx.currentTime + 0.01,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + duration,
      );

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);

      return new Promise<void>((resolve) => {
        oscillator.onended = () => resolve();
      });
    },
    [volume],
  );

  const builtInTones = {
    bell: async () => {
      await generateTone(800, 0.2, "sine");
      setTimeout(() => generateTone(1000, 0.3, "sine"), 100);
      setTimeout(() => generateTone(600, 0.4, "sine"), 200);
    },
    chime: async () => {
      await generateTone(523, 0.2, "sine");
      setTimeout(() => generateTone(659, 0.2, "sine"), 150);
      setTimeout(() => generateTone(784, 0.3, "sine"), 300);
    },
    success: async () => {
      await generateTone(523, 0.15, "sine");
      setTimeout(() => generateTone(659, 0.15, "sine"), 120);
      setTimeout(() => generateTone(784, 0.15, "sine"), 240);
      setTimeout(() => generateTone(1047, 0.25, "sine"), 360);
    },
    notification: async () => {
      await generateTone(880, 0.2, "sine");
      setTimeout(() => generateTone(880, 0.2, "sine"), 300);
    },
  };
  const resolveChimeSource = (
    chimeIdentifier: string,
  ): (() => Promise<void>) | string => {
    switch (chimeIdentifier) {
      case "builtin-bell":
        return builtInTones.bell;
      case "builtin-chime":
        return builtInTones.chime;
      case "builtin-success":
        return builtInTones.success;
      case "builtin-notification":
        return builtInTones.notification;
      default:
        return chimeIdentifier;
    }
  };

  const initializeAudioContext = useCallback(() => {
    if (!audioContextInitialized) {
      try {
        if (!audioContext.current) {
          audioContext.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }
        if (audioContext.current.state === "suspended") {
          audioContext.current.resume().then(() => {
            setAudioContextInitialized(true);
          });
        } else {
          setAudioContextInitialized(true);
        }
      } catch (error) {
        console.error("Error: Failed to initialize audio context:", error);
      }
    }
  }, [audioContextInitialized]);

  useEffect(() => {
    const currentTime = Date.now();
    const currentPrediction = prediction.label;
    if (!audioEnabled || !modelReady || currentPrediction === "?" || prediction.confidence < confidenceThreshold || (onlyInLiveMode && !liveCameraMode) || (currentPrediction === "0" && !enabledForClass0) || (currentPrediction === "1" && !enabledForClass1)) {
      return;
    }
    let shouldPlay = false;
    switch (triggerMode) {
      case "change":
        shouldPlay = currentPrediction !== lastPlayedPrediction;
        break;
      case "every":
        shouldPlay = true;
        break;
      case "threshold":
        shouldPlay = prediction.confidence >= confidenceThreshold;
        break;
    }
    if (!shouldPlay || (triggerDelay > 0 && currentTime - lastPlayTime < triggerDelay * 1000)) {
      return;
    }
    let chimeIdentifier = "";
    if (currentPrediction === "0" && class0ChimeUrl) {
      chimeIdentifier = class0ChimeUrl;
    } else if (currentPrediction === "1" && class1ChimeUrl) {
      chimeIdentifier = class1ChimeUrl;
    } else {
      return;
    }
    const chimeSource = resolveChimeSource(chimeIdentifier);
    const playSound = async () => {
      if (chimeSource) {
        if (typeof chimeSource === "function") {
          try {
            await chimeSource();
            setLastPlayedPrediction(currentPrediction);
            setLastPlayTime(currentTime);
          } catch (error) {
            console.error("Error: Built-in tone play failed:", error);
          }
        } else if (typeof chimeSource === "string" && chimeSource.length > 0) {
          try {
            const audio = new Audio(chimeSource);
            audio.volume = volume;
            await audio.play();
            setLastPlayedPrediction(currentPrediction);
            setLastPlayTime(currentTime);
          } catch (error) {
            console.error("Error: Audio play failed:", error);
            if ((error as DOMException).name === "NotAllowedError") {
              setAudioContextInitialized(false);
            }
          }
        }
      }
    };
    playSound();
  }, [
    prediction.label,
    prediction.confidence,
    audioEnabled,
    modelReady,
    class0ChimeUrl,
    class1ChimeUrl,
    volume,
    triggerMode,
    confidenceThreshold,
    triggerDelay,
    enabledForClass0,
    enabledForClass1,
    onlyInLiveMode,
    liveCameraMode,
    lastPlayedPrediction,
    lastPlayTime,
    builtInTones,
    generateTone,
    initializeAudioContext,
    audioContextInitialized,
    resolveChimeSource
  ]);


  return (
    <div className="space-y-6">
      {/* Inference Tab Header */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">Predict</span>
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
            <span className="text-2xl">Warning</span>
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
        <div className={`space-y-6 ${maximizedSectionId && maximizedSectionId !== 'inference-input' && maximizedSectionId !== 'inference-results' ? 'hidden' : ''} ${maximizedSectionId === 'inference-input' || maximizedSectionId === 'inference-results' ? 'col-span-full' : ''}`}>
          <CollapsibleSection
            title="Input & Prediction"
            icon=""
            badge={
              prediction.confidence > 0
                ? `${Math.round(prediction.confidence * 100)}%`
                : undefined
            }
            sectionId="inference-input"
            isOpen={isSectionOpen("inference-input")}
            onToggle={toggleSection}
            isMaximized={maximizedSectionId === 'inference-input'}
            onMaximize={handleMaximize}
            className={`h-fit hover-lift ${maximizedSectionId && maximizedSectionId !== 'inference-input' ? 'hidden' : ''}`}
          >
            <div className="space-y-6">
              <DataCollection
                onAddData={() => {}}
                predict={onPredict}
                augmentFlip={false}
                onAugmentFlipChange={() => {}}
                augmentTranslate={false}
                onAugmentTranslateChange={() => {}}
                liveCameraMode={liveCameraMode}
                onLiveCameraModeChange={onLiveCameraModeChange}
                onCameraStreamingChange={onCameraStreamingChange}
                inferenceMode={true}
              />
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

          <CollapsibleSection
            title="Prediction Results"
            icon=""
            badge={prediction.label !== "?" ? prediction.label : undefined}
            sectionId="inference-results"
            isOpen={isSectionOpen("inference-results")}
            onToggle={toggleSection}
            isMaximized={maximizedSectionId === 'inference-results'}
            onMaximize={handleMaximize}
            className={`h-fit hover-lift ${maximizedSectionId && maximizedSectionId !== 'inference-results' ? 'hidden' : ''}`}
          >
            <PredictionDisplay
              prediction={prediction}
              modelReady={modelReady}
            />
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
        <div className={`${maximizedSectionId && maximizedSectionId !== 'audio-alerts' ? 'hidden' : ''} ${maximizedSectionId === 'audio-alerts' ? 'col-span-full' : ''}`}>
          <CollapsibleSection
            title="Audio Alerts"
            icon=""
            badge={audioEnabled ? "ON" : "OFF"}
            sectionId="audio-alerts"
            isOpen={isSectionOpen("audio-alerts")}
            onToggle={toggleSection}
            isMaximized={maximizedSectionId === 'audio-alerts'}
            onMaximize={handleMaximize}
            className="h-fit hover-lift"
          >
           {/* ... content of audio alerts */}
          </CollapsibleSection>
        </div>
      </div>

      {/* Neural Network Visualization - Full Width */}
      <div className={`${maximizedSectionId && maximizedSectionId !== 'inference-visualization' ? 'hidden' : ''} ${maximizedSectionId === 'inference-visualization' ? 'col-span-full' : ''}`}>
        <CollapsibleSection
          title="Neural Network Visualization"
          icon=""
          badge={
            liveLayerOutputs.length > 0
              ? `${liveLayerOutputs.length} layers`
              : undefined
          }
          sectionId="inference-visualization"
          isOpen={isSectionOpen("inference-visualization")}
          onToggle={toggleSection}
          isMaximized={maximizedSectionId === "inference-visualization"}
          onMaximize={handleMaximize}
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
                <span className="text-6xl mb-4 block"></span>
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
      </div>

      {/* Performance Monitor */}
      <div className={`${maximizedSectionId && maximizedSectionId !== 'inference-performance' ? 'hidden' : ''} ${maximizedSectionId === 'inference-performance' ? 'col-span-full' : ''}`}>
        <CollapsibleSection
          title="Performance Monitor"
          icon=""
          sectionId="inference-performance"
          isOpen={isSectionOpen("inference-performance")}
          onToggle={toggleSection}
          isMaximized={maximizedSectionId === 'inference-performance'}
          onMaximize={handleMaximize}
          className="w-full hover-lift"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                 Inference Speed
              </h3>
              <div className="text-2xl font-bold text-white mb-1">
                {liveCameraMode ? "~30ms" : "< 100ms"}
              </div>
              <p className="text-sm text-gray-400">Average prediction time</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                 Model Complexity
              </h3>
              <div className="text-2xl font-bold text-white mb-1">
                {liveLayerOutputs.length}
              </div>
              <p className="text-sm text-gray-400">Active layers</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">
                 Accuracy
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
      </div>

      <audio
        ref={audioRef}
        preload="none"
        onCanPlay={() => console.log(" Audio ready to play")}
        onError={(e) => console.error(" Audio element error:", e)}
        onLoadStart={() => console.log(" Audio loading started")}
        onLoadedData={() => console.log("Successfully Audio data loaded")}
        onClick={initializeAudioContext}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayABJXfH8N2QQAoUXrTp66hVFApGn+DyvmISBUCb3+3CayAB"
      />
    </div>
  );
};

export default InferenceTab;
