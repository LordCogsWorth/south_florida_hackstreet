'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'General',
    items: [
      { key: '⌘R', description: 'Toggle recording' },
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: '⌘K', description: 'Open command palette' },
    ],
  },
  {
    category: 'Session',
    items: [
      { key: 'S', description: 'Capture snapshot' },
      { key: 'B', description: 'Add bookmark' },
      { key: 'M', description: 'Add marker' },
      { key: ']', description: 'Next snapshot' },
      { key: '[', description: 'Previous snapshot' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { key: '⌘1', description: 'Go to Session' },
      { key: '⌘2', description: 'Go to Notes' },
      { key: '⌘3', description: 'Go to Flashcards' },
      { key: '⌘4', description: 'Go to Exports' },
      { key: '⌘,', description: 'Go to Settings' },
    ],
  },
  {
    category: 'Transcript',
    items: [
      { key: '/', description: 'Focus search' },
      { key: '⌘A', description: 'Select all transcript' },
      { key: '⌘C', description: 'Copy selected text' },
      { key: 'Escape', description: 'Clear search' },
    ],
  },
  {
    category: 'Study',
    items: [
      { key: 'Space', description: 'Flip flashcard' },
      { key: '1-4', description: 'Grade flashcard (Again/Hard/Good/Easy)' },
      { key: 'Enter', description: 'Submit quiz answer' },
      { key: '→', description: 'Next question' },
      { key: '←', description: 'Previous question' },
    ],
  },
];

export const ShortcutsDialog = ({
  open,
  onOpenChange,
}: ShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with
            E.D.I.T.H. more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((category, index) => (
            <div key={category.category}>
              <h3 className="text-sm font-medium text-foreground mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
              {index < shortcuts.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> On Windows and Linux, use Ctrl instead of ⌘.
            Some shortcuts may not work in all contexts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
