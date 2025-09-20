// src/tools/ocrBoard.ts
import * as sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { getObjectStore } from '../util/storage';

interface BoardEvent {
  t: number;
  frameKey: string;
  bbox: [number, number, number, number];
  score: number;
}

interface OCRResult {
  t: number;
  text: string;
  words: string[];
  confidence?: number;
}

export async function ocrBoard(ctx: any, lecture: any, events: BoardEvent[]): Promise<OCRResult[]> {
  const store = getObjectStore(ctx);
  const worker = await createWorker('eng');
  
  console.log(`Running OCR on ${events.length} board change events`);
  
  // Configure Tesseract for better handwriting recognition
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}=-+*/\'"@#$%^&_|\\~ \n',
    tessedit_pageseg_mode: '6', // Uniform block of text
    preserve_interword_spaces: '1'
  });

  const results: OCRResult[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    try {
      console.log(`Processing OCR for event ${i + 1}/${events.length} at ${event.t}s`);
      
      // Get the frame buffer
      const frameBuffer = await store.getBuffer(event.frameKey);
      
      // Extract the board region and enhance for OCR
      const cropBuffer = await sharp(frameBuffer)
        .extract({
          left: event.bbox[0],
          top: event.bbox[1],
          width: event.bbox[2],
          height: event.bbox[3]
        })
        .greyscale()
        .normalise() // Enhance contrast
        .png()
        .toBuffer();

      // Run OCR
      const { data } = await worker.recognize(cropBuffer);
      
      const cleanText = data.text.trim();
      if (cleanText) {
        results.push({
          t: event.t,
          text: cleanText,
          words: data.words?.map(w => w.text) || [],
          confidence: data.confidence
        });
        
        console.log(`OCR result (${event.t}s): "${cleanText.substring(0, 100)}..."`);
      }
      
    } catch (error) {
      console.error(`OCR failed for event at ${event.t}s:`, error);
      continue;
    }
  }

  await worker.terminate();
  
  console.log(`OCR completed: ${results.length} text extractions`);
  
  // Store the OCR results
  await ctx.object.putJSON(`lectures/${lecture.id}/boardOCR.json`, results);
  return results;
}