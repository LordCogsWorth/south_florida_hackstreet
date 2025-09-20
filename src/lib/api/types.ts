// Core data types for E.D.I.T.H. application

export type TranscriptChunk = {
  id: string;
  ts: number;
  text: string;
  speaker?: string;
  confidence?: number;
};

export type Snapshot = {
  id: string;
  ts: number;
  thumbnailUrl: string;
  fullUrl: string;
  ocr?: string;
  markers?: Array<{
    id: string;
    x: number;
    y: number;
    label: string;
    color: string;
  }>;
};

export type StepExpansion = {
  snapshotId: string;
  steps: Array<{
    id: string;
    title: string;
    body: string;
    type: 'equation' | 'explanation' | 'example' | 'note';
  }>;
};

export type AlignmentRequest = {
  notesText: string;
  sessionId: string;
};

export type AlignmentResult = {
  missing: Array<{
    id: string;
    text: string;
    source: 'transcript' | 'snapshot' | 'ocr';
    sourceTs: number;
    confidence: number;
  }>;
  matched: Array<{
    id: string;
    excerpt: string;
    sourceTs: number;
    source: 'transcript' | 'snapshot' | 'ocr';
  }>;
  suggestions: Array<{
    id: string;
    text: string;
    reason: string;
  }>;
};

export type Summary = {
  id: string;
  bullets: Array<{
    id: string;
    text: string;
    importance: 'high' | 'medium' | 'low';
    sourceTs: number;
  }>;
  keyTopics: string[];
  createdAt: string;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  nextReview?: string;
  reviewCount: number;
  correctCount: number;
};

export type QuizItem = {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
};

export type Session = {
  id: string;
  title: string;
  course: string;
  instructor?: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'paused' | 'ended';
  isRecording: boolean;
  transcript: TranscriptChunk[];
  snapshots: Snapshot[];
  markers: Array<{
    id: string;
    ts: number;
    type: 'bookmark' | 'important' | 'question';
    label: string;
    color: string;
  }>;
};

export type LiveEvent =
  | { type: 'transcript'; data: TranscriptChunk }
  | { type: 'snapshot'; data: Snapshot }
  | { type: 'status'; data: { connected: boolean; latencyMs?: number } }
  | { type: 'error'; data: { message: string; code?: string } };

export type ConnectionStatus = {
  connected: boolean;
  latencyMs?: number;
  lastConnected?: string;
  error?: string;
};

export type ExportFormat = 'pdf' | 'docx' | 'md';

export type ExportOptions = {
  format: ExportFormat;
  includeTranscript: boolean;
  includeSnapshots: boolean;
  includeSummary: boolean;
  includeNotes: boolean;
  filename?: string;
};

export type UserSettings = {
  theme: 'light' | 'dark' | 'system';
  dataRetention: 7 | 30 | 90; // days
  autoSave: boolean;
  keyboardShortcuts: boolean;
  notifications: boolean;
  privacy: {
    shareData: boolean;
    analytics: boolean;
  };
};

export type AnalyticsEvent = {
  type:
    | 'session_started'
    | 'session_ended'
    | 'snapshot_captured'
    | 'pack_exported'
    | 'flashcard_studied'
    | 'quiz_completed';
  sessionId?: string;
  data?: Record<string, any>;
  timestamp: string;
};
