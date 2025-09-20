'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useTranscript, useSnapshots } from '@/lib/store/session.store';
import { fetchSummary, exportSmartNotePack } from '@/lib/api/client';
import { formatTimestamp } from '@/lib/utils/time';
import {
  FileText,
  Download,
  Brain,
  Clock,
  CheckCircle,
  Sparkles,
  BookOpen,
  ImageIcon,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Summary } from '@/lib/api/types';

export const SmartNotePackCard = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'md'>(
    'pdf'
  );
  const transcript = useTranscript();
  const snapshots = useSnapshots();

  // Load summary on mount
  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const summaryData = await fetchSummary('demo-session');
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const handleGeneratePack = async () => {
    try {
      setIsGenerating(true);
      await loadSummary();
      toast.success('Smart Note Pack generated successfully');
    } catch (error) {
      console.error('Failed to generate pack:', error);
      toast.error('Failed to generate Smart Note Pack');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'md') => {
    try {
      setIsExporting(true);
      const blob = await exportSmartNotePack('demo-session', {
        format,
        includeTranscript: true,
        includeSnapshots: true,
        includeSummary: true,
        includeNotes: true,
        filename: `edith-smart-pack-${new Date().toISOString().split('T')[0]}`,
      });

      // Download the blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edith-smart-pack.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Smart Note Pack exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export pack:', error);
      toast.error('Failed to export Smart Note Pack');
    } finally {
      setIsExporting(false);
    }
  };

  const getContentStats = () => {
    const transcriptWords = transcript.reduce(
      (acc, chunk) => acc + chunk.text.split(' ').length,
      0
    );
    const snapshotCount = snapshots.length;
    const notesText =
      typeof window !== 'undefined'
        ? localStorage.getItem('edith_notes') || ''
        : '';
    const notesWords = notesText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      transcriptWords,
      snapshotCount,
      notesWords,
      totalItems: transcript.length + snapshotCount + (notesWords > 0 ? 1 : 0),
    };
  };

  const stats = getContentStats();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Smart Note Pack</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-generated comprehensive study materials
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Content Overview */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Content Overview</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Mic className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">
                  {stats.transcriptWords} words
                </div>
                <div className="text-xs text-muted-foreground">Transcript</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <ImageIcon className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">
                  {stats.snapshotCount} images
                </div>
                <div className="text-xs text-muted-foreground">Snapshots</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium">
                  {stats.notesWords} words
                </div>
                <div className="text-xs text-muted-foreground">Your Notes</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Brain className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm font-medium">
                  {summary?.bullets.length || 0} points
                </div>
                <div className="text-xs text-muted-foreground">AI Summary</div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* AI Summary Preview */}
        {summary ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">AI Summary</h4>
            <div className="space-y-2">
              {summary.bullets.slice(0, 3).map((bullet) => (
                <div key={bullet.id} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{bullet.text}</p>
                </div>
              ))}
              {summary.bullets.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{summary.bullets.length - 3} more points
                </p>
              )}
            </div>

            {summary.keyTopics.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">
                  Key Topics
                </h5>
                <div className="flex flex-wrap gap-1">
                  {summary.keyTopics.map((topic, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No summary available</p>
            <p className="text-xs">
              Generate a Smart Note Pack to see AI insights
            </p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleGeneratePack}
            disabled={isGenerating || stats.totalItems === 0}
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Smart Pack'}
          </Button>

          {summary && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">
                Export Format
              </h5>
              <div className="grid grid-cols-3 gap-2">
                {(['pdf', 'docx', 'md'] as const).map((format) => (
                  <Button
                    key={format}
                    variant={exportFormat === format ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat(format)}
                    className="text-xs"
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => handleExport(exportFormat)}
                disabled={isExporting}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting
                  ? 'Exporting...'
                  : `Export as ${exportFormat.toUpperCase()}`}
              </Button>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Generating Smart Pack...</span>
              <span>Processing content</span>
            </div>
            <Progress value={66} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
