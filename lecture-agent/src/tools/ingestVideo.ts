// src/tools/ingestVideo.ts
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { getObjectStore } from '../util/storage';

export async function ingestVideo(ctx: any, { videoUrl, fileId, title }: {videoUrl?: string; fileId?: string; title?: string}) {
  const id = uuid();
  const store = getObjectStore(ctx);

  console.log(`Processing video for lecture ${id}`);

  // Download video to temp location
  let videoPath: string;
  if (fileId) {
    // Get from uploaded files
    videoPath = await store.downloadToTemp({ objectKey: `uploads/${fileId}.mp4`, suffix: `${id}.mp4` });
  } else if (videoUrl) {
    // Download from URL
    videoPath = await store.downloadToTemp({ videoUrl, suffix: `${id}.mp4` });
  } else {
    throw new Error('Either videoUrl or fileId is required');
  }

  // Extract audio (mono, 16kHz) for ASR
  const audioPath = path.join('/tmp', `${id}.wav`);
  console.log(`Extracting audio to ${audioPath}`);
  
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .save(audioPath)
      .on('end', () => {
        console.log('Audio extraction completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Audio extraction failed:', err);
        reject(err);
      });
  });

  // Generate frames every 1 second for analysis
  const framesDir = await store.ensureTmpDir(`frames-${id}`);
  console.log(`Extracting frames to ${framesDir}`);
  
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(['-r', '1']) // 1 frame per second
      .save(path.join(framesDir, 'frame-%06d.jpg'))
      .on('end', () => {
        console.log('Frame extraction completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Frame extraction failed:', err);
        reject(err);
      });
  });

  // Get video metadata
  const videoInfo = await new Promise<any>((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });

  const duration = videoInfo.format?.duration || 0;
  const videoStream = videoInfo.streams?.find((s: any) => s.codec_type === 'video');
  const width = videoStream?.width || 1920;
  const height = videoStream?.height || 1080;

  // Persist artifacts to object storage
  const [audioObj, framesObj] = await Promise.all([
    store.put(`lectures/${id}/audio.wav`, audioPath),
    store.putDir(`lectures/${id}/frames/`, framesDir)
  ]);

  // Clean up temp files
  await fs.promises.unlink(audioPath).catch(() => {});
  await fs.promises.rm(framesDir, { recursive: true }).catch(() => {});
  await fs.promises.unlink(videoPath).catch(() => {});

  const record = {
    id,
    title: title || 'Untitled Lecture',
    audioKey: audioObj.key,
    framesPrefix: framesObj.prefix,
    duration,
    width,
    height,
    createdAt: Date.now()
  };

  await ctx.kv.set(`lecture:${id}`, record);
  console.log(`Lecture record created: ${id}`);
  
  return record;
}