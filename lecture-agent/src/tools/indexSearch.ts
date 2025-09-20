// src/tools/indexSearch.ts

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
}

interface OCRResult {
  t: number;
  text: string;
  words: string[];
}

interface Document {
  id: string;
  text: string;
  meta: {
    t?: number;
    tStart?: number;
    tEnd?: number;
    type: 'asr' | 'board';
  };
}

export async function buildIndexes(
  ctx: any, 
  lecture: any, 
  { transcript, boardOCR }: { transcript: any; boardOCR: OCRResult[] }
) {
  console.log('Building search indexes...');
  
  const docs: Document[] = [];

  // Index transcript segments
  if (transcript.segments) {
    transcript.segments.forEach((segment: TranscriptSegment, i: number) => {
      docs.push({
        id: `${lecture.id}-seg-${i}`,
        text: segment.text,
        meta: { 
          tStart: segment.start, 
          tEnd: segment.end, 
          type: 'asr' 
        }
      });
    });
  }

  // Index board OCR results
  boardOCR.forEach((board, i) => {
    if (board.text && board.text.trim()) {
      docs.push({
        id: `${lecture.id}-board-${i}`,
        text: board.text,
        meta: { 
          t: board.t, 
          type: 'board' 
        }
      });
    }
  });

  console.log(`Indexing ${docs.length} documents`);

  // Create embeddings and store in vector database
  // Note: In a real implementation, you'd use actual embeddings
  // For now, we'll store simple keyword indexes
  
  const keywordMap: Record<string, number[]> = {};
  
  for (const doc of docs) {
    // Store document metadata
    await ctx.kv.set(`doc:${doc.id}`, {
      text: doc.text,
      meta: doc.meta
    });
    
    // Build keyword index
    const timestamp = doc.meta.t ?? doc.meta.tStart ?? 0;
    const keywords = extractKeywords(doc.text);
    
    for (const keyword of keywords) {
      if (!keywordMap[keyword]) {
        keywordMap[keyword] = [];
      }
      keywordMap[keyword].push(timestamp);
    }
    
    // In a real implementation with embeddings:
    // const embedding = await createEmbedding(doc.text);
    // await ctx.vector.upsert('lecture-index', doc.id, embedding, doc.meta);
  }

  // Store keyword map for fast lookups
  await ctx.kv.set(`lecture:${lecture.id}:keywords`, keywordMap);
  await ctx.kv.set(`lecture:${lecture.id}:docCount`, docs.length);
  
  console.log(`Indexed ${docs.length} documents with ${Object.keys(keywordMap).length} unique keywords`);
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3)
    .filter(word => !isStopWord(word));
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'will', 'this', 'that', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
  ]);
  return stopWords.has(word);
}