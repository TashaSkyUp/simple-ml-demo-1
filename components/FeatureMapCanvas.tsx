
import React, { useEffect, useRef } from 'react';

interface FeatureMapCanvasProps {
    mapData: number[][] | number[][][]; // Can be a single map or multiple maps (channels)
    size?: number;
    channelIndexToDisplay?: number; // Which channel to display if mapData is multi-channel
    label?: string; // Optional label for the canvas
}

export const FeatureMapCanvas: React.FC<FeatureMapCanvasProps> = ({ mapData, size = 60, channelIndexToDisplay = 0, label }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Determine if mapData is [H][W][3] RGB image or [C][H][W] feature maps
        const is3D = Array.isArray(mapData) && Array.isArray(mapData[0]) && Array.isArray(mapData[0][0]);
        const isRGB =
            is3D &&
            !Array.isArray((mapData as number[][][])[0][0][0]) &&
            (mapData as number[][][])[0][0].length === 3;

        if (isRGB) {
            // Handle RGB data - draw full color image
            const rgbData = mapData as number[][][];
            const gridSize = rgbData.length;
            const cellSize = size / gridSize;

            ctx.fillStyle = '#1f2937'; // bg-gray-800
            ctx.fillRect(0, 0, size, size);

            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < rgbData[y].length; x++) {
                    const [r, g, b] = rgbData[y][x];
                    const r255 = Math.floor(Math.min(255, Math.max(0, r * 255)));
                    const g255 = Math.floor(Math.min(255, Math.max(0, g * 255)));
                    const b255 = Math.floor(Math.min(255, Math.max(0, b * 255)));

                    ctx.fillStyle = `rgb(${r255}, ${g255}, ${b255})`;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize + 1, cellSize + 1);
                }
            }
        } else if (is3D) {
            // Handle multi-channel feature maps
            const maps = mapData as number[][][];
            const displayMap =
                maps[channelIndexToDisplay] || maps[0] || [];

            if (!displayMap || displayMap.length === 0 || !displayMap[0]) {
                ctx.fillStyle = '#1f2937';
                ctx.fillRect(0, 0, size, size);
                if (label) {
                    ctx.fillStyle = '#6b7280';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, size / 2, size / 2);
                }
                return;
            }

            const gridSize = displayMap.length;
            const cellSize = size / gridSize;

            const flatData = displayMap.flat();
            const maxAbsVal = Math.max(...flatData.map(val => Math.abs(val)), 1e-6);

            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, size, size);

            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < displayMap[y].length; x++) {
                    const val = displayMap[y][x];
                    if (Math.abs(val) > 1e-4) {
                        const intensity = Math.min(1, Math.abs(val) / maxAbsVal);
                        ctx.fillStyle = val > 0
                            ? `rgba(56, 189, 248, ${intensity})`
                            : `rgba(239, 68, 68, ${intensity})`;
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }
            if (label) {
                ctx.fillStyle = '#9ca3af';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, size / 2, size - 5);
            }
        } else {
            // Handle grayscale data
            const displayMap = mapData as number[][];

            if (!displayMap || displayMap.length === 0 || !displayMap[0] || displayMap[0].length === 0) {
                ctx.fillStyle = '#1f2937'; // bg-gray-800
                ctx.fillRect(0, 0, size, size);
                if (label) {
                    ctx.fillStyle = '#6b7280'; // text-gray-500
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, size / 2, size / 2);
                }
                return;
            }

            const gridSize = displayMap.length;
            const cellSize = size / gridSize;

            const flatData = displayMap.flat();
            const maxAbsVal = Math.max(...flatData.map(val => Math.abs(val)), 1e-6);

            ctx.fillStyle = '#1f2937'; // bg-gray-800
            ctx.fillRect(0, 0, size, size);

            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < displayMap[y].length; x++) {
                    const val = displayMap[y][x];
                    if (Math.abs(val) > 1e-4) {
                        const intensity = Math.min(1, Math.abs(val) / maxAbsVal);
                        ctx.fillStyle = val > 0
                            ? `rgba(56, 189, 248, ${intensity})` // cyan-400 for positive
                            : `rgba(239, 68, 68, ${intensity})`; // red-500 for negative
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }
            if (label) { // Draw label on top, could be outside if there's space
                ctx.fillStyle = '#9ca3af'; // text-gray-400
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, size / 2, size - 5); // Position at bottom
            }
        }

    }, [mapData, size, channelIndexToDisplay, label]);

    return <canvas ref={canvasRef} width={size} height={size} className="bg-gray-900 rounded-md shadow-inner" />;
};
