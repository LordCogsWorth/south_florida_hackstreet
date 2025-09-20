'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LiveTranscript } from '@/components/session/LiveTranscript';
import { WhiteboardPreview } from '@/components/session/WhiteboardPreview';
import { TimelineRail } from '@/components/session/TimelineRail';
import { StepDrawer } from '@/components/session/StepDrawer';
import { useSessionStore } from '@/lib/store/session.store';
import { createSession, getSession } from '@/lib/api/client';
import {
  connectSocket,
  onSocketEvent,
  setMockMode,
} from '@/lib/realtime/socket';
import { toast } from 'sonner';

export default function SessionPage() {
  const [isLoading, setIsLoading] = useState(true);
  const {
    currentSession,
    setCurrentSession,
    addTranscriptChunk,
    addSnapshot,
    trackEvent,
  } = useSessionStore();

  // Initialize session and socket connection
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);

        // Enable mock mode for demo
        setMockMode(true);

        // Create or get existing session
        let session = currentSession;
        if (!session) {
          session = await createSession('Demo Lecture', 'Advanced Mathematics');
          setCurrentSession(session);
        } else {
          session = await getSession(session.id);
          setCurrentSession(session);
        }

        // Connect to socket for real-time updates
        connectSocket(session.id);

        // Set up socket event listeners
        const unsubscribeTranscript = onSocketEvent('transcript', (chunk) => {
          addTranscriptChunk(chunk);
        });

        const unsubscribeSnapshot = onSocketEvent('snapshot', (snapshot) => {
          addSnapshot(snapshot);
          trackEvent({
            type: 'snapshot_captured',
            sessionId: session?.id,
            data: { snapshotId: snapshot.id },
          });
        });

        const unsubscribeStatus = onSocketEvent('status', (status) => {
          // Update connection status in store
          useSessionStore.getState().updateConnectionStatus(status);
        });

        // Track session start
        trackEvent({
          type: 'session_started',
          sessionId: session?.id,
        });

        toast.success('Session initialized successfully');

        // Cleanup function
        return () => {
          unsubscribeTranscript();
          unsubscribeSnapshot();
          unsubscribeStatus();
        };
      } catch (error) {
        console.error('Failed to initialize session:', error);
        toast.error('Failed to initialize session');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing session...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
          {/* Left Column - Whiteboard and Timeline */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            {/* Whiteboard Preview */}
            <div className="flex-1 min-h-0">
              <WhiteboardPreview />
            </div>

            {/* Timeline Rail */}
            <div className="h-32">
              <TimelineRail />
            </div>
          </div>

          {/* Right Column - Live Transcript */}
          <div className="col-span-12 lg:col-span-4">
            <LiveTranscript />
          </div>
        </div>
      </div>

      {/* Step Drawer */}
      <StepDrawer />
    </AppLayout>
  );
}
