
// --- Matrix/Volume Utilities ---
export const createMatrix = (rows: number, cols: number, filler: number | (() => number) = 0): number[][] => {
    return new Array(rows).fill(null).map(() =>
        new Array(cols).fill(null).map(() => (typeof filler === 'function' ? filler() : filler))
    );
};

// Removed: createVolume, applyActivationToMap, applyActivationToMaps, convolve, activationDerivatives
// as TensorFlow.js handles these.

// --- Image Processing ---
export const imageToGrid = (canvas: HTMLCanvasElement | null): number[][] => {
    if (!canvas) return createMatrix(28, 28);
    const ctx = canvas.getContext('2d');
    if (!ctx) return createMatrix(28,28);
    
    // Downscale to 28x28 before getting imageData for better representation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return createMatrix(28,28);

    // Fill with black and then draw the scaled image
    // This helps maintain contrast and avoid issues with transparent backgrounds
    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0,0,28,28);
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    
    const imageData = tempCtx.getImageData(0, 0, 28, 28);
    const grid = createMatrix(28, 28);

    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        // const g = imageData.data[i+1]; // Not needed for grayscale from white drawing
        // const b = imageData.data[i+2]; // Not needed for grayscale from white drawing
        // Using a common formula for grayscale, or just R if it's drawn in white/gray
        // const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
        // Assuming drawing is done in white on black, R channel is enough
        const pixelIndex = i / 4;
        const y = Math.floor(pixelIndex / 28);
        const x = pixelIndex % 28;
        grid[y][x] = r / 255; // Normalize to 0-1
    }
    return grid;
};

export const drawGridToCanvas = (canvas: HTMLCanvasElement | null, gridData: number[][]) => {
    if (!canvas || !gridData || gridData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#111827'; // bg-gray-900 (darker for drawing area)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gridData.length === 0 || !gridData[0] || gridData[0].length === 0) return;
    
    const cellDrawWidth = canvas.width / gridData[0].length; 
    const cellDrawHeight = canvas.height / gridData.length;

    for (let r = 0; r < gridData.length; r++) {
        for (let c = 0; c < gridData[r].length; c++) {
            const value = gridData[r][c];
            if (value > 0.05) { 
                const intensity = Math.floor(value * 255);
                ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
                ctx.fillRect(c * cellDrawWidth, r * cellDrawHeight, cellDrawWidth, cellDrawHeight);
            }
        }
    }
};

// --- Data Augmentation Utilities ---

export const flipGridHorizontal = (grid: number[][]): number[][] => {
    if (!grid || grid.length === 0) return [];
    return grid.map(row => [...row].reverse());
};

export const translateGrid = (grid: number[][], dx: number, dy: number): number[][] => {
    if (!grid || grid.length === 0) return [[]];
    const rows = grid.length;
    const cols = grid[0].length;
    const newGrid = createMatrix(rows, cols, 0);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const newR = r - dy;
            const newC = c - dx;
            if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
                newGrid[r][c] = grid[newR][newC];
            }
        }
    }
    return newGrid;
};

// --- AI Image Generation Utilities ---
export const base64ToGrid = (base64Image: string): Promise<number[][]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // The imageToGrid function expects the source canvas to be potentially larger
            // and it handles the downscaling to 28x28 internally.
            // For best results, draw the image at a reasonable size first, e.g., similar to drawing canvas.
            // Let's use a size that imageToGrid can work well with, e.g. 280x280.
            // imageToGrid will then create its own 28x28 temp canvas.
            canvas.width = 280; 
            canvas.height = 280;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error("Failed to get 2D context for base64ToGrid conversion.");
                return reject(createMatrix(28,28));
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(imageToGrid(canvas));
        };
        img.onerror = (error) => {
            console.error("Error loading base64 image:", error);
            reject(createMatrix(28,28)); // return empty grid on error
        };
        img.src = base64Image;
    });
};

// Note: Arbitrary small rotations are complex on a raw grid.
// For simplicity, we're not implementing small angle rotations here.
// TensorFlow.js image processing functions (tf.image.rotate) would be better
// if data was already in tensor format at augmentation stage.
