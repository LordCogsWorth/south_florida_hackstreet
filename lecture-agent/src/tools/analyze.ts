// src/tools/analyze.ts
import { toTimecode } from '../util/timecode';

interface AnalysisRequest {
  lectureId: string;
  query: string;
}

interface AnalysisResult {
  answer: string;
  links: Array<{
    t: number;
    timecode: string;
    text: string;
    type: 'asr' | 'board';
  }>;
  flashcards?: Array<{
    question: string;
    answer: string;
  }>;
  summary?: string;
}

export async function analyzeQuery(ctx: any, { lectureId, query }: AnalysisRequest): Promise<AnalysisResult> {
  console.log(`Analyzing query "${query}" for lecture ${lectureId}`);

  // Get lecture metadata
  const lecture = await ctx.kv.get(`lecture:${lectureId}`);
  if (!lecture) {
    throw new Error(`Lecture ${lectureId} not found`);
  }

  // Search for relevant content
  const relevantDocs = await searchRelevantContent(ctx, lectureId, query);
  
  // Build context for LLM
  const context = relevantDocs.map(doc => {
    const timestamp = doc.meta.t ?? doc.meta.tStart ?? 0;
    const timecode = toTimecode(timestamp);
    return `[${timecode}] (${doc.meta.type}) ${doc.text}`;
  }).join('\n');

  // Generate AI response
  const aiResponse = await generateAIResponse(query, context);
  
  // Extract jump links
  const links = relevantDocs.map(doc => ({
    t: doc.meta.t ?? doc.meta.tStart ?? 0,
    timecode: toTimecode(doc.meta.t ?? doc.meta.tStart ?? 0),
    text: doc.text.substring(0, 100) + (doc.text.length > 100 ? '...' : ''),
    type: doc.meta.type
  }));

  return {
    answer: aiResponse.answer,
    links: links.slice(0, 10), // Limit to top 10 results
    flashcards: aiResponse.flashcards,
    summary: aiResponse.summary
  };
}

async function searchRelevantContent(ctx: any, lectureId: string, query: string) {
  // Get keyword map
  const keywordMap = await ctx.kv.get(`lecture:${lectureId}:keywords`) || {};
  const queryKeywords = extractQueryKeywords(query);
  
  // Find documents with matching keywords
  const docScores: Record<string, number> = {};
  
  for (const keyword of queryKeywords) {
    const timestamps = keywordMap[keyword] || [];
    for (const timestamp of timestamps) {
      // Find document IDs for this timestamp
      const docCount = await ctx.kv.get(`lecture:${lectureId}:docCount`) || 0;
      
      for (let i = 0; i < docCount; i++) {
        const segDocId = `${lectureId}-seg-${i}`;
        const boardDocId = `${lectureId}-board-${i}`;
        
        const segDoc = await ctx.kv.get(`doc:${segDocId}`);
        const boardDoc = await ctx.kv.get(`doc:${boardDocId}`);
        
        if (segDoc && matchesTimestamp(segDoc.meta, timestamp)) {
          docScores[segDocId] = (docScores[segDocId] || 0) + 1;
        }
        
        if (boardDoc && matchesTimestamp(boardDoc.meta, timestamp)) {
          docScores[boardDocId] = (docScores[boardDocId] || 0) + 1;
        }
      }
    }
  }
  
  // Get top scoring documents
  const sortedDocs = Object.entries(docScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8); // Top 8 results
  
  const relevantDocs = [];
  for (const [docId] of sortedDocs) {
    const doc = await ctx.kv.get(`doc:${docId}`);
    if (doc) {
      relevantDocs.push(doc);
    }
  }
  
  // Sort by timestamp
  relevantDocs.sort((a, b) => {
    const aTime = a.meta.t ?? a.meta.tStart ?? 0;
    const bTime = b.meta.t ?? b.meta.tStart ?? 0;
    return aTime - bTime;
  });
  
  return relevantDocs;
}

function matchesTimestamp(meta: any, timestamp: number): boolean {
  if (meta.t !== undefined) {
    return Math.abs(meta.t - timestamp) < 2; // Within 2 seconds
  }
  if (meta.tStart !== undefined && meta.tEnd !== undefined) {
    return timestamp >= meta.tStart && timestamp <= meta.tEnd;
  }
  return false;
}

function extractQueryKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3);
}

async function generateAIResponse(query: string, context: string) {
  // In a real implementation, this would call OpenAI/Anthropic via Agentuity's AI gateway
  // For now, return a mock response
  
  const prompt = `You are a helpful tutor. Answer the student's question using the provided lecture context.
Include specific timestamp references and create helpful flashcards if appropriate.

Question: ${query}

Context:
${context}

Provide:
1. A clear, concise answer
2. Relevant flashcards (if applicable)
3. A brief summary of the key points`;

  // Mock AI response - in production, replace with actual LLM call
  return {
    answer: `Based on the lecture content, ${query.toLowerCase()} involves several key concepts that were covered in the timestamps shown above. The main points include the theoretical foundations and practical applications discussed throughout the session.`,
    flashcards: [
      {
        question: `What is the main concept related to "${query}"?`,
        answer: "The main concept involves the theoretical and practical aspects covered in this lecture section."
      }
    ],
    summary: "This lecture section covers fundamental concepts with both theoretical background and practical examples."
  };
  
  // In production, use:
  // const response = await chat({
  //   model: "gpt-4o-mini",
  //   messages: [{ role: "user", content: prompt }]
  // });
  // return parseAIResponse(response.text);
}