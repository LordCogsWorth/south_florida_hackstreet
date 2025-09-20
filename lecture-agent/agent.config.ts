// agent.config.ts
import { defineAgent } from "@agentuity/sdk";

export default defineAgent({
  name: "lecture-board-analyst",
  version: "0.1.0",
  description: "Analyzes lecture videos with whiteboard detection, OCR, and AI-powered Q&A",
  
  io: {
    inputs: [
      // HTTP endpoint: POST /io/ingest with { videoUrl?, fileId?, title? }
      { 
        type: "http", 
        path: "/io/ingest",
        description: "Ingest lecture video for processing",
        schema: {
          type: "object",
          properties: {
            videoUrl: { type: "string", description: "URL to video file" },
            fileId: { type: "string", description: "File ID for uploaded video" },
            title: { type: "string", description: "Lecture title" }
          }
        }
      },
      
      // HTTP endpoint: POST /io/analyze with { lectureId, query }
      { 
        type: "http", 
        path: "/io/analyze",
        description: "Analyze lecture content with AI",
        schema: {
          type: "object",
          properties: {
            lectureId: { type: "string", required: true },
            query: { type: "string", required: true }
          }
        }
      },
      
      // HTTP endpoint: POST /io/upload for direct file upload
      { 
        type: "http", 
        path: "/io/upload",
        description: "Upload video file directly",
        multipart: true
      }
    ],
    
    outputs: [
      // Respond synchronously over HTTP; can add Slack/Email later
      { type: "http" }
    ]
  },
  
  // Built-in storage provided by Agentuity
  storage: {
    kv: true,      // Key-value store for metadata
    object: true,  // Object storage for video files, frames, audio
    vector: true   // Vector store for RAG/semantic search
  },
  
  // Environment variables for API keys
  env: {
    OPENAI_API_KEY: { required: false, description: "OpenAI API key for LLM calls" },
    WHISPER_API_KEY: { required: false, description: "Whisper API key for transcription" }
  }
});