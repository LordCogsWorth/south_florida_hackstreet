'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranscript } from '@/lib/store/session.store';
import { alignNotes } from '@/lib/api/client';
import { formatTimestamp } from '@/lib/utils/time';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Copy,
  Plus,
  Lightbulb,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AlignmentResult } from '@/lib/api/types';

export const AlignmentDiff = () => {
  const [alignmentResult, setAlignmentResult] =
    useState<AlignmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notesText, setNotesText] = useState('');
  const transcript = useTranscript();

  // Load notes from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotes = localStorage.getItem('edith_notes');
      if (savedNotes) {
        setNotesText(savedNotes);
      }
    }
  }, []);

  const handleAlignNotes = async () => {
    if (!notesText.trim()) {
      toast.error('Please enter some notes to align');
      return;
    }

    try {
      setIsLoading(true);
      const result = await alignNotes({
        notesText,
        sessionId: 'demo-session',
      });
      setAlignmentResult(result);
      toast.success('Notes aligned successfully');
    } catch (error) {
      console.error('Failed to align notes:', error);
      toast.error('Failed to align notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertMissing = (missingItem: any) => {
    const newNotes = notesText + '\n\n' + missingItem.text;
    setNotesText(newNotes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('edith_notes', newNotes);
    }
    toast.success('Missing content added to notes');
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'transcript':
        return <User className="h-3 w-3" />;
      case 'snapshot':
        return <FileText className="h-3 w-3" />;
      case 'ocr':
        return <FileText className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'transcript':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'snapshot':
        return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'ocr':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Note Alignment</CardTitle>
          <Button
            onClick={handleAlignNotes}
            disabled={isLoading || !notesText.trim()}
            size="sm"
          >
            {isLoading ? 'Aligning...' : 'Align Notes'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Compare your notes with captured lecture content to find missing
          information
        </p>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {!alignmentResult ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alignment results yet</p>
                <p className="text-xs">
                  Click &quot;Align Notes&quot; to compare your notes with the
                  lecture content
                </p>
              </div>
            ) : (
              <>
                {/* Missing Content */}
                {alignmentResult.missing.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <h3 className="font-medium text-sm">
                        Missing Content ({alignmentResult.missing.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {alignmentResult.missing.map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className={`p-1 rounded ${getSourceColor(item.source)}`}
                                >
                                  {getSourceIcon(item.source)}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {item.source}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(item.sourceTs)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    item.confidence > 0.9
                                      ? 'text-green-600'
                                      : item.confidence > 0.7
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                  }`}
                                >
                                  {Math.round(item.confidence * 100)}%
                                </Badge>
                              </div>
                              <p className="text-sm leading-relaxed">
                                {item.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyToClipboard(item.text)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInsertMissing(item)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Content */}
                {alignmentResult.matched.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium text-sm">
                        Matched Content ({alignmentResult.matched.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {alignmentResult.matched.map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 bg-green-50 dark:bg-green-900/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className={`p-1 rounded ${getSourceColor(item.source)}`}
                                >
                                  {getSourceIcon(item.source)}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {item.source}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(item.sourceTs)}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">
                                {item.excerpt}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopyToClipboard(item.excerpt)
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {alignmentResult.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      <h3 className="font-medium text-sm">
                        Suggestions ({alignmentResult.suggestions.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {alignmentResult.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20"
                        >
                          <p className="text-sm font-medium mb-1">
                            {suggestion.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {alignmentResult.missing.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Missing Items
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {alignmentResult.matched.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Matched Items
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
