'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSelectedSnapshot } from '@/lib/store/session.store';
import { getStepExpansion } from '@/lib/api/client';
import { formatTimestamp } from '@/lib/utils/time';
import {
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Calculator,
  Lightbulb,
  BookOpen,
  FileText,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StepExpansion } from '@/lib/api/types';

export const StepDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepExpansion, setStepExpansion] = useState<StepExpansion | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const selectedSnapshot = useSelectedSnapshot();

  // Load step expansion when snapshot is selected
  useEffect(() => {
    if (selectedSnapshot) {
      setIsOpen(true);
      loadStepExpansion(selectedSnapshot.id);
    } else {
      setIsOpen(false);
    }
  }, [selectedSnapshot]);

  const loadStepExpansion = async (snapshotId: string) => {
    try {
      setIsLoading(true);
      const expansion = await getStepExpansion(snapshotId);
      setStepExpansion(expansion);
    } catch (error) {
      console.error('Failed to load step expansion:', error);
      toast.error('Failed to load step expansion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyStep = async (step: any) => {
    const text = `${step.title}\n\n${step.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Step copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy step');
    }
  };

  const handleCopyAll = async () => {
    if (!stepExpansion) return;

    const text = stepExpansion.steps
      .map((step, index) => `${index + 1}. ${step.title}\n\n${step.body}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('All steps copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy steps');
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'equation':
        return <Calculator className="h-4 w-4" />;
      case 'explanation':
        return <Lightbulb className="h-4 w-4" />;
      case 'example':
        return <BookOpen className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      default:
        return <ChevronRight className="h-4 w-4" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'equation':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'explanation':
        return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'example':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      case 'note':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  if (!selectedSnapshot) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-96 sm:w-[500px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Step-by-Step Expansion</SheetTitle>
              <SheetDescription>
                Detailed breakdown of the selected snapshot
              </SheetDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Snapshot Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Selected Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="font-mono">
                  {formatTimestamp(selectedSnapshot.ts)}
                </span>
              </div>
              {selectedSnapshot.ocr && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    OCR Text:
                  </span>
                  <p className="text-sm bg-muted p-2 rounded font-mono">
                    {selectedSnapshot.ocr}
                  </p>
                </div>
              )}
              {selectedSnapshot.markers &&
                selectedSnapshot.markers.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">
                      Markers:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedSnapshot.markers.map((marker) => (
                        <Badge
                          key={marker.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {marker.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Step Expansion */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Step-by-Step Breakdown
                </CardTitle>
                {stepExpansion && (
                  <Button variant="outline" size="sm" onClick={handleCopyAll}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full mb-1"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              ) : stepExpansion ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {stepExpansion.steps.map((step, index) => (
                      <div key={step.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${getStepColor(step.type)}`}
                          >
                            {getStepIcon(step.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-sm">
                                {step.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {step.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {step.body}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyStep(step)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {index < stepExpansion.steps.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No step expansion available</p>
                  <p className="text-xs">Try selecting a different snapshot</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(selectedSnapshot.fullUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Image
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const text = `Snapshot from ${formatTimestamp(selectedSnapshot.ts)}\n\n${selectedSnapshot.ocr || 'No OCR text available'}`;
                navigator.clipboard.writeText(text);
                toast.success('Snapshot info copied to clipboard');
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Info
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
