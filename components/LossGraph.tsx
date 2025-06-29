
import React, { useEffect, useRef } from 'react';

interface LossGraphProps {
    history: number[];
}

export const LossGraph: React.FC<LossGraphProps> = ({ history }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 25; // Increased padding slightly for labels if needed, or adjust label position

        // Clear canvas
        ctx.fillStyle = '#1f2937'; // bg-gray-800
        ctx.fillRect(0, 0, width, height);

        if (history.length < 1) { // Can draw a dot for 1 point, or nothing
            ctx.fillStyle = '#9ca3af'; // text-gray-400
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Train model to see loss graph.', width / 2, height / 2);
            return; 
        }

        const plotWidth = width - padding - padding;
        const plotHeight = height - padding - padding;

        // Determine max loss for scaling, ensure minimum scale for visibility
        const minDisplayLoss = history.length > 0 ? Math.min(...history) : 0;
        const maxDataLoss = history.length > 0 ? Math.max(...history) : 0.25;
        const maxLoss = Math.max(0.25, maxDataLoss); // Ensure a minimum y-axis height, can be dynamic too


        // Draw main axes (slightly thicker or different color if preferred)
        ctx.strokeStyle = '#4b5563'; // bg-gray-600
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding); // Start Y axis from top padding
        ctx.lineTo(padding, height - padding); // Y axis
        ctx.lineTo(width - padding, height - padding); // X axis
        ctx.stroke();

        // Grid line style
        const gridColor = '#374151'; // gray-700, for lighter grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;

        // Y-axis ticks and grid lines
        const numYTicks = 5;
        ctx.fillStyle = '#9ca3af'; // text-gray-400 for labels
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < numYTicks; i++) {
            const tickValue = (i / (numYTicks - 1)) * maxLoss;
            // Adjust y to be relative to plot area top (padding)
            const y = (height - padding) - (tickValue / maxLoss) * plotHeight; 
            
            ctx.fillText(tickValue.toFixed(2), padding - 8, y);
            if (i > 0 && i < numYTicks) { // Draw grid lines, skip for 0 if it aligns with X-axis if desired
                ctx.beginPath();
                ctx.moveTo(padding + 1, y); // Start slightly off the Y-axis line
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }
        }

        // X-axis ticks and grid lines
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        if (history.length >= 1) {
            const pointsToPlot = history.length;
            const numXTicks = 5; // Desired number of ticks
            const actualNumXTicks = Math.min(numXTicks, pointsToPlot);

            for (let i = 0; i < actualNumXTicks; i++) {
                let historyIndex;
                let xPos;

                if (actualNumXTicks === 1) { // Single tick for a single point
                    historyIndex = 0;
                    xPos = padding; // Plot at the beginning
                } else {
                    historyIndex = Math.round((i / (actualNumXTicks - 1)) * (pointsToPlot - 1));
                    xPos = padding + (historyIndex / (pointsToPlot - 1)) * plotWidth;
                }
                
                const epochLabel = String(historyIndex); // Epochs are 0-indexed relative to history start
                ctx.fillText(epochLabel, xPos, height - padding + 8);
                
                if (actualNumXTicks > 1 && i > 0 && i < actualNumXTicks) {
                    ctx.beginPath();
                    ctx.moveTo(xPos, height - padding - 1); // Start slightly off X-axis
                    ctx.lineTo(xPos, padding);
                    ctx.stroke();
                }
            }
        }


        // Plot loss history line (draw on top of grid lines)
        if (history.length >= 1) {
            ctx.strokeStyle = '#38bdf8'; // cyan-400
            ctx.lineWidth = 2;
            ctx.beginPath();
            history.forEach((loss, i) => {
                const x = padding + (i / (history.length - 1)) * plotWidth;
                 // Clamp loss to be within 0 and maxLoss for plotting
                const yValue = Math.max(0, Math.min(loss, maxLoss));
                const y = (height - padding) - (yValue / maxLoss) * plotHeight;
                
                if (history.length === 1) { // Draw a small circle for a single point
                    ctx.arc(x,y, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            if (history.length > 1) ctx.stroke();
        }


        // Axis Labels (after plotting data, so they are on top)
        ctx.fillStyle = '#9ca3af'; // text-gray-400
        ctx.font = '11px sans-serif'; // Slightly larger for main labels
        
        ctx.textAlign = 'center';
        ctx.fillText('Epochs', padding + plotWidth / 2, height - padding + 18); // Adjusted y for ticks

        ctx.save();
        ctx.translate(padding - 18, padding + plotHeight / 2); // Adjusted x for ticks
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Loss', 0, 0);
        ctx.restore();

    }, [history]);

    return <canvas ref={canvasRef} width="300" height="150" className="bg-gray-900 rounded-md shadow-inner mt-2" />;
};
