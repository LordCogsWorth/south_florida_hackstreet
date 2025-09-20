import type {
  TranscriptChunk,
  Snapshot,
  StepExpansion,
  AlignmentRequest,
  AlignmentResult,
  Summary,
  Flashcard,
  QuizItem,
  Session,
  ExportOptions,
  ExportFormat,
} from './types';

// Mock data imports (will be created later)
import mockTranscript from '@/mocks/transcript.json';
import mockSnapshots from '@/mocks/snapshots.json';
import mockSteps from '@/mocks/steps.json';
import mockFlashcards from '@/mocks/flashcards.json';
import mockQuiz from '@/mocks/quiz.json';
import mockSummary from '@/mocks/summary.json';
import mockAlignment from '@/mocks/alignment.json';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

// Helper function to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Session Management
export async function createSession(
  title: string,
  course: string
): Promise<Session> {
  await delay(500);
  return {
    id: `session_${Date.now()}`,
    title,
    course,
    startTime: new Date().toISOString(),
    status: 'active',
    isRecording: false,
    transcript: [],
    snapshots: [],
    markers: [],
  };
}

export async function getSession(sessionId: string): Promise<Session> {
  await delay(300);
  return {
    id: sessionId,
    title: 'Mock Lecture Session',
    course: 'Advanced Mathematics',
    instructor: 'Dr. Smith',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    status: 'active',
    isRecording: true,
    transcript: mockTranscript as TranscriptChunk[],
    snapshots: mockSnapshots as Snapshot[],
    markers: [
      {
        id: 'marker_1',
        ts: 1200,
        type: 'important',
        label: 'Key Formula',
        color: '#ef4444',
      },
    ],
  };
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Session>
): Promise<Session> {
  await delay(200);
  const session = await getSession(sessionId);
  return { ...session, ...updates };
}

// Transcript Management
export async function addTranscriptChunk(
  sessionId: string,
  chunk: TranscriptChunk
): Promise<void> {
  await delay(100);
  // In real implementation, this would send to backend
  console.log('Adding transcript chunk:', chunk);
}

export async function getTranscript(
  sessionId: string
): Promise<TranscriptChunk[]> {
  await delay(300);
  return mockTranscript as TranscriptChunk[];
}

// Snapshot Management
export async function addSnapshot(
  sessionId: string,
  snapshot: Omit<Snapshot, 'id'>
): Promise<Snapshot> {
  await delay(500);
  const newSnapshot: Snapshot = {
    ...snapshot,
    id: `snapshot_${Date.now()}`,
  };
  console.log('Adding snapshot:', newSnapshot);
  return newSnapshot;
}

export async function getSnapshots(sessionId: string): Promise<Snapshot[]> {
  await delay(300);
  return mockSnapshots as Snapshot[];
}

// Step-by-Step Expansion
export async function getStepExpansion(
  snapshotId: string
): Promise<StepExpansion> {
  await delay(400);
  const steps = mockSteps.find((s) => s.snapshotId === snapshotId);
  if (!steps) {
    throw new Error('Step expansion not found');
  }
  return steps as StepExpansion;
}

// Notes Alignment
export async function alignNotes(
  request: AlignmentRequest
): Promise<AlignmentResult> {
  await delay(800);
  return mockAlignment as AlignmentResult;
}

// Summary Generation
export async function fetchSummary(sessionId: string): Promise<Summary> {
  await delay(600);
  return mockSummary as Summary;
}

// Flashcards
export async function fetchFlashcards(sessionId: string): Promise<Flashcard[]> {
  await delay(300);
  return mockFlashcards as Flashcard[];
}

export async function updateFlashcardProgress(
  flashcardId: string,
  grade: 'again' | 'hard' | 'good' | 'easy'
): Promise<void> {
  await delay(200);
  console.log('Updating flashcard progress:', flashcardId, grade);
}

// Quiz
export async function fetchQuiz(sessionId: string): Promise<QuizItem[]> {
  await delay(300);
  return mockQuiz as QuizItem[];
}

export async function submitQuizAnswers(
  sessionId: string,
  answers: Record<string, number>
): Promise<{
  score: number;
  total: number;
  correctAnswers: Record<string, number>;
}> {
  await delay(500);
  const quiz = await fetchQuiz(sessionId);
  let correct = 0;
  const correctAnswers: Record<string, number> = {};

  quiz.forEach((item) => {
    correctAnswers[item.id] = item.answerIndex;
    if (answers[item.id] === item.answerIndex) {
      correct++;
    }
  });

  return {
    score: correct,
    total: quiz.length,
    correctAnswers,
  };
}

// Export
export async function exportSmartNotePack(
  sessionId: string,
  options: ExportOptions
): Promise<Blob> {
  await delay(2000); // Simulate processing time

  const content = `# Smart Note Pack - ${options.filename || 'session'}\n\n`;
  const blob = new Blob([content], { type: 'text/plain' });

  console.log('Exporting smart note pack:', options);
  return blob;
}

// Analytics
export async function trackEvent(event: {
  type: string;
  sessionId?: string;
  data?: Record<string, any>;
}): Promise<void> {
  await delay(100);
  console.log('Analytics event:', event);
}

// Health Check
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
}> {
  await delay(100);
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
}

// Error handling wrapper
export async function apiCall<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error('API call failed:', error);
    return fallback;
  }
}
