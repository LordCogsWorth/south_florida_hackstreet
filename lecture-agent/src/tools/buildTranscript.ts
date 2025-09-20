// src/tools/buildTranscript.ts
import { getObjectStore } from '../util/storage';

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface TranscriptResult {
  segments: TranscriptSegment[];
  language?: string;
  duration?: number;
}

export async function buildTranscript(ctx: any, lecture: {id: string; audioKey: string}): Promise<TranscriptResult> {
  const store = getObjectStore(ctx);
  const audioPath = await store.downloadToTemp({ objectKey: lecture.audioKey });

  console.log(`Building transcript for lecture ${lecture.id}`);

  try {
    // Option 1: Use OpenAI Whisper API if available
    if (process.env.OPENAI_API_KEY) {
      const result = await transcribeWithOpenAI(audioPath);
      await ctx.object.putJSON(`lectures/${lecture.id}/transcript.json`, result);
      return result;
    }
    
    // Option 2: Use local Whisper or other ASR service
    // For now, return a mock transcript for demonstration
    const mockResult: TranscriptResult = {
      segments: [
        {
          text: "Welcome to today's lecture on advanced algorithms.",
          start: 0,
          end: 3.5,
          words: [
            { word: "Welcome", start: 0, end: 0.8 },
            { word: "to", start: 0.8, end: 1.0 },
            { word: "today's", start: 1.0, end: 1.5 },
            { word: "lecture", start: 1.5, end: 2.0 },
            { word: "on", start: 2.0, end: 2.2 },
            { word: "advanced", start: 2.2, end: 2.8 },
            { word: "algorithms", start: 2.8, end: 3.5 }
          ]
        },
        {
          text: "Today we'll be covering dynamic programming and graph algorithms.",
          start: 4.0,
          end: 8.5
        }
      ],
      language: "en",
      duration: 8.5
    };

    await ctx.object.putJSON(`lectures/${lecture.id}/transcript.json`, mockResult);
    return mockResult;

  } catch (error) {
    console.error('Transcript generation failed:', error);
    throw error;
  }
}

async function transcribeWithOpenAI(audioPath: string): Promise<TranscriptResult> {
  const fs = require('fs');
  const FormData = require('form-data');
  const fetch = require('node-fetch');

  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioPath));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  return {
    segments: result.segments || [],
    language: result.language,
    duration: result.duration
  };
}