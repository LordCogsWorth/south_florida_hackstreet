'use client';

import { cn } from '@/lib/utils';
import {
  useSessionStore,
  useSidebarCollapsed,
} from '@/lib/store/session.store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Brain,
  FileText,
  Home,
  Settings,
  Download,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Play,
  Pause,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsRecording, useCurrentSession } from '@/lib/store/session.store';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Session', href: '/session', icon: Mic },
  { name: 'Notes', href: '/notes', icon: FileText },
  { name: 'Flashcards', href: '/flashcards', icon: Brain },
  { name: 'Exports', href: '/exports', icon: Download },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const sidebarCollapsed = useSidebarCollapsed();
  const isRecording = useIsRecording();
  const currentSession = useCurrentSession();
  const { toggleSidebar, startRecording, stopRecording } = useSessionStore();

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-card border-r transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-semibold text-foreground">E.D.I.T.H.</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Recording Controls */}
      {currentSession && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant={isRecording ? 'destructive' : 'default'}
              size="sm"
              onClick={handleRecordingToggle}
              className="flex-1"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  {!sidebarCollapsed && 'Stop'}
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {!sidebarCollapsed && 'Record'}
                </>
              )}
            </Button>
            {isRecording && !sidebarCollapsed && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span>Live</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    sidebarCollapsed && 'px-2'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!sidebarCollapsed && (
                    <span className="ml-2">{item.name}</span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Session Info */}
      {currentSession && !sidebarCollapsed && (
        <div className="p-4 border-t">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              Current Session
            </h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="truncate">{currentSession.title}</p>
              <p className="truncate">{currentSession.course}</p>
              {currentSession.instructor && (
                <p className="truncate">
                  Instructor: {currentSession.instructor}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
