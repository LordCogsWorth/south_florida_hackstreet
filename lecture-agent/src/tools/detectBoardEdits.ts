// src/tools/detectBoardEdits.ts
import * as sharp from 'sharp';
import { calculateSSIM, findBoardRegion } from '../util/boardDetect';
import { getObjectStore } from '../util/storage';

interface BoardEvent {
  t: number;
  frameKey: string;
  bbox: [number, number, number, number];
  score: number;
}

export async function detectBoardEdits(ctx: any, lecture: {id: string; framesPrefix: string}): Promise<BoardEvent[]> {
  const store = getObjectStore(ctx);
  const frames = await store.listPrefix(lecture.framesPrefix);
  
  console.log(`Analyzing ${frames.length} frames for board changes`);
  
  let prevCrop: Buffer | null = null;
  const events: BoardEvent[] = [];
  const changeThreshold = 0.85; // SSIM threshold for detecting changes

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const t = extractSecondsFromFrameName(frame.name || ''); // frame-000123.jpg -> 123 seconds
    
    try {
      const frameBuffer = await store.getBuffer(frame.key);
      const img = sharp(frameBuffer);
      const meta = await img.metadata();
      
      // Find the board region in this frame
      const bbox = await findBoardRegion(img, meta);
      
      // Extract and process the board region
      const crop = await img
        .extract({ 
          left: bbox[0], 
          top: bbox[1], 
          width: bbox[2], 
          height: bbox[3] 
        })
        .greyscale()
        .resize(800, 600, { fit: 'fill' }) // Normalize size for comparison
        .raw()
        .toBuffer();

      if (!prevCrop) {
        prevCrop = crop;
        // Always include the first frame as a baseline
        events.push({ t, frameKey: frame.key, bbox, score: 1.0 });
        continue;
      }

      // Calculate similarity using SSIM
      const similarity = calculateSSIM(prevCrop, crop);
      
      if (similarity < changeThreshold) {
        // Significant change detected
        const changeScore = 1 - similarity;
        events.push({ t, frameKey: frame.key, bbox, score: changeScore });
        prevCrop = crop; // Update reference frame
        
        console.log(`Board change detected at ${t}s (similarity: ${similarity.toFixed(3)})`);
      }
      
    } catch (error) {
      console.error(`Error processing frame ${frame.key}:`, error);
      continue;
    }
  }

  console.log(`Detected ${events.length} board change events`);
  
  // Store the events
  await ctx.object.putJSON(`lectures/${lecture.id}/boardEvents.json`, events);
  return events;
}

function extractSecondsFromFrameName(filename: string): number {
  // Extract frame number from filename like "frame-000123.jpg"
  const match = filename.match(/frame-(\d+)/);
  if (match) {
    return parseInt(match[1], 10); // Frame number corresponds to seconds (1 fps)
  }
  return 0;
}