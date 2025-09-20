'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranscript, useTranscriptStats } from '@/lib/store/session.store';
import { formatTimestamp } from '@/lib/utils/time';
import { Search, Copy, Bookmark, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const LiveTranscript = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const transcript = useTranscript();
  const stats = useTranscriptStats();

  // Filter transcript based on search query
  const filteredTranscript = transcript.filter((chunk) =>
    chunk.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (scrollAreaRef.current && !isSearchFocused) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [transcript.length, isSearchFocused]);

  const handleCopyAll = async () => {
    const text = transcript
      .map(
        (chunk) =>
          `[${formatTimestamp(chunk.ts)}] ${chunk.speaker || 'Unknown'}: ${chunk.text}`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Transcript copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy transcript');
    }
  };

  const handleBookmark = (chunkId: string, timestamp: number) => {
    // In a real app, this would add a bookmark to the store
    toast.success(`Bookmark added at ${formatTimestamp(timestamp)}`);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Transcript</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.totalChunks} chunks
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stats.wordCount} words
            </Badge>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="pl-10"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea ref={scrollAreaRef} className="h-full px-4">
          <div className="space-y-3 pb-4">
            {filteredTranscript.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? 'No matching transcript found'
                  : 'No transcript available yet'}
              </div>
            ) : (
              filteredTranscript.map((chunk) => (
                <div
                  key={chunk.id}
                  className="group hover:bg-muted/50 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {chunk.speaker && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{chunk.speaker}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(chunk.ts)}</span>
                        </div>
                        {chunk.confidence && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              chunk.confidence > 0.9
                                ? 'text-green-600'
                                : chunk.confidence > 0.7
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {Math.round(chunk.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">
                        {highlightText(chunk.text, searchQuery)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBookmark(chunk.id, chunk.ts)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
