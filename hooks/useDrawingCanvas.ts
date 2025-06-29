
import { useRef, useEffect, useCallback } from 'react';
import { imageToGrid, createMatrix } from '../utils/cnnUtils';

interface UseDrawingCanvasProps {
    onDrawEnd?: (grid: number[][]) => void;
    lineWidth?: number;
    strokeColor?: string;
    canvasWidth?: number;
    canvasHeight?: number;
}

export const useDrawingCanvas = (props: UseDrawingCanvasProps) => {
    const { onDrawEnd, lineWidth = 20, strokeColor = '#FFFFFF', canvasWidth = 224, canvasHeight = 224 } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef<boolean>(false);

    // Ref to store the latest onDrawEnd callback
    const onDrawEndRef = useRef(onDrawEnd);
    useEffect(() => {
        onDrawEndRef.current = onDrawEnd;
    }, [onDrawEnd]);

    const getPos = useCallback((e: MouseEvent | TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        let clientX, clientY;
        if (e instanceof TouchEvent && e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            return { x: 0, y: 0 };
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }, []); // Empty dependency array as canvasRef.current is stable within the hook's lifecycle

    const startDrawing = useCallback((event: Event) => {
        if (!canvasRef.current) return;
        const nativeEvent = event as MouseEvent | TouchEvent;
        if (nativeEvent instanceof TouchEvent) nativeEvent.preventDefault();
        isDrawing.current = true;
        const { x, y } = getPos(nativeEvent);
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, [getPos]);

    const draw = useCallback((event: Event) => {
        if (!isDrawing.current || !canvasRef.current) return;
        const nativeEvent = event as MouseEvent | TouchEvent;
        if (nativeEvent instanceof TouchEvent) nativeEvent.preventDefault();
        const { x, y } = getPos(nativeEvent);
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
    }, [getPos]);

    const stopDrawing = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (onDrawEndRef.current && canvasRef.current) {
            const grid = imageToGrid(canvasRef.current);
            onDrawEndRef.current(grid);
        }
    }, [canvasRef]); // Depends only on canvasRef (stable)

    const clearCanvas = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#111827'; // bg-gray-900 (darker shade for drawing area)
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (onDrawEndRef.current) { 
            const emptyGrid = createMatrix(28, 28, 0); 
            onDrawEndRef.current(emptyGrid);
        }
    }, [canvasRef]); // Depends only on canvasRef (stable)

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        clearCanvas(); // Initial clear, clearCanvas is now stable

        // Add event listeners using the stable callbacks
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [startDrawing, draw, stopDrawing, clearCanvas, lineWidth, strokeColor, canvasWidth, canvasHeight, canvasRef]);
    // Dependencies: Stable callbacks, and props that should trigger re-initialization. canvasRef added for completeness.

    return { canvasRef, clearCanvas };
};
