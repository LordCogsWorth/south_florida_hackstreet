'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { NotesEditor } from '@/components/notes/NotesEditor';
import { AlignmentDiff } from '@/components/notes/AlignmentDiff';
import { SmartNotePackCard } from '@/components/notes/SmartNotePackCard';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export default function NotesPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background p-4">
          <h1 className="text-2xl font-bold">Smart Notes</h1>
          <p className="text-muted-foreground">
            Review and align your notes with captured lecture content
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Notes Editor */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full pr-2">
                <NotesEditor />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Alignment and Smart Pack */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full pl-2 space-y-4">
                <AlignmentDiff />
                <SmartNotePackCard />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </AppLayout>
  );
}
