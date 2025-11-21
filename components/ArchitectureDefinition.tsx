import React, { useState, useRef } from "react";
import type {
  LayerConfig,
  ConvLayerConfig,
  PoolLayerConfig,
  DropoutLayerConfig,
  ActivationLayerConfig,
  DenseLayerConfig,
  FlattenLayerConfig,
  ReshapeLayerConfig,
} from "../types";
import { LayerType, ActivationFunction, PoolingType } from "../types";

interface ArchitectureDefinitionProps {
  layers: LayerConfig[];
  updateLayer: (id: string | number, newConfig: Partial<LayerConfig>) => void;
  removeLayer: (id: string | number) => void;
  addLayer: (type: LayerType) => void;
  reorderLayers: (dragIndex: number, hoverIndex: number) => void;
}

export const ArchitectureDefinition: React.FC<ArchitectureDefinitionProps> = ({
  layers,
  updateLayer,
  removeLayer,
  addLayer,
  reorderLayers,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; index: number } | null>(
    null,
  );
  const touchElementRef = useRef<HTMLElement | null>(null);

  const handleNumericInput = (
    value: string,
    defaultValue: number = 1,
    min: number = 1,
    max: number = Infinity,
  ): number => {
    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, parsed));
  };

  const handleFloatInput = (
    value: string,
    defaultValue: number = 0.1,
    min: number = 0,
    max: number = 1,
  ): number => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, parsed));
  };

  const validateReshapeBasic = (
    targetShape: number[],
  ): { isValid: boolean; message: string } => {
    const totalElements = targetShape.reduce((acc, dim) => acc * dim, 1);

    if (totalElements <= 0) {
      return { isValid: false, message: "All dimensions must be positive" };
    }

    return {
      isValid: true,
      message: `Shape: [${targetShape.join(", ")}] = ${totalElements} elements`,
    };
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);

    // Create a custom drag image with better styling
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = "0.8";
    dragImage.style.transform = "rotate(3deg)";
    dragImage.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.3)";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Clean up the temporary drag image
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    setHoverIndex(index);
  };

  const handleDragLeave = () => {
    setHoverIndex(null);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number,
  ) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderLayers(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      index,
    };
    touchElementRef.current = e.currentTarget as HTMLElement;
    setDraggedIndex(index);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !touchElementRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Find which layer we're hovering over
    const elements = document.querySelectorAll("[data-layer-index]");
    let hoverTarget = null;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        hoverTarget = parseInt(element.getAttribute("data-layer-index") || "0");
        break;
      }
    }

    if (hoverTarget !== null) {
      setHoverIndex(hoverTarget);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || hoverIndex === null) {
      setDraggedIndex(null);
      setHoverIndex(null);
      touchStartRef.current = null;
      touchElementRef.current = null;
      return;
    }

    const draggedIdx = touchStartRef.current.index;
    if (draggedIdx !== hoverIndex) {
      reorderLayers(draggedIdx, hoverIndex);
    }

    setDraggedIndex(null);
    setHoverIndex(null);
    touchStartRef.current = null;
    touchElementRef.current = null;
    e.preventDefault();
  };

  return (
    <div>
      <div className="space-y-3 bg-gray-900/50 p-1 rounded-lg max-h-[64rem] overflow-y-auto">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            data-layer-index={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
                            bg-gray-700 p-1 rounded-md cursor-move transition-all duration-200
                            ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                            ${hoverIndex === index ? "border-2 border-cyan-400 bg-gray-600" : "border-2 border-transparent"}
                        `}
          >
            <div className="flex items-center gap-2 w-full">
              <div className="flex items-center gap-2">
                <div className="flex flex-col justify-center w-2 h-2 text-gray-400 hover:text-cyan-400 transition-colors cursor-move">
                  <div className="w-1 h-1 bg-current rounded-full mb-1"></div>
                  <div className="w-1 h-1 bg-current rounded-full mb-1"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                </div>
                <p className="font-bold text-cyan-400 whitespace-nowrap">
                  {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}
                </p>
              </div>

              <div className="flex-1 flex items-center gap-4 overflow-x-auto no-scrollbar">
                {layer.type === LayerType.Conv && (
                  <>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`conv-filtersize-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Size
                      </label>
                      <select
                        id={`conv-filtersize-${layer.id}`}
                        value={(layer as ConvLayerConfig).filterSize}
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            filterSize: parseInt(e.target.value) as 3 | 5,
                          })
                        }
                        className="bg-gray-800 text-white p-1 rounded-md border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="3">3x3</option>
                        <option value="5">5x5</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`conv-numfilters-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Num
                      </label>
                      <input
                        id={`conv-numfilters-${layer.id}`}
                        type="number"
                        min="1"
                        max="64"
                        step="1"
                        value={(layer as ConvLayerConfig).numFilters}
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            numFilters: handleNumericInput(
                              e.target.value,
                              1,
                              1,
                              64,
                            ),
                          })
                        }
                        className="w-10 bg-gray-800 text-white p-1 rounded-md border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`conv-activation-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Act
                      </label>
                      <select
                        id={`conv-activation-${layer.id}`}
                        value={
                          (layer as ConvLayerConfig).activation ||
                          ActivationFunction.ReLU
                        }
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            activation: e.target.value as ActivationFunction,
                          })
                        }
                        className="w-12 bg-gray-800 text-white p-1 rounded-md border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        {Object.values(ActivationFunction).map((funcName) => (
                          <option key={funcName} value={funcName}>
                            {funcName.charAt(0).toUpperCase() +
                              funcName.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {layer.type === LayerType.Pool && (
                  <>
                    <div className="flex items-center gap-1">
                      <label
                        htmlFor={`pool-size-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Size: {(layer as PoolLayerConfig).poolSize}x
                        {(layer as PoolLayerConfig).poolSize}
                      </label>
                      <input
                        id={`pool-size-${layer.id}`}
                        type="range"
                        min="2"
                        max="4"
                        step="1"
                        value={(layer as PoolLayerConfig).poolSize}
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            poolSize: parseInt(e.target.value),
                          })
                        }
                        className="w-12 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`pool-type-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Type
                      </label>
                      <select
                        id={`pool-type-${layer.id}`}
                        value={(layer as PoolLayerConfig).poolingType}
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            poolingType: e.target.value as PoolingType,
                          })
                        }
                        className="w-12 bg-gray-800 text-white p-0.5 rounded-md border border-gray-600 text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        {Object.values(PoolingType).map((poolTypeName) => (
                          <option key={poolTypeName} value={poolTypeName}>
                            {poolTypeName.charAt(0).toUpperCase() +
                              poolTypeName.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {layer.type === LayerType.Dropout && (
                  <div className="flex items-center gap-2 w-full max-w-xs">
                    <label
                      htmlFor={`dropout-rate-${layer.id}`}
                      className="text-sm text-gray-400 whitespace-nowrap min-w-[80px]"
                    >
                      Rate:{" "}
                      {Math.round((layer as DropoutLayerConfig).rate * 100)}%
                    </label>
                    <input
                      id={`dropout-rate-${layer.id}`}
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.01"
                      value={(layer as DropoutLayerConfig).rate}
                      onChange={(e) =>
                        updateLayer(layer.id, {
                          rate: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                )}

                {layer.type === LayerType.Activation && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`activation-func-${layer.id}`}
                      className="text-sm text-gray-400 whitespace-nowrap"
                    >
                      Func
                    </label>
                    <select
                      id={`activation-func-${layer.id}`}
                      value={(layer as ActivationLayerConfig).func}
                      onChange={(e) =>
                        updateLayer(layer.id, {
                          func: e.target.value as ActivationFunction,
                        })
                      }
                      className="bg-gray-800 text-white p-1 rounded-md border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                      {Object.values(ActivationFunction).map((funcName) => (
                        <option key={funcName} value={funcName}>
                          {funcName.charAt(0).toUpperCase() + funcName.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {layer.type === LayerType.Dense && (
                  <>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`dense-units-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Units
                      </label>
                      <input
                        id={`dense-units-${layer.id}`}
                        type="number"
                        min="1"
                        max="128"
                        step="1"
                        value={(layer as DenseLayerConfig).units}
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            units: handleNumericInput(
                              e.target.value,
                              1,
                              1,
                              128,
                            ),
                          })
                        }
                        className="w-16 bg-gray-800 text-white p-1 rounded-md border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`dense-activation-${layer.id}`}
                        className="text-sm text-gray-400 whitespace-nowrap"
                      >
                        Activation
                      </label>
                      <select
                        id={`dense-activation-${layer.id}`}
                        value={(layer as DenseLayerConfig).activation}
                        onChange={(e) =>
                          updateLayer(layer.id, {
                            activation: e.target.value as ActivationFunction,
                          })
                        }
                        className="bg-gray-800 text-white p-1 rounded-md border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        {Object.values(ActivationFunction).map((funcName) => (
                          <option key={funcName} value={funcName}>
                            {funcName.charAt(0).toUpperCase() +
                              funcName.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {layer.type === LayerType.Flatten && (
                  <p className="text-sm text-gray-400 italic whitespace-nowrap">
                    Flattens input
                  </p>
                )}

                {layer.type === LayerType.Reshape && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 whitespace-nowrap">
                        Target: [
                        {(layer as ReshapeLayerConfig).targetShape.join(", ")}]
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="256"
                        value={(layer as ReshapeLayerConfig).targetShape[0]}
                        onChange={(e) => {
                          const newShape = [
                            ...(layer as ReshapeLayerConfig).targetShape,
                          ];
                          newShape[0] = Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          );
                          updateLayer(layer.id, { targetShape: newShape });
                        }}
                        className="w-12 bg-gray-800 text-white p-1 rounded border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <span className="text-gray-500">×</span>
                      <input
                        type="number"
                        min="1"
                        max="256"
                        value={(layer as ReshapeLayerConfig).targetShape[1]}
                        onChange={(e) => {
                          const newShape = [
                            ...(layer as ReshapeLayerConfig).targetShape,
                          ];
                          newShape[1] = Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          );
                          updateLayer(layer.id, { targetShape: newShape });
                        }}
                        className="w-12 bg-gray-800 text-white p-1 rounded border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <span className="text-gray-500">×</span>
                      <input
                        type="number"
                        min="1"
                        max="256"
                        value={(layer as ReshapeLayerConfig).targetShape[2]}
                        onChange={(e) => {
                          const newShape = [
                            ...(layer as ReshapeLayerConfig).targetShape,
                          ];
                          newShape[2] = Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          );
                          updateLayer(layer.id, { targetShape: newShape });
                        }}
                        className="w-12 bg-gray-800 text-white p-1 rounded border border-gray-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayer(layer.id);
                }}
                className="text-red-400 hover:text-red-300 font-bold p-2 rounded-full hover:bg-red-900/20 transition-colors flex-shrink-0"
                aria-label={`Remove layer ${index + 1}`}
              >
                &times;
              </button>
            </div>

          </div >
        ))}

        {
          layers.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-2">No layers defined yet</p>
              <p className="text-sm">
                Add layers below to build your CNN architecture
              </p>
            </div>
          )
        }

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
          <button
            onClick={() => addLayer(LayerType.Conv)}
            className="p-1 rounded-md transition-all duration-200 bg-cyan-700 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-cyan-200">+</span> Conv
          </button>
          <button
            onClick={() => addLayer(LayerType.Pool)}
            className="p-1 rounded-md transition-all duration-200 bg-sky-700 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-sky-200">+</span> Pool
          </button>
          <button
            onClick={() => addLayer(LayerType.Activation)}
            className="p-1 rounded-md transition-all duration-200 bg-green-700 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-green-200">+</span> Activation
          </button>
          <button
            onClick={() => addLayer(LayerType.Dropout)}
            className="p-1 rounded-md transition-all duration-200 bg-purple-700 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-purple-200">+</span> Dropout
          </button>
          <button
            onClick={() => addLayer(LayerType.Flatten)}
            className="p-1 rounded-md transition-all duration-200 bg-indigo-700 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-indigo-200">+</span> Flatten
          </button>
          <button
            onClick={() => addLayer(LayerType.Dense)}
            className="p-1 rounded-md transition-all duration-200 bg-pink-700 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-pink-200">+</span> Dense
          </button>
          <button
            onClick={() => addLayer(LayerType.Reshape)}
            className="p-1 rounded-md transition-all duration-200 bg-orange-700 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs hover:scale-105 active:scale-95"
          >
            <span className="font-bold text-orange-200">+</span> Reshape
          </button>
        </div>

        {layers.length > 0 && (
          <div></div>
        )}
      </div>
    </div>
  );
};
