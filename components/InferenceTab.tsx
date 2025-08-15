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
}) => {
  // Audio alerts state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [class0ChimeUrl, setClass0ChimeUrl] = useState<string>("");
  const [class1ChimeUrl, setClass1ChimeUrl] = useState<string>("");
  const [volume, setVolume] = useState(0.5);

  // Trigger conditions
  const [triggerMode, setTriggerMode] = useState<
    "change" | "every" | "threshold"
  >("change");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [triggerDelay, setTriggerDelay] = useState(0); // seconds between allowed plays
  const [enabledForClass0, setEnabledForClass0] = useState(true);
  const [enabledForClass1, setEnabledForClass1] = useState(true);
  const [onlyInLiveMode, setOnlyInLiveMode] = useState(false);

  // State tracking
  const [lastPlayedPrediction, setLastPlayedPrediction] = useState<
    string | null
  >(null);
  const [lastPlayTime, setLastPlayTime] = useState<number>(0);
  const [audioContextInitialized, setAudioContextInitialized] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // Generate built-in tones using Web Audio API
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

      // Envelope for smooth sound
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
      // Bell-like sound with multiple harmonics
      await generateTone(800, 0.2, "sine");
      setTimeout(() => generateTone(1000, 0.3, "sine"), 100);
      setTimeout(() => generateTone(600, 0.4, "sine"), 200);
    },
    chime: async () => {
      // Chime with ascending tones
      await generateTone(523, 0.2, "sine"); // C5
      setTimeout(() => generateTone(659, 0.2, "sine"), 150); // E5
      setTimeout(() => generateTone(784, 0.3, "sine"), 300); // G5
    },
    success: async () => {
      // Successfully sound with cheerful progression
      await generateTone(523, 0.15, "sine"); // C5
      setTimeout(() => generateTone(659, 0.15, "sine"), 120); // E5
      setTimeout(() => generateTone(784, 0.15, "sine"), 240); // G5
      setTimeout(() => generateTone(1047, 0.25, "sine"), 360); // C6
    },
    notification: async () => {
      // Simple notification beep
      await generateTone(880, 0.2, "sine"); // A5
      setTimeout(() => generateTone(880, 0.2, "sine"), 300); // A5 again
    },
  };

  // Function to resolve chime source - returns either the function or the URL string
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
        return chimeIdentifier; // Assume it's a URL
    }
  };

  // Initialize audio context on first user interaction
  const initializeAudioContext = useCallback(() => {
    if (!audioContextInitialized) {
      try {
        if (!audioContext.current) {
          audioContext.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }

        if (audioContext.current.state === "suspended") {
          audioContext.current.resume().then(() => {
            console.log("🔓 Audio context initialized");
            setAudioContextInitialized(true);
          });
        } else {
          console.log("🔓 Audio context already initialized");
          setAudioContextInitialized(true);
        }
      } catch (error) {
        console.error("Error: Failed to initialize audio context:", error);
      }
    }
  }, [audioContextInitialized]);

  // Play chime when conditions are met
  useEffect(() => {
    const currentTime = Date.now();
    const currentPrediction = prediction.label;

    console.log(" Audio chime evaluation:", {
      audioEnabled,
      modelReady,
      prediction: currentPrediction,
      confidence: prediction.confidence,
      triggerMode,
      confidenceThreshold,
      enabledForClass:
        currentPrediction === "0" ? enabledForClass0 : enabledForClass1,
      onlyInLiveMode,
      liveCameraMode,
      timeSinceLastPlay: currentTime - lastPlayTime,
      triggerDelay: triggerDelay * 1000,
    });

    // Basic requirements
    if (!audioEnabled) {
      console.log("🔇 Audio disabled");
      return;
    }

    if (!modelReady) {
      console.log("🤖 Model not ready");
      return;
    }

    if (currentPrediction === "?") {
      console.log("❓ No prediction available");
      return;
    }

    // Confidence check
    if (prediction.confidence < confidenceThreshold) {
      console.log(
        ` Confidence ${prediction.confidence} below threshold ${confidenceThreshold}`,
      );
      return;
    }

    // Live mode check
    if (onlyInLiveMode && !liveCameraMode) {
      console.log("📹 Only live mode enabled but not in live camera mode");
      return;
    }

    // Class-specific check
    if (currentPrediction === "0" && !enabledForClass0) {
      console.log(" Class 0 chimes disabled");
      return;
    }
    if (currentPrediction === "1" && !enabledForClass1) {
      console.log(" Class 1 chimes disabled");
      return;
    }

    // Trigger mode logic
    let shouldPlay = false;
    switch (triggerMode) {
      case "change":
        shouldPlay = currentPrediction !== lastPlayedPrediction;
        console.log(
          ` Change mode: ${shouldPlay ? "different" : "same"} prediction`,
        );
        break;
      case "every":
        shouldPlay = true;
        console.log("🔁 Every mode: always play");
        break;
      case "threshold":
        shouldPlay = prediction.confidence >= confidenceThreshold;
        console.log(
          ` Threshold mode: confidence ${prediction.confidence} >= ${confidenceThreshold}`,
        );
        break;
    }

    if (!shouldPlay) {
      return;
    }

    // Delay check
    if (triggerDelay > 0 && currentTime - lastPlayTime < triggerDelay * 1000) {
      console.log(
        ` Trigger delay: ${currentTime - lastPlayTime}ms < ${triggerDelay * 1000}ms`,
      );
      return;
    }

    // Get chime identifier and resolve to source
    let chimeIdentifier = "";
    if (currentPrediction === "0" && class0ChimeUrl) {
      chimeIdentifier = class0ChimeUrl;
      console.log(" Playing Class 0 chime");
    } else if (currentPrediction === "1" && class1ChimeUrl) {
      chimeIdentifier = class1ChimeUrl;
      console.log(" Playing Class 1 chime");
    } else {
      console.log(
        ` No chime configured for prediction: ${currentPrediction}`,
      );
      return;
    }

    const chimeSource = resolveChimeSource(chimeIdentifier);

    // Play the chime
    const playSound = async () => {
      if (chimeSource) {
        console.log(
          " Attempting to play:",
          typeof chimeSource === "function"
            ? `built-in tone (${chimeIdentifier})`
            : chimeSource,
        );

        // Check if it's a built-in tone function
        if (typeof chimeSource === "function") {
          try {
            await chimeSource();
            console.log("Successfully Built-in tone played successfully");
            setLastPlayedPrediction(currentPrediction);
            setLastPlayTime(currentTime);
          } catch (error: any) {
            console.error("Error: Built-in tone play failed:", error);
          }
        } else if (typeof chimeSource === "string" && chimeSource.length > 0) {
          // Handle URL-based audio
          try {
            // Create a new audio element to avoid cutting off current playback
            const audio = new Audio(chimeSource);
            audio.volume = volume;

            await audio.play();
            console.log("Successfully Audio played successfully");
            setLastPlayedPrediction(currentPrediction);
            setLastPlayTime(currentTime);
          } catch (error: any) {
            console.error("Error: Audio play failed:", error);
            if (error.name === "NotAllowedError") {
              console.log(" Audio blocked - user interaction required");
              setAudioContextInitialized(false);
            }
          }
        } else {
          console.log(
            " Invalid chime source:",
            typeof chimeSource,
            chimeSource,
          );
        }
      } else {
        console.log(" No chime configured");
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
        <div className="space-y-6">
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
            className="h-fit hover-lift"
          >
            <div className="space-y-6">
              {/* Input Methods */}
              <DataCollection
                onAddData={() => {}} // No data collection in inference mode
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
            icon=""
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
            icon=""
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
                     Enable Audio Alerts
                  </h3>
                  <button
                    onClick={() => {
                      const newState = !audioEnabled;
                      setAudioEnabled(newState);
                      if (newState) {
                        initializeAudioContext();
                      }
                    }}
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
                  {audioEnabled && !audioContextInitialized && (
                    <span className="block text-yellow-400 mt-1">
                      Warning Click anywhere to enable audio
                    </span>
                  )}
                </p>
              </div>

              {/* Trigger Configuration */}
              {audioEnabled && (
                <div className="bg-indigo-900 border border-indigo-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-indigo-300 mb-3">
                     Trigger Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-indigo-200 mb-2">
                        Trigger Mode
                      </label>
                      <select
                        value={triggerMode}
                        onChange={(e) =>
                          setTriggerMode(
                            e.target.value as "change" | "every" | "threshold",
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="change">On prediction change</option>
                        <option value="every">Every prediction</option>
                        <option value="threshold">Above confidence only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-indigo-200 mb-2">
                        Confidence Threshold:{" "}
                        {Math.round(confidenceThreshold * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={confidenceThreshold}
                        onChange={(e) =>
                          setConfidenceThreshold(parseFloat(e.target.value))
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-indigo-200 mb-2">
                        Trigger Delay: {triggerDelay}s
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={triggerDelay}
                        onChange={(e) =>
                          setTriggerDelay(parseFloat(e.target.value))
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-indigo-200 mb-2">
                        Live Camera Only
                      </label>
                      <button
                        onClick={() => setOnlyInLiveMode(!onlyInLiveMode)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          onlyInLiveMode
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                            : "bg-gray-600 hover:bg-gray-500 text-gray-300"
                        }`}
                      >
                        {onlyInLiveMode ? "Live Only" : "All Modes"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enabledForClass0}
                          onChange={(e) =>
                            setEnabledForClass0(e.target.checked)
                          }
                          className="accent-green-500"
                        />
                        <span className="text-sm text-indigo-200">
                          Enable Class 0 chimes
                        </span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enabledForClass1}
                          onChange={(e) =>
                            setEnabledForClass1(e.target.checked)
                          }
                          className="accent-purple-500"
                        />
                        <span className="text-sm text-indigo-200">
                          Enable Class 1 chimes
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Volume Control */}
              {audioEnabled && (
                <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">
                     Volume Control
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
                     Class 0 Chime
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="Enter URL for Class 0 sound (mp3, wav, ogg)"
                      value={
                        class0ChimeUrl.startsWith("builtin-")
                          ? ""
                          : class0ChimeUrl
                      }
                      onChange={(e) => setClass0ChimeUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          if (class0ChimeUrl) {
                            console.log(
                              " Testing Class 0 chime:",
                              class0ChimeUrl,
                            );
                            initializeAudioContext();

                            const chimeSource =
                              resolveChimeSource(class0ChimeUrl);
                            if (typeof chimeSource === "function") {
                              chimeSource().catch((error) => {
                                console.error("Error: Test play failed:", error);
                                alert(
                                  "Failed to play built-in sound. Check browser permissions.",
                                );
                              });
                            } else if (chimeSource && chimeSource.length > 0) {
                              const audio = new Audio(chimeSource);
                              audio.volume = volume;
                              audio.play().catch((error) => {
                                console.error("Error: Test play failed:", error);
                                alert(
                                  "Failed to play sound. Check URL and browser permissions.",
                                );
                              });
                            } else {
                              alert(
                                "Invalid sound configuration. Please select a built-in sound or enter a valid URL.",
                              );
                            }
                          }
                        }}
                        disabled={!class0ChimeUrl}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded text-sm transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => setClass0ChimeUrl("builtin-bell")}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                      >
                        Bell
                      </button>
                      <button
                        onClick={() => setClass0ChimeUrl("builtin-success")}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                      >
                        Success
                      </button>
                      <button
                        onClick={() => setClass0ChimeUrl("")}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs text-green-200">
                      Try built-in sounds above, or use:
                      https://www.soundboard.com/handler/DownLoadTrack.ashx?trackid=1341
                      (Note: Some URLs may not work due to CORS restrictions)
                    </p>
                  </div>
                </div>
              )}

              {/* Class 1 Chime */}
              {audioEnabled && (
                <div className="bg-purple-900 border border-purple-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3">
                     Class 1 Chime
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="Enter URL for Class 1 sound (mp3, wav, ogg)"
                      value={
                        class1ChimeUrl.startsWith("builtin-")
                          ? ""
                          : class1ChimeUrl
                      }
                      onChange={(e) => setClass1ChimeUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          if (class1ChimeUrl) {
                            console.log(
                              " Testing Class 1 chime:",
                              class1ChimeUrl,
                            );
                            initializeAudioContext();

                            const chimeSource =
                              resolveChimeSource(class1ChimeUrl);
                            if (typeof chimeSource === "function") {
                              chimeSource().catch((error) => {
                                console.error("Error: Test play failed:", error);
                                alert(
                                  "Failed to play built-in sound. Check browser permissions.",
                                );
                              });
                            } else if (chimeSource && chimeSource.length > 0) {
                              const audio = new Audio(chimeSource);
                              audio.volume = volume;
                              audio.play().catch((error) => {
                                console.error("Error: Test play failed:", error);
                                alert(
                                  "Failed to play sound. Check URL and browser permissions.",
                                );
                              });
                            } else {
                              alert(
                                "Invalid sound configuration. Please select a built-in sound or enter a valid URL.",
                              );
                            }
                          }
                        }}
                        disabled={!class1ChimeUrl}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded text-sm transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => setClass1ChimeUrl("builtin-chime")}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                      >
                        Chime
                      </button>
                      <button
                        onClick={() =>
                          setClass1ChimeUrl("builtin-notification")
                        }
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                      >
                        Notify
                      </button>
                      <button
                        onClick={() => setClass1ChimeUrl("")}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs text-purple-200">
                      Try built-in sounds above, or use:
                      https://www.soundboard.com/handler/DownLoadTrack.ashx?trackid=1342
                      (Note: Some URLs may not work due to CORS restrictions)
                    </p>
                  </div>
                </div>
              )}

              {/* Status Info */}
              {audioEnabled && (
                <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                     Alert Status
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
                      <span className="text-yellow-200">Trigger Mode:</span>
                      <div className="text-green-400 font-medium capitalize">
                        {triggerMode}
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-200">Confidence:</span>
                      <div className="text-green-400 font-medium">
                        ≥{Math.round(confidenceThreshold * 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-200">Trigger Delay:</span>
                      <div className="text-green-400 font-medium">
                        {triggerDelay}s
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-200">Live Mode Only:</span>
                      <div
                        className={`font-medium ${onlyInLiveMode ? "text-red-400" : "text-gray-400"}`}
                      >
                        {onlyInLiveMode ? "Yes" : "No"}
                      </div>
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
        icon=""
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

      {/* Performance Monitor */}
      <CollapsibleSection
        title="Performance Monitor"
        icon=""
        sectionId="inference-performance"
        isOpen={isSectionOpen("inference-performance")}
        onToggle={toggleSection}
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

      {/* Hidden audio element for playing chimes */}
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
