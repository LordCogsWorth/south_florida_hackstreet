'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { exportSmartNotePack } from '@/lib/api/client';
import {
  Download,
  Check,
  Clock,
  FileText,
  Image,
  Brain,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportCardProps {
  title: string;
  description: string;
  format: 'pdf' | 'docx' | 'md' | 'csv' | 'zip';
  icon: string;
  features: string[];
}

export const ExportCard = ({
  title,
  description,
  format,
  icon,
  features,
}: ExportCardProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [includeOptions, setIncludeOptions] = useState({
    transcript: true,
    notes: true,
    summary: true,
    snapshots: true,
    flashcards: false,
  });

  const getFormatIcon = () => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'docx':
        return <FileText className="h-5 w-5" />;
      case 'md':
        return <FileText className="h-5 w-5" />;
      case 'csv':
        return <FileText className="h-5 w-5" />;
      case 'zip':
        return <Download className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getFormatColor = () => {
    switch (format) {
      case 'pdf':
        return 'text-red-600 bg-red-100 dark:bg-red-900';
      case 'docx':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'md':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
      case 'csv':
        return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'zip':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const blob = await exportSmartNotePack('demo-session', {
        format,
        includeTranscript: includeOptions.transcript,
        includeNotes: includeOptions.notes,
        includeSummary: includeOptions.summary,
        includeSnapshots: includeOptions.snapshots,
        filename: `edith-${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`,
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edith-${title.toLowerCase().replace(/\s+/g, '-')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${title} exported successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getContentStats = () => {
    // In a real app, these would come from the store
    return {
      transcript: 1200,
      notes: 500,
      snapshots: 8,
      flashcards: 10,
    };
  };

  const stats = getContentStats();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="text-2xl"
              role="img"
              aria-label="Export format icon"
            >
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge
                variant="outline"
                className={`text-xs ${getFormatColor()}`}
              >
                {format.toUpperCase()}
              </Badge>
            </div>
          </div>
          {getFormatIcon()}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Content Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Include Content</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="transcript"
                checked={includeOptions.transcript}
                onCheckedChange={(checked) =>
                  setIncludeOptions((prev) => ({
                    ...prev,
                    transcript: !!checked,
                  }))
                }
              />
              <Label
                htmlFor="transcript"
                className="flex items-center gap-2 text-sm"
              >
                <Mic className="h-4 w-4" />
                Transcript ({stats.transcript} words)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notes"
                checked={includeOptions.notes}
                onCheckedChange={(checked) =>
                  setIncludeOptions((prev) => ({ ...prev, notes: !!checked }))
                }
              />
              <Label
                htmlFor="notes"
                className="flex items-center gap-2 text-sm"
              >
                <FileText className="h-4 w-4" />
                Notes ({stats.notes} words)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="summary"
                checked={includeOptions.summary}
                onCheckedChange={(checked) =>
                  setIncludeOptions((prev) => ({ ...prev, summary: !!checked }))
                }
              />
              <Label
                htmlFor="summary"
                className="flex items-center gap-2 text-sm"
              >
                <Brain className="h-4 w-4" />
                AI Summary
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="snapshots"
                checked={includeOptions.snapshots}
                onCheckedChange={(checked) =>
                  setIncludeOptions((prev) => ({
                    ...prev,
                    snapshots: !!checked,
                  }))
                }
              />
              <Label
                htmlFor="snapshots"
                className="flex items-center gap-2 text-sm"
              >
                <Image className="h-4 w-4" />
                Snapshots ({stats.snapshots} images)
              </Label>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Features</h4>
          <ul className="space-y-1">
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Check className="h-3 w-3 text-green-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Exporting...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {format.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
