'use client';

import { useState, useEffect } from 'react';
import {
  useSessionStore,
  useConnectionStatus,
  useIsRecording,
  useCurrentSession,
} from '@/lib/store/session.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Clock,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { formatDuration } from '@/lib/utils/time';
import { StatusPill } from '@/components/common/StatusPill';
import { ShortcutsDialog } from '@/components/settings/ShortcutsDialog';

export const TopBar = () => {
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { theme, setTheme } = useTheme();
  const isRecording = useIsRecording();
  const currentSession = useCurrentSession();
  const connectionStatus = useConnectionStatus();
  const { startRecording, stopRecording, trackEvent } = useSessionStore();

  // Update recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1000);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
      trackEvent({
        type: 'session_ended',
        sessionId: currentSession?.id,
      });
    } else {
      startRecording();
      trackEvent({
        type: 'session_started',
        sessionId: currentSession?.id,
      });
    }
  };

  const handleThemeToggle = () => {
    const newTheme =
      theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(newTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleRecordingToggle();
      } else if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  return (
    <TooltipProvider>
      <div className="flex h-16 items-center justify-between border-b bg-background px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Recording Controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? 'destructive' : 'default'}
                  size="sm"
                  onClick={handleRecordingToggle}
                  className="gap-2"
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {isRecording ? 'Stop' : 'Record'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? 'Stop recording' : 'Start recording'}</p>
                <p className="text-xs text-muted-foreground">⌘R</p>
              </TooltipContent>
            </Tooltip>

            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Session Info */}
          {currentSession && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                {currentSession.course}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentSession.title}
              </span>
            </div>
          )}
        </div>

        {/* Center Section - Status */}
        <div className="flex items-center gap-2">
          <StatusPill status={connectionStatus} />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleThemeToggle}>
                {getThemeIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle theme</p>
            </TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <a href="/settings">
                  <Settings className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          {/* Help */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Keyboard shortcuts</p>
              <p className="text-xs text-muted-foreground">?</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Shortcuts Dialog */}
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </TooltipProvider>
  );
};
