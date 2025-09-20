'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { fetchFlashcards, updateFlashcardProgress } from '@/lib/api/client';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Flashcard } from '@/lib/api/types';

type Grade = 'again' | 'hard' | 'good' | 'easy';

export const CardStudy = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studyStats, setStudyStats] = useState({
    total: 0,
    studied: 0,
    correct: 0,
  });

  // Load flashcards on mount
  useEffect(() => {
    loadFlashcards();
  }, []);

  // Update study stats
  useEffect(() => {
    const studied = flashcards.filter((card) => card.reviewCount > 0).length;
    const correct = flashcards.reduce(
      (acc, card) => acc + card.correctCount,
      0
    );
    setStudyStats({
      total: flashcards.length,
      studied,
      correct,
    });
  }, [flashcards]);

  const loadFlashcards = async () => {
    try {
      setIsLoading(true);
      const cards = await fetchFlashcards('demo-session');
      setFlashcards(cards);
    } catch (error) {
      console.error('Failed to load flashcards:', error);
      toast.error('Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const currentCard = flashcards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleGrade = async (grade: Grade) => {
    if (!currentCard) return;

    try {
      await updateFlashcardProgress(currentCard.id, grade);

      // Update local state
      setFlashcards((prev) =>
        prev.map((card) =>
          card.id === currentCard.id
            ? {
                ...card,
                reviewCount: card.reviewCount + 1,
                correctCount:
                  grade === 'again' ? card.correctCount : card.correctCount + 1,
                lastReviewed: new Date().toISOString(),
              }
            : card
        )
      );

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        toast.success('Study session completed!');
      }
    } catch (error) {
      console.error('Failed to update flashcard progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success('Study session restarted');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === '1') {
        e.preventDefault();
        handleGrade('again');
      } else if (e.key === '2') {
        e.preventDefault();
        handleGrade('hard');
      } else if (e.key === '3') {
        e.preventDefault();
        handleGrade('good');
      } else if (e.key === '4') {
        e.preventDefault();
        handleGrade('easy');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, isFlipped]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">No flashcards available</p>
          <p className="text-sm text-muted-foreground">
            Create some flashcards to start studying
          </p>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Study Session</h2>
          <p className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Study Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {studyStats.studied}
          </div>
          <div className="text-xs text-muted-foreground">Studied</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {studyStats.correct}
          </div>
          <div className="text-xs text-muted-foreground">Correct</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {studyStats.total > 0
              ? Math.round((studyStats.correct / studyStats.studied) * 100)
              : 0}
            %
          </div>
          <div className="text-xs text-muted-foreground">Accuracy</div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center">
        <Card
          className="w-full max-w-2xl h-80 cursor-pointer"
          onClick={handleFlip}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {currentCard.difficulty}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{currentCard.reviewCount} reviews</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                {isFlipped ? 'Answer' : 'Question'}
              </div>
              <div className="text-lg leading-relaxed">
                {isFlipped ? currentCard.back : currentCard.front}
              </div>
              {!isFlipped && (
                <div className="text-xs text-muted-foreground">
                  Click or press Space to reveal answer
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={handleFlip}
            className="flex-1 max-w-xs"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </Button>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Grading */}
        {isFlipped && (
          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              How well did you know this?
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => handleGrade('again')}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Again (1)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGrade('hard')}
                className="text-orange-600 hover:text-orange-700"
              >
                <Clock className="h-4 w-4 mr-2" />
                Hard (2)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGrade('good')}
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Good (3)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGrade('easy')}
                className="text-blue-600 hover:text-blue-700"
              >
                <Star className="h-4 w-4 mr-2" />
                Easy (4)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
