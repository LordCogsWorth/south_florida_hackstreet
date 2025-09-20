import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  Session,
  TranscriptChunk,
  Snapshot,
  ConnectionStatus,
  UserSettings,
  AnalyticsEvent,
} from '@/lib/api/types';

// Session State
interface SessionState {
  // Current session
  currentSession: Session | null;
  isRecording: boolean;
  recordingStartTime: number | null;

  // Real-time data
  transcript: TranscriptChunk[];
  snapshots: Snapshot[];
  selectedSnapshot: Snapshot | null;

  // Connection status
  connectionStatus: ConnectionStatus;

  // UI state
  sidebarCollapsed: boolean;
  selectedTab: 'transcript' | 'snapshots' | 'notes' | 'flashcards';

  // Settings
  settings: UserSettings;

  // Actions
  setCurrentSession: (session: Session | null) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addTranscriptChunk: (chunk: TranscriptChunk) => void;
  addSnapshot: (snapshot: Snapshot) => void;
  selectSnapshot: (snapshot: Snapshot | null) => void;
  updateConnectionStatus: (status: ConnectionStatus) => void;
  toggleSidebar: () => void;
  setSelectedTab: (
    tab: 'transcript' | 'snapshots' | 'notes' | 'flashcards'
  ) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetSession: () => void;
  trackEvent: (event: Omit<AnalyticsEvent, 'timestamp'>) => void;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  dataRetention: 30,
  autoSave: true,
  keyboardShortcuts: true,
  notifications: true,
  privacy: {
    shareData: false,
    analytics: true,
  },
};

export const useSessionStore = create<SessionState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      currentSession: null,
      isRecording: false,
      recordingStartTime: null,
      transcript: [],
      snapshots: [],
      selectedSnapshot: null,
      connectionStatus: { connected: false },
      sidebarCollapsed: false,
      selectedTab: 'transcript',
      settings: defaultSettings,

      // Actions
      setCurrentSession: (session) =>
        set(
          (state) => ({
            currentSession: session,
            transcript: session?.transcript || [],
            snapshots: session?.snapshots || [],
            isRecording: session?.isRecording || false,
          }),
          false,
          'setCurrentSession'
        ),

      startRecording: () =>
        set(
          (state) => ({
            isRecording: true,
            recordingStartTime: Date.now(),
          }),
          false,
          'startRecording'
        ),

      stopRecording: () =>
        set(
          (state) => ({
            isRecording: false,
            recordingStartTime: null,
          }),
          false,
          'stopRecording'
        ),

      addTranscriptChunk: (chunk) =>
        set(
          (state) => ({
            transcript: [...state.transcript, chunk],
          }),
          false,
          'addTranscriptChunk'
        ),

      addSnapshot: (snapshot) =>
        set(
          (state) => ({
            snapshots: [...state.snapshots, snapshot],
          }),
          false,
          'addSnapshot'
        ),

      selectSnapshot: (snapshot) =>
        set(
          (state) => ({
            selectedSnapshot: snapshot,
          }),
          false,
          'selectSnapshot'
        ),

      updateConnectionStatus: (status) =>
        set(
          (state) => ({
            connectionStatus: status,
          }),
          false,
          'updateConnectionStatus'
        ),

      toggleSidebar: () =>
        set(
          (state) => ({
            sidebarCollapsed: !state.sidebarCollapsed,
          }),
          false,
          'toggleSidebar'
        ),

      setSelectedTab: (tab) =>
        set(
          (state) => ({
            selectedTab: tab,
          }),
          false,
          'setSelectedTab'
        ),

      updateSettings: (newSettings) =>
        set(
          (state) => ({
            settings: { ...state.settings, ...newSettings },
          }),
          false,
          'updateSettings'
        ),

      resetSession: () =>
        set(
          (state) => ({
            currentSession: null,
            isRecording: false,
            recordingStartTime: null,
            transcript: [],
            snapshots: [],
            selectedSnapshot: null,
            connectionStatus: { connected: false },
          }),
          false,
          'resetSession'
        ),

      trackEvent: (event) => {
        const analyticsEvent: AnalyticsEvent = {
          ...event,
          timestamp: new Date().toISOString(),
        };

        // In a real app, this would send to analytics service
        console.log('Analytics event:', analyticsEvent);

        // Track locally for demo
        if (typeof window !== 'undefined') {
          const events = JSON.parse(
            localStorage.getItem('edith_analytics') || '[]'
          );
          events.push(analyticsEvent);
          localStorage.setItem(
            'edith_analytics',
            JSON.stringify(events.slice(-100))
          ); // Keep last 100 events
        }
      },
    })),
    {
      name: 'edith-session-store',
    }
  )
);

// Selectors for common use cases
export const useCurrentSession = () =>
  useSessionStore((state) => state.currentSession);
export const useIsRecording = () =>
  useSessionStore((state) => state.isRecording);
export const useTranscript = () => useSessionStore((state) => state.transcript);
export const useSnapshots = () => useSessionStore((state) => state.snapshots);
export const useSelectedSnapshot = () =>
  useSessionStore((state) => state.selectedSnapshot);
export const useConnectionStatus = () =>
  useSessionStore((state) => state.connectionStatus);
export const useSidebarCollapsed = () =>
  useSessionStore((state) => state.sidebarCollapsed);
export const useSelectedTab = () =>
  useSessionStore((state) => state.selectedTab);
export const useSettings = () => useSessionStore((state) => state.settings);

// Computed selectors
export const useRecordingDuration = () =>
  useSessionStore((state) => {
    if (!state.isRecording || !state.recordingStartTime) return 0;
    return Date.now() - state.recordingStartTime;
  });

export const useTranscriptStats = () =>
  useSessionStore((state) => {
    const transcript = state.transcript;
    const wordCount = transcript.reduce(
      (acc, chunk) => acc + chunk.text.split(' ').length,
      0
    );
    const speakerCount = new Set(
      transcript.map((chunk) => chunk.speaker).filter(Boolean)
    ).size;

    return {
      totalChunks: transcript.length,
      wordCount,
      speakerCount,
      duration:
        transcript.length > 0
          ? transcript[transcript.length - 1].ts - transcript[0].ts
          : 0,
    };
  });

export const useSnapshotStats = () =>
  useSessionStore((state) => {
    const snapshots = state.snapshots;
    return {
      totalSnapshots: snapshots.length,
      withOCR: snapshots.filter((s) => s.ocr).length,
      withMarkers: snapshots.filter((s) => s.markers && s.markers.length > 0)
        .length,
    };
  });

// Persist settings to localStorage
if (typeof window !== 'undefined') {
  // Load settings from localStorage on mount
  const savedSettings = localStorage.getItem('edith_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      useSessionStore.getState().updateSettings(parsed);
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }

  // Subscribe to settings changes and save to localStorage
  useSessionStore.subscribe(
    (state) => state.settings,
    (settings) => {
      localStorage.setItem('edith_settings', JSON.stringify(settings));
    }
  );
}
