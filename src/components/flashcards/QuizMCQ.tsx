'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { fetchQuiz, submitQuizAnswers } from '@/lib/api/client';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Brain,
  Trophy,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import type { QuizItem } from '@/lib/api/types';

type QuizState = 'loading' | 'active' | 'completed';

export const QuizMCQ = () => {
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    total: number;
    correctAnswers: Record<string, number>;
  } | null>(null);

  // Load quiz on mount
  useEffect(() => {
    loadQuiz();
  }, []);

  // Timer
  useEffect(() => {
    if (quizState === 'active' && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && quizState === 'active') {
      handleSubmitQuiz();
    }
  }, [timeRemaining, quizState]);

  const loadQuiz = async () => {
    try {
      setQuizState('loading');
      const items = await fetchQuiz('demo-session');
      setQuizItems(items);
      setTimeRemaining(items.length * 60); // 1 minute per question
      setQuizState('active');
    } catch (error) {
      console.error('Failed to load quiz:', error);
      toast.error('Failed to load quiz');
    }
  };

  const currentItem = quizItems[currentIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentItem.id]: answerIndex,
    }));
  };

  const handleNext = () => {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setQuizState('loading');
      const results = await submitQuizAnswers('demo-session', selectedAnswers);
      setQuizResults(results);
      setQuizState('completed');
      toast.success(`Quiz completed! Score: ${results.score}/${results.total}`);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      toast.error('Failed to submit quiz');
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizResults(null);
    loadQuiz();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      case 'hard':
        return 'text-red-600 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (quizState === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (quizState === 'completed' && quizResults) {
    const percentage = Math.round(
      (quizResults.score / quizResults.total) * 100
    );

    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            <p className="text-muted-foreground">
              Great job on completing the quiz
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score */}
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {quizResults.score}/{quizResults.total}
              </div>
              <div className="text-2xl font-semibold mb-1">{percentage}%</div>
              <div className="text-sm text-muted-foreground">
                {percentage >= 80
                  ? 'Excellent!'
                  : percentage >= 60
                    ? 'Good job!'
                    : 'Keep studying!'}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score</span>
                <span>
                  {quizResults.score}/{quizResults.total}
                </span>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>

            {/* Restart Button */}
            <Button onClick={handleRestart} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Take Quiz Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">No quiz available</p>
          <p className="text-sm text-muted-foreground">
            Create some quiz questions to start testing
          </p>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / quizItems.length) * 100;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Quiz</h2>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {quizItems.length}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>
              {answeredCount}/{quizItems.length} answered
            </span>
          </div>
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

      {/* Question */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={`text-xs ${getDifficultyColor(currentItem.difficulty)}`}
            >
              {currentItem.difficulty}
            </Badge>
            {currentItem.tags && (
              <div className="flex gap-1">
                {currentItem.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-lg font-medium">{currentItem.prompt}</div>

          <RadioGroup
            value={selectedAnswers[currentItem.id]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
            className="space-y-3"
          >
            {currentItem.choices.map((choice, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={index.toString()}
                  id={`choice-${index}`}
                />
                <Label
                  htmlFor={`choice-${index}`}
                  className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {choice}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {currentItem.explanation && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Explanation:</div>
              <div className="text-sm text-muted-foreground">
                {currentItem.explanation}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentIndex === quizItems.length - 1 ? (
            <Button
              onClick={handleSubmitQuiz}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
};
