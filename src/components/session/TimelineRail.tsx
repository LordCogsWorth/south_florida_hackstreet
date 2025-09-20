'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useSnapshots,
  useSelectedSnapshot,
  selectSnapshot,
} from '@/lib/store/session.store';
import { formatTimestamp } from '@/lib/utils/time';
import { ChevronLeft, ChevronRight, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const TimelineRail = () => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const snapshots = useSnapshots();
  const selectedSnapshot = useSelectedSnapshot();
  const { selectSnapshot: setSelectedSnapshot } = useSessionStore();

  // Auto-scroll to selected snapshot
  useEffect(() => {
    if (selectedSnapshot && scrollAreaRef.current) {
      const selectedElement = scrollAreaRef.current.querySelector(
        `[data-snapshot-id="${selectedSnapshot.id}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedSnapshot]);

  const handleSnapshotClick = (snapshot: any) => {
    setSelectedSnapshot(snapshot);
    toast.success(`Selected snapshot from ${formatTimestamp(snapshot.ts)}`);
  };

  const scrollToStart = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollLeft = 0;
      }
    }
  };

  const scrollToEnd = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
      }
    }
  };

  const scrollToPrevious = () => {
    if (!selectedSnapshot) return;

    const currentIndex = snapshots.findIndex(
      (s) => s.id === selectedSnapshot.id
    );
    if (currentIndex > 0) {
      const previousSnapshot = snapshots[currentIndex - 1];
      setSelectedSnapshot(previousSnapshot);
    }
  };

  const scrollToNext = () => {
    if (!selectedSnapshot) return;

    const currentIndex = snapshots.findIndex(
      (s) => s.id === selectedSnapshot.id
    );
    if (currentIndex < snapshots.length - 1) {
      const nextSnapshot = snapshots[currentIndex + 1];
      setSelectedSnapshot(nextSnapshot);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[') {
        e.preventDefault();
        scrollToPrevious();
      } else if (e.key === ']') {
        e.preventDefault();
        scrollToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSnapshot, snapshots]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Timeline</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThumbnails(!showThumbnails)}
            >
              {showThumbnails ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="outline" className="text-xs">
              {snapshots.length} items
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {snapshots.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No snapshots yet</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Navigation buttons */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-8 w-8 p-0"
              onClick={scrollToStart}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-8 w-8 p-0"
              onClick={scrollToEnd}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <ScrollArea ref={scrollAreaRef} className="h-24">
              <div className="flex items-center gap-2 p-2">
                {snapshots.map((snapshot, index) => (
                  <div
                    key={snapshot.id}
                    data-snapshot-id={snapshot.id}
                    className={`flex-shrink-0 cursor-pointer transition-all duration-200 ${
                      selectedSnapshot?.id === snapshot.id
                        ? 'ring-2 ring-primary ring-offset-2'
                        : 'hover:ring-1 hover:ring-muted-foreground'
                    }`}
                    onClick={() => handleSnapshotClick(snapshot)}
                  >
                    <div className="relative">
                      {showThumbnails ? (
                        <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center">
                          <div className="text-xs text-muted-foreground text-center">
                            <div className="font-mono">
                              {formatTimestamp(snapshot.ts).split(' ')[1]}
                            </div>
                            <div className="text-[10px]">#{index + 1}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center">
                          <Clock className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Markers indicator */}
                      {snapshot.markers && snapshot.markers.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            {snapshot.markers.length}
                          </span>
                        </div>
                      )}

                      {/* OCR indicator */}
                      {snapshot.ocr && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            T
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
