// src/agent.ts
import { Agent, http } from "@agentuity/sdk";
import { analyzeQuery } from "./tools/analyze";
import { buildTranscript } from "./tools/buildTranscript";
import { detectBoardEdits } from "./tools/detectBoardEdits";
import { buildIndexes } from "./tools/indexSearch";
import { ingestVideo } from "./tools/ingestVideo";
import { ocrBoard } from "./tools/ocrBoard";
import { uploadFile } from "./tools/uploadFile";

export const agent = new Agent();

// POST /io/upload -> handle multipart file upload
agent.on(http("/io/upload"), async (ctx) => {
  try {
    const result = await uploadFile(ctx);
    return ctx.respond(200, { 
      success: true, 
      fileId: result.fileId,
      message: "File uploaded successfully. Use /io/ingest to process it." 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return ctx.respond(400, { error: error.message });
  }
});

// POST /io/ingest -> kicks off full pipeline, returns lectureId
agent.on(http("/io/ingest"), async (ctx) => {
  try {
    const { videoUrl, fileId, title } = ctx.request.body ?? {};
    
    if (!videoUrl && !fileId) {
      return ctx.respond(400, { error: "Either videoUrl or fileId is required" });
    }

    console.log(`Starting ingestion for ${title || 'untitled lecture'}`);
    
    // Step 1: Ingest video and extract audio + frames
    const lecture = await ingestVideo(ctx, { videoUrl, fileId, title });
    console.log(`Lecture created: ${lecture.id}`);

    // Step 2: Build transcript with timestamps
    console.log("Building transcript...");
    const transcript = await buildTranscript(ctx, lecture);
    console.log(`Transcript completed: ${transcript.segments?.length || 0} segments`);

    // Step 3: Detect board edits/changes
    console.log("Detecting board edits...");
    const boardEvents = await detectBoardEdits(ctx, lecture);
    console.log(`Board events detected: ${boardEvents.length}`);

    // Step 4: OCR on changed board frames
    console.log("Running OCR on board changes...");
    const boardOCR = await ocrBoard(ctx, lecture, boardEvents);
    console.log(`OCR completed: ${boardOCR.length} board texts`);

    // Step 5: Build searchable indexes
    console.log("Building search indexes...");
    await buildIndexes(ctx, lecture, { transcript, boardOCR });
    console.log("Indexing completed");

    return ctx.respond(200, { 
      success: true,
      lectureId: lecture.id, 
      segments: transcript.segments?.length || 0, 
      boardEvents: boardEvents.length,
      ocrTexts: boardOCR.length,
      message: "Lecture processed successfully. Ready for analysis!"
    });

  } catch (error) {
    console.error("Ingestion error:", error);
    return ctx.respond(500, { error: error.message });
  }
});

// POST /io/analyze -> RAG over transcript+OCR with timestamped citations
agent.on(http("/io/analyze"), async (ctx) => {
  try {
    const { lectureId, query } = ctx.request.body ?? {};
    
    if (!lectureId || !query) {
      return ctx.respond(400, { error: "lectureId and query are required" });
    }

    console.log(`Analyzing lecture ${lectureId}: "${query}"`);
    
    const result = await analyzeQuery(ctx, { lectureId, query });
    
    return ctx.respond(200, {
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return ctx.respond(500, { error: error.message });
  }
});

// GET /health -> simple health check
agent.on(http("/health"), async (ctx) => {
  return ctx.respond(200, { 
    status: "healthy", 
    agent: "lecture-board-analyst",
    version: "0.1.0",
    timestamp: new Date().toISOString()
  });
});

console.log("🎓 Lecture Board Analyst Agent ready!");