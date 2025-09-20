'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ExportCard } from '@/components/exports/ExportCard';

export default function ExportsPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background p-4">
          <h1 className="text-2xl font-bold">Exports</h1>
          <p className="text-muted-foreground">
            Download your lecture content in various formats
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ExportCard
              title="Smart Note Pack"
              description="Comprehensive study materials with transcript, notes, and AI summary"
              format="pdf"
              icon="📄"
              features={[
                'Full transcript with timestamps',
                'Your personal notes',
                'AI-generated summary',
                'Whiteboard snapshots',
                'Step-by-step explanations',
              ]}
            />

            <ExportCard
              title="Transcript Only"
              description="Clean transcript text for easy reading and searching"
              format="md"
              icon="📝"
              features={[
                'Formatted transcript',
                'Speaker identification',
                'Timestamps',
                'Searchable text',
              ]}
            />

            <ExportCard
              title="Notes & Summary"
              description="Your notes combined with AI insights and key points"
              format="docx"
              icon="📚"
              features={[
                'Your personal notes',
                'AI summary bullets',
                'Key topics highlighted',
                'Missing content suggestions',
              ]}
            />

            <ExportCard
              title="Flashcards"
              description="Study cards for spaced repetition learning"
              format="csv"
              icon="🎴"
              features={[
                'Question and answer pairs',
                'Difficulty levels',
                'Tags for organization',
                'Review statistics',
              ]}
            />

            <ExportCard
              title="Whiteboard Images"
              description="All captured whiteboard content as images"
              format="zip"
              icon="🖼️"
              features={[
                'High-resolution images',
                'OCR text extraction',
                'Markers and annotations',
                'Chronological order',
              ]}
            />

            <ExportCard
              title="Complete Archive"
              description="Everything in one comprehensive package"
              format="zip"
              icon="📦"
              features={[
                'All content types',
                'Multiple formats',
                'Metadata included',
                'Ready for sharing',
              ]}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
