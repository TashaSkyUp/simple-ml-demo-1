export const createMatrix = (
  rows: number,
  cols: number,
  filler: number | (() => number) = 0,
): number[][] => {
  return new Array(rows)
    .fill(null)
    .map(() =>
      new Array(cols)
        .fill(null)
        .map(() => (typeof filler === "function" ? filler() : filler)),
    );
};

// Convert ImageData to RGB grid
export const imageDataToRGBGrid = (
  imageData: ImageData,
  targetWidth: number = 28,
  targetHeight: number = 28,
): number[][][] => {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    return new Array(targetHeight)
      .fill(null)
      .map(() => new Array(targetWidth).fill(null).map(() => [0, 0, 0]));

  ctx.putImageData(imageData, 0, 0);

  // Scale to target size
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = targetWidth;
  tempCanvas.height = targetHeight;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx)
    return new Array(targetHeight)
      .fill(null)
      .map(() => new Array(targetWidth).fill(null).map(() => [0, 0, 0]));

  tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
  const scaledImageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);

  const grid: number[][][] = new Array(targetHeight)
    .fill(null)
    .map(() => new Array(targetWidth).fill(null).map(() => [0, 0, 0]));

  for (let i = 0; i < scaledImageData.data.length; i += 4) {
    const r = scaledImageData.data[i];
    const g = scaledImageData.data[i + 1];
    const b = scaledImageData.data[i + 2];
    const pixelIndex = i / 4;
    const y = Math.floor(pixelIndex / targetWidth);
    const x = pixelIndex % targetWidth;
    grid[y][x] = [r / 255, g / 255, b / 255]; // Normalize to 0-1
  }
  return grid;
};

// --- Data Augmentation Utilities ---

// RGB augmentation functions
export const flipRGBGridHorizontal = (grid: number[][][]): number[][][] => {
  if (!grid || grid.length === 0) return [];
  return grid.map((row) => [...row].reverse());
};

export const translateRGBGrid = (
  grid: number[][][],
  dx: number,
  dy: number,
): number[][][] => {
  if (!grid || grid.length === 0) return [];
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid: number[][][] = new Array(rows)
    .fill(null)
    .map(() => new Array(cols).fill(null).map(() => [0, 0, 0]));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const newR = r - dy;
      const newC = c - dx;
      if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
        newGrid[r][c] = [...grid[newR][newC]];
      }
    }
  }
  return newGrid;
};
