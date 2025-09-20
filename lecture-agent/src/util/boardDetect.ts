// src/util/boardDetect.ts
import Sharp from 'sharp';

export async function findBoardRegion(img: Sharp.Sharp, meta: Sharp.Metadata): Promise<[number, number, number, number]> {
  const { width = 1920, height = 1080 } = meta;
  
  // Simple heuristic: assume whiteboard/blackboard is the largest rectangular region
  // that's either very bright (whiteboard) or very dark (blackboard)
  
  try {
    // Convert to grayscale and get image data
    const { data } = await img
      .clone()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Find bright (whiteboard) or dark (blackboard) regions
    const threshold_bright = 200; // For whiteboards
    const threshold_dark = 50;    // For blackboards
    
    let brightPixels = 0;
    let darkPixels = 0;
    
    // Count bright and dark pixels to determine board type
    for (let i = 0; i < data.length; i++) {
      const pixel = data[i];
      if (pixel > threshold_bright) brightPixels++;
      if (pixel < threshold_dark) darkPixels++;
    }
    
    const isWhiteboard = brightPixels > darkPixels;
    const threshold = isWhiteboard ? threshold_bright : threshold_dark;
    const targetValue = isWhiteboard ? 255 : 0;
    
    // Find bounding box of the board region
    let minX = width, maxX = 0, minY = height, maxY = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        const pixel = data[pixelIndex];
        
        const isTargetPixel = isWhiteboard ? 
          pixel > threshold : 
          pixel < threshold;
        
        if (isTargetPixel) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Ensure we found a valid region
    if (minX >= maxX || minY >= maxY) {
      // Fallback: use center 80% of image
      const padding = 0.1;
      return [
        Math.floor(width * padding),
        Math.floor(height * padding),
        Math.floor(width * (1 - 2 * padding)),
        Math.floor(height * (1 - 2 * padding))
      ];
    }
    
    // Add some padding to the detected region
    const padding = 20;
    const x = Math.max(0, minX - padding);
    const y = Math.max(0, minY - padding);
    const w = Math.min(width - x, maxX - minX + 2 * padding);
    const h = Math.min(height - y, maxY - minY + 2 * padding);
    
    return [x, y, w, h];
    
  } catch (error) {
    console.error('Error in board detection:', error);
    // Fallback: return center 80% of image
    const padding = 0.1;
    return [
      Math.floor(width * padding),
      Math.floor(height * padding),
      Math.floor(width * (1 - 2 * padding)),
      Math.floor(height * (1 - 2 * padding))
    ];
  }
}

export function calculateSSIM(img1: Buffer, img2: Buffer): number {
  // Simplified SSIM calculation
  // In production, use a proper SSIM library like ssim.js
  
  if (img1.length !== img2.length) {
    return 0;
  }
  
  let sum1 = 0, sum2 = 0, sum12 = 0;
  let sum1sq = 0, sum2sq = 0;
  
  for (let i = 0; i < img1.length; i++) {
    const pixel1 = img1[i];
    const pixel2 = img2[i];
    
    sum1 += pixel1;
    sum2 += pixel2;
    sum12 += pixel1 * pixel2;
    sum1sq += pixel1 * pixel1;
    sum2sq += pixel2 * pixel2;
  }
  
  const n = img1.length;
  const mean1 = sum1 / n;
  const mean2 = sum2 / n;
  
  const variance1 = (sum1sq / n) - (mean1 * mean1);
  const variance2 = (sum2sq / n) - (mean2 * mean2);
  const covariance = (sum12 / n) - (mean1 * mean2);
  
  const c1 = 0.01 * 0.01;
  const c2 = 0.03 * 0.03;
  
  const numerator = (2 * mean1 * mean2 + c1) * (2 * covariance + c2);
  const denominator = (mean1 * mean1 + mean2 * mean2 + c1) * (variance1 + variance2 + c2);
  
  return numerator / denominator;
}