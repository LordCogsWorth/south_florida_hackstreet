'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useTranscript } from '@/lib/store/session.store';
import { Save, Download, Upload, FileText, Eye, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

export const NotesEditor = () => {
  const [notes, setNotes] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const transcript = useTranscript();

  // Update word and character counts
  useEffect(() => {
    const words = notes
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWordCount(words.length);
    setCharCount(notes.length);
  }, [notes]);

  // Load notes from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotes = localStorage.getItem('edith_notes');
      if (savedNotes) {
        setNotes(savedNotes);
      }
    }
  }, []);

  // Auto-save notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes && typeof window !== 'undefined') {
        localStorage.setItem('edith_notes', notes);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes]);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('edith_notes', notes);
      toast.success('Notes saved successfully');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edith-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Notes downloaded');
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setNotes(content);
      toast.success('Notes uploaded successfully');
    };
    reader.readAsText(file);
  };

  const generateFromTranscript = () => {
    const transcriptText = transcript
      .map(
        (chunk) =>
          `[${new Date(chunk.ts).toLocaleTimeString()}] ${chunk.speaker || 'Speaker'}: ${chunk.text}`
      )
      .join('\n\n');

    setNotes(transcriptText);
    toast.success('Notes generated from transcript');
  };

  const formatPreview = (text: string) => {
    // Simple markdown-like formatting for preview
    return text.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-2xl font-bold mt-4 mb-2">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-semibold mt-3 mb-2">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        return (
          <h3 key={index} className="text-lg font-medium mt-2 mb-1">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        return (
          <li key={index} className="ml-4">
            {line.slice(2)}
          </li>
        );
      } else if (line.startsWith('* ')) {
        return (
          <li key={index} className="ml-4">
            {line.slice(2)}
          </li>
        );
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return (
          <p key={index} className="mb-2">
            {line}
          </p>
        );
      }
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notes Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {wordCount} words
            </Badge>
            <Badge variant="outline" className="text-xs">
              {charCount} chars
            </Badge>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? (
              <Edit3 className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            size="sm"
            onClick={generateFromTranscript}
            disabled={transcript.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            From Transcript
          </Button>

          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          <input
            type="file"
            accept=".txt,.md"
            onChange={handleUpload}
            className="hidden"
            id="upload-notes"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('upload-notes')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <Tabs value={isPreviewMode ? 'preview' : 'edit'} className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="h-full mt-0">
            <div className="h-full p-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Start writing your notes here...

You can use markdown-like formatting:
# Heading 1
## Heading 2
### Heading 3
- Bullet point
* Another bullet point

The notes will be automatically saved as you type."
                className="h-full resize-none border-0 focus-visible:ring-0 text-sm leading-relaxed"
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="h-full mt-0">
            <div className="h-full p-4 overflow-auto">
              <div className="prose prose-sm max-w-none">
                {notes ? (
                  formatPreview(notes)
                ) : (
                  <p className="text-muted-foreground italic">
                    No notes to preview. Start writing in the Edit tab.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
